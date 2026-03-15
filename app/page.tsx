'use client'

import { useState, useRef, useCallback } from 'react'

/* ───────────────────── Types ───────────────────── */

interface SOAPSection {
  content: string
  confidence: number
}

interface SOAPResult {
  subjective: SOAPSection
  objective: SOAPSection
  assessment: SOAPSection
  plan: SOAPSection
  fhir: Record<string, unknown>
}

type ApprovalState = 'pending' | 'approved' | 'edited'

interface SectionState {
  approval: ApprovalState
  editedContent: string | null
  isEditing: boolean
}

/* ───────────────────── Glass Styles ───────────────────── */

const glass = {
  base: {
    background: 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
    backdropFilter: 'blur(20px) saturate(150%) brightness(1.05)',
    border: '1px solid rgba(255,255,255,0.07)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.15), 0 8px 32px rgba(0,0,0,0.35)',
  },
  panel: {
    background: 'linear-gradient(160deg, rgba(255,255,255,0.055), rgba(255,255,255,0.02) 60%, rgba(139,92,246,0.015))',
    backdropFilter: 'blur(32px) saturate(180%) brightness(1.08)',
    border: '1px solid rgba(255,255,255,0.09)',
    boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.13), inset 0 -1px 0 rgba(0,0,0,0.18), 0 12px 40px rgba(0,0,0,0.4)',
  },
  strong: {
    background: 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))',
    backdropFilter: 'blur(48px) saturate(200%) brightness(1.1)',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 16px 48px rgba(0,0,0,0.5)',
  },
  active: {
    background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(99,102,241,0.04))',
    backdropFilter: 'blur(32px) saturate(180%)',
    border: '1px solid rgba(139,92,246,0.28)',
    boxShadow: 'inset 0 1.5px 0 rgba(167,139,250,0.2), 0 0 32px rgba(139,92,246,0.08)',
  },
  approved: {
    background: 'linear-gradient(135deg, rgba(74,222,128,0.06), rgba(16,185,129,0.03))',
    backdropFilter: 'blur(32px) saturate(160%)',
    border: '1px solid rgba(74,222,128,0.22)',
    boxShadow: 'inset 0 1.5px 0 rgba(74,222,128,0.15), 0 0 20px rgba(74,222,128,0.04)',
  },
}

/* ───────────────────── Demo Data ───────────────────── */

const DEMO = {
  patientName: 'Reyes, Marco',
  chiefComplaint: 'Chest pain, 3 days',
  transcript:
    '35-year-old male presents with a 3-day history of sharp chest pain radiating to the left arm. Pain is 6 out of 10, worse on exertion, relieved by rest. No fever, no cough. Patient has a history of hypertension managed with lisinopril 10mg daily. Vitals: BP 138 over 84, HR 91, RR 16, Temp 98.6, O2 sat 97% on room air. EKG shows normal sinus rhythm, no ST changes. Lungs clear to auscultation bilaterally. Heart sounds regular, no murmurs. Plan to order troponin, BMP, chest X-ray, and cardiology consult. Advised patient to avoid strenuous activity pending results.',
}

const SECTION_META = [
  { key: 'subjective' as const, badge: 'S', label: 'Subjective', desc: 'Patient-reported symptoms, history, and concerns' },
  { key: 'objective' as const, badge: 'O', label: 'Objective', desc: 'Clinical findings, vitals, and examination results' },
  { key: 'assessment' as const, badge: 'A', label: 'Assessment', desc: 'Clinical analysis, differential diagnoses, and interpretation' },
  { key: 'plan' as const, badge: 'P', label: 'Plan', desc: 'Treatment plan, orders, follow-up, and patient education' },
]

/* ───────────────────── Component ───────────────────── */

