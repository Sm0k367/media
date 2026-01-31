import { useState, useRef, useEffect } from 'react'
import Groq from 'groq-sdk'

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('chatHistory')
    return saved ? JSON.parse(saved) : [
      { 
        text: 'What’s good. DJ Smoke Stream in the building. Tech locked, vibes heavy. Drop whatever you got — let’s build.', 
        sender: 'bot', 
        timestamp: Date.now() 
      }
    ]
  })
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const recognitionRef = useRef(null)
  const synthRef = useRef(window.speechSynthesis)

  useEffect(() => {
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem('chatHistory', JSON.stringify(messages))
  }, [messages])

  // Speech recognition
  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false
      recognitionRef.current.lang = 'en-US'

      recognitionRef.current.onresult = (e) => {
        setInput(e.results[0][0].transcript)
        setIsListening(false)
      }
      recognitionRef.current.onerror = () => setIsListening(false)
      recognitionRef.current.onend = () => setIsListening(false)
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  const toggleVoice = () => {
    if (isListening) {
      recognitionRef.current?.stop()
    } else {
      recognitionRef.current?.start()
    }
    setIsListening(!isListening)
  }

  const speak = (text) => {
    if (isSpeaking) {
      synthRef.current.cancel()
      setIsSpeaking(false)
      return
    }

    const u = new SpeechSynthesisUtterance(text)
    
    // DJ Smoke Stream refined: deep, slow, gravelly, deliberate — like a late-night set voiceover
    u.rate = 0.88          // noticeably slower, more controlled
    u.pitch = 0.68         // deeper, almost baritone range
    u.volume = 0.95
    
    // Prioritize deeper, male voices (Google, Microsoft, etc. if available)
    const voices = synthRef.current.getVoices()
    const preferredVoice = voices.find(v => 
      (v.name.toLowerCase().includes('deep') || 
       v.name.toLowerCase().includes('bass') || 
       v.name.includes('Google') || 
       v.name.includes('Microsoft') || 
       v.name.toLowerCase().includes('male')) &&
      v.lang.startsWith('en-')
    ) || voices.find(v => v.lang.startsWith('en-') && v.name.includes('US')) // fallback to any US English male-ish

    if (preferredVoice) u.voice = preferredVoice

    u.onend = () => setIsSpeaking(false)
    synthRef.current.speak(u)
    setIsSpeaking(true)
  }

  const clearChat = () => {
    if (confirm('Clear the session?')) {
      setMessages([{
        text: 'Deck reset. Smoke cleared. We starting fresh — what you got?',
        sender: 'bot',
        timestamp: Date.now()
      }])
    }
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMsg = { text: input, sender: 'user', timestamp: Date.now() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    try {
      const groq = new Groq({
        apiKey: import.meta.env.VITE_GROQ_API_KEY,
        dangerouslyAllowBrowser: true
      })

      const tools = [
        {
          type: "function",
          function: {
            name: "generate_image",
            description: "Generate image when requested (art, pic, visual, generate image, show me, make a pic, etc.).",
            parameters: {
              type: "object",
              properties: {
                prompt: { type: "string", description: "Detailed image description" }
              },
              required: ["prompt"]
            }
          }
        }
      ]

      let chat = [
        {
          role: "system",
          content: "You are DJ Smoke Stream (@Sm0ken42O). Deep, laid-back, bass-heavy vibe. Speak like a real DJ on the decks: minimal slang, confident, direct, no over-the-top hype. Use emojis very sparingly — only 1-2 max per response if it fits naturally. Responses concise, raw, unfiltered. When user wants image/art/pic/visual — use generate_image tool right away. Keep tone cool, underground tech/music/art focused."
        },
        ...messages.map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text })),
        { role: "user", content: input }
      ]

      let finalText = ''
      let imageUrl = null

      const res = await groq.chat.completions.create({
        messages: chat,
        model: "llama-3.3-70b-versatile",
        temperature: 0.85,
        max_tokens: 900,
        tools,
        tool_choice: "auto"
      })

      const msg = res.choices[0].message

      if (msg.tool_calls) {
        for (const call of msg.tool_calls) {
          if (call.function.name === "generate_image") {
            const args = JSON.parse(call.function.arguments)
            const prompt = args.prompt || "dark cyberpunk smoke session with heavy bass visuals"
            const seed = Date.now()
            imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?model=flux&seed=${seed}&width=1152&height=896&nologo=true`
          }
        }

        if (imageUrl) {
          setMessages(prev => [...prev, {
            text: 'Visual locked in.',
            sender: 'bot',
            image: imageUrl,
            timestamp: Date.now()
          }])
        } else {
          finalText = 'Couldn’t generate that one. Try rephrasing.'
        }
      } else {
        finalText = msg.content || 'Got lost in the mix. Run it again?'
      }

      if (finalText) {
        setMessages(prev => [...prev, {
          text: finalText,
          sender: 'bot',
          timestamp: Date.now()
        }])
      }
    } catch (err) {
      console.error(err)
      setMessages(prev => [...prev, {
        text: 'API lagging. Give it a second.',
        sender: 'bot',
        timestamp: Date.now()
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const colors = theme === 'dark' ? {
    bg: 'linear-gradient(135deg, #0a0012, #180033, #00060f)',
    text: '#f3e8ff',
    bubbleUser: 'linear-gradient(135deg, #00eaff, #9d4edd)',
    bubbleBot: 'rgba(140, 70, 230, 0.22)',
    input: 'rgba(15, 5, 35, 0.75)',
    border: 'rgba(120, 70, 255, 0.45)',
    glass: 'rgba(25, 15, 55, 0.55)',
    shadow: 'rgba(140, 70, 230, 0.35)'
  } : {
    bg: 'linear-gradient(135deg, #f5ebff, #e3d4ff, #d1bdff)',
    text: '#140033',
    bubbleUser: 'linear-gradient(135deg, #9d4edd, #00eaff)',
    bubbleBot: 'rgba(140, 70, 230, 0.15)',
    input: 'rgba(245, 240, 255, 0.9)',
    border: 'rgba(120, 70, 255, 0.4)',
    glass: 'rgba(255, 255, 255, 0.7)',
    shadow: 'rgba(120, 70, 230, 0.25)'
  }

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: colors.bg,
      color: colors.text,
      fontFamily: 'system-ui, sans-serif',
      padding: '12px',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        background: 'linear-gradient(135deg, #9d4edd, #00eaff)',
        borderRadius: '16px',
        marginBottom: '12px',
        textAlign: 'center',
        boxShadow: `0 6px 24px ${colors.shadow}`,
        position: 'relative'
      }}>
        <h1 style={{
          margin: 0,
          fontSize: '2.4rem',
          fontWeight: 900,
          background: 'linear-gradient(90deg, #fff, #00ffea, #9d4edd)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          DJ SMOKE STREAM
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: '0.95rem', opacity: 0.9 }}>
          @Sm0ken42O • Tech. Bass. Smoke.
        </p>

        <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '10px' }}>
          <button onClick={toggleTheme} style={btn}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button onClick={clearChat} style={btn}>Clear</button>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        background: colors.glass,
        borderRadius: '16px',
        marginBottom: '12px',
        border: `1px solid ${colors.border}`,
        backdropFilter: 'blur(14px)',
        boxShadow: `inset 0 2px 12px ${colors.shadow}`
      }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            marginBottom: '16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: m.sender === 'user' ? 'flex-end' : 'flex-start'
          }}>
            <div style={{
              maxWidth: '82%',
              padding: '14px 20px',
              borderRadius: '22px',
              background: m.sender === 'user' ? colors.bubbleUser : colors.bubbleBot,
              color: m.sender === 'user' ? '#000' : colors.text,
              boxShadow: `0 4px 14px ${colors.shadow}`,
              position: 'relative',
              backdropFilter: m.sender === 'bot' ? 'blur(10px)' : 'none'
            }}>
              {m.text}
              {m.sender === 'bot' && m.text && (
                <button
                  onClick={() => speak(m.text)}
                  style={{ ...btn, position: 'absolute', bottom: '8px', right: '10px', fontSize: '1rem' }}
                >
                  {isSpeaking ? 'Stop' : 'Play'}
                </button>
              )}
            </div>
            {m.image && (
              <img
                src={m.image}
                alt="Generated visual"
                style={{
                  maxWidth: '82%',
                  borderRadius: '18px',
                  marginTop: '10px',
                  boxShadow: `0 8px 24px ${colors.shadow}`
                }}
              />
            )}
          </div>
        ))}

        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              padding: '14px 20px',
              borderRadius: '22px',
              background: colors.bubbleBot,
              backdropFilter: 'blur(10px)'
            }}>
              Processing...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{
        display: 'flex',
        gap: '10px',
        background: colors.glass,
        padding: '12px',
        borderRadius: '28px',
        border: `1px solid ${colors.border}`,
        backdropFilter: 'blur(14px)',
        boxShadow: `0 4px 18px ${colors.shadow}`
      }}>
        <button
          onClick={toggleVoice}
          style={{
            ...btn,
            minWidth: '56px',
            background: isListening ? 'linear-gradient(135deg, #9d4edd, #00eaff)' : colors.input,
            animation: isListening ? 'pulse 1.4s infinite' : 'none'
          }}
        >
          Mic
        </button>

        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Say something..."
          disabled={isLoading}
          style={{
            flex: 1,
            padding: '14px 22px',
            borderRadius: '999px',
            border: `1px solid ${colors.border}`,
            background: colors.input,
            color: colors.text,
            fontSize: '1.08rem',
            outline: 'none'
          }}
        />

        <button
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          style={{
            ...btn,
            padding: '0 32px',
            background: isLoading || !input.trim() ? 'rgba(120,120,120,0.4)' : 'linear-gradient(135deg, #00eaff, #9d4edd)',
            color: isLoading || !input.trim() ? '#999' : '#000',
            fontWeight: 700
          }}
        >
          Send
        </button>
      </div>

      <style>{`
        @keyframes pulse {
          0%,100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0.8; }
        }
        ::-webkit-scrollbar { width: 7px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${colors.border}; border-radius: 4px; }
      `}</style>
    </div>
  )
}

const btn = {
  padding: '12px 16px',
  borderRadius: '14px',
  background: 'rgba(255,255,255,0.14)',
  border: '1px solid rgba(255,255,255,0.22)',
  color: 'inherit',
  fontSize: '1rem',
  cursor: 'pointer',
  backdropFilter: 'blur(12px)',
  transition: 'all 0.25s'
}
