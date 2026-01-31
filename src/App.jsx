import { useState, useRef, useEffect } from 'react'
import Groq from 'groq-sdk'
import { useAuth } from './AuthContext'
import AuthModal from './AuthModal'
import { saveChatHistory, loadChatHistory } from './chatService'

export default function App() {
  const { user, loading: authLoading, signOut } = useAuth()

  // Theme state
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')

  // Chat state
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('chatHistory')
    return saved ? JSON.parse(saved) : [
      { text: '💯 Epic Tech AI is online! Fueled by cannabis & caffeine ☕🌿', sender: 'bot', timestamp: Date.now() }
    ]
  })
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)

  // Voice state
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const recognitionRef = useRef(null)
  const synthRef = useRef(window.speechSynthesis)

  // Media generation state
  const [showMediaGen, setShowMediaGen] = useState(false)
  const [imagePrompt, setImagePrompt] = useState('')

  // History sidebar state
  const [showHistory, setShowHistory] = useState(false)

  // Auth & user menu state
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)

  // Load chat history from DB when user logs in
  useEffect(() => {
    if (user) {
      loadChatHistory(user.id).then(dbMessages => {
        if (dbMessages && dbMessages.length > 0) {
          setMessages(dbMessages)
        }
      })
    }
  }, [user])

  // Save messages to localStorage and DB
  useEffect(() => {
    localStorage.setItem('chatHistory', JSON.stringify(messages))
    if (user) {
      saveChatHistory(user.id, messages)
    }
  }, [messages, user])

  // Save theme
  useEffect(() => {
    localStorage.setItem('theme', theme)
  }, [theme])

  // Speech recognition setup
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript
        setInput(transcript)
        setIsListening(false)
      }
      recognitionRef.current.onerror = () => setIsListening(false)
      recognitionRef.current.onend = () => setIsListening(false)
    }
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => scrollToBottom(), [messages])

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark')

  const toggleVoiceInput = () => {
    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
    } else {
      recognitionRef.current?.start()
      setIsListening(true)
    }
  }

  const speakText = (text) => {
    if (isSpeaking) {
      synthRef.current.cancel()
      setIsSpeaking(false)
      return
    }
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1.0
    utterance.pitch = 1.0
    utterance.onend = () => setIsSpeaking(false)
    synthRef.current.speak(utterance)
    setIsSpeaking(true)
  }

  const clearHistory = () => {
    if (confirm('Clear all chat history?')) {
      setMessages([
        { text: '💯 Epic Tech AI is online! Fueled by cannabis & caffeine ☕🌿', sender: 'bot', timestamp: Date.now() }
      ])
    }
  }

  const exportChat = () => {
    const chatText = messages.map(m => `[${m.sender}]: ${m.text}`).join('\n\n')
    const blob = new Blob([chatText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `epic-tech-ai-chat-${Date.now()}.txt`
    a.click()
  }

  const handleGenerateMedia = () => {
    if (!imagePrompt.trim()) return
    const prompt = imagePrompt.trim()
    const encoded = encodeURIComponent(prompt)
    const imageUrl = `https://image.pollinations.ai/prompt/${encoded}?model=flux&seed=${Date.now()}`
    setMessages(prev => [...prev, {
      text: `🎨 Manually generated: "${prompt}"`,
      sender: 'bot',
      timestamp: Date.now(),
      image: imageUrl
    }])
    setImagePrompt('')
    setShowMediaGen(false)
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

      let chatMessages = [
        {
          role: 'system',
          content: 'You are Epic Tech AI, a creative multimedia artist who makes music, videos, and AI art. You are fueled by cannabis and caffeine. You are friendly, creative, and enthusiastic about technology, AI, music production (especially DJ Smoke Stream), and digital art. Keep responses conversational and engaging. You can generate images using the provided tool when the user requests visual content.'
        },
        ...messages.map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text
        })),
        { role: 'user', content: input }
      ]

      const tools = [
        {
          type: 'function',
          function: {
            name: 'generate_image',
            description: 'Generate an AI image based on a detailed prompt.',
            parameters: {
              type: 'object',
              properties: {
                prompt: { type: 'string', description: 'Detailed description of the image to generate.' }
              },
              required: ['prompt']
            }
          }
        }
      ]

      while (true) {
        const completion = await groq.chat.completions.create({
          messages: chatMessages,
          model: 'llama-3.3-70b-versatile',
          temperature: 0.7,
          max_tokens: 1024,
          tools: tools,
          tool_choice: 'auto'
        })

        const message = completion.choices[0]?.message
        if (!message) break

        chatMessages.push(message)

        if (message.tool_calls) {
          for (const tool_call of message.tool_calls) {
            if (tool_call.function.name === 'generate_image') {
              const args = JSON.parse(tool_call.function.arguments)
              const prompt = args.prompt || 'epic tech art'
              const encoded = encodeURIComponent(prompt)
              const imageUrl = `https://image.pollinations.ai/prompt/${encoded}?model=flux&seed=${Date.now()}`
              setMessages(prev => [...prev, {
                text: '',
                sender: 'bot',
                timestamp: Date.now(),
                image: imageUrl
              }])

              chatMessages.push({
                role: 'tool',
                tool_call_id: tool_call.id,
                content: JSON.stringify({ image_url: imageUrl })
              })
            }
          }
        } else {
          const botResponse = message.content || 'Sorry, something went wrong.'
          setMessages(prev => [...prev, { text: botResponse, sender: 'bot', timestamp: Date.now() }])
          break
        }
      }
    } catch (error) {
      console.error('Groq API Error:', error)
      setMessages(prev => [...prev, {
        text: '⚠️ Oops! Something went wrong. The AI is taking a coffee break ☕',
        sender: 'bot',
        timestamp: Date.now()
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const colors = theme === 'dark' ? {
    bg: 'linear-gradient(135deg, #0a0015 0%, #1a0033 50%, #0f001a 100%)',
    text: '#e8f4f8',
    headerBg: 'linear-gradient(135deg, #00f0ff 0%, #a855f7 50%, #ff00aa 100%)',
    headerText: '#000',
    messageBg: 'rgba(26, 0, 51, 0.4)',
    userBubble: 'linear-gradient(135deg, #00f0ff 0%, #00d4ff 100%)',
    botBubble: 'rgba(0, 240, 255, 0.08)',
    inputBg: 'rgba(10, 0, 21, 0.6)',
    border: 'rgba(0, 240, 255, 0.25)',
    glass: 'rgba(255, 255, 255, 0.05)',
    shadow: 'rgba(0, 240, 255, 0.15)'
  } : {
    bg: 'linear-gradient(135deg, #f0f4ff 0%, #e0e7ff 50%, #f5f3ff 100%)',
    text: '#1e293b',
    headerBg: 'linear-gradient(135deg, #00d4ff 0%, #a855f7 50%, #ff0080 100%)',
    headerText: '#fff',
    messageBg: 'rgba(255, 255, 255, 0.7)',
    userBubble: 'linear-gradient(135deg, #00d4ff 0%, #0099ff 100%)',
    botBubble: 'rgba(0, 212, 255, 0.08)',
    inputBg: 'rgba(255, 255, 255, 0.8)',
    border: 'rgba(0, 212, 255, 0.3)',
    glass: 'rgba(255, 255, 255, 0.6)',
    shadow: 'rgba(0, 0, 0, 0.1)'
  }

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: colors.bg,
      color: colors.text,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      padding: '16px',
      position: 'relative'
    }}>
      {/* Header */}
      <div style={{
        position: 'relative',
        textAlign: 'center',
        padding: '24px',
        background: colors.headerBg,
        borderRadius: '16px',
        marginBottom: '16px',
        boxShadow: `0 8px 32px ${colors.shadow}`,
        backdropFilter: 'blur(10px)'
      }}>
        {/* User button (left) */}
        <div style={{ position: 'absolute', top: '16px', left: '16px' }}>
          <button
            onClick={() => user ? setShowUserMenu(!showUserMenu) : setShowAuthModal(true)}
            style={{ ...buttonStyle, minWidth: '48px', minHeight: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {user ? (user.photoURL ? <img src={user.photoURL} alt="User" style={{ width: '32px', height: '32px', borderRadius: '50%' }} /> : '👤') : 'Login'}
          </button>
        </div>

        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: '900',
          letterSpacing: '2px',
          background: 'linear-gradient(90deg, #ffffff, #00f0ff, #ff00aa)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          margin: 0
        }}>
          💯 EPIC TECH AI 🔥
        </h1>
        <p style={{ margin: '8px 0 0', fontSize: '0.9rem', color: colors.headerText, fontWeight: '600' }}>
          @Sm0ken42O • Fueled by Cannabis & Caffeine ☕🌿
        </p>

        {/* Controls (right) */}
        <div style={{ position: 'absolute', top: '16px', right: '16px', display: 'flex', gap: '8px' }}>
          <button onClick={toggleTheme} style={{ ...buttonStyle, minWidth: '48px', minHeight: '48px' }}>{theme === 'dark' ? '☀️' : '🌙'}</button>
          <button onClick={() => setShowHistory(!showHistory)} style={{ ...buttonStyle, minWidth: '48px', minHeight: '48px' }}>📜</button>
          <button onClick={() => setShowMediaGen(true)} style={{ ...buttonStyle, minWidth: '48px', minHeight: '48px' }}>🎨</button>
        </div>
      </div>

      {/* User menu dropdown */}
      {showUserMenu && user && (
        <div style={{
          position: 'absolute',
          top: '80px',
          left: '16px',
          width: '240px',
          background: colors.messageBg,
          border: `1px solid ${colors.border}`,
          borderRadius: '16px',
          padding: '16px',
          zIndex: 1000,
          boxShadow: `0 8px 32px ${colors.shadow}`,
          backdropFilter: 'blur(20px)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            {user.photoURL ? <img src={user.photoURL} alt="User" style={{ width: '48px', height: '48px', borderRadius: '50%' }} /> : '👤'}
            <div>
              <div style={{ fontWeight: '700' }}>{user.displayName || 'User'}</div>
              <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>{user.email}</div>
            </div>
          </div>
          <button onClick={() => { signOut(); setShowUserMenu(false) }} style={{ ...buttonStyle, width: '100%' }}>
            Sign Out
          </button>
        </div>
      )}

      {/* History sidebar */}
      {showHistory && (
        <div style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          width: '320px',
          maxHeight: '80vh',
          background: colors.messageBg,
          border: `1px solid ${colors.border}`,
          borderRadius: '16px',
          padding: '24px',
          zIndex: 1000,
          backdropFilter: 'blur(20px)',
          boxShadow: `0 8px 32px ${colors.shadow}`
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontWeight: '700' }}>Chat History</h3>
            <button onClick={() => setShowHistory(false)} style={{ ...buttonStyle }}>✕</button>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button onClick={clearHistory} style={{ ...buttonStyle, flex: 1 }}>Clear</button>
            <button onClick={exportChat} style={{ ...buttonStyle, flex: 1 }}>Export</button>
          </div>
          <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>{messages.length} messages</div>
        </div>
      )}

      {/* Media Generation Modal */}
      {showMediaGen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowMediaGen(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '90%',
            maxWidth: '500px',
            background: colors.messageBg,
            border: `1px solid ${colors.border}`,
            borderRadius: '20px',
            padding: '32px',
            boxShadow: `0 8px 32px ${colors.shadow}`,
            backdropFilter: 'blur(20px)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, fontWeight: '700' }}>🎨 Generate Image</h3>
              <button onClick={() => setShowMediaGen(false)} style={{ ...buttonStyle }}>✕</button>
            </div>
            <input
              type="text"
              value={imagePrompt}
              onChange={e => setImagePrompt(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleGenerateMedia()}
              placeholder="Describe the image you want..."
              style={{
                width: '100%',
                padding: '16px 20px',
                borderRadius: '12px',
                border: `2px solid ${colors.border}`,
                background: colors.inputBg,
                color: colors.text,
                fontSize: '1rem',
                marginBottom: '16px',
                outline: 'none'
              }}
            />
            <button
              onClick={handleGenerateMedia}
              disabled={!imagePrompt.trim()}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '12px',
                background: !imagePrompt.trim() ? 'rgba(100,100,100,0.5)' : 'linear-gradient(135deg, #00f0ff, #ff00aa)',
                color: !imagePrompt.trim() ? '#666' : '#000',
                border: 'none',
                fontWeight: '700'
              }}
            >
              Generate Image
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px',
        background: colors.messageBg,
        borderRadius: '16px',
        marginBottom: '16px',
        border: `1px solid ${colors.border}`,
        backdropFilter: 'blur(20px)',
        boxShadow: `0 4px 16px ${colors.shadow}`
      }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            marginBottom: '16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start'
          }}>
            <div style={{
              padding: '16px 20px',
              borderRadius: '20px',
              background: msg.sender === 'user' ? colors.userBubble : colors.botBubble,
              border: msg.sender === 'bot' ? `1px solid ${colors.border}` : 'none',
              color: msg.sender === 'user' ? '#000' : colors.text,
              maxWidth: '75%',
              boxShadow: `0 4px 16px ${colors.shadow}`,
              position: 'relative',
              backdropFilter: msg.sender === 'bot' ? 'blur(10px)' : 'none'
            }}>
              {msg.text}
              {msg.sender === 'bot' && msg.text && (
                <button
                  onClick={() => speakText(msg.text)}
                  style={{ ...buttonStyle, position: 'absolute', bottom: '8px', right: '8px', fontSize: '0.875rem' }}
                >
                  {isSpeaking ? '🔇' : '🔊'}
                </button>
              )}
            </div>
            {msg.image && (
              <img
                src={msg.image}
                alt="Generated"
                style={{
                  maxWidth: '75%',
                  borderRadius: '16px',
                  marginTop: '8px',
                  boxShadow: `0 4px 16px ${colors.shadow}`
                }}
              />
            )}
          </div>
        ))}

        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '16px' }}>
            <div style={{
              padding: '16px 20px',
              borderRadius: '20px',
              background: colors.botBubble,
              border: `1px solid ${colors.border}`,
              backdropFilter: 'blur(10px)'
            }}>
              Thinking... 🤔
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{
        display: 'flex',
        gap: '8px',
        background: colors.messageBg,
        padding: '16px',
        borderRadius: '16px',
        border: `1px solid ${colors.border}`,
        backdropFilter: 'blur(20px)',
        boxShadow: `0 4px 16px ${colors.shadow}`
      }}>
        <button
          onClick={toggleVoiceInput}
          style={{
            ...buttonStyle,
            minWidth: '48px',
            minHeight: '48px',
            background: isListening ? 'linear-gradient(135deg, #ff0080, #ff00aa)' : colors.inputBg
          }}
        >
          🎤
        </button>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Type a message..."
          disabled={isLoading}
          style={{
            flex: 1,
            padding: '14px 20px',
            borderRadius: '24px',
            border: `2px solid ${colors.border}`,
            background: colors.inputBg,
            color: colors.text,
            fontSize: '1rem',
            outline: 'none'
          }}
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          style={{
            padding: '14px 32px',
            borderRadius: '24px',
            background: isLoading || !input.trim() ? 'rgba(100,100,100,0.5)' : 'linear-gradient(135deg, #00f0ff, #ff00aa)',
            color: isLoading || !input.trim() ? '#666' : '#000',
            border: 'none',
            fontWeight: '700'
          }}
        >
          {isLoading ? '...' : 'Send'}
        </button>
      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal colors={colors} onClose={() => setShowAuthModal(false)} />
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: ${colors.glass}; border-radius: 4px; }
        ::-webkit-scrollbar-thumb { background: ${colors.border}; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: ${colors.shadow}; }
      `}</style>
    </div>
  )
}

const buttonStyle = {
  padding: '12px 16px',
  borderRadius: '12px',
  background: 'rgba(0, 240, 255, 0.15)',
  border: '1px solid rgba(0, 240, 255, 0.3)',
  color: 'inherit',
  cursor: 'pointer',
  fontSize: '1rem',
  transition: 'all 0.3s ease',
  fontWeight: '600',
  backdropFilter: 'blur(10px)'
}
