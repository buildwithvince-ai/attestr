"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
type SOAPSection = { content: string; confidence: number };
type SOAPNote = {
  subjective: SOAPSection;
  objective: SOAPSection;
  assessment: SOAPSection;
  plan: SOAPSection;
  fhir: Record<string, unknown>;
};
type ApprovalState = Record<string, "pending" | "approved" | "edited">;
type EncounterRecord = {
  id: string;
  created_at: string;
  patient_name: string;
  chief_complaint: string;
  encounter_date: string;
  soap_subjective: string;
  soap_objective: string;
  soap_assessment: string;
  soap_plan: string;
  confidence_subjective: number;
  confidence_objective: number;
  confidence_assessment: number;
  confidence_plan: number;
  fhir_document: Record<string, unknown>;
  status: string;
};
type PatientGroup = {
  patient_name: string;
  encounters: EncounterRecord[];
  last_seen: string;
};

/* ─────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────── */
const DEMO_DATA = {
  patientName: "Reyes, Marco",
  chiefComplaint: "Chest pain, 3 days",
  encounterDate: new Date().toISOString().split("T")[0],
  transcript:
    "35-year-old male presents with a 3-day history of sharp chest pain radiating to the left arm. Pain is 6 out of 10, worse on exertion, relieved by rest. No fever, no cough. Patient has a history of hypertension managed with lisinopril 10mg daily. Vitals: BP 138 over 84, HR 91, RR 16, Temp 98.6, O2 sat 97% on room air. EKG shows normal sinus rhythm, no ST changes. Lungs clear to auscultation bilaterally. Heart sounds regular, no murmurs. Plan to order troponin, BMP, chest X-ray, and cardiology consult. Advised patient to avoid strenuous activity pending results.",
};

const SOAP_LABELS: Record<string, string> = {
  subjective: "Subjective",
  objective: "Objective",
  assessment: "Assessment",
  plan: "Plan",
};
const SOAP_DESC: Record<string, string> = {
  subjective: "Patient's reported symptoms & history",
  objective: "Measurable findings & vitals",
  assessment: "Diagnosis or clinical impression",
  plan: "Treatment, orders & follow-up",
};

