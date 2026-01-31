# Epic Tech AI Bot

A laid-back AI chatbot with DJ Smoke Stream vibes — deep, confident, underground tone. Powered by Groq LLM, real-time web search, image generation with Pollinations Flux (fallback capable), voice input/output, theme toggle, local chat persistence.

## Features
- Conversational AI with tool calling for web search and image gen
- Real-time info lookup (placeholder - add actual search API)
- Image gen with fallback if limits hit
- Voice recognition & text-to-speech with deep voice polish
- Dark/light theme
- Responsive on all devices (mobile/desktop, portrait/landscape)
- Full-bleed gradient background (no white edges)

## Setup
1. Clone repo: `git clone https://github.com/Sm0k367/media`
2. Install deps: `npm i`
3. Add `.env` with `VITE_GROQ_API_KEY=your_key` (from Groq console)
4. Run locally: `npm run dev`
5. Deploy to Vercel: Add VITE_GROQ_API_KEY in env vars

## Usage
- Type prompts — AI handles anything, uses tools as needed
- For real web search, replace placeholder with actual API (e.g. Serper, Tavily)
- Image fallback: Add alternative provider API

## Known Issues
- Favicon 404: Add public/favicon.ico
- API errors: Ensure Groq key is valid in Vercel env

Built with Vite + React. @Sm0ken42O
