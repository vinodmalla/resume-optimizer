# Resume Optimizer

AI-powered resume tailoring app built with React + Node.js/Express + Anthropic Claude.

## Project Structure

```
resume-optimizer/
├── client/          # React frontend (Vite)
├── server/          # Node.js + Express backend
└── README.md
```

## Quick Start

### 1. Install dependencies

```bash
# Backend
cd server && npm install

# Frontend
cd ../client && npm install
```

### 2. Add your Anthropic API key

```bash
cd server
cp .env.example .env
# Edit .env and add your key: ANTHROPIC_API_KEY=sk-ant-...
```

Get your API key at: https://console.anthropic.com

### 3. Run the app

Open two terminals:

```bash
# Terminal 1 — backend (port 3001)
cd server && npm run dev

# Terminal 2 — frontend (port 5173)
cd client && npm run dev
```

Open http://localhost:5173

## Features

- Upload / paste standard resume as your template
- Paste any job description
- AI tailors resume matching the job while preserving your exact format
- Keyword match tags shown
- Download as PDF
- Secure: API key never exposed to the browser
