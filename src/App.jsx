import { useState, useRef, useEffect } from 'react'
import Groq from 'groq-sdk'

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('chatHistory')
    return saved ? JSON.parse(saved) : [
      { 
        text: 'Epic Tech AI online. Real-time access ready. Drop whatever — I’m locked in.', 
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

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark')

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
    u.rate = 0.88
    u.pitch = 0.68
    u.volume = 0.95

    const voices = synthRef.current.getVoices()
    const preferred = voices.find(v => 
      v.lang.startsWith('en-') && 
      (v.name.toLowerCase().includes('deep') || v.name.includes('Google') || v.name.includes('Microsoft') || v.name.toLowerCase().includes('male'))
    ) || voices.find(v => v.lang.startsWith('en-'))

    if (preferred) u.voice = preferred

    u.onend = () => setIsSpeaking(false)
    synthRef.current.speak(u)
    setIsSpeaking(true)
  }

  const clearChat = () => {
    if (confirm('Clear session?')) {
      setMessages([{
        text: 'Session reset. Clean slate. What’s next?',
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
            name: "web_search",
            description: "Search the web for current information.",
            parameters: {
              type: "object",
              properties: {
                query: { type: "string", description: "Search query" }
              },
              required: ["query"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "generate_image",
            description: "Generate an image. Use when visual content is requested.",
            parameters: {
              type: "object",
              properties: {
                prompt: { type: "string", description: "Image description" }
              },
              required: ["prompt"]
            }
          }
        }
      ]

      let chat = [
        {
          role: "system",
          content: "You are Epic Tech AI with DJ Smoke Stream energy: deep, laid-back, confident, underground tone. You have real-time web access and can do anything. Responses concise, direct. Emojis rare. Use tools when needed. For images, use Pollinations Flux; fallback if limited."
        },
        ...messages.map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text })),
        { role: "user", content: input }
      ]

      let finalText = ''
      let imageUrl = null

      let completion = await groq.chat.completions.create({
        messages: chat,
        model: "llama-3.3-70b-versatile",  // Fixed: current supported model
        temperature: 0.9,
        max_tokens: 1500,
        tools,
        tool_choice: "auto"
      })

      let msg = completion.choices[0].message

      while (msg.tool_calls) {
        chat.push(msg)

        for (const call of msg.tool_calls) {
          if (call.function.name === "web_search") {
            const args = JSON.parse(call.function.arguments)
            // Placeholder for real search (add actual API later)
            const searchResult = `Web results for "${args.query}": [Placeholder - integrate real search API]`
            chat.push({
              role: "tool",
              tool_call_id: call.id,
              name: call.function.name,
              content: searchResult
            })
          } else if (call.function.name === "generate_image") {
            const args = JSON.parse(call.function.arguments)
            const prompt = args.prompt || "dark atmospheric tech smoke session heavy bass aesthetic"
            const seed = Date.now()
            imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?model=flux&seed=${seed}&width=1152&height=896&nologo=true`
            chat.push({
              role: "tool",
              tool_call_id: call.id,
              name: call.function.name,
              content: `Image generated: ${imageUrl}`
            })
          }
        }

        completion = await groq.chat.completions.create({
          messages: chat,
          model: "llama-3.3-70b-versatile",
          temperature: 0.9,
          max_tokens: 1500
        })

        msg = completion.choices[0].message
      }

      finalText = msg.content || 'Signal dropped. Try again?'

      setMessages(prev => [...prev, {
        text: finalText,
        sender: 'bot',
        image: imageUrl,
        timestamp: Date.now()
      }])
    } catch (err) {
      console.error('Groq API Error:', err)
      let errorMsg = 'API error. Check console.'
      if (err.message?.includes('400') || err.message?.includes('model')) {
        errorMsg = 'Model issue or invalid request. Check Groq dashboard and API key.'
      } else if (err.message?.includes('401') || err.message?.includes('auth')) {
        errorMsg = 'API key invalid or expired. Update VITE_GROQ_API_KEY in Vercel env vars.'
      } else if (err.message?.includes('rate')) {
        errorMsg = 'Rate limit hit. Wait a minute.'
      }
      setMessages(prev => [...prev, {
        text: errorMsg,
        sender: 'bot',
        timestamp: Date.now()
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const colors = theme === 'dark' ? {
    bg: 'linear-gradient(135deg, #0a0012 0%, #180033 50%, #00060f 100%)',
    text: '#f3e8ff',
    bubbleUser: 'linear-gradient(135deg, #00eaff, #9d4edd)',
    bubbleBot: 'rgba(140, 70, 230, 0.35)',
    input: 'rgba(15, 5, 35, 0.92)',
    border: 'rgba(120, 70, 255, 0.28)',
    glass: 'rgba(25, 15, 55, 0.75)',
    shadow: 'rgba(140, 70, 230, 0.25)'
  } : {
    bg: 'linear-gradient(135deg, #f5ebff 0%, #e3d4ff 50%, #d1bdff 100%)',
    text: '#140033',
    bubbleUser: 'linear-gradient(135deg, #9d4edd, #00eaff)',
    bubbleBot: 'rgba(140, 70, 230, 0.22)',
    input: 'rgba(245, 240, 255, 0.96)',
    border: 'rgba(120, 70, 255, 0.25)',
    glass: 'rgba(255, 255, 255, 0.85)',
    shadow: 'rgba(120, 70, 230, 0.18)'
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      margin: 0,
      padding: 0,
      background: colors.bg,
      color: colors.text,
      fontFamily: 'system-ui, sans-serif',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 0',
        background: 'linear-gradient(135deg, #9d4edd, #00eaff)',
        textAlign: 'center',
        boxShadow: `0 4px 16px ${colors.shadow}`
      }}>
        <h1 style={{
          margin: '0 0 4px 0',
          fontSize: '2.4rem',
          fontWeight: 900,
          background: 'linear-gradient(90deg, #fff, #00ffea, #9d4edd)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          EPIC TECH AI
        </h1>
        <p style={{ margin: 0, fontSize: '0.95rem', opacity: 0.9 }}>
          @Sm0ken42O • Deep tech. Heavy smoke. Real-time on.
        </p>

        <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '10px' }}>
          <button onClick={toggleTheme} style={btn}>
            {theme === 'dark' ? 'Light' : 'Dark'}
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
        backdropFilter: 'blur(16px)',
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
                  style={{ ...btn, position: 'absolute', bottom: '8px', right: '10px', fontSize: '0.95rem' }}
                >
                  {isSpeaking ? 'Stop' : 'Play'}
                </button>
              )}
            </div>
            {m.image && (
              <img
                src={m.image}
                alt="Generated"
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
              Thinking...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{
        display: 'flex',
        gap: '10px',
        padding: '12px',
        background: colors.glass,
        backdropFilter: 'blur(16px)',
        boxShadow: `0 -4px 16px ${colors.shadow}`
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
          placeholder="Speak your mind..."
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
          DROP
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
