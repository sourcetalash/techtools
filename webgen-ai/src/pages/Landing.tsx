import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { Textarea } from '../components/ui/Textarea'
import { Button } from '../components/ui/Button'

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
    <Layout>
      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">Generate modern websites with AI</h1>
          <p className="mt-3 text-base md:text-lg opacity-80">Describe your idea. Choose a framework. Edit with live preview.</p>
        </div>
        <div className="mt-8 mx-auto max-w-3xl">
          <Textarea
            className="h-40"
            placeholder="Describe the website you want..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <div className="mt-3 flex items-center justify-end">
            <Button onClick={handleNext} disabled={!prompt.trim()}>Next</Button>
          </div>
        </div>
      </section>
    </Layout>
  )
}

