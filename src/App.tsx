import { useState } from 'react'

const MAX_LENGTH = 500;

function App() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const handleTranslate = async () => {
    if (!input.trim()) return
    
    setLoading(true)
    setError('')
    
    try {
      // For now, we'll use a mock that simulates the API
      // In production, this would call your backend which calls Claude
      const response = await corporateTranslate(input)
      setOutput(response)
    } catch (err) {
      setError('Failed to corporatize. The synergy is weak today.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey) {
      handleTranslate()
    }
  }

  const handleExample = (text: string) => {
    setInput(text)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent">
            CoproChat
          </h1>
          <p className="text-slate-400 text-lg">
            Translate human language into corporate bullshit 💩
          </p>
          <p className="text-slate-600 text-xs mt-2 italic">
            Because someone has to say "let's circle back" unironically
          </p>
        </div>

        {/* Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-400 mb-2">
            What you actually mean:
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, MAX_LENGTH))}
            onKeyDown={handleKeyDown}
            placeholder="I don't want to do this..."
            maxLength={MAX_LENGTH}
            className="w-full h-32 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none text-lg"
          />
          <div className="flex justify-between text-xs mt-1">
            <span className="text-slate-500">⌘+Enter to translate</span>
            <span className={input.length > MAX_LENGTH * 0.9 ? 'text-amber-400' : 'text-slate-500'}>
              {input.length}/{MAX_LENGTH}
            </span>
          </div>
        </div>

        {/* Translate button */}
        <button
          onClick={handleTranslate}
          disabled={!input.trim() || loading}
          className="w-full py-4 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed rounded-xl font-semibold text-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]"
        >
          {loading ? '🔄 Synergizing...' : '💩 Make It Corporate 💩'}
        </button>

        {/* Error */}
        {error && (
          <div className="mt-4 p-4 bg-red-900/30 border border-red-700 rounded-xl text-red-300">
            {error}
          </div>
        )}

        {/* Output */}
        {output && !loading && (
          <div className="mt-8">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-slate-400">
                What you'll say in the meeting:
              </label>
              <button
                onClick={handleCopy}
                className="text-sm text-amber-400 hover:text-amber-300 transition-colors"
              >
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
            <div className="p-6 bg-gradient-to-br from-slate-800/80 to-slate-800/40 border border-amber-900/30 rounded-xl">
              <p className="text-lg leading-relaxed">{output}</p>
            </div>
          </div>
        )}

        {/* Examples */}
        <div className="mt-12 pt-8 border-t border-slate-800">
          <h3 className="text-sm font-medium text-slate-400 mb-4">Try these (click to load):</h3>
          <div className="flex flex-wrap gap-2">
            {[
              "We're cutting this project",
              "I don't want to do this",
              "This is a bad idea",
              "No",
              "The launch failed",
              "I'll do it later",
              "That's not my job",
              "This meeting could have been an email",
              "I have no idea what I'm doing",
            ].map((example) => (
              <button
                key={example}
                onClick={() => handleExample(example)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-300 transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-slate-500 text-sm">
          <p>Built by <a href="https://minimumclicks.com" className="text-amber-400 hover:underline">Minimum Clicks</a></p>
          <p className="mt-1">Inspired by the $280k IT Director's Guide to Corporate Survival</p>
        </div>
      </div>
    </div>
  )
}

// Call the backend API
const API_URL = import.meta.env.DEV ? 'http://localhost:3001' : '';

async function corporateTranslate(input: string): Promise<string> {
  const response = await fetch(`${API_URL}/api/translate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: input }),
  })
  
  if (!response.ok) {
    throw new Error('Translation failed')
  }
  
  const data = await response.json()
  return data.translation
}

export default App
