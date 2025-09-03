import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Landing() {
  const navigate = useNavigate()
  const [prompt, setPrompt] = useState('')

  function handleNext() {
    const trimmed = prompt.trim()
    if (!trimmed) return
    sessionStorage.setItem('webgen:prompt', trimmed)
    navigate('/select')
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-3xl font-semibold">AI Website Generator</h1>
      <div className="w-full max-w-2xl flex flex-col gap-3">
        <textarea
          className="w-full h-40 rounded-md border border-gray-300 bg-white/5 p-3 outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Describe the website you want..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <button
          onClick={handleNext}
          className="self-end rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
          disabled={!prompt.trim()}
        >
          Next
        </button>
      </div>
      <p className="text-sm opacity-70">Enter a prompt, then choose framework</p>
    </div>
  )
}

