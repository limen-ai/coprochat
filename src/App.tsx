import { useState } from 'react'

const MAX_LENGTH = 500;

type Mode = 'corporatize' | 'humanize';
type BSLevel = 'pm' | 'director' | 'vp';

const BS_LEVELS: { id: BSLevel; label: string; emoji: string; description: string }[] = [
  { id: 'pm', label: 'Product Manager', emoji: '📋', description: 'Light jargon, still human' },
  { id: 'director', label: 'Director', emoji: '📊', description: 'Heavy buzzwords, some fluff' },
  { id: 'vp', label: 'VP', emoji: '🚀', description: 'Maximum synergy, pure theatre' },
];

const EXAMPLES = {
  corporatize: [
    "We're cutting this project",
    "I don't want to do this",
    "This is a bad idea",
    "No",
    "The launch failed",
    "I'll do it later",
    "That's not my job",
    "This meeting could have been an email",
    "I have no idea what I'm doing",
    "You're wrong",
    "Stop micromanaging me",
    "We wasted 6 months on this",
    "The CEO's idea is stupid",
    "I'm quitting soon",
    "Nobody uses this feature",
  ],
  humanize: [
    "Let's circle back on this",
    "We need to align on deliverables",
    "I'll take this offline",
    "There's been a strategic realignment",
    "We're pivoting to new opportunities",
    "Let's table this for now",
    "This is a growth opportunity",
    "We're rightsizing the team",
    "As per my last email",
    "Let's parking lot that idea",
    "We need to boil the ocean here",
    "Excited to announce a new chapter",
    "We're sunsetting this product",
    "Appreciate your partnership on this",
    "Just a friendly reminder",
  ],
};

const UI_TEXT = {
  corporatize: {
    subtitle: "Translate human language into corporate bullshit 💩",
    tagline: "Because someone has to say \"let's circle back\" unironically",
    inputLabel: "What you actually mean:",
    placeholder: "I don't want to do this...",
    buttonText: "💩 Make It Corporate 💩",
    loadingText: "🔄 Synergizing...",
    outputLabel: "What you'll say in the meeting:",
    errorText: "Failed to corporatize. The synergy is weak today.",
  },
  humanize: {
    subtitle: "Decode corporate bullshit into plain English 🧠",
    tagline: "What did they actually mean by \"strategic realignment\"?",
    inputLabel: "What they said in the meeting:",
    placeholder: "Let's circle back on this...",
    buttonText: "🧠 Decode the BS 🧠",
    loadingText: "🔍 Decrypting...",
    outputLabel: "What they actually meant:",
    errorText: "Failed to decode. Too much synergy interference.",
  },
};

function BSLevelSlider({ level, onChange }: { level: BSLevel; onChange: (level: BSLevel) => void }) {
  const currentIndex = BS_LEVELS.findIndex(l => l.id === level);
  const currentLevel = BS_LEVELS[currentIndex];
  const [isDragging, setIsDragging] = useState(false);
  
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    onChange(BS_LEVELS[value].id);
  };

  const thumbPosition = (currentIndex / (BS_LEVELS.length - 1)) * 100;
  
  return (
    <div className="mb-6 select-none">
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <label className="text-sm font-display text-slate-400 uppercase tracking-wider">BS Level</label>
        <span className={`text-sm font-display uppercase tracking-wide transition-all duration-300 ${
          currentIndex === 0 ? 'text-amber-400' : 
          currentIndex === 1 ? 'text-orange-400' : 'text-red-400'
        }`}>
          {currentLevel.label}
        </span>
      </div>
      
      {/* Winamp-style slider */}
      <div className="relative h-12 bg-slate-800 rounded-lg border border-slate-700 shadow-inner overflow-hidden">
        {/* Track groove */}
        <div className="absolute inset-y-2 left-4 right-4">
          {/* Background groove */}
          <div className="absolute inset-y-0 left-0 right-0 bg-slate-900 rounded-sm shadow-inner" />
          
          {/* Filled portion with metallic gradient */}
          <div 
            className="absolute inset-y-0 left-0 rounded-sm transition-all duration-150 ease-out"
            style={{ 
              width: `${thumbPosition}%`,
              background: currentIndex === 0 
                ? 'linear-gradient(to bottom, #fbbf24, #d97706, #b45309)' 
                : currentIndex === 1 
                  ? 'linear-gradient(to bottom, #fb923c, #ea580c, #c2410c)' 
                  : 'linear-gradient(to bottom, #f87171, #dc2626, #b91c1c)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(0,0,0,0.3)'
            }}
          />
          
          {/* Notch markers */}
          {BS_LEVELS.map((_, index) => {
            const position = (index / (BS_LEVELS.length - 1)) * 100;
            return (
              <div
                key={index}
                className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 bg-slate-600"
                style={{ left: `${position}%` }}
              />
            );
          })}
        </div>
        
        {/* Heavy rectangular thumb (Winamp fader style) */}
        <div 
          className={`absolute top-1 bottom-1 -translate-x-1/2 transition-all pointer-events-none ${
            isDragging ? 'duration-50' : 'duration-150 ease-out'
          }`}
          style={{ left: `calc(16px + ${thumbPosition}% * (100% - 32px) / 100%)` }}
        >
          <div className={`relative w-5 h-full rounded-sm transition-all duration-150 ${
            isDragging ? 'scale-x-110' : ''
          }`}
          style={{
            background: 'linear-gradient(to bottom, #e2e8f0, #94a3b8, #64748b, #475569)',
            boxShadow: isDragging 
              ? '0 0 12px rgba(255,255,255,0.4), inset 0 1px 0 rgba(255,255,255,0.8), inset 0 -1px 0 rgba(0,0,0,0.4)' 
              : 'inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.3)'
          }}>
            {/* Grip lines */}
            <div className="absolute inset-x-1 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
              <div className="h-px bg-slate-600/60" />
              <div className="h-px bg-slate-400/40" />
              <div className="h-px bg-slate-600/60" />
              <div className="h-px bg-slate-400/40" />
              <div className="h-px bg-slate-600/60" />
            </div>
          </div>
        </div>
        
        {/* Invisible range input */}
        <input
          type="range"
          min="0"
          max={BS_LEVELS.length - 1}
          value={currentIndex}
          onChange={handleSliderChange}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onMouseLeave={() => setIsDragging(false)}
          onTouchStart={() => setIsDragging(true)}
          onTouchEnd={() => setIsDragging(false)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-grab active:cursor-grabbing z-10"
        />
      </div>
      
      {/* Level labels + description in one row */}
      <div className="flex items-center justify-between mt-3 px-1">
        {BS_LEVELS.map((lvl, index) => {
          const isActive = index === currentIndex;
          return (
            <button
              key={lvl.id}
              onClick={() => onChange(lvl.id)}
              className={`flex flex-col items-center gap-0.5 transition-all duration-200 ${
                isActive ? 'scale-105' : 'opacity-40 hover:opacity-70'
              }`}
            >
              <span className="text-xl">{lvl.emoji}</span>
              <span className={`text-xs font-display ${
                isActive 
                  ? index === 0 ? 'text-amber-400' : index === 1 ? 'text-orange-400' : 'text-red-400'
                  : 'text-slate-500'
              }`}>
                {lvl.label}
              </span>
            </button>
          );
        })}
      </div>
      
      {/* Description - centered */}
      <p className={`text-xs text-center italic mt-2 transition-all duration-300 ${
        currentIndex === 0 ? 'text-amber-400/70' : 
        currentIndex === 1 ? 'text-orange-400/70' : 'text-red-400/70'
      }`}>
        {currentLevel.description}
      </p>
    </div>
  );
}

