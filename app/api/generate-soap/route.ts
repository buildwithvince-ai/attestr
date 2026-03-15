import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(req: NextRequest) {
  try {
    const { narrative, patientName, chiefComplaint, encounterDate } = await req.json()

    if (!narrative || narrative.trim().length < 20) {
      return NextResponse.json(
        { error: 'Narrative must be at least 20 characters' },
        { status: 400 }
      )
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' })

    const prompt = `You are a clinical documentation AI. Given the following patient encounter narrative, produce a structured SOAP note with confidence scores.

Patient: ${patientName}
Chief Complaint: ${chiefComplaint}
Date: ${encounterDate}

Encounter Narrative:
${narrative}

Return ONLY valid JSON (no markdown, no backticks, no explanation) in this exact format:
{
  "subjective": { "content": "...", "confidence": 0.0 },
  "objective": { "content": "...", "confidence": 0.0 },
  "assessment": { "content": "...", "confidence": 0.0 },
  "plan": { "content": "...", "confidence": 0.0 },
  "fhir": {
    "resourceType": "DocumentReference",
    "status": "current",
    "type": { "coding": [{ "system": "http://loinc.org", "code": "11488-4", "display": "Consult note" }] },
    "subject": { "display": "${patientName}" },
    "date": "${encounterDate}",
    "description": "${chiefComplaint}"
  }
}

Rules:
- Each SOAP section content should be detailed clinical text
- Confidence scores: 0.0 to 1.0 based on how much evidence exists in the narrative for that section
- Higher confidence when the narrative explicitly covers that section's domain
- Lower confidence when you must infer or the narrative lacks detail for that section
- The FHIR object must use the exact patient name, date, and chief complaint provided`

    const result = await model.generateContent(prompt)
    const text = result.response.text().replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(text)

    return NextResponse.json(parsed)
  } catch (error) {
    console.error('SOAP generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate SOAP note' },
      { status: 500 }
    )
  }
}
