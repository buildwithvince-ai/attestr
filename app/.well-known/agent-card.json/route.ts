import { NextResponse } from 'next/server'

const AGENT_CARD = {
  name: 'Attestr',
  description: 'AI clinical documentation agent that converts physician encounter narratives into structured, FHIR R4-compliant SOAP notes with section-by-section confidence scoring and approval workflow.',
  url: 'https://attestr-ai.vercel.app',
  version: '1.0.0',
  capabilities: {
    streaming: false,
    pushNotifications: false,
  },
  skills: [
    {
      id: 'generate_soap_note',
      name: 'Generate SOAP Note',
      description: 'Converts a free-form patient encounter narrative into a structured SOAP note (Subjective, Objective, Assessment, Plan) with confidence scores and FHIR R4 DocumentReference.',
      inputModes: ['text'],
      outputModes: ['text'],
    },
    {
      id: 'validate_encounter',
      name: 'Validate Encounter',
      description: 'Checks whether an encounter narrative has sufficient clinical detail to generate a reliable SOAP note.',
      inputModes: ['text'],
      outputModes: ['text'],
    },
  ],
  defaultInputModes: ['text'],
  defaultOutputModes: ['text'],
}

export async function GET() {
  return NextResponse.json(AGENT_CARD, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    },
  })
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
