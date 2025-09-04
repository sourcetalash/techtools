import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
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
    <Layout>
      <section className="py-10">
        <h2 className="text-3xl font-semibold tracking-tight">Select website type</h2>
        <p className="opacity-80 max-w-3xl mt-2">{prompt || 'No prompt set'}</p>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <TypeTile title="Static HTML/CSS" onClick={() => choose('static')} subtitle="Vanilla" />
          <TypeTile title="React" onClick={() => choose('react')} subtitle="Vite SPA" />
          <TypeTile title="Vue" onClick={() => choose('vue')} subtitle="Vite SPA" />
          <TypeTile title="Angular" onClick={() => choose('angular')} subtitle="Lite preview" />
          <TypeTile title="Next.js" onClick={() => choose('next')} subtitle="Static preview" />
        </div>
      </section>
    </Layout>
  )

function TypeTile({ title, subtitle, onClick }: { title: string, subtitle: string, onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-white/5 p-5 text-left hover:shadow-sm transition-all">
      <div className="text-lg font-medium">{title}</div>
      <div className="text-sm opacity-70">{subtitle}</div>
    </button>
  )
}
}