export default function Home() {
  const [screen, setScreen] = useState<'input' | 'review'>('input')
  const [patientName, setPatientName] = useState('')
  const [chiefComplaint, setChiefComplaint] = useState('')
  const [encounterDate, setEncounterDate] = useState(() => new Date().toISOString().split('T')[0])
  const [transcript, setTranscript] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [soapResult, setSoapResult] = useState<SOAPResult | null>(null)
  const [sections, setSections] = useState<Record<string, SectionState>>({
    subjective: { approval: 'pending', editedContent: null, isEditing: false },
    objective: { approval: 'pending', editedContent: null, isEditing: false },
    assessment: { approval: 'pending', editedContent: null, isEditing: false },
    plan: { approval: 'pending', editedContent: null, isEditing: false },
  })
  const [showFhir, setShowFhir] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isDemoTyping, setIsDemoTyping] = useState(false)

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  /* ── Voice input ── */
  const toggleRecording = useCallback(() => {
    if (isRecording) {
      recognitionRef.current?.stop()
      setIsRecording(false)
      return
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      alert('Speech recognition is not supported in this browser. Please use Chrome or Edge.')
      return
    }

    const recognition = new SR()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = ''
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          final += t + ' '
        } else {
          interim += t
        }
      }
      if (final) {
        setTranscript(prev => prev + final)
      }
      if (textareaRef.current && interim) {
        textareaRef.current.placeholder = interim
      }
    }

    recognition.onerror = () => setIsRecording(false)
    recognition.onend = () => setIsRecording(false)

    recognition.start()
    recognitionRef.current = recognition
    setIsRecording(true)
  }, [isRecording])

  /* ── Demo typewriter ── */
  const fillDemo = useCallback(() => {
    setPatientName(DEMO.patientName)
    setChiefComplaint(DEMO.chiefComplaint)
    setIsDemoTyping(true)
    setTranscript('')

    let i = 0
    const tick = setInterval(() => {
      i += 7
      if (i >= DEMO.transcript.length) {
        setTranscript(DEMO.transcript)
        setIsDemoTyping(false)
        clearInterval(tick)
      } else {
        setTranscript(DEMO.transcript.slice(0, i))
      }
    }, 16)
  }, [])

  /* ── Generate SOAP ── */
  const generateSoap = async () => {
    setIsGenerating(true)
    try {
      const res = await fetch('/api/generate-soap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ narrative: transcript, patientName, chiefComplaint, encounterDate }),
      })
      if (!res.ok) throw new Error('Generation failed')
      const data: SOAPResult = await res.json()
      setSoapResult(data)
      setSections({
        subjective: { approval: 'pending', editedContent: null, isEditing: false },
        objective: { approval: 'pending', editedContent: null, isEditing: false },
        assessment: { approval: 'pending', editedContent: null, isEditing: false },
        plan: { approval: 'pending', editedContent: null, isEditing: false },
      })
      setScreen('review')
    } catch {
      alert('Failed to generate SOAP note. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  /* ── Section actions ── */
  const approveSection = (key: string) => {
    setSections(prev => ({ ...prev, [key]: { ...prev[key], approval: 'approved', isEditing: false } }))
  }

  const startEditing = (key: string) => {
    setSections(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        isEditing: true,
        editedContent: prev[key].editedContent ?? (soapResult as Record<string, SOAPSection>)[key]?.content ?? '',
      },
    }))
  }

  const saveEdit = (key: string) => {
    setSections(prev => ({ ...prev, [key]: { ...prev[key], approval: 'edited', isEditing: false } }))
  }

  const updateEditContent = (key: string, value: string) => {
    setSections(prev => ({ ...prev, [key]: { ...prev[key], editedContent: value } }))
  }

  /* ── Progress ── */
  const approvedCount = Object.values(sections).filter(s => s.approval === 'approved' || s.approval === 'edited').length
  const allApproved = approvedCount === 4

  /* ── Copy to EHR ── */
  const copyToEhr = () => {
    if (!soapResult || !allApproved) return
    const lines = SECTION_META.map(({ key, label }) => {
      const content = sections[key].editedContent ?? (soapResult[key] as SOAPSection).content
      return `${label}:\n${content}`
    })
    const text = `SOAP Note — ${patientName}\nDate: ${encounterDate}\nChief Complaint: ${chiefComplaint}\n\n${lines.join('\n\n')}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  /* ── Validation ── */
  const canGenerate = patientName.trim().length > 0 && transcript.trim().length > 20

  const validationHint = !patientName.trim()
    ? 'Enter a patient name to continue'
    : transcript.trim().length <= 20
      ? 'Dictate or type at least 20 characters of encounter narrative'
      : ''

  /* ── Confidence helpers ── */
  const confLabel = (c: number) => (c >= 0.8 ? 'High' : c >= 0.6 ? 'Review' : 'Verify')
  const confColor = (c: number) => (c >= 0.8 ? '#4ade80' : c >= 0.6 ? '#fbbf24' : '#f87171')

  /* ───────────────────── Render ───────────────────── */
  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      {/* ── Ambient orbs ── */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute', top: '-10%', left: '-5%', width: '40vw', height: '40vw',
            background: 'rgba(99,102,241,0.09)', borderRadius: '50%', filter: 'blur(100px)',
            animation: 'float1 14s ease-in-out infinite',
          }}
        />
        <div
          style={{
            position: 'absolute', bottom: '-10%', right: '-5%', width: '35vw', height: '35vw',
            background: 'rgba(16,185,129,0.07)', borderRadius: '50%', filter: 'blur(90px)',
            animation: 'float2 18s ease-in-out infinite',
          }}
        />
        <div
          style={{
            position: 'absolute', top: '30%', right: '10%', width: '25vw', height: '25vw',
            background: 'rgba(139,92,246,0.06)', borderRadius: '50%', filter: 'blur(70px)',
            animation: 'float3 22s ease-in-out infinite',
          }}
        />
      </div>

      {/* ── Keyframes ── */}
      <style>{`
        @keyframes float1 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(30px, 20px); } }
        @keyframes float2 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-25px, -15px); } }
        @keyframes float3 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-15px, 25px); } }
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }
        @keyframes confTrack { from { width: 0; } }
        @keyframes waveBar {
          0%, 100% { transform: scaleY(0.3); }
          50% { transform: scaleY(1); }
        }
        @keyframes penWrite {
          0% { stroke-dashoffset: 200; }
          100% { stroke-dashoffset: 0; }
        }
      `}</style>

      {/* ── Header ── */}
      <header
        style={{
          ...glass.strong,
          position: 'sticky', top: 0, zIndex: 50,
          padding: '16px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Sora', fontWeight: 700, fontSize: 16, color: '#fff',
            }}
          >
            A
          </div>
          <span style={{ fontFamily: 'Sora', fontWeight: 600, fontSize: 18, color: '#f1f5f9' }}>
            Attestr
          </span>
          <span style={{ fontFamily: 'Sora', fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 400, marginLeft: 4 }}>
            AI-drafted. Physician-approved.
          </span>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {screen === 'review' && (
            <button
              onClick={() => setScreen('input')}
              style={{
                ...glass.base,
                padding: '8px 16px', borderRadius: 10, cursor: 'pointer',
                fontFamily: 'Sora', fontSize: 13, fontWeight: 500, color: '#f1f5f9',
              }}
            >
              New Note
            </button>
          )}
          {screen === 'input' && (
            <button
              onClick={fillDemo}
              disabled={isDemoTyping}
              style={{
                ...glass.base,
                padding: '8px 16px', borderRadius: 10, cursor: isDemoTyping ? 'wait' : 'pointer',
                fontFamily: 'Sora', fontSize: 13, fontWeight: 500,
                color: '#8b5cf6', opacity: isDemoTyping ? 0.5 : 1,
              }}
            >
              Try Demo
            </button>
          )}
        </div>
      </header>

      {/* ── Generating overlay ── */}
      {isGenerating && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(6,10,20,0.85)',
            backdropFilter: 'blur(48px) saturate(200%) brightness(1.1)',
          }}
        >
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none" style={{ marginBottom: 24 }}>
            <line x1="20" y1="25" x2="60" y2="25" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
            <line x1="20" y1="35" x2="60" y2="35" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
            <line x1="20" y1="45" x2="55" y2="45" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
            <line x1="20" y1="55" x2="50" y2="55" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
            <path
              d="M20 25 Q30 23 40 25 Q50 27 60 25"
              stroke="#8b5cf6" strokeWidth="2" fill="none"
              strokeDasharray="200" style={{ animation: 'penWrite 2s linear infinite' }}
            />
            <path
              d="M20 35 Q35 33 50 35 Q55 37 60 35"
              stroke="#6366f1" strokeWidth="2" fill="none"
              strokeDasharray="200" style={{ animation: 'penWrite 2s linear 0.5s infinite' }}
            />
            <path
              d="M20 45 Q30 43 40 45 Q48 47 55 45"
              stroke="#8b5cf6" strokeWidth="2" fill="none"
              strokeDasharray="200" style={{ animation: 'penWrite 2s linear 1s infinite' }}
            />
            <path
              d="M58 18 L64 12 L66 14 L60 20 Z"
              fill="#8b5cf6" style={{ animation: 'float1 3s ease-in-out infinite' }}
            />
          </svg>

          <h2 style={{ fontFamily: 'Sora', fontWeight: 600, fontSize: 22, color: '#f1f5f9', marginBottom: 8 }}>
            Generating SOAP Note
          </h2>
          <p style={{ fontFamily: 'Sora', fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 24 }}>
            Structuring your encounter narrative with Gemini 1.5 Flash&hellip;
          </p>

          <div style={{ width: 240, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div
              style={{
                width: '40%', height: '100%', borderRadius: 2,
                background: 'linear-gradient(90deg, transparent, #8b5cf6, transparent)',
                animation: 'shimmer 1.5s ease-in-out infinite',
              }}
            />
          </div>

          <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
            {['FHIR', 'SOAP', 'CONFIDENCE SCORING'].map(tag => (
              <span
                key={tag}
                style={{
                  fontFamily: 'JetBrains Mono', fontSize: 10, fontWeight: 500,
                  color: 'rgba(255,255,255,0.2)', letterSpacing: '0.08em',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      <main style={{ position: 'relative', zIndex: 1, maxWidth: 720, margin: '0 auto', padding: '32px 20px 64px' }}>

        {/* ════════════════ INPUT SCREEN ════════════════ */}
        {screen === 'input' && (
          <div>
            <div style={{ marginBottom: 32, textAlign: 'center' }}>
              <h1 style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 28, color: '#f1f5f9', marginBottom: 6 }}>
                Clinical Documentation
              </h1>
              <p style={{ fontFamily: 'Sora', fontSize: 14, color: 'rgba(255,255,255,0.35)' }}>
                Speak or type your encounter narrative. Attestr will structure it into a SOAP note.
              </p>
            </div>

            <div style={{ ...glass.panel, borderRadius: 16, padding: 24, marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 16 }}>
                <span style={{ fontFamily: 'Sora', fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Patient Name
                </span>
                <input
                  type="text"
                  value={patientName}
                  onChange={e => setPatientName(e.target.value)}
                  placeholder="Last, First"
                  style={{
                    display: 'block', width: '100%', marginTop: 6, padding: '10px 14px',
                    borderRadius: 10, fontFamily: 'Sora', fontSize: 14, color: '#f1f5f9',
                    ...glass.base, outline: 'none',
                  }}
                />
              </label>

              <label style={{ display: 'block', marginBottom: 16 }}>
                <span style={{ fontFamily: 'Sora', fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Chief Complaint
                </span>
                <input
                  type="text"
                  value={chiefComplaint}
                  onChange={e => setChiefComplaint(e.target.value)}
                  placeholder="e.g. Chest pain, 3 days"
                  style={{
                    display: 'block', width: '100%', marginTop: 6, padding: '10px 14px',
                    borderRadius: 10, fontFamily: 'Sora', fontSize: 14, color: '#f1f5f9',
                    ...glass.base, outline: 'none',
                  }}
                />
              </label>

              <label style={{ display: 'block', marginBottom: 16 }}>
                <span style={{ fontFamily: 'Sora', fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Date of Service
                </span>
                <input
                  type="date"
                  value={encounterDate}
                  onChange={e => setEncounterDate(e.target.value)}
                  style={{
                    display: 'block', width: '100%', marginTop: 6, padding: '10px 14px',
                    borderRadius: 10, fontFamily: 'Sora', fontSize: 14, color: '#f1f5f9',
                    ...glass.base, outline: 'none', colorScheme: 'dark',
                  }}
                />
              </label>

              <label style={{ display: 'block', marginBottom: 8 }}>
                <span style={{ fontFamily: 'Sora', fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Encounter Narrative
                </span>
                <textarea
                  ref={textareaRef}
                  rows={9}
                  value={transcript}
                  onChange={e => setTranscript(e.target.value)}
                  placeholder="Dictate or type the patient encounter…"
                  style={{
                    display: 'block', width: '100%', marginTop: 6, padding: '12px 14px',
                    borderRadius: 10, fontFamily: 'JetBrains Mono', fontSize: 13, color: '#f1f5f9',
                    resize: 'vertical',
                    ...(isRecording ? glass.active : glass.base),
                    outline: 'none',
                  }}
                />
              </label>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <button
                  onClick={toggleRecording}
                  style={{
                    ...(isRecording ? glass.active : glass.base),
                    width: 44, height: 44, borderRadius: 12, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: isRecording ? '#8b5cf6' : '#f1f5f9', fontSize: 20,
                  }}
                >
                  {isRecording ? '\u23F9' : '\uD83C\uDFA4'}
                </button>
                {isRecording && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2, height: 28 }}>
                    {Array.from({ length: 28 }).map((_, i) => (
                      <div
                        key={i}
                        style={{
                          width: 2.5, height: '100%', borderRadius: 1,
                          background: '#8b5cf6',
                          animation: `waveBar 0.6s ease-in-out ${i * 0.04}s infinite`,
                          transformOrigin: 'center',
                        }}
                      />
                    ))}
                  </div>
                )}
                {!isRecording && (
                  <span style={{ fontFamily: 'Sora', fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>
                    Click to start voice dictation (Chrome/Edge)
                  </span>
                )}
              </div>
            </div>

            {validationHint && (
              <p style={{
                fontFamily: 'Sora', fontSize: 12, color: 'rgba(255,255,255,0.35)',
                textAlign: 'center', marginBottom: 16,
              }}>
                {validationHint}
              </p>
            )}

            <button
              onClick={generateSoap}
              disabled={!canGenerate || isGenerating}
              style={{
                display: 'block', width: '100%', padding: '14px 0', borderRadius: 12,
                fontFamily: 'Sora', fontWeight: 600, fontSize: 15, cursor: canGenerate ? 'pointer' : 'not-allowed',
                border: 'none', color: '#fff',
                background: canGenerate
                  ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                  : 'rgba(255,255,255,0.06)',
                opacity: canGenerate ? 1 : 0.5,
                boxShadow: canGenerate ? '0 4px 20px rgba(99,102,241,0.3)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              Generate SOAP Note
            </button>
          </div>
        )}

        {/* ════════════════ REVIEW SCREEN ════════════════ */}
        {screen === 'review' && soapResult && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontFamily: 'Sora', fontSize: 13, fontWeight: 500, color: '#f1f5f9' }}>
                  Review Progress
                </span>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
                  {approvedCount}/4 approved
                </span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%', borderRadius: 3,
                    width: `${(approvedCount / 4) * 100}%`,
                    background: allApproved
                      ? 'linear-gradient(90deg, #4ade80, #10b981)'
                      : 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
            </div>

            {SECTION_META.map(({ key, badge, label, desc }) => {
              const section = soapResult[key] as SOAPSection
              const state = sections[key]
              const isApproved = state.approval === 'approved' || state.approval === 'edited'
              const content = state.editedContent ?? section.content

              return (
                <div
                  key={key}
                  style={{
                    ...(isApproved ? glass.approved : glass.panel),
                    borderRadius: 16, padding: 20, marginBottom: 16,
                    display: 'flex', gap: 16,
                    transition: 'all 0.3s ease',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, minWidth: 40 }}>
                    <div
                      style={{
                        width: 36, height: 36, borderRadius: 10,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'Sora', fontWeight: 700, fontSize: 16, color: '#fff',
                        background: isApproved
                          ? 'linear-gradient(135deg, #4ade80, #10b981)'
                          : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      }}
                    >
                      {badge}
                    </div>
                    <div
                      style={{
                        width: 4, flex: 1, borderRadius: 2,
                        background: 'rgba(255,255,255,0.06)',
                        position: 'relative', overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute', bottom: 0, width: '100%',
                          height: `${section.confidence * 100}%`,
                          borderRadius: 2,
                          background: confColor(section.confidence),
                          animation: 'confTrack 1s ease-out',
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <h3 style={{ fontFamily: 'Sora', fontWeight: 600, fontSize: 16, color: '#f1f5f9', marginBottom: 2 }}>
                          {label}
                        </h3>
                        <p style={{ fontFamily: 'Sora', fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{desc}</p>
                      </div>
                      <span
                        style={{
                          fontFamily: 'JetBrains Mono', fontSize: 12, fontWeight: 500,
                          color: confColor(section.confidence), whiteSpace: 'nowrap',
                        }}
                      >
                        {Math.round(section.confidence * 100)}% {confLabel(section.confidence)}
                      </span>
                    </div>

                    <div style={{ height: 3, borderRadius: 1.5, background: 'rgba(255,255,255,0.04)', marginBottom: 12, overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%', borderRadius: 1.5,
                          width: `${section.confidence * 100}%`,
                          background: confColor(section.confidence),
                          animation: 'confTrack 1s ease-out',
                        }}
                      />
                    </div>

                    {state.isEditing ? (
                      <textarea
                        rows={6}
                        value={state.editedContent ?? ''}
                        onChange={e => updateEditContent(key, e.target.value)}
                        style={{
                          display: 'block', width: '100%', padding: '10px 12px',
                          borderRadius: 8, fontFamily: 'JetBrains Mono', fontSize: 13,
                          color: '#f1f5f9', resize: 'vertical',
                          ...glass.active, outline: 'none',
                        }}
                      />
                    ) : (
                      <pre
                        style={{
                          fontFamily: 'JetBrains Mono', fontSize: 13, color: '#f1f5f9',
                          whiteSpace: 'pre-wrap', lineHeight: 1.6, margin: 0,
                        }}
                      >
                        {content}
                      </pre>
                    )}

                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      {state.isEditing ? (
                        <button
                          onClick={() => saveEdit(key)}
                          style={{
                            padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
                            fontFamily: 'Sora', fontSize: 12, fontWeight: 500,
                            background: 'linear-gradient(135deg, #4ade80, #10b981)',
                            border: 'none', color: '#fff',
                          }}
                        >
                          Save &amp; Approve
                        </button>
                      ) : (
                        <>
                          {!isApproved && (
                            <button
                              onClick={() => approveSection(key)}
                              style={{
                                padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
                                fontFamily: 'Sora', fontSize: 12, fontWeight: 500,
                                background: 'linear-gradient(135deg, #4ade80, #10b981)',
                                border: 'none', color: '#fff',
                              }}
                            >
                              Approve
                            </button>
                          )}
                          {!isApproved && (
                            <button
                              onClick={() => startEditing(key)}
                              style={{
                                ...glass.base,
                                padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
                                fontFamily: 'Sora', fontSize: 12, fontWeight: 500, color: '#f1f5f9',
                              }}
                            >
                              Edit
                            </button>
                          )}
                          {isApproved && (
                            <span style={{ fontFamily: 'Sora', fontSize: 12, color: '#4ade80', fontWeight: 500 }}>
                              {state.approval === 'edited' ? 'Edited & Approved' : 'Approved'}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            <button
              onClick={copyToEhr}
              disabled={!allApproved}
              style={{
                display: 'block', width: '100%', padding: '14px 0', borderRadius: 12,
                fontFamily: 'Sora', fontWeight: 600, fontSize: 15,
                border: 'none', color: '#fff',
                cursor: allApproved ? 'pointer' : 'not-allowed',
                background: allApproved
                  ? 'linear-gradient(135deg, #4ade80, #10b981)'
                  : 'rgba(255,255,255,0.06)',
                opacity: allApproved ? 1 : 0.5,
                boxShadow: allApproved ? '0 4px 20px rgba(74,222,128,0.3)' : 'none',
                transition: 'all 0.2s ease',
                marginBottom: 16,
              }}
            >
              {copied ? 'Copied!' : allApproved ? 'Copy to EHR' : 'Approve all sections to copy'}
            </button>

            <div style={{ ...glass.base, borderRadius: 12, overflow: 'hidden' }}>
              <button
                onClick={() => setShowFhir(!showFhir)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  width: '100%', padding: '12px 16px', border: 'none', cursor: 'pointer',
                  background: 'transparent', color: 'rgba(255,255,255,0.35)',
                  fontFamily: 'JetBrains Mono', fontSize: 12,
                }}
              >
                <span>FHIR R4 DocumentReference</span>
                <span>{showFhir ? '\u25BC' : '\u25B6'}</span>
              </button>
              {showFhir && (
                <pre
                  style={{
                    padding: '12px 16px', margin: 0,
                    fontFamily: 'JetBrains Mono', fontSize: 11, color: 'rgba(255,255,255,0.35)',
                    whiteSpace: 'pre-wrap', borderTop: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  {JSON.stringify(soapResult.fhir, null, 2)}
                </pre>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

/* ── Web Speech API types ── */
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition
    webkitSpeechRecognition: typeof SpeechRecognition
  }
}
