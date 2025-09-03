import { useEffect, useMemo, useRef, useState } from 'react'
import { SandpackProvider, SandpackLayout, SandpackPreview, SandpackFileExplorer } from '@codesandbox/sandpack-react'
import MonacoSandpackEditor from '../components/MonacoSandpackEditor'
import { useNavigate } from 'react-router-dom'
import { useSnapshot } from 'valtio'
import { appState } from '../state/store'
import { generateProjectFiles, applyChatChange } from '../services/generation'
import { saveAs } from 'file-saver'
import JSZip from 'jszip'
import * as htmlToImage from 'html-to-image'

export default function EditorPage() {
  const navigate = useNavigate()
  const snap = useSnapshot(appState)
  const [status, setStatus] = useState<'idle' | 'generating' | 'ready' | 'error'>('idle')
  const [error, setError] = useState<string>('')
  const startedRef = useRef(false)

  useEffect(() => {
    const prompt = sessionStorage.getItem('webgen:prompt') || ''
    const type = (sessionStorage.getItem('webgen:type') || 'static') as 'static' | 'react' | 'vue' | 'angular' | 'next'
    if (!prompt.trim()) {
      navigate('/')
      return
    }
    if (!startedRef.current) {
      startedRef.current = true
      setStatus('generating')
      generateProjectFiles(prompt, type)
        .then((files) => {
          appState.files = files
          appState.prompt = prompt
          appState.type = type
          setStatus('ready')
          appState.activity.push({ role: 'user', text: prompt })
          appState.activity.push({ role: 'assistant', text: `Generated initial ${type} project with ${Object.keys(files).length} files.` })
        })
        .catch((e) => {
          setError(String(e))
          setStatus('error')
        })
    }
  }, [navigate])

  const template = useMemo(() => {
    if (snap.type === 'react') return 'react'
    if (snap.type === 'vue') return 'vue'
    // Angular and Next.js are complex in Sandpack; use vanilla + dev server scripts when possible
    return 'vanilla'
  }, [snap.type])

  const files = useMemo(() => snap.files, [snap.files])

  async function handleDownload() {
    const zip = new JSZip()
    Object.entries(appState.files).forEach(([path, content]) => zip.file(path.startsWith('/') ? path.slice(1) : path, content))
    const blob = await zip.generateAsync({ type: 'blob' })
    saveAs(blob, `project-${appState.type || 'site'}.zip`)
  }

  async function handleCapture() {
    const container = document.querySelector('[data-editor-root="true"]') as HTMLElement | null
    if (!container) return
    const dataUrl = await htmlToImage.toPng(container, { pixelRatio: 2 })
    const res = await fetch(dataUrl)
    const blob = await res.blob()
    saveAs(blob, `ui-capture-${Date.now()}.png`)
    try {
      await fetch('/api/capture', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dataUrl }) })
    } catch {}
  }

  async function handleChat(message: string) {
    const reply = await applyChatChange(message, appState)
    appState.activity.push({ role: 'user', text: message })
    appState.activity.push({ role: 'assistant', text: reply.summary })
    appState.files = reply.files
  }

  return (
    <div className="min-h-dvh flex flex-col" data-editor-root="true">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-3">
          <span className="font-medium">Editor</span>
          <span className="text-sm opacity-70">{snap.type?.toUpperCase()}</span>
          <span className="text-sm opacity-70">{status}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleDownload} className="rounded border px-3 py-1">Download</button>
          <button onClick={handleCapture} className="rounded border px-3 py-1">Capture UI</button>
        </div>
      </div>

      {status === 'error' && (
        <div className="p-4 text-red-500">{error}</div>
      )}

      <div className="flex-1 grid grid-cols-4 min-h-0">
        <div className="col-span-3 min-h-0">
          <SandpackProvider template={template as any} files={files} options={{ activeFile: Object.keys(files)[0] }}>
            <SandpackLayout style={{ height: 'calc(100dvh - 90px)' }}>
              <SandpackFileExplorer />
              <MonacoSandpackEditor />
              <SandpackPreview />
            </SandpackLayout>
          </SandpackProvider>
        </div>
        <div className="col-span-1 border-l flex flex-col min-h-0">
          <div className="p-2 border-b font-medium">Chat</div>
          <div className="flex-1 overflow-auto p-2 space-y-2">
            {snap.activity.map((m, i) => (
              <div key={i} className="text-sm">
                <span className="font-semibold mr-1">{m.role}:</span>
                <span className="whitespace-pre-wrap">{m.text}</span>
              </div>
            ))}
          </div>
          <ChatInput onSend={handleChat} disabled={status !== 'ready'} />
        </div>
      </div>
    </div>
  )
}

function ChatInput({ onSend, disabled }: { onSend: (text: string) => void | Promise<void>, disabled?: boolean }) {
  const [value, setValue] = useState('')
  async function submit() {
    const v = value.trim()
    if (!v) return
    setValue('')
    await onSend(v)
  }
  return (
    <div className="p-2 border-t flex items-center gap-2">
      <input
        className="flex-1 rounded border px-2 py-1"
        placeholder={disabled ? 'Generating...' : 'Ask to change something...'}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
        onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
      />
      <button onClick={submit} disabled={disabled} className="rounded border px-3 py-1">Send</button>
    </div>
  )
}

