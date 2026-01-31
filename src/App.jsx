import { useState, useRef, useEffect } from 'react'
import Groq from 'groq-sdk'

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('chatHistory')
    return saved ? JSON.parse(saved) : [
      { 
        text: '💯 Yo what’s good fam! Epic Tech AI locked in — cannabis vibes & caffeine flow ☕🌿 Hit me with anything 🔥', 
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
    u.rate = 1.05
    u.pitch = 1.1
    u.onend = () => setIsSpeaking(false)
    synthRef.current.speak(u)
    setIsSpeaking(true)
  }

  const clearChat = () => {
    if (confirm('Wipe the whole convo?')) {
      setMessages([{
        text: '💯 Fresh start baby — let’s get lit again 🔥',
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
            description: "Generate a dope AI image. Use this whenever user asks for art, picture, visual, generate image, make me a pic, etc.",
            parameters: {
              type: "object",
              properties: {
                prompt: { type: "string", description: "Detailed description of the image — go wild" }
              },
              required: ["prompt"]
            }
          }
        }
      ]

      let chat = [
        {
          role: "system",
          content: "You are Epic Tech AI @Sm0ken42O — 100 emoji energy, cannabis & caffeine powered, raw creative vibes. Talk like a real one: slang, 🔥 emojis, hype tech/AI/music/art talk (big on DJ Smoke Stream). Always respond fast, fun, unfiltered. When user wants image/art/visual/pic/photo/artwork — use generate_image tool immediately. Keep it lit."
        },
        ...messages.map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text })),
        { role: "user", content: input }
      ]

      let finalResponse = ''
      let imageUrl = null

      const res = await groq.chat.completions.create({
        messages: chat,
        model: "llama-3.3-70b-versatile",
        temperature: 0.9,
        max_tokens: 1200,
        tools,
        tool_choice: "auto"
      })

      const msg = res.choices[0].message

      if (msg.tool_calls) {
        for (const call of msg.tool_calls) {
          if (call.function.name === "generate_image") {
            const args = JSON.parse(call.function.arguments)
            const prompt = args.prompt || "futuristic cannabis infused cyberpunk DJ setup neon glow"
            const seed = Date.now()
            imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?model=flux&seed=${seed}&width=1024&height=1024&nologo=true`
          }
        }

        // Add image to chat
        if (imageUrl) {
          setMessages(prev => [...prev, {
            text: `🔥 Fresh visual drop: ${input}`,
            sender: 'bot',
            image: imageUrl,
            timestamp: Date.now()
          }])
        } else {
          finalResponse = "Damn, couldn't cook that image — try rephrasing? 🔥"
        }
      } else {
        finalResponse = msg.content || "Ayo something tripped — run that back? ☁️"
      }

      if (finalResponse) {
        setMessages(prev => [...prev, {
          text: finalResponse,
          sender: 'bot',
          timestamp: Date.now()
        }])
      }
    } catch (err) {
      console.error(err)
      setMessages(prev => [...prev, {
        text: "⚠️ Groq takin a quick smoke break — hit me again in a sec ☁️",
        sender: 'bot',
        timestamp: Date.now()
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const colors = theme === 'dark' ? {
    bg: 'linear-gradient(135deg, #0f001a, #1a0033, #000814)',
    text: '#f0e6ff',
    bubbleUser: 'linear-gradient(135deg, #00d4ff, #7c3aed)',
    bubbleBot: 'rgba(120, 60, 200, 0.18)',
    input: 'rgba(20, 10, 40, 0.7)',
    border: 'rgba(100, 60, 255, 0.4)',
    glass: 'rgba(30, 20, 60, 0.5)',
    shadow: 'rgba(120, 60, 200, 0.3)'
  } : {
    bg: 'linear-gradient(135deg, #f0e8ff, #e0d4ff, #d0c0ff)',
    text: '#1a0033',
    bubbleUser: 'linear-gradient(135deg, #7c3aed, #00d4ff)',
    bubbleBot: 'rgba(120, 60, 200, 0.12)',
    input: 'rgba(240, 235, 255, 0.85)',
    border: 'rgba(100, 60, 255, 0.35)',
    glass: 'rgba(255, 255, 255, 0.65)',
    shadow: 'rgba(100, 60, 200, 0.2)'
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
        background: 'linear-gradient(135deg, #7c3aed, #00d4ff)',
        borderRadius: '16px',
        marginBottom: '12px',
        textAlign: 'center',
        boxShadow: `0 6px 20px ${colors.shadow}`,
        position: 'relative'
      }}>
        <h1 style={{
          margin: 0,
          fontSize: '2.4rem',
          fontWeight: 900,
          background: 'linear-gradient(90deg, #fff, #00ffea, #ff00aa)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          💯 EPIC TECH AI 🔥
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: '0.95rem', opacity: 0.9 }}>
          @Sm0ken42O • Cannabis × Caffeine Powered ☁️☕
        </p>

        <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '10px' }}>
          <button onClick={toggleTheme} style={btn}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button onClick={clearChat} style={btn}>🗑️</button>
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
        backdropFilter: 'blur(12px)',
        boxShadow: `inset 0 2px 10px ${colors.shadow}`
      }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            marginBottom: '16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: m.sender === 'user' ? 'flex-end' : 'flex-start'
          }}>
            <div style={{
              maxWidth: '80%',
              padding: '14px 18px',
              borderRadius: '20px',
              background: m.sender === 'user' ? colors.bubbleUser : colors.bubbleBot,
              color: m.sender === 'user' ? '#000' : colors.text,
              boxShadow: `0 3px 12px ${colors.shadow}`,
              position: 'relative',
              backdropFilter: m.sender === 'bot' ? 'blur(8px)' : 'none'
            }}>
              {m.text}
              {m.sender === 'bot' && m.text && (
                <button
                  onClick={() => speak(m.text)}
                  style={{ ...btn, position: 'absolute', bottom: '6px', right: '8px', fontSize: '0.9rem' }}
                >
                  {isSpeaking ? '🔇' : '🔊'}
                </button>
              )}
            </div>
            {m.image && (
              <img
                src={m.image}
                alt="AI gen"
                style={{
                  maxWidth: '80%',
                  borderRadius: '16px',
                  marginTop: '8px',
                  boxShadow: `0 6px 20px ${colors.shadow}`
                }}
              />
            )}
          </div>
        ))}

        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              padding: '14px 18px',
              borderRadius: '20px',
              background: colors.bubbleBot,
              backdropFilter: 'blur(8px)'
            }}>
              Cookin somethin crazy... 🔥
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
        borderRadius: '24px',
        border: `1px solid ${colors.border}`,
        backdropFilter: 'blur(12px)',
        boxShadow: `0 4px 16px ${colors.shadow}`
      }}>
        <button
          onClick={toggleVoice}
          style={{
            ...btn,
            minWidth: '52px',
            background: isListening ? 'linear-gradient(135deg, #ff3366, #ff00aa)' : colors.input,
            animation: isListening ? 'pulse 1.2s infinite' : 'none'
          }}
        >
          🎤
        </button>

        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Drop that heat..."
          disabled={isLoading}
          style={{
            flex: 1,
            padding: '14px 20px',
            borderRadius: '999px',
            border: `1px solid ${colors.border}`,
            background: colors.input,
            color: colors.text,
            fontSize: '1.05rem',
            outline: 'none'
          }}
        />

        <button
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          style={{
            ...btn,
            padding: '0 28px',
            background: isLoading || !input.trim() ? 'rgba(100,100,100,0.4)' : 'linear-gradient(135deg, #00ffea, #ff00aa)',
            color: isLoading || !input.trim() ? '#888' : '#000',
            fontWeight: 700
          }}
        >
          {isLoading ? '...' : 'Send'}
        </button>
      </div>

      <style>{`
        @keyframes pulse {
          0%,100% { transform: scale(1); }
          50% { transform: scale(1.12); }
        }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${colors.border}; border-radius: 3px; }
      `}</style>
    </div>
  )
}

const btn = {
  padding: '12px',
  borderRadius: '12px',
  background: 'rgba(255,255,255,0.12)',
  border: '1px solid rgba(255,255,255,0.2)',
  color: 'inherit',
  fontSize: '1.1rem',
  cursor: 'pointer',
  backdropFilter: 'blur(10px)',
  transition: 'all 0.2s'
}
