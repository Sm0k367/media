# 💯 Epic Tech AI 🔥

A fast, multimedia-capable chatbot built with React + Vite, powered by Groq (Llama 3.3 70B), Pollinations.ai (Flux image gen), Firebase Auth & Firestore chat persistence, voice input/output, and glassmorphism UI.

## Features
- Real-time chat with Groq LLM
- Automatic image generation via tool calling (ask for images/art)
- Manual image generation modal (🎨 button)
- Voice input (microphone) and text-to-speech output
- Firebase Google Auth with chat history sync
- Local + DB chat persistence
- Dark/light theme toggle
- Chat history sidebar with clear/export
- Fully responsive glassmorphism design

## Setup

1. Clone the repo
   ```bash
   git clone <your-repo-url>
   cd epic-tech-ai

Install dependenciesbash

npm install

Create .env file from .env.example and add your keys

VITE_GROQ_API_KEY=your_groq_key

VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...

Run locallybash

npm run dev

Deploy to VercelPush to GitHub
Import project in Vercel dashboard
Add all VITE_ environment variables in Vercel project settings
Deploy (Vercel auto-detects Vite)

That's it — enjoy!