/* ─────────────────────────────────────────────
   PEN WRITING ANIMATION
───────────────────────────────────────────── */
function PenWritingAnimation() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <style>{`
          @keyframes nibTravel {
            0%   { offset-distance: 0%; }
            100% { offset-distance: 100%; }
          }
          @keyframes inkDraw1 {
            0%,10%   { stroke-dashoffset: 44; }
            35%,100% { stroke-dashoffset: 0; }
          }
          @keyframes inkDraw2 {
            0%,35%   { stroke-dashoffset: 38; }
            60%,100% { stroke-dashoffset: 0; }
          }
          @keyframes inkDraw3 {
            0%,60%   { stroke-dashoffset: 30; }
            85%,100% { stroke-dashoffset: 0; }
          }
          @keyframes inkFade {
            0%,80% { opacity:1; }
            100%   { opacity:0.3; }
          }
          @keyframes penBob {
            0%,100% { transform: translate(0px,0px) rotate(-38deg); }
            25%     { transform: translate(14px,2px) rotate(-38deg); }
            50%     { transform: translate(8px,10px) rotate(-38deg); }
            75%     { transform: translate(16px,10px) rotate(-38deg); }
          }
          @keyframes glowPulse {
            0%,100% { opacity:0.5; }
            50%     { opacity:1; }
          }
          .pen-group {
            animation: penBob 2.4s cubic-bezier(0.4,0,0.6,1) infinite;
            transform-origin: 20px 48px;
          }
          .ink-line-1 { stroke-dasharray:44; stroke-dashoffset:44; animation: inkDraw1 2.4s ease-in-out infinite, inkFade 2.4s ease-in-out infinite; }
          .ink-line-2 { stroke-dasharray:38; stroke-dashoffset:38; animation: inkDraw2 2.4s ease-in-out infinite, inkFade 2.4s ease-in-out infinite; }
          .ink-line-3 { stroke-dasharray:30; stroke-dashoffset:30; animation: inkDraw3 2.4s ease-in-out infinite, inkFade 2.4s ease-in-out infinite; }
          .nib-glow   { animation: glowPulse 1.2s ease-in-out infinite; }
        `}</style>
        <filter id="nibGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="pageGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <rect x="8" y="6" width="40" height="52" rx="4" fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.18)" strokeWidth="1" filter="url(#pageGlow)"/>
      <rect x="8" y="6" width="40" height="4" rx="4" fill="rgba(255,255,255,0.12)"/>
      <line className="ink-line-1" x1="16" y1="22" x2="40" y2="22" stroke="rgba(129,140,248,0.95)" strokeWidth="2" strokeLinecap="round"/>
      <line className="ink-line-2" x1="16" y1="32" x2="38" y2="32" stroke="rgba(129,140,248,0.85)" strokeWidth="2" strokeLinecap="round"/>
      <line className="ink-line-3" x1="16" y1="42" x2="34" y2="42" stroke="rgba(129,140,248,0.75)" strokeWidth="2" strokeLinecap="round"/>
      <g className="pen-group">
        <path d="M18 46 L28 16 L32 16 L22 46 Z" fill="rgba(255,255,255,0.9)" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5"/>
        <path d="M19.5 46 L29 18 L30 18 L20.5 46 Z" fill="rgba(255,255,255,0.4)"/>
        <path d="M18 46 L22 46 L20.5 50 L17.5 50 Z" fill="rgba(200,210,255,0.85)"/>
        <path d="M17.5 50 L20.5 50 L19 54 Z" fill="rgba(129,140,248,1)" filter="url(#nibGlow)"/>
        <circle className="nib-glow" cx="19" cy="53.5" r="1.5" fill="rgba(167,139,250,0.9)" filter="url(#nibGlow)"/>
        <rect x="29.5" y="14" width="2" height="28" rx="1" fill="rgba(180,190,255,0.6)"/>
        <rect x="27.5" y="13" width="6" height="4" rx="1.5" fill="rgba(255,255,255,0.7)"/>
      </g>
    </svg>
  );
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function Attestr() {
  // Screen: input | review | history | note-view
  const [screen, setScreen] = useState<"input" | "review" | "history" | "note-view">("input");

  // Input state
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [patientName, setPatientName] = useState("");
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [encounterDate, setEncounterDate] = useState("");
  const [audioLevel, setAudioLevel] = useState(0);
  const [demoLoading, setDemoLoading] = useState(false);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");

  // Review state
  const [soapNote, setSoapNote] = useState<SOAPNote | null>(null);
  const [approvals, setApprovals] = useState<ApprovalState>({});
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState<Record<string, string>>({});
  const [showFHIR, setShowFHIR] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // History state
  const [encounters, setEncounters] = useState<EncounterRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [viewingEncounter, setViewingEncounter] = useState<EncounterRecord | null>(null);

  const recognitionRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    setEncounterDate(new Date().toISOString().split("T")[0]);
  }, []);

  useEffect(() => {
    if (isListening) {
      const animate = () => { setAudioLevel(Math.random() * 100); animFrameRef.current = requestAnimationFrame(animate); };
      animFrameRef.current = requestAnimationFrame(animate);
    } else {
      setAudioLevel(0);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    }
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [isListening]);

  // Load encounters when history screen opens
  useEffect(() => {
    if (screen === "history") fetchEncounters();
  }, [screen]);

  const fetchEncounters = async () => {
    setHistoryLoading(true);
    const { data, error } = await supabase
      .from("attestr_encounters")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setEncounters(data);
    setHistoryLoading(false);
  };

  // Group encounters by patient
  const patientGroups: PatientGroup[] = Object.values(
    encounters.reduce((acc, enc) => {
      if (!acc[enc.patient_name]) {
        acc[enc.patient_name] = { patient_name: enc.patient_name, encounters: [], last_seen: enc.encounter_date };
      }
      acc[enc.patient_name].encounters.push(enc);
      return acc;
    }, {} as Record<string, PatientGroup>)
  );

  const loadDemo = () => {
    setDemoLoading(true);
    setPatientName(""); setChiefComplaint(""); setTranscript("");
    setTimeout(() => {
      setPatientName(DEMO_DATA.patientName);
      setChiefComplaint(DEMO_DATA.chiefComplaint);
      setEncounterDate(DEMO_DATA.encounterDate);
    }, 300);
    let i = 0;
    const text = DEMO_DATA.transcript;
    const iv = setInterval(() => {
      i += 7; setTranscript(text.slice(0, i));
      if (i >= text.length) { setTranscript(text); clearInterval(iv); setDemoLoading(false); }
    }, 16);
  };

  const startListening = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Voice input requires Chrome or Edge."); return; }
    const r = new SR();
    r.continuous = true; r.interimResults = true; r.lang = "en-US";
    r.onresult = (e: any) => {
      let fin = ""; let intr = "";
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) fin += e.results[i][0].transcript + " ";
        else intr += e.results[i][0].transcript;
      }
      if (fin) setTranscript(p => p + fin);
      setInterimText(intr);
    };
    r.onerror = () => stopListening();
    r.onend = () => setIsListening(false);
    recognitionRef.current = r;
    r.start();
    setIsListening(true);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
    setInterimText("");
  };

  const clearAll = () => {
    setTranscript(""); setInterimText(""); setPatientName("");
    setChiefComplaint(""); setGenerateError("");
    setEncounterDate(new Date().toISOString().split("T")[0]);
  };

  const generateSOAP = async () => {
    setGenerating(true); setGenerateError("");
    try {
      const res = await fetch("/api/generate-soap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ narrative: transcript, patientName, chiefComplaint, encounterDate }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Generation failed.");
      setSoapNote(data);
      setApprovals({ subjective: "pending", objective: "pending", assessment: "pending", plan: "pending" });
      setEditedContent({
        subjective: data.subjective.content,
        objective: data.objective.content,
        assessment: data.assessment.content,
        plan: data.plan.content,
      });
      setScreen("review");
    } catch (err: any) {
      setGenerateError(err.message || "Something went wrong.");
    } finally {
      setGenerating(false);
    }
  };

  const approveSection = (s: string) => { setApprovals(p => ({ ...p, [s]: "approved" })); setEditingSection(null); };
  const saveEdit = (s: string) => { setApprovals(p => ({ ...p, [s]: "edited" })); setEditingSection(null); };

  const allApproved = soapNote && Object.values(approvals).every(s => s !== "pending");
  const approvedCount = Object.values(approvals).filter(s => s !== "pending").length;

  const saveToSupabase = async () => {
    if (!soapNote) return;
    setSaving(true); setSaveError("");
    try {
      const { error } = await supabase.from("attestr_encounters").insert({
        patient_name: patientName,
        chief_complaint: chiefComplaint,
        encounter_date: encounterDate,
        narrative: transcript,
        soap_subjective: editedContent.subjective,
        soap_objective: editedContent.objective,
        soap_assessment: editedContent.assessment,
        soap_plan: editedContent.plan,
        confidence_subjective: soapNote.subjective.confidence,
        confidence_objective: soapNote.objective.confidence,
        confidence_assessment: soapNote.assessment.confidence,
        confidence_plan: soapNote.plan.confidence,
        fhir_document: soapNote.fhir,
        status: "approved",
      });
      if (error) throw new Error(error.message);
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const buildNote = () => !soapNote ? "" :
    `SOAP NOTE — ${patientName}\nDate: ${encounterDate}\nChief Complaint: ${chiefComplaint}\n\nSUBJECTIVE:\n${editedContent.subjective}\n\nOBJECTIVE:\n${editedContent.objective}\n\nASSESSMENT:\n${editedContent.assessment}\n\nPLAN:\n${editedContent.plan}\n\n---\nGenerated by Attestr · AI-drafted. Physician-approved.`;

  const copyNote = async () => {
    navigator.clipboard.writeText(buildNote());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    await saveToSupabase();
  };

  const confColor = (c: number) => c >= 0.8 ? "#4ade80" : c >= 0.6 ? "#fbbf24" : "#f87171";
  const confLabel = (c: number) => c >= 0.8 ? "High confidence" : c >= 0.6 ? "Review recommended" : "Verify carefully";
  const canGenerate = transcript.trim().length > 20 && patientName.trim().length > 0;

  const WaveBar = ({ h }: { h: number }) => (
    <div style={{
      width: "3px", borderRadius: "2px",
      background: isListening ? "rgba(139,92,246,0.85)" : "rgba(255,255,255,0.06)",
      height: isListening ? `${Math.max(5, (audioLevel * h) / 100)}px` : "5px",
      transition: "height 0.07s ease",
    }} />
  );

  /* ── CSS ── */
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
    *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }

    .lg-base {
      background: linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02));
      backdrop-filter: blur(20px) saturate(150%) brightness(1.05);
      -webkit-backdrop-filter: blur(20px) saturate(150%) brightness(1.05);
      border: 1px solid rgba(255,255,255,0.07);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.15), 0 8px 32px rgba(0,0,0,0.35);
    }
    .lg-panel {
      background: linear-gradient(160deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.02) 60%, rgba(139,92,246,0.015) 100%);
      backdrop-filter: blur(32px) saturate(180%) brightness(1.08);
      -webkit-backdrop-filter: blur(32px) saturate(180%) brightness(1.08);
      border: 1px solid rgba(255,255,255,0.09);
      box-shadow: inset 0 1.5px 0 rgba(255,255,255,0.13), inset 0 -1px 0 rgba(0,0,0,0.18), 0 12px 40px rgba(0,0,0,0.4);
    }
    .lg-strong {
      background: linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03));
      backdrop-filter: blur(48px) saturate(200%) brightness(1.1);
      -webkit-backdrop-filter: blur(48px) saturate(200%) brightness(1.1);
      border-bottom: 1px solid rgba(255,255,255,0.1);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.18), 0 16px 48px rgba(0,0,0,0.5);
    }
    .lg-active {
      background: linear-gradient(135deg, rgba(139,92,246,0.08), rgba(99,102,241,0.04));
      backdrop-filter: blur(32px) saturate(180%);
      -webkit-backdrop-filter: blur(32px) saturate(180%);
      border: 1px solid rgba(139,92,246,0.28);
      box-shadow: inset 0 1.5px 0 rgba(167,139,250,0.2), 0 0 32px rgba(139,92,246,0.08);
    }
    .lg-approved {
      background: linear-gradient(135deg, rgba(74,222,128,0.06), rgba(16,185,129,0.03));
      backdrop-filter: blur(32px) saturate(160%);
      -webkit-backdrop-filter: blur(32px) saturate(160%);
      border: 1px solid rgba(74,222,128,0.22);
      box-shadow: inset 0 1.5px 0 rgba(74,222,128,0.15), 0 0 20px rgba(74,222,128,0.04);
    }
    .lg-warning {
      background: linear-gradient(135deg, rgba(251,191,36,0.06), rgba(245,158,11,0.03));
      backdrop-filter: blur(20px) saturate(150%);
      -webkit-backdrop-filter: blur(20px) saturate(150%);
      border: 1px solid rgba(251,191,36,0.2);
      box-shadow: inset 0 1px 0 rgba(251,191,36,0.1), 0 4px 16px rgba(0,0,0,0.3);
    }

    input, textarea {
      background: rgba(255,255,255,0.035);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 10px; padding: 11px 14px;
      color: rgba(241,245,249,0.9);
      font-family: 'JetBrains Mono', monospace; font-size: 13px;
      width: 100%; outline: none; resize: none; transition: all 0.2s ease;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), inset 0 2px 8px rgba(0,0,0,0.2);
    }
    input:focus, textarea:focus {
      background: rgba(255,255,255,0.055);
      border-color: rgba(139,92,246,0.45);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 0 0 3px rgba(139,92,246,0.1), 0 0 24px rgba(139,92,246,0.06);
    }
    input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.18); }
    input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.45) brightness(1.2); cursor:pointer; }

    label { display:block; font-size:10px; font-weight:600; letter-spacing:0.1em; text-transform:uppercase; color:rgba(255,255,255,0.3); margin-bottom:6px; font-family:'Sora',system-ui,sans-serif; }

    .btn-primary { font-family:'Sora',system-ui,sans-serif; font-size:14px; font-weight:600; color:#fff; border:none; border-radius:12px; padding:15px 28px; cursor:pointer; width:100%; transition:all 0.25s ease; position:relative; overflow:hidden; background:linear-gradient(135deg,rgba(99,102,241,0.95),rgba(139,92,246,0.95)); border:1px solid rgba(167,139,250,0.35); box-shadow:inset 0 1px 0 rgba(255,255,255,0.22), 0 4px 24px rgba(99,102,241,0.35); }
    .btn-primary::before { content:''; position:absolute; top:0; left:0; right:0; height:50%; background:linear-gradient(180deg,rgba(255,255,255,0.12),transparent); border-radius:12px 12px 0 0; pointer-events:none; }
    .btn-primary:hover:not(:disabled) { transform:translateY(-1px); box-shadow:inset 0 1px 0 rgba(255,255,255,0.25), 0 8px 40px rgba(99,102,241,0.5); }
    .btn-primary:disabled { background:rgba(255,255,255,0.04); border-color:rgba(255,255,255,0.06); color:rgba(255,255,255,0.2); cursor:not-allowed; box-shadow:inset 0 1px 0 rgba(255,255,255,0.04); }
    .btn-primary:disabled::before { display:none; }

    .btn-success { font-family:'Sora',system-ui,sans-serif; font-size:14px; font-weight:600; color:#fff; border-radius:12px; padding:15px 28px; cursor:pointer; width:100%; transition:all 0.25s ease; position:relative; overflow:hidden; background:linear-gradient(135deg,rgba(5,150,105,0.95),rgba(16,185,129,0.95)); border:1px solid rgba(52,211,153,0.35); box-shadow:inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 24px rgba(16,185,129,0.3); }
    .btn-success::before { content:''; position:absolute; top:0; left:0; right:0; height:50%; background:linear-gradient(180deg,rgba(255,255,255,0.12),transparent); border-radius:12px 12px 0 0; pointer-events:none; }
    .btn-success:hover:not(:disabled) { transform:translateY(-1px); box-shadow:inset 0 1px 0 rgba(255,255,255,0.22), 0 8px 40px rgba(16,185,129,0.45); }
    .btn-success:disabled { background:rgba(255,255,255,0.04); border-color:rgba(255,255,255,0.06); color:rgba(255,255,255,0.2); cursor:not-allowed; }

    .btn-ghost { font-family:'Sora',system-ui,sans-serif; font-size:12px; font-weight:500; color:rgba(255,255,255,0.45); background:rgba(255,255,255,0.04); backdrop-filter:blur(16px); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:7px 14px; cursor:pointer; transition:all 0.2s ease; display:flex; align-items:center; gap:6px; box-shadow:inset 0 1px 0 rgba(255,255,255,0.07); }
    .btn-ghost:hover { background:rgba(139,92,246,0.1); border-color:rgba(139,92,246,0.28); color:rgba(167,139,250,0.95); }

    .btn-approve { font-family:'Sora',system-ui,sans-serif; font-size:12px; font-weight:500; color:#4ade80; background:rgba(74,222,128,0.08); backdrop-filter:blur(8px); border:1px solid rgba(74,222,128,0.22); border-radius:8px; padding:6px 14px; cursor:pointer; transition:all 0.2s ease; box-shadow:inset 0 1px 0 rgba(74,222,128,0.1); }
    .btn-approve:hover { background:rgba(74,222,128,0.15); }

    .btn-edit-inline { font-family:'Sora',system-ui,sans-serif; font-size:12px; font-weight:500; color:rgba(255,255,255,0.35); background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.07); border-radius:8px; padding:6px 14px; cursor:pointer; transition:all 0.2s ease; }
    .btn-edit-inline:hover { border-color:rgba(139,92,246,0.28); color:rgba(167,139,250,0.9); background:rgba(139,92,246,0.07); }

    .btn-clear { font-family:'Sora',system-ui,sans-serif; font-size:11px; color:rgba(255,255,255,0.25); background:transparent; border:1px solid rgba(255,255,255,0.07); border-radius:5px; padding:3px 9px; cursor:pointer; transition:all 0.15s; }
    .btn-clear:hover { border-color:rgba(248,113,113,0.35); color:#f87171; }

    .btn-history { font-family:'Sora',system-ui,sans-serif; font-size:12px; font-weight:500; color:rgba(255,255,255,0.45); background:rgba(255,255,255,0.04); backdrop-filter:blur(16px); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:7px 14px; cursor:pointer; transition:all 0.2s ease; display:flex; align-items:center; gap:6px; box-shadow:inset 0 1px 0 rgba(255,255,255,0.07); }
    .btn-history:hover { background:rgba(139,92,246,0.1); border-color:rgba(139,92,246,0.28); color:rgba(167,139,250,0.95); }

    .mic-btn { width:44px; height:44px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0; transition:all 0.2s ease; background:rgba(255,255,255,0.05); border:1.5px solid rgba(255,255,255,0.1); box-shadow:inset 0 1px 0 rgba(255,255,255,0.1); }
    .mic-btn:hover { transform:scale(1.06); background:rgba(255,255,255,0.08); }
    .mic-btn.recording { background:rgba(139,92,246,0.14); border-color:rgba(139,92,246,0.45); animation:recPulse 1.4s ease-out infinite; }

    .encounter-row { transition:all 0.2s ease; cursor:pointer; }
    .encounter-row:hover { background:rgba(139,92,246,0.06) !important; border-color:rgba(139,92,246,0.2) !important; }

    .patient-row { transition:all 0.2s ease; cursor:pointer; }
    .patient-row:hover { background:rgba(255,255,255,0.03) !important; }

    @keyframes recPulse {
      0%   { box-shadow: inset 0 1px 0 rgba(167,139,250,0.2), 0 0 0 0 rgba(139,92,246,0.5); }
      70%  { box-shadow: inset 0 1px 0 rgba(167,139,250,0.2), 0 0 0 10px rgba(139,92,246,0); }
      100% { box-shadow: inset 0 1px 0 rgba(167,139,250,0.2), 0 0 0 0 rgba(139,92,246,0); }
    }
    @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
    .fade-up { animation:fadeUp 0.45s cubic-bezier(0.2,0,0.3,1) forwards; }
    @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.12} }
    .blink { animation:blink 1.1s ease-in-out infinite; }
    @keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(200%)} }
    @keyframes floatOrb1 { 0%,100%{transform:translateY(0px) scale(1)} 50%{transform:translateY(-30px) scale(1.05)} }
    @keyframes floatOrb2 { 0%,100%{transform:translateY(0px) scale(1)} 50%{transform:translateY(20px) scale(0.97)} }
    @keyframes floatOrb3 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(20px,-15px) scale(1.04)} 66%{transform:translate(-15px,10px) scale(0.98)} }
    @keyframes glowRing { 0%,100%{transform:scale(1);opacity:0.6} 50%{transform:scale(1.15);opacity:1} }
    ::-webkit-scrollbar{width:3px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.07);border-radius:2px}
  `;

  /* ── Background ── */
  const BgScene = () => (
    <>
      <div style={{ position:"fixed", inset:0, zIndex:0, background:"radial-gradient(ellipse 80% 60% at 20% 10%, rgba(99,102,241,0.14) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 80%, rgba(16,185,129,0.08) 0%, transparent 60%), #060a14" }}/>
      <div style={{ position:"fixed", width:"700px", height:"700px", top:"-200px", left:"-150px", borderRadius:"50%", background:"rgba(99,102,241,0.09)", filter:"blur(100px)", zIndex:0, animation:"floatOrb1 14s ease-in-out infinite" }}/>
      <div style={{ position:"fixed", width:"500px", height:"500px", bottom:"-150px", right:"-100px", borderRadius:"50%", background:"rgba(16,185,129,0.07)", filter:"blur(90px)", zIndex:0, animation:"floatOrb2 18s ease-in-out infinite" }}/>
      <div style={{ position:"fixed", width:"350px", height:"350px", top:"45%", left:"55%", borderRadius:"50%", background:"rgba(139,92,246,0.06)", filter:"blur(70px)", zIndex:0, animation:"floatOrb3 22s ease-in-out infinite" }}/>
    </>
  );

  /* ── Header ── */
  const Header = ({ extra }: { extra?: React.ReactNode }) => (
    <header className="lg-strong" style={{ padding:"15px 28px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:50, borderLeft:"none", borderRight:"none", borderTop:"none", borderRadius:0 }}>
      <div style={{ display:"flex", alignItems:"center", gap:"11px" }}>
        <div style={{ position:"relative", width:"36px", height:"36px" }}>
          <div style={{ position:"absolute", inset:0, borderRadius:"10px", background:"linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow:"inset 0 1px 0 rgba(255,255,255,0.25), 0 0 28px rgba(99,102,241,0.45)" }}/>
          <div style={{ position:"absolute", inset:0, borderRadius:"10px", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M9 12h6M9 16h6M9 8h4M5 20h14a2 2 0 002-2V8l-5-5H5a2 2 0 00-2 2v13a2 2 0 002 2z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
        <div>
          <div style={{ fontSize:"15px", fontWeight:700, letterSpacing:"-0.04em", color:"#f1f5f9", fontFamily:"'Sora',system-ui,sans-serif" }}>Attestr</div>
          <div style={{ fontSize:"10px", color:"rgba(255,255,255,0.28)", letterSpacing:"0.06em", fontFamily:"'Sora',system-ui,sans-serif", fontWeight:500 }}>AI CLINICAL DOCUMENTATION</div>
        </div>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
        {extra}
        <div className="lg-base" style={{ display:"flex", alignItems:"center", gap:"6px", borderRadius:"20px", padding:"5px 11px" }}>
          <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:"#4ade80", boxShadow:"0 0 8px rgba(74,222,128,0.7)" }}/>
          <span style={{ fontSize:"10.5px", color:"rgba(255,255,255,0.38)", fontFamily:"'JetBrains Mono',monospace" }}>FHIR R4</span>
        </div>
      </div>
    </header>
  );

  /* ── Disclaimer Banner ── */
  const Disclaimer = () => (
    <div className="lg-warning" style={{ borderRadius:"12px", padding:"12px 16px", marginBottom:"16px", display:"flex", gap:"10px", alignItems:"flex-start" }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flexShrink:0, marginTop:"1px" }}>
        <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="rgba(251,191,36,0.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <p style={{ fontSize:"12.5px", color:"rgba(251,191,36,0.75)", lineHeight:1.6, fontFamily:"'Sora',system-ui,sans-serif" }}>
        <strong style={{ fontWeight:600, color:"rgba(251,191,36,0.9)" }}>Clinical Disclaimer —</strong>{" "}
        Attestr is a documentation assistant only. All AI-generated content must be reviewed and approved by a licensed physician before use in any clinical record. Do not enter real patient identifiers — use initials or anonymised references only.
      </p>
    </div>
  );

  /* ── Voice Divider ── */
  const VoiceDivider = () => (
    <div style={{ display:"flex", alignItems:"center", gap:"14px", margin:"16px 0" }}>
      <div style={{ flex:1, height:"1px", background:"linear-gradient(90deg, transparent, rgba(255,255,255,0.08))" }}/>
      <span style={{ fontSize:"11.5px", color:"rgba(255,255,255,0.28)", fontFamily:"'Sora',system-ui,sans-serif", whiteSpace:"nowrap", display:"flex", alignItems:"center", gap:"6px" }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" stroke="rgba(139,92,246,0.6)" strokeWidth="1.5"/>
          <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" stroke="rgba(139,92,246,0.6)" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        or use voice input below if more convenient
      </span>
      <div style={{ flex:1, height:"1px", background:"linear-gradient(90deg, rgba(255,255,255,0.08), transparent)" }}/>
    </div>
  );

  /* ═══════════════════════════════════════
     GENERATING OVERLAY
  ═══════════════════════════════════════ */
  if (generating) return (
    <div style={{ minHeight:"100vh", fontFamily:"'Sora',system-ui,sans-serif", color:"#e2e8f0", display:"flex", alignItems:"center", justifyContent:"center", position:"relative", overflow:"hidden" }}>
      <style>{css}</style>
      <BgScene />
      <div className="lg-panel fade-up" style={{ borderRadius:"28px", padding:"52px 60px", textAlign:"center", maxWidth:"380px", width:"calc(100% - 48px)", position:"relative", zIndex:1 }}>
        <div style={{ position:"absolute", top:0, left:"15%", right:"15%", height:"1px", background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)" }}/>
        <div style={{ display:"flex", justifyContent:"center", marginBottom:"28px" }}>
          <div style={{ position:"relative", width:"80px", height:"80px", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <div style={{ position:"absolute", inset:"-4px", borderRadius:"50%", background:"radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)", animation:"glowRing 2s ease-in-out infinite" }}/>
            <div className="lg-panel" style={{ position:"absolute", inset:0, borderRadius:"50%", background:"rgba(139,92,246,0.08)" }}/>
            <PenWritingAnimation />
          </div>
        </div>
        <div style={{ fontSize:"19px", fontWeight:700, color:"#f1f5f9", marginBottom:"8px", letterSpacing:"-0.03em" }}>Generating SOAP Note</div>
        <div style={{ fontSize:"13px", color:"rgba(255,255,255,0.38)", lineHeight:1.65 }}>Structuring your encounter narrative with Gemini 1.5 Flash…</div>
        <div style={{ marginTop:"32px", height:"3px", borderRadius:"2px", background:"rgba(255,255,255,0.05)", overflow:"hidden", position:"relative" }}>
          <div style={{ position:"absolute", top:0, bottom:0, width:"40%", background:"linear-gradient(90deg,transparent,rgba(139,92,246,0.9),rgba(167,139,250,1),rgba(139,92,246,0.9),transparent)", animation:"shimmer 1.8s ease-in-out infinite", borderRadius:"2px" }}/>
        </div>
        <div style={{ marginTop:"20px", display:"flex", alignItems:"center", justifyContent:"center", gap:"8px" }}>
          <div className="blink" style={{ width:"5px", height:"5px", borderRadius:"50%", background:"rgba(139,92,246,0.85)" }}/>
          <span style={{ fontSize:"10.5px", color:"rgba(255,255,255,0.25)", fontFamily:"'JetBrains Mono',monospace", letterSpacing:"0.06em" }}>FHIR · SOAP · CONFIDENCE SCORING</span>
          <div className="blink" style={{ width:"5px", height:"5px", borderRadius:"50%", background:"rgba(139,92,246,0.85)", animationDelay:"0.5s" }}/>
        </div>
      </div>
    </div>
  );

  /* ═══════════════════════════════════════
     HISTORY SCREEN
  ═══════════════════════════════════════ */
  if (screen === "history") return (
    <div style={{ minHeight:"100vh", fontFamily:"'Sora',system-ui,sans-serif", color:"#e2e8f0", display:"flex", flexDirection:"column", position:"relative", overflow:"hidden" }}>
      <style>{css}</style>
      <BgScene />
      <Header extra={
        <button className="btn-ghost" onClick={() => { setSelectedPatient(null); setScreen("input"); }}>
          ← New Encounter
        </button>
      }/>

      <main style={{ flex:1, maxWidth:"820px", width:"100%", margin:"0 auto", padding:"44px 24px 64px", position:"relative", zIndex:1 }}>

        {/* Heading */}
        <div className="fade-up" style={{ marginBottom:"32px" }}>
          <div style={{ fontSize:"10.5px", fontWeight:600, letterSpacing:"0.12em", textTransform:"uppercase", color:"rgba(139,92,246,0.8)", marginBottom:"8px", fontFamily:"'JetBrains Mono',monospace" }}>
            {selectedPatient ? "Patient Timeline" : "Encounter History"}
          </div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <h1 style={{ fontSize:"28px", fontWeight:700, letterSpacing:"-0.04em", color:"#f1f5f9" }}>
              {selectedPatient || "All Patients"}
            </h1>
            {selectedPatient && (
              <button className="btn-ghost" onClick={() => setSelectedPatient(null)}>
                ← All Patients
              </button>
            )}
          </div>
        </div>

        {historyLoading ? (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"80px 0", gap:"12px" }}>
            <PenWritingAnimation />
            <span style={{ fontSize:"14px", color:"rgba(255,255,255,0.3)" }}>Loading encounters…</span>
          </div>
        ) : encounters.length === 0 ? (
          <div className="lg-panel" style={{ borderRadius:"18px", padding:"48px", textAlign:"center" }}>
            <div style={{ fontSize:"14px", color:"rgba(255,255,255,0.3)", lineHeight:1.7 }}>
              No encounters yet.<br/>Generate and approve your first SOAP note to see it here.
            </div>
          </div>
        ) : !selectedPatient ? (
          /* ── Patient List ── */
          <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
            {patientGroups.map((group, idx) => (
              <div
                key={group.patient_name}
                className="lg-panel patient-row fade-up"
                style={{ borderRadius:"16px", padding:"18px 22px", display:"flex", alignItems:"center", justifyContent:"space-between", animationDelay:`${idx * 60}ms`, position:"relative" }}
                onClick={() => setSelectedPatient(group.patient_name)}
              >
                <div style={{ position:"absolute", top:0, left:"8%", right:"8%", height:"1px", background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.1),transparent)" }}/>
                <div style={{ display:"flex", alignItems:"center", gap:"14px" }}>
                  <div style={{ width:"40px", height:"40px", borderRadius:"50%", background:"linear-gradient(135deg,rgba(99,102,241,0.2),rgba(139,92,246,0.2))", border:"1px solid rgba(139,92,246,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"14px", fontWeight:700, color:"rgba(139,92,246,0.9)", fontFamily:"'JetBrains Mono',monospace", boxShadow:"inset 0 1px 0 rgba(255,255,255,0.1)" }}>
                    {group.patient_name.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontSize:"14px", fontWeight:600, color:"#f1f5f9", letterSpacing:"-0.02em" }}>{group.patient_name}</div>
                    <div style={{ fontSize:"11.5px", color:"rgba(255,255,255,0.3)", marginTop:"2px", fontFamily:"'JetBrains Mono',monospace" }}>
                      Last seen: {group.encounters[0]?.encounter_date || "—"}
                    </div>
                  </div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
                  <div className="lg-base" style={{ borderRadius:"20px", padding:"4px 12px", border:"none" }}>
                    <span style={{ fontSize:"11.5px", color:"rgba(255,255,255,0.4)", fontFamily:"'JetBrains Mono',monospace" }}>
                      {group.encounters.length} {group.encounters.length === 1 ? "encounter" : "encounters"}
                    </span>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M9 18l6-6-6-6" stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ── Patient Timeline ── */
          <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
            {encounters
              .filter(e => e.patient_name === selectedPatient)
              .map((enc, idx) => (
                <div
                  key={enc.id}
                  className="lg-panel encounter-row fade-up"
                  style={{ borderRadius:"16px", padding:"18px 22px", position:"relative", animationDelay:`${idx * 60}ms` }}
                  onClick={() => { setViewingEncounter(enc); setScreen("note-view"); }}
                >
                  <div style={{ position:"absolute", top:0, left:"8%", right:"8%", height:"1px", background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.1),transparent)" }}/>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <div>
                      <div style={{ fontSize:"13.5px", fontWeight:600, color:"#f1f5f9", letterSpacing:"-0.02em" }}>{enc.chief_complaint || "No chief complaint"}</div>
                      <div style={{ fontSize:"11.5px", color:"rgba(255,255,255,0.3)", marginTop:"3px", fontFamily:"'JetBrains Mono',monospace" }}>{enc.encounter_date}</div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:"5px", background:"rgba(74,222,128,0.07)", border:"1px solid rgba(74,222,128,0.18)", borderRadius:"20px", padding:"3px 10px" }}>
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        <span style={{ fontSize:"10.5px", color:"#4ade80", fontWeight:600 }}>Approved</span>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M9 18l6-6-6-6" stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                  {/* Mini confidence bars */}
                  <div style={{ display:"flex", gap:"6px", marginTop:"12px" }}>
                    {[
                      { label:"S", c: enc.confidence_subjective },
                      { label:"O", c: enc.confidence_objective },
                      { label:"A", c: enc.confidence_assessment },
                      { label:"P", c: enc.confidence_plan },
                    ].map(({ label, c }) => (
                      <div key={label} style={{ display:"flex", alignItems:"center", gap:"4px" }}>
                        <span style={{ fontSize:"9px", color:"rgba(255,255,255,0.25)", fontFamily:"'JetBrains Mono',monospace" }}>{label}</span>
                        <div style={{ width:"32px", height:"2px", background:"rgba(255,255,255,0.06)", borderRadius:"1px", overflow:"hidden" }}>
                          <div style={{ height:"100%", width:`${c * 100}%`, background:confColor(c), borderRadius:"1px" }}/>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </main>
    </div>
  );

  /* ═══════════════════════════════════════
     NOTE VIEW SCREEN (read-only)
  ═══════════════════════════════════════ */
  if (screen === "note-view" && viewingEncounter) {
    const enc = viewingEncounter;
    return (
      <div style={{ minHeight:"100vh", fontFamily:"'Sora',system-ui,sans-serif", color:"#e2e8f0", display:"flex", flexDirection:"column", position:"relative", overflow:"hidden" }}>
        <style>{css}</style>
        <BgScene />
        <Header extra={
          <button className="btn-ghost" onClick={() => setScreen("history")}>
            ← Back to History
          </button>
        }/>
        <main style={{ flex:1, maxWidth:"820px", width:"100%", margin:"0 auto", padding:"44px 24px 64px", position:"relative", zIndex:1 }}>
          <div className="fade-up" style={{ marginBottom:"28px" }}>
            <div style={{ fontSize:"10.5px", fontWeight:600, letterSpacing:"0.12em", textTransform:"uppercase", color:"rgba(139,92,246,0.8)", marginBottom:"8px", fontFamily:"'JetBrains Mono',monospace" }}>Approved SOAP Note</div>
            <h1 style={{ fontSize:"24px", fontWeight:700, letterSpacing:"-0.04em", color:"#f1f5f9" }}>{enc.patient_name}</h1>
            <p style={{ fontSize:"12.5px", color:"rgba(255,255,255,0.3)", marginTop:"4px", fontFamily:"'JetBrains Mono',monospace" }}>{enc.chief_complaint} · {enc.encounter_date}</p>
          </div>

          {(["subjective","objective","assessment","plan"] as const).map((section, idx) => {
            const contentKey = `soap_${section}` as keyof EncounterRecord;
            const confKey = `confidence_${section}` as keyof EncounterRecord;
            const content = enc[contentKey] as string;
            const conf = enc[confKey] as number;
            return (
              <div key={section} className="lg-approved fade-up" style={{ borderRadius:"16px", padding:"20px 22px", marginBottom:"12px", animationDelay:`${idx * 70}ms`, position:"relative" }}>
                <div style={{ position:"absolute", top:0, left:"8%", right:"8%", height:"1px", background:"linear-gradient(90deg,transparent,rgba(74,222,128,0.15),transparent)" }}/>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"10px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                    <div style={{ width:"28px", height:"28px", borderRadius:"7px", background:"rgba(74,222,128,0.1)", border:"1px solid rgba(74,222,128,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"10px", fontWeight:700, color:"#4ade80", fontFamily:"'JetBrains Mono',monospace" }}>
                      {section[0].toUpperCase()}
                    </div>
                    <span style={{ fontSize:"13px", fontWeight:600, color:"#f1f5f9" }}>{SOAP_LABELS[section]}</span>
                  </div>
                  <span style={{ fontSize:"11px", color:confColor(conf), fontFamily:"'JetBrains Mono',monospace" }}>{Math.round(conf * 100)}%</span>
                </div>
                <div style={{ fontSize:"13px", color:"rgba(226,232,240,0.65)", lineHeight:1.85, fontFamily:"'JetBrains Mono',monospace", whiteSpace:"pre-wrap" }}>
                  {content}
                </div>
              </div>
            );
          })}

          <button className="btn-success" style={{ marginTop:"8px" }} onClick={() => {
            const note = `SOAP NOTE — ${enc.patient_name}\nDate: ${enc.encounter_date}\nChief Complaint: ${enc.chief_complaint}\n\nSUBJECTIVE:\n${enc.soap_subjective}\n\nOBJECTIVE:\n${enc.soap_objective}\n\nASSESSMENT:\n${enc.soap_assessment}\n\nPLAN:\n${enc.soap_plan}\n\n---\nGenerated by Attestr · AI-drafted. Physician-approved.`;
            navigator.clipboard.writeText(note);
          }}>
            Copy Note to Clipboard
          </button>
        </main>
      </div>
    );
  }

  /* ═══════════════════════════════════════
     INPUT SCREEN
  ═══════════════════════════════════════ */
  if (screen === "input") return (
    <div style={{ minHeight:"100vh", fontFamily:"'Sora',system-ui,sans-serif", color:"#e2e8f0", display:"flex", flexDirection:"column", position:"relative", overflow:"hidden" }}>
      <style>{css}</style>
      <BgScene />
      <Header extra={
        <>
          <button className="btn-history" onClick={() => setScreen("history")}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M12 8v4l3 3M12 3a9 9 0 100 18A9 9 0 0012 3z" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            History
          </button>
          <button className="btn-ghost" onClick={loadDemo} disabled={demoLoading}>
            {demoLoading
              ? <><div className="blink" style={{ width:"7px", height:"7px", borderRadius:"50%", background:"rgba(139,92,246,0.8)" }}/>Loading…</>
              : <><svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M5 3l14 9-14 9V3z" fill="rgba(255,255,255,0.5)"/></svg>Try Demo</>}
          </button>
        </>
      }/>

      <main style={{ flex:1, maxWidth:"780px", width:"100%", margin:"0 auto", padding:"44px 24px 64px", position:"relative", zIndex:1 }}>

        <div className="fade-up" style={{ marginBottom:"28px" }}>
          <div style={{ fontSize:"10.5px", fontWeight:600, letterSpacing:"0.12em", textTransform:"uppercase", color:"rgba(139,92,246,0.8)", marginBottom:"8px", fontFamily:"'JetBrains Mono',monospace" }}>New Encounter</div>
          <h1 style={{ fontSize:"30px", fontWeight:700, letterSpacing:"-0.04em", color:"#f1f5f9", lineHeight:1.15 }}>Patient Encounter Summary</h1>
          <p style={{ fontSize:"14px", color:"rgba(255,255,255,0.32)", marginTop:"10px", lineHeight:1.7 }}>Type your encounter notes below, or use voice input for a hands-free experience. Attestr generates a structured SOAP note ready for attestation and EHR entry.</p>
        </div>

        {/* Disclaimer */}
        <Disclaimer />

        {/* Encounter details */}
        <div className="lg-panel" style={{ borderRadius:"18px", padding:"22px 24px", marginBottom:"16px", position:"relative" }}>
          <div style={{ position:"absolute", top:0, left:"10%", right:"10%", height:"1px", background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent)" }}/>
          <div style={{ fontSize:"10px", fontWeight:600, letterSpacing:"0.1em", textTransform:"uppercase", color:"rgba(255,255,255,0.2)", marginBottom:"16px", fontFamily:"'JetBrains Mono',monospace" }}>Encounter Details</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 160px", gap:"14px" }}>
            <div><label>Patient Name</label><input type="text" placeholder="Last, First" value={patientName} onChange={e => setPatientName(e.target.value)}/></div>
            <div><label>Chief Complaint</label><input type="text" placeholder="e.g. Chest pain, 3 days" value={chiefComplaint} onChange={e => setChiefComplaint(e.target.value)}/></div>
            <div><label>Date of Service</label><input type="date" value={encounterDate} onChange={e => setEncounterDate(e.target.value)}/></div>
          </div>
        </div>

        {/* Narrative + voice divider */}
        <div className={isListening ? "lg-active" : "lg-panel"} style={{ borderRadius:"18px", padding:"22px 24px", marginBottom:"16px", position:"relative", transition:"all 0.3s ease" }}>
          <div style={{ position:"absolute", top:0, left:"10%", right:"10%", height:"1px", background:`linear-gradient(90deg,transparent,${isListening ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.12)"},transparent)` }}/>

          {/* Toolbar */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"14px" }}>
            <label style={{ margin:0 }}>Encounter Narrative</label>
            <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
              {(transcript || patientName) && <button className="btn-clear" onClick={clearAll}>Clear all</button>}
              <span style={{ fontSize:"10.5px", color:"rgba(255,255,255,0.18)", fontFamily:"'JetBrains Mono',monospace" }}>{transcript.length}</span>
            </div>
          </div>

          {/* Text area */}
          <textarea
            rows={7}
            placeholder={`Type your encounter notes here.\n\nExample: "35-year-old male presents with 3-day history of sharp chest pain radiating to left arm. Vitals: BP 138/84, HR 91..."`}
            value={transcript + (interimText ? ` ${interimText}` : "")}
            onChange={e => setTranscript(e.target.value)}
            style={{ lineHeight:1.8 }}
          />

          {/* Voice divider */}
          <VoiceDivider />

          {/* Voice bar */}
          <div className="lg-base" style={{ display:"flex", alignItems:"center", gap:"12px", padding:"10px 14px", borderRadius:"12px" }}>
            <button className={`mic-btn${isListening ? " recording" : ""}`} onClick={isListening ? stopListening : startListening}>
              {isListening
                ? <svg width="14" height="14" viewBox="0 0 24 24" fill="rgba(139,92,246,0.9)"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
                : <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round"/></svg>}
            </button>
            <div style={{ display:"flex", alignItems:"center", gap:"3px", flex:1, height:"28px" }}>
              {[.4,.7,.5,.9,.55,.8,.45,.7,.38,.65,.95,.5,.72,.85,.4,.62,.5,.88,.7,.5,.65,.8,.45,.72,.38,.9,.55,.7].map((h, i) => (
                <WaveBar key={i} h={h * 100}/>
              ))}
            </div>
            {isListening
              ? <div style={{ display:"flex", alignItems:"center", gap:"6px", flexShrink:0 }}>
                  <div className="blink" style={{ width:"6px", height:"6px", borderRadius:"50%", background:"rgba(139,92,246,0.95)", boxShadow:"0 0 8px rgba(139,92,246,0.6)" }}/>
                  <span style={{ fontSize:"10.5px", color:"rgba(139,92,246,0.9)", fontFamily:"'JetBrains Mono',monospace" }}>REC</span>
                </div>
              : <span style={{ fontSize:"11.5px", color:"rgba(255,255,255,0.18)", flexShrink:0 }}>Tap mic to speak</span>}
          </div>

          {interimText && <div style={{ fontSize:"11.5px", color:"rgba(139,92,246,0.65)", marginTop:"10px", fontStyle:"italic" }}>Transcribing…</div>}
        </div>

        {/* Error */}
        {generateError && (
          <div style={{ background:"rgba(248,113,113,0.07)", backdropFilter:"blur(16px)", border:"1px solid rgba(248,113,113,0.2)", borderRadius:"12px", padding:"12px 16px", marginBottom:"14px", fontSize:"13px", color:"#f87171" }}>
            ⚠ {generateError}
          </div>
        )}

        {/* Hint */}
        {!canGenerate && !generateError && (
          <div className="lg-base" style={{ display:"flex", gap:"10px", alignItems:"flex-start", borderRadius:"12px", padding:"12px 16px", marginBottom:"14px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ marginTop:"1px", flexShrink:0 }}>
              <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"/>
              <path d="M12 8v4M12 16h.01" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span style={{ fontSize:"13px", color:"rgba(255,255,255,0.28)", lineHeight:1.6 }}>
              {!patientName.trim() ? "Add a patient name to continue." : "Add more encounter detail to generate a SOAP note."}
            </span>
          </div>
        )}

        <button className="btn-primary" disabled={!canGenerate || generating} onClick={generateSOAP}>
          {canGenerate ? "Generate SOAP Note →" : "Complete fields above to generate"}
        </button>

        <div style={{ textAlign:"center", marginTop:"20px", display:"flex", alignItems:"center", justifyContent:"center", gap:"16px" }}>
          {["Section-by-section approval", "FHIR DocumentReference", "Gemini 1.5 Flash"].map((t, i) => (
            <span key={i} style={{ fontSize:"11px", display:"flex", alignItems:"center", gap:"16px" }}>
              {i > 0 && <span style={{ color:"rgba(255,255,255,0.08)" }}>·</span>}
              <span style={{ color:"rgba(255,255,255,0.2)", fontFamily:"'JetBrains Mono',monospace" }}>{t}</span>
            </span>
          ))}
        </div>
      </main>
    </div>
  );

  /* ═══════════════════════════════════════
     REVIEW SCREEN
  ═══════════════════════════════════════ */
  return (
    <div style={{ minHeight:"100vh", fontFamily:"'Sora',system-ui,sans-serif", color:"#e2e8f0", display:"flex", flexDirection:"column", position:"relative", overflow:"hidden" }}>
      <style>{css}</style>
      <BgScene />
      <Header extra={<button className="btn-ghost" onClick={() => setScreen("input")}>← New Encounter</button>}/>

      <main style={{ flex:1, maxWidth:"820px", width:"100%", margin:"0 auto", padding:"44px 24px 80px", position:"relative", zIndex:1 }}>

        <div className="fade-up" style={{ marginBottom:"32px" }}>
          <div style={{ fontSize:"10.5px", fontWeight:600, letterSpacing:"0.12em", textTransform:"uppercase", color:"rgba(139,92,246,0.8)", marginBottom:"8px", fontFamily:"'JetBrains Mono',monospace" }}>SOAP Note Review</div>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:"16px" }}>
            <div>
              <h1 style={{ fontSize:"24px", fontWeight:700, letterSpacing:"-0.04em", color:"#f1f5f9" }}>{patientName}</h1>
              <p style={{ fontSize:"12.5px", color:"rgba(255,255,255,0.3)", marginTop:"4px", fontFamily:"'JetBrains Mono',monospace" }}>{chiefComplaint} · {encounterDate}</p>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:"10px", flexShrink:0, paddingTop:"4px" }}>
              <span style={{ fontSize:"11.5px", color:"rgba(255,255,255,0.3)", fontFamily:"'JetBrains Mono',monospace" }}>{approvedCount}/4</span>
              <div style={{ width:"72px", height:"5px", borderRadius:"3px", overflow:"hidden", background:"rgba(255,255,255,0.05)" }}>
                <div style={{ height:"100%", width:`${(approvedCount / 4) * 100}%`, background:"linear-gradient(90deg,#6366f1,#4ade80)", borderRadius:"3px", transition:"width 0.4s cubic-bezier(0.2,0,0.3,1)", boxShadow:"0 0 8px rgba(99,102,241,0.6)" }}/>
              </div>
            </div>
          </div>
        </div>

        {/* SOAP sections */}
        {soapNote && (["subjective", "objective", "assessment", "plan"] as const).map((section, idx) => {
          const data = soapNote[section];
          const status = approvals[section];
          const isEditing = editingSection === section;
          const isApproved = status !== "pending";

          return (
            <div
              key={section}
              className={`fade-up ${isApproved ? "lg-approved" : isEditing ? "lg-active" : "lg-panel"}`}
              style={{ borderRadius:"18px", padding:"22px 24px", marginBottom:"14px", position:"relative", transition:"all 0.3s ease", animationDelay:`${idx * 70}ms` }}
            >
              <div style={{ position:"absolute", top:0, left:"10%", right:"10%", height:"1px", background:`linear-gradient(90deg,transparent,${isApproved ? "rgba(74,222,128,0.2)" : isEditing ? "rgba(139,92,246,0.25)" : "rgba(255,255,255,0.1)"},transparent)` }}/>

              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"12px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
                  <div style={{ width:"32px", height:"32px", borderRadius:"9px", background: isApproved ? "rgba(74,222,128,0.1)" : "rgba(99,102,241,0.1)", border:`1px solid ${isApproved ? "rgba(74,222,128,0.22)" : "rgba(139,92,246,0.2)"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"11px", fontWeight:700, color: isApproved ? "#4ade80" : "rgba(139,92,246,0.9)", fontFamily:"'JetBrains Mono',monospace", boxShadow:"inset 0 1px 0 rgba(255,255,255,0.08)" }}>
                    {section[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize:"14px", fontWeight:600, color:"#f1f5f9", letterSpacing:"-0.02em" }}>{SOAP_LABELS[section]}</div>
                    <div style={{ fontSize:"11px", color:"rgba(255,255,255,0.28)", marginTop:"1px" }}>{SOAP_DESC[section]}</div>
                  </div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:"10px", flexShrink:0 }}>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:"12px", color:confColor(data.confidence), fontFamily:"'JetBrains Mono',monospace", fontWeight:500 }}>{Math.round(data.confidence * 100)}%</div>
                    <div style={{ fontSize:"10px", color:"rgba(255,255,255,0.22)" }}>{confLabel(data.confidence)}</div>
                  </div>
                  <div style={{ width:"3px", height:"34px", borderRadius:"2px", background:confColor(data.confidence), opacity:0.55, boxShadow:`0 0 8px ${confColor(data.confidence)}` }}/>
                  {isApproved && (
                    <div style={{ display:"flex", alignItems:"center", gap:"5px", background:"rgba(74,222,128,0.07)", border:"1px solid rgba(74,222,128,0.2)", borderRadius:"20px", padding:"3px 10px", boxShadow:"inset 0 1px 0 rgba(74,222,128,0.1)" }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      <span style={{ fontSize:"10.5px", color:"#4ade80", fontWeight:600 }}>{status === "edited" ? "Edited" : "Approved"}</span>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ height:"2px", background:"rgba(255,255,255,0.05)", borderRadius:"1px", marginBottom:"16px", overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${data.confidence * 100}%`, background:confColor(data.confidence), borderRadius:"1px", transition:"width 0.7s cubic-bezier(0.2,0,0.3,1)", boxShadow:`0 0 6px ${confColor(data.confidence)}` }}/>
              </div>

              {isEditing ? (
                <textarea rows={5} value={editedContent[section]} onChange={e => setEditedContent(p => ({ ...p, [section]: e.target.value }))} style={{ lineHeight:1.8, marginBottom:"14px" }} autoFocus/>
              ) : (
                <div style={{ fontSize:"13px", color:"rgba(226,232,240,0.7)", lineHeight:1.9, fontFamily:"'JetBrains Mono',monospace", whiteSpace:"pre-wrap", marginBottom:"16px" }}>
                  {editedContent[section]}
                </div>
              )}

              <div style={{ display:"flex", gap:"8px", justifyContent:"flex-end" }}>
                {isEditing ? (
                  <>
                    <button className="btn-edit-inline" onClick={() => setEditingSection(null)}>Cancel</button>
                    <button className="btn-approve" onClick={() => saveEdit(section)}>Save & Approve</button>
                  </>
                ) : isApproved ? (
                  <button className="btn-edit-inline" onClick={() => { setEditingSection(section); setApprovals(p => ({ ...p, [section]: "pending" })); }}>Edit</button>
                ) : (
                  <>
                    <button className="btn-edit-inline" onClick={() => setEditingSection(section)}>Edit</button>
                    <button className="btn-approve" onClick={() => approveSection(section)}>Approve ✓</button>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {/* FHIR toggle */}
        {soapNote && (
          <div style={{ marginBottom:"20px" }}>
            <button className="btn-ghost" style={{ width:"100%", justifyContent:"center" }} onClick={() => setShowFHIR(p => !p)}>
              {showFHIR ? "Hide" : "Show"} FHIR DocumentReference
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" style={{ transform:showFHIR ? "rotate(180deg)" : "none", transition:"transform 0.2s" }}>
                <path d="M6 9l6 6 6-6" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {showFHIR && (
              <div className="lg-base" style={{ borderRadius:"14px", padding:"18px", marginTop:"10px" }}>
                <pre style={{ fontSize:"11.5px", color:"rgba(255,255,255,0.3)", fontFamily:"'JetBrains Mono',monospace", whiteSpace:"pre-wrap", lineHeight:1.75 }}>
                  {JSON.stringify(soapNote.fhir, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Save error */}
        {saveError && (
          <div style={{ background:"rgba(248,113,113,0.07)", border:"1px solid rgba(248,113,113,0.2)", borderRadius:"10px", padding:"10px 14px", marginBottom:"14px", fontSize:"12.5px", color:"#f87171" }}>
            ⚠ Failed to save to history: {saveError}
          </div>
        )}

        {/* CTA */}
        <button className={allApproved ? "btn-success" : "btn-primary"} disabled={!allApproved || saving} onClick={copyNote}>
          {saving
            ? "Saving to history…"
            : copied
              ? "✓ Copied — paste into your EHR"
              : allApproved
                ? "Copy Attested Note to EHR →"
                : `Approve all sections to finalize (${approvedCount}/4)`}
        </button>

        {allApproved && !copied && !saving && (
          <p style={{ textAlign:"center", fontSize:"11.5px", color:"rgba(255,255,255,0.2)", marginTop:"12px", fontFamily:"'JetBrains Mono',monospace" }}>
            All sections attested · Saved to history · FHIR R4
          </p>
        )}
      </main>
    </div>
  );
}
