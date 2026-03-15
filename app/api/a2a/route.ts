import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

interface A2ATask {
  id: string
  message: {
    parts: { text: string }[]
  }
  metadata?: Record<string, string>
}

async function generateSOAP(narrative: string) {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' })

  const prompt = `You are a clinical documentation AI. Given the following patient encounter narrative, produce a structured SOAP note with confidence scores.

Encounter Narrative:
${narrative}

Return ONLY valid JSON (no markdown, no backticks) in this exact format:
{
  "subjective": { "content": "...", "confidence": 0.0 },
  "objective": { "content": "...", "confidence": 0.0 },
  "assessment": { "content": "...", "confidence": 0.0 },
  "plan": { "content": "...", "confidence": 0.0 }
}

Confidence scores: 0.0 to 1.0 based on evidence in the narrative for each section.`

  const result = await model.generateContent(prompt)
  const text = result.response.text().replace(/```json|```/g, '').trim()
  return JSON.parse(text)
}

function validateEncounter(narrative: string) {
  const checks = {
    hasHistory: /history|present|complain|symptom/i.test(narrative),
    hasVitals: /bp|hr|rr|temp|o2|vital|blood pressure|heart rate/i.test(narrative),
    hasExam: /exam|auscultation|palpat|inspect|lung|heart|abdomen/i.test(narrative),
    hasPlan: /plan|order|prescri|refer|follow|advise|recommend/i.test(narrative),
    sufficientLength: narrative.trim().length >= 50,
  }

  const score = Object.values(checks).filter(Boolean).length
  const ready = score >= 3

  return {
    ready,
    score: `${score}/5`,
    details: checks,
    recommendation: ready
      ? 'Narrative has sufficient detail for SOAP note generation.'
      : 'Narrative needs more clinical detail. Consider adding: ' +
        [
          !checks.hasHistory && 'patient history/symptoms',
          !checks.hasVitals && 'vitals',
          !checks.hasExam && 'examination findings',
          !checks.hasPlan && 'treatment plan',
          !checks.sufficientLength && 'more detail (at least 50 characters)',
        ]
          .filter(Boolean)
          .join(', '),
  }
}

export async function POST(req: NextRequest) {
  try {
    const task: A2ATask = await req.json()
    const messageText = task.message?.parts?.map(p => p.text).join(' ') || ''

    const isValidation = /valid|enough|ready|check|sufficient/i.test(messageText)

    if (isValidation) {
      const validation = validateEncounter(messageText)
      return NextResponse.json(
        {
          id: task.id,
          status: { state: 'completed' },
          artifacts: [
            {
              parts: [{ text: JSON.stringify(validation, null, 2) }],
              mimeType: 'application/json',
            },
          ],
        },
        {
          headers: { 'Access-Control-Allow-Origin': '*' },
        }
      )
    }

    const soap = await generateSOAP(messageText)
    return NextResponse.json(
      {
        id: task.id,
        status: { state: 'completed' },
        artifacts: [
          {
            parts: [{ text: JSON.stringify(soap, null, 2) }],
            mimeType: 'application/json',
          },
        ],
      },
      {
        headers: { 'Access-Control-Allow-Origin': '*' },
      }
    )
  } catch (error) {
    console.error('A2A error:', error)
    const task = await req.json().catch(() => ({ id: 'unknown' }))
    return NextResponse.json(
      {
        id: task.id,
        status: { state: 'failed', message: 'Internal error processing A2A task' },
        artifacts: [],
      },
      {
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
      }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
