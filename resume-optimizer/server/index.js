require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Anthropic = require("@anthropic-ai/sdk");

const app = express();
const PORT = process.env.PORT || 3001;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json({ limit: "2mb" }));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Tailor resume endpoint
app.post("/api/tailor", async (req, res) => {
  const { resume, jobDescription } = req.body;

  if (!resume || resume.trim().length < 50) {
    return res.status(400).json({ error: "Resume content is too short." });
  }
  if (!jobDescription || jobDescription.trim().length < 30) {
    return res.status(400).json({ error: "Job description is too short." });
  }

  const prompt = `You are an expert resume writer and career coach. A user wants their resume tailored to a specific job.

RULES:
1. Rewrite the resume to highlight skills and experience relevant to the job description.
2. Reword bullet points using keywords from the job description where truthful.
3. Keep the EXACT same format, sections, and structure as the original resume.
4. Do NOT invent or fabricate any experience or skills not present in the original.
5. Do NOT add or remove sections.
6. At the very top of your response, output a line in this exact format:
   KEY_MATCHES: keyword1, keyword2, keyword3, keyword4, keyword5
   (5-8 most relevant keywords matched between the job and resume)
7. Then output the full tailored resume in plain text below that line.

ORIGINAL RESUME:
${resume}

JOB DESCRIPTION:
${jobDescription}

Respond with KEY_MATCHES line first, then the tailored resume.`;

  try {
    const message = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const fullText = message.content.map((b) => b.text || "").join("");

    // Parse keywords and resume body
    const keyMatchLine = fullText.match(/KEY_MATCHES:\s*(.+)/i);
    const keywords = keyMatchLine
      ? keyMatchLine[1].split(",").map((k) => k.trim()).filter(Boolean)
      : [];
    const resumeBody = fullText.replace(/KEY_MATCHES:.+\n?/i, "").trim();

    res.json({ keywords, resume: resumeBody });
  } catch (err) {
    console.error("Anthropic API error:", err.message);
    res.status(500).json({ error: "Failed to generate resume. Check your API key." });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
