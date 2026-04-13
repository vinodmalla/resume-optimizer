import { useState } from "react";
import styles from "./App.module.css";

const STEPS = ["Resume", "Job", "Result"];

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

function StepResume({ resumeText, setResumeText, onNext }) {
  const [error, setError] = useState("");

  const handleNext = () => {
    if (resumeText.trim().length < 50) {
      setError("Please paste your full resume (at least 50 characters).");
      return;
    }
    setError("");
    onNext();
  };

  return (
    <div className={styles.stepWrap}>
      <div className={styles.stepHeader}>
        <h2 className={styles.stepTitle}>Your standard resume</h2>
        <p className={styles.stepSub}>This is your template — paste it once and reuse it for every job.</p>
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Resume content</label>
        <textarea
          className={styles.textarea}
          rows={14}
          placeholder={"John Doe\njohn@email.com | LinkedIn\n\nSUMMARY\nExperienced software engineer...\n\nEXPERIENCE\nSenior Engineer — Acme Corp (2021–present)\n• Built scalable APIs serving 1M+ users\n\nSKILLS\nJavaScript, React, Node.js, Python"}
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
        />
        <div className={styles.charCount}>{resumeText.length} chars</div>
      </div>
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.actions}>
        <button className={styles.btnPrimary} onClick={handleNext}>
          Continue →
        </button>
      </div>
    </div>
  );
}

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
        <p className={styles.stepSub}>The AI will tailor your resume to this role — the more detail, the better.</p>
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

function StepResult({ resumeText, jobText, onBack, onReset }) {
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
        body: JSON.stringify({ resume: resumeText, jobDescription: jobText }),
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
      body { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.55; margin: 2cm; color: #111; }
      p { margin: 2px 0; }
    </style></head><body>
    ${lines.map((l) => l.trim() ? `<p>${l.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</p>` : "<br>").join("")}
    </body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (win) win.onload = () => win.print();
  };

  if (!generated) {
    return (
      <div className={styles.stepWrap}>
        <div className={styles.stepHeader}>
          <h2 className={styles.stepTitle}>Ready to generate</h2>
          <p className={styles.stepSub}>Click below to tailor your resume with AI.</p>
        </div>
        {error && <p className={styles.error}>{error}</p>}
        <div className={styles.actions}>
          <button className={styles.btnSecondary} onClick={onBack}>← Back</button>
          <button className={styles.btnPrimary} onClick={generate} disabled={loading}>
            {loading ? <span className={styles.spinner} /> : null}
            {loading ? "Generating…" : "Generate tailored resume →"}
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.loadingWrap}>
        <div className={styles.spinnerLg} />
        <p className={styles.loadingText}>Tailoring your resume with AI…</p>
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
          <span className={styles.tagsLabel}>Keyword matches</span>
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
            {copied ? "Copied!" : "Copy text"}
          </button>
        </div>
        <pre className={styles.resultPre}>{result?.resume}</pre>
      </div>

      <div className={styles.actions}>
        <button className={styles.btnPrimary} onClick={downloadPDF}>Download PDF ↗</button>
        <button className={styles.btnSecondary} onClick={onBack}>← Change job</button>
        <button className={styles.btnGhost} onClick={onReset}>New resume</button>
      </div>
      <div className={styles.actions} style={{ marginTop: 8 }}>
        <button className={styles.btnSecondary} onClick={generate}>Regenerate</button>
      </div>
    </div>
  );
}

export default function App() {
  const [step, setStep] = useState(0);
  const [resumeText, setResumeText] = useState("");
  const [jobText, setJobText] = useState("");

  const reset = () => { setStep(0); setResumeText(""); setJobText(""); };

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
            <StepResume resumeText={resumeText} setResumeText={setResumeText} onNext={() => setStep(1)} />
          )}
          {step === 1 && (
            <StepJob jobText={jobText} setJobText={setJobText} onNext={() => setStep(2)} onBack={() => setStep(0)} />
          )}
          {step === 2 && (
            <StepResult resumeText={resumeText} jobText={jobText} onBack={() => setStep(1)} onReset={reset} />
          )}
        </div>
      </main>

      <footer className={styles.footer}>
        <p>Powered by Claude · Your API key stays on the server</p>
      </footer>
    </div>
  );
}
