require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const pdfParse = require("pdf-parse-new")
const mammoth = require("mammoth");
const Groq = require("groq-sdk");

const app = express();
const PORT = process.env.PORT || 3001;

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

// multer — store file in memory (no disk I/O)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only PDF, DOCX, or TXT files are supported."));
  },
});

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json({ limit: "2mb" }));

// ── Health ────────────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// ── Extract links from raw text ───────────────────────────────────────────────
function extractLinks(text) {
  const links = {};

  // URLs (http/https)
  const urlRegex = /https?:\/\/[^\s"'<>)\]]+/gi;
  const urls = text.match(urlRegex) || [];
  if (urls.length) links.urls = [...new Set(urls)];

  // Email addresses
  const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/gi;
  const emails = text.match(emailRegex) || [];
  if (emails.length) links.emails = [...new Set(emails)];

  // Phone numbers
  const phoneRegex = /(\+?\d[\d\s\-().]{7,}\d)/g;
  const phones = text.match(phoneRegex) || [];
  if (phones.length) links.phones = [...new Set(phones.map((p) => p.trim()))];

  // LinkedIn
  const li = urls.filter((u) => u.includes("linkedin.com"));
  if (li.length) links.linkedin = li[0];

  // GitHub
  const gh = urls.filter((u) => u.includes("github.com"));
  if (gh.length) links.github = gh[0];

  // Portfolio / personal sites (not linkedin/github)
  const portfolio = urls.filter(
    (u) => !u.includes("linkedin.com") && !u.includes("github.com")
  );
  if (portfolio.length) links.portfolio = portfolio[0];

  return links;
}

// ── Parse uploaded file → plain text ─────────────────────────────────────────
async function parseFile(buffer, mimetype) {
  if (mimetype === "application/pdf") {
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (
    mimetype ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (mimetype === "text/plain") {
    return buffer.toString("utf-8");
  }

  throw new Error("Unsupported file type.");
}

// ── POST /api/parse  (upload file → return text + links) ─────────────────────
app.post("/api/parse", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded." });

    const text = await parseFile(req.file.buffer, req.file.mimetype);

    if (!text || text.trim().length < 50) {
      return res.status(400).json({ error: "Could not extract text from file." });
    }

    const links = extractLinks(text);

    res.json({ text: text.trim(), links, filename: req.file.originalname });
  } catch (err) {
    console.error("Parse error:", err.message);
    res.status(500).json({ error: err.message || "Failed to parse file." });
  }
});

// ── POST /api/tailor  (text + JD → tailored resume) ──────────────────────────
app.post("/api/tailor", async (req, res) => {
  const { resume, jobDescription, links } = req.body;

  if (!resume || resume.trim().length < 50)
    return res.status(400).json({ error: "Resume content is too short." });
  if (!jobDescription || jobDescription.trim().length < 30)
    return res.status(400).json({ error: "Job description is too short." });

  // Build a links context block so Claude preserves them exactly
  const linksContext = links
    ? `
CONTACT LINKS TO PRESERVE EXACTLY (do not alter these):
${links.emails ? `Email: ${links.emails.join(", ")}` : ""}
${links.phones ? `Phone: ${links.phones.join(", ")}` : ""}
${links.linkedin ? `LinkedIn: ${links.linkedin}` : ""}
${links.github ? `GitHub: ${links.github}` : ""}
${links.portfolio ? `Portfolio: ${links.portfolio}` : ""}
${links.urls ? `Other URLs: ${links.urls.join(", ")}` : ""}
`.trim()
    : "";

  const prompt = `You are an expert resume writer and ATS optimization specialist.

TASK: Rewrite the resume while STRICTLY preserving formatting and links.

🚨 HARD RULES (ABSOLUTE — NO EXCEPTIONS) 🚨

FORMAT RULES:
- You MUST return the resume in EXACT SAME FORMAT as input.
- DO NOT change spacing, indentation, bullet symbols, or line breaks.
- DO NOT reformat sections.
- DO NOT convert to paragraphs.
- DO NOT add markdown or styling.

LINK RULES:
- DO NOT remove, modify, or rewrite ANY URLs.
- ALL links (LinkedIn, GitHub, Portfolio) must remain EXACTLY the same.
- Copy links character-by-character without any change.

CONTENT RULES:
- ONLY rewrite bullet point text to match the job description.
- DO NOT add new experience.
- DO NOT remove any content.
- DO NOT change contact details.

IF YOU CANNOT IMPROVE A LINE:
→ RETURN IT EXACTLY AS IS.

OUTPUT STRICTLY:
1. First line:
KEY_MATCHES: keyword1, keyword2, keyword3, keyword4, keyword5, keyword6

2. Then:
Return FULL resume with EXACT SAME formatting.

❌ ANY formatting change = WRONG OUTPUT
❌ ANY link change = WRONG OUTPUT

─────────────────────────────────
ORIGINAL RESUME:
${resume}

─────────────────────────────────
JOB DESCRIPTION:
${jobDescription}
─────────────────────────────────
`;
  try {
    const message = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }],
    });

    const fullText = message.choices[0].message.content;

    const keyMatchLine = fullText.match(/KEY_MATCHES:\s*(.+)/i);
    const keywords = keyMatchLine
      ? keyMatchLine[1].split(",").map((k) => k.trim()).filter(Boolean)
      : [];
    const resumeBody = fullText.replace(/KEY_MATCHES:.+\n?/i, "").trim();

    res.json({ keywords, resume: resumeBody });
  } catch (err) {
    console.error("Groq API error:", err.message);
    res.status(500).json({ error: "Failed to generate resume. Check your GROQ_API_KEY." });
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));