function App() {
  const [mode, setMode] = useState<Mode>('corporatize')
  const [bsLevel, setBsLevel] = useState<BSLevel>('director')
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const ui = UI_TEXT[mode];
  const examples = EXAMPLES[mode];

  const handleModeChange = (newMode: Mode) => {
    if (newMode !== mode) {
      setMode(newMode)
      setInput('')
      setOutput('')
      setError('')
    }
  }

  const handleTranslate = async () => {
    if (!input.trim()) return
    
    setLoading(true)
    setError('')
    
    try {
      const response = await translate(input, mode, bsLevel)
      setOutput(response)
    } catch (err) {
      setError(ui.errorText)
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
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-4 mb-3">
            <img src="/logo.png" alt="CoproChat" className="h-28 drop-shadow-2xl" />
            <h1 className="text-6xl font-display bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent">
              CoproChat
            </h1>
          </div>
          <p className="text-slate-400 text-lg">
            {ui.subtitle}
          </p>
          <p className="text-slate-600 text-xs mt-2 italic">
            {ui.tagline}
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex bg-slate-800 rounded-xl p-1">
            <button
              onClick={() => handleModeChange('corporatize')}
              className={`px-6 py-2.5 rounded-lg font-display text-lg transition-all ${
                mode === 'corporatize'
                  ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              💩 Corporatize
            </button>
            <button
              onClick={() => handleModeChange('humanize')}
              className={`px-6 py-2.5 rounded-lg font-display text-lg transition-all ${
                mode === 'humanize'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🧠 Humanize
            </button>
          </div>
        </div>

        {/* BS Level Slider - only show in corporatize mode */}
        {mode === 'corporatize' && (
          <BSLevelSlider level={bsLevel} onChange={setBsLevel} />
        )}

        {/* Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-400 mb-2">
            {ui.inputLabel}
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, MAX_LENGTH))}
            onKeyDown={handleKeyDown}
            placeholder={ui.placeholder}
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
          className={`w-full py-4 rounded-xl font-display text-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed ${
            mode === 'corporatize'
              ? 'bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500'
              : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500'
          }`}
        >
          {loading ? ui.loadingText : ui.buttonText}
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
                {ui.outputLabel}
              </label>
              <button
                onClick={handleCopy}
                className={`text-sm transition-colors ${
                  mode === 'corporatize' 
                    ? 'text-amber-400 hover:text-amber-300' 
                    : 'text-cyan-400 hover:text-cyan-300'
                }`}
              >
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
            <div className={`p-6 rounded-xl ${
              mode === 'corporatize'
                ? 'bg-gradient-to-br from-slate-800/80 to-slate-800/40 border border-amber-900/30'
                : 'bg-gradient-to-br from-slate-800/80 to-slate-800/40 border border-cyan-900/30'
            }`}>
              <p className="text-lg leading-relaxed">{output}</p>
            </div>
          </div>
        )}

        {/* Examples */}
        <div className="mt-8 pt-6 border-t border-slate-800">
          <h3 className="text-sm font-medium text-slate-400 mb-4">Try these (click to load):</h3>
          <div className="flex flex-wrap gap-2">
            {examples.map((example) => (
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
        <div className="mt-8 text-center text-slate-500 text-sm">
          <p>Inspired by the $280k IT Director's Guide to Corporate Survival</p>
        </div>
      </div>
    </div>
  )
}

// Call the backend API
const API_URL = import.meta.env.DEV ? 'http://localhost:3001' : '';

async function translate(input: string, mode: Mode, level: BSLevel): Promise<string> {
  const response = await fetch(`${API_URL}/api/translate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: input, mode, level }),
  })
  
  if (!response.ok) {
    throw new Error('Translation failed')
  }
  
  const data = await response.json()
  return data.translation
}

export default App
