import { useState, useRef } from "react";
import styles from "./App.module.css";

const STEPS = ["Resume", "Job", "Result"];

// ── Progress Bar ──────────────────────────────────────────────────────────────
function ProgressBar({ step }) {
  return (
    <div className={styles.progress}>
      {STEPS.map((label, i) => (
        <div key={label} className={styles.progressItem}>
          <div className={`${styles.dot} ${i < step ? styles.dotDone : i === step ? styles.dotActive : ""}`}>
            {i < step ? "✓" : i + 1}
          </div>
          <span className={`${styles.progressLabel} ${i === step ? styles.progressLabelActive : ""}`}>{label}</span>
        </div>
      ))}
    </div>
  );
}

// ── File Upload Zone ──────────────────────────────────────────────────────────
function FileUploadZone({ onParsed, loading, setLoading }) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const inputRef = useRef();

  const handleFile = async (file) => {
    if (!file) return;
    const allowed = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"];
    if (!allowed.includes(file.type)) {
      setError("Only PDF, DOCX, or TXT files are supported.");
      return;
    }
    setError("");
    setLoading(true);
    setFileName(file.name);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/parse", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Parse failed");
      onParsed(data.text, data.links, data.filename);
    } catch (e) {
      setError(e.message);
      setFileName("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div
        className={`${styles.dropZone} ${dragging ? styles.dropZoneActive : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
      >
        <input ref={inputRef} type="file" accept=".pdf,.docx,.txt" style={{ display: "none" }} onChange={(e) => handleFile(e.target.files[0])} />
        {loading ? (
          <div className={styles.dropContent}>
            <div className={styles.spinner} />
            <span className={styles.dropText}>Extracting text…</span>
          </div>
        ) : fileName ? (
          <div className={styles.dropContent}>
            <span className={styles.dropIcon}>✓</span>
            <span className={styles.dropText}>{fileName}</span>
            <span className={styles.dropHint}>Click to replace</span>
          </div>
        ) : (
          <div className={styles.dropContent}>
            <span className={styles.dropIcon}>↑</span>
            <span className={styles.dropText}>Drop your resume here</span>
            <span className={styles.dropHint}>PDF, DOCX, or TXT · max 5MB · or click to browse</span>
          </div>
        )}
      </div>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}

// ── Links Badge Row ───────────────────────────────────────────────────────────
function LinksRow({ links }) {
  if (!links || Object.keys(links).length === 0) return null;
  const items = [
    links.emails && { label: "✉ Email", value: links.emails[0] },
    links.phones && { label: "✆ Phone", value: links.phones[0] },
    links.linkedin && { label: "in LinkedIn", value: links.linkedin },
    links.github && { label: "⌥ GitHub", value: links.github },
    links.portfolio && { label: "⬡ Portfolio", value: links.portfolio },
  ].filter(Boolean);

  if (!items.length) return null;

  return (
    <div className={styles.linksRow}>
      <span className={styles.linksLabel}>Extracted links</span>
      <div className={styles.linksList}>
        {items.map((item) => (
          <span key={item.label} className={styles.linkBadge} title={item.value}>
            <span className={styles.linkBadgeLabel}>{item.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Step 1: Resume ────────────────────────────────────────────────────────────
function StepResume({ resumeText, setResumeText, links, setLinks, onNext }) {
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [mode, setMode] = useState("upload"); // "upload" | "paste"

  const handleNext = () => {
    if (resumeText.trim().length < 50) {
      setError("Please upload or paste your full resume.");
      return;
    }
    setError("");
    onNext();
  };

  const handleParsed = (text, extractedLinks) => {
    setResumeText(text);
    setLinks(extractedLinks);
    setError("");
  };

  return (
    <div className={styles.stepWrap}>
      <div className={styles.stepHeader}>
        <h2 className={styles.stepTitle}>Your resume</h2>
        <p className={styles.stepSub}>Upload your file or paste text — we extract everything including links.</p>
      </div>

      <div className={styles.modeToggle}>
        <button className={`${styles.modeBtn} ${mode === "upload" ? styles.modeBtnActive : ""}`} onClick={() => setMode("upload")}>Upload file</button>
        <button className={`${styles.modeBtn} ${mode === "paste" ? styles.modeBtnActive : ""}`} onClick={() => setMode("paste")}>Paste text</button>
      </div>

      {mode === "upload" ? (
        <FileUploadZone onParsed={handleParsed} loading={uploading} setLoading={setUploading} />
      ) : null}

      {mode === "paste" || resumeText ? (
        <div className={styles.field} style={{ marginTop: mode === "upload" && resumeText ? "1rem" : mode === "paste" ? "1rem" : 0 }}>
          {mode === "upload" && resumeText && <label className={styles.label}>Extracted text (editable)</label>}
          {mode === "paste" && <label className={styles.label}>Paste resume content</label>}
          <textarea
            className={styles.textarea}
            rows={mode === "upload" ? 10 : 14}
            placeholder="John Doe&#10;john@email.com | linkedin.com/in/johndoe | github.com/johndoe&#10;&#10;SUMMARY&#10;Experienced software engineer...&#10;&#10;EXPERIENCE&#10;Senior Engineer — Acme Corp (2021–present)&#10;• Built scalable APIs serving 1M+ users&#10;&#10;SKILLS&#10;JavaScript, React, Node.js"
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
          />
          <div className={styles.charCount}>{resumeText.length} chars</div>
        </div>
      ) : null}

      {resumeText && <LinksRow links={links} />}

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.actions}>
        <button className={styles.btnPrimary} onClick={handleNext} disabled={uploading}>
          Continue →
        </button>
      </div>
    </div>
  );
}

// ── Step 2: Job Description ───────────────────────────────────────────────────
function StepJob({ jobText, setJobText, onNext, onBack }) {
  const [error, setError] = useState("");

  const handleNext = () => {
    if (jobText.trim().length < 30) {
      setError("Please paste the full job description.");
      return;
    }
    setError("");
    onNext();
  };

  return (
    <div className={styles.stepWrap}>
      <div className={styles.stepHeader}>
        <h2 className={styles.stepTitle}>Job description</h2>
        <p className={styles.stepSub}>The more detail, the better the tailoring. Paste the full JD.</p>
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Paste job description</label>
        <textarea
          className={styles.textarea}
          rows={14}
          placeholder={"Senior Frontend Engineer — TechCorp\n\nWe are looking for a frontend engineer who...\n\nRequirements:\n• 4+ years React experience\n• Strong TypeScript skills\n• Experience with REST APIs\n..."}
          value={jobText}
          onChange={(e) => setJobText(e.target.value)}
        />
        <div className={styles.charCount}>{jobText.length} chars</div>
      </div>
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.actions}>
        <button className={styles.btnSecondary} onClick={onBack}>← Back</button>
        <button className={styles.btnPrimary} onClick={handleNext}>Generate resume →</button>
      </div>
    </div>
  );
}

// ── Step 3: Result ────────────────────────────────────────────────────────────
function StepResult({ resumeText, jobText, links, onBack, onReset }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [generated, setGenerated] = useState(false);

  const generate = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume: resumeText, jobDescription: jobText, links }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Server error");
      setResult(data);
      setGenerated(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const copyText = () => {
    navigator.clipboard.writeText(result.resume);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadPDF = () => {
    const lines = result.resume.split("\n");
    const html = `<html><head><meta charset="utf-8">
    <style>
      body { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.6; margin: 2cm; color: #111; }
      p { margin: 2px 0; }
      a { color: #1a0dab; }
    </style></head><body>
    ${lines.map((l) => l.trim() ? `<p>${l.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/(https?:\/\/[^\s]+)/g,'<a href="$1">$1</a>')}</p>` : "<br>").join("")}
    </body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (win) win.onload = () => setTimeout(() => win.print(), 300);
  };

  if (loading) {
    return (
      <div className={styles.loadingWrap}>
        <div className={styles.spinnerLg} />
        <p className={styles.loadingText}>Tailoring your resume with AI…</p>
        <p className={styles.loadingSub}>Matching keywords · Rewording bullets · Preserving links</p>
      </div>
    );
  }

  if (!generated) {
    return (
      <div className={styles.stepWrap}>
        <div className={styles.stepHeader}>
          <h2 className={styles.stepTitle}>Ready to generate</h2>
          <p className={styles.stepSub}>AI will tailor your resume to the job description while preserving all your links and contact info.</p>
        </div>
        {links && Object.keys(links).length > 0 && (
          <div className={styles.infoBox}>
            <span className={styles.infoIcon}>✓</span>
            <span>Links detected — email, LinkedIn, GitHub, and other URLs will be preserved exactly.</span>
          </div>
        )}
        {error && <p className={styles.error}>{error}</p>}
        <div className={styles.actions}>
          <button className={styles.btnSecondary} onClick={onBack}>← Back</button>
          <button className={styles.btnPrimary} onClick={generate}>Generate tailored resume →</button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.stepWrap}>
        <p className={styles.error}>{error}</p>
        <div className={styles.actions}>
          <button className={styles.btnSecondary} onClick={onBack}>← Back</button>
          <button className={styles.btnPrimary} onClick={generate}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.stepWrap}>
      <div className={styles.stepHeader}>
        <h2 className={styles.stepTitle}>Your tailored resume</h2>
        <p className={styles.stepSub}>Review, copy, or download as PDF.</p>
      </div>

      {result?.keywords?.length > 0 && (
        <div className={styles.tags}>
          <span className={styles.tagsLabel}>ATS keyword matches</span>
          <div className={styles.tagList}>
            {result.keywords.map((k) => (
              <span key={k} className={styles.tag}>{k}</span>
            ))}
          </div>
        </div>
      )}

      <div className={styles.resultCard}>
        <div className={styles.resultToolbar}>
          <span className={styles.resultCardTitle}>Tailored resume</span>
          <button className={styles.copyBtn} onClick={copyText}>
            {copied ? "✓ Copied!" : "Copy text"}
          </button>
        </div>
        <pre className={styles.resultPre}>{result?.resume}</pre>
      </div>

      <div className={styles.actions}>
        <button className={styles.btnPrimary} onClick={downloadPDF}>Download PDF ↗</button>
        <button className={styles.btnSecondary} onClick={generate}>Regenerate</button>
        <button className={styles.btnSecondary} onClick={onBack}>← Change job</button>
        <button className={styles.btnGhost} onClick={onReset}>New resume</button>
      </div>
    </div>
  );
}

// ── Root App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [step, setStep] = useState(0);
  const [resumeText, setResumeText] = useState("");
  const [jobText, setJobText] = useState("");
  const [links, setLinks] = useState({});

  const reset = () => { setStep(0); setResumeText(""); setJobText(""); setLinks({}); };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoMark}>R</span>
          <span className={styles.logoText}>ResumeAI</span>
        </div>
        <p className={styles.tagline}>Tailor your resume to any job in seconds</p>
      </header>

      <main className={styles.main}>
        <ProgressBar step={step} />
        <div className={styles.card}>
          {step === 0 && (
            <StepResume
              resumeText={resumeText} setResumeText={setResumeText}
              links={links} setLinks={setLinks}
              onNext={() => setStep(1)}
            />
          )}
          {step === 1 && (
            <StepJob jobText={jobText} setJobText={setJobText} onNext={() => setStep(2)} onBack={() => setStep(0)} />
          )}
          {step === 2 && (
            <StepResult resumeText={resumeText} jobText={jobText} links={links} onBack={() => setStep(1)} onReset={reset} />
          )}
        </div>
      </main>

      <footer className={styles.footer}>
        <p>Powered by Groq · llama-3.3-70b-versatile · Free API</p>
      </footer>
    </div>
  );
}