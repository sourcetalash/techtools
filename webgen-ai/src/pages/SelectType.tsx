import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTemplatesForType } from '../data/templates'

type Framework = 'static' | 'react' | 'vue' | 'angular' | 'next'

export default function SelectType() {
  const navigate = useNavigate()
  const [prompt, setPrompt] = useState<string>('')

  useEffect(() => {
    setPrompt(sessionStorage.getItem('webgen:prompt') || '')
  }, [])

  function choose(type: Framework) {
    if (!prompt.trim()) {
      navigate('/')
      return
    }
    sessionStorage.setItem('webgen:type', type)
    // Store default template hint for the chosen type
    const templates = getTemplatesForType(type as any)
    if (templates?.length) {
      sessionStorage.setItem('webgen:templateId', templates[0].id)
      sessionStorage.setItem('webgen:templateHint', templates[0].promptHint)
    }
    navigate('/editor')
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-6 p-6">
      <h2 className="text-2xl font-medium">Select website type</h2>
      <p className="opacity-70 max-w-2xl text-center">{prompt || 'No prompt set'}</p>
      <div className="grid grid-cols-5 gap-4">
        <button onClick={() => choose('static')} className="rounded-md border px-6 py-3 hover:bg-white/5">Static HTML/CSS</button>
        <button onClick={() => choose('react')} className="rounded-md border px-6 py-3 hover:bg-white/5">React</button>
        <button onClick={() => choose('vue')} className="rounded-md border px-6 py-3 hover:bg-white/5">Vue</button>
        <button onClick={() => choose('angular')} className="rounded-md border px-6 py-3 hover:bg-white/5">Angular</button>
        <button onClick={() => choose('next')} className="rounded-md border px-6 py-3 hover:bg-white/5">Next.js</button>
      </div>
    </div>
  )
}

