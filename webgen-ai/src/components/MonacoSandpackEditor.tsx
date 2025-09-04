import { useEffect, useMemo, useRef, useState } from 'react'
import { useSandpack } from '@codesandbox/sandpack-react'
import { useSnapshot } from 'valtio'
import { appState } from '../state/store'
import Editor, { type OnMount } from '@monaco-editor/react'

function detectLanguage(path: string): string {
  const lower = path.toLowerCase()
  if (lower.endsWith('.ts') || lower.endsWith('.tsx')) return 'typescript'
  if (lower.endsWith('.js') || lower.endsWith('.jsx')) return 'javascript'
  if (lower.endsWith('.json')) return 'json'
  if (lower.endsWith('.css')) return 'css'
  if (lower.endsWith('.html') || lower.endsWith('.htm')) return 'html'
  if (lower.endsWith('.vue')) return 'html'
  return 'plaintext'
}

export default function MonacoSandpackEditor() {
  const { sandpack } = useSandpack()
  const snap = useSnapshot(appState)
  const activePath = sandpack.activeFile
  const file = sandpack.files[activePath]
  const code = file?.code ?? ''
  const language = useMemo(() => detectLanguage(activePath), [activePath])
  const [theme, setTheme] = useState<'light' | 'vs-dark'>('vs-dark')
  const [wrap, setWrap] = useState<boolean>(true)
  const editorRef = useRef<any>(null)

  const onMount: OnMount = (editor) => {
    editorRef.current = editor
  }

  useEffect(() => {
    // Ensure model language updates when file changes
    const editor = editorRef.current
    if (!editor) return
    const model = editor.getModel?.()
    if (model && (window as any).monaco) {
      const monaco = (window as any).monaco
      monaco.editor.setModelLanguage(model, language)
    }
  }, [language])

  function doFormat() {
    const editor = editorRef.current
    editor?.getAction?.('editor.action.formatDocument')?.run?.()
  }

  function toggleWrap() {
    setWrap((w) => !w)
  }

  function toggleTheme() {
    setTheme((t) => (t === 'vs-dark' ? 'light' : 'vs-dark'))
  }

  return (
    <div className="flex flex-col min-h-0 w-full">
      <div className="flex items-center justify-between border-b px-2 py-1 text-sm">
        <div className="truncate">
          {activePath}
          {snap.currentWriting && snap.currentWriting === activePath ? <span className="ml-2 text-xs opacity-70">(writing...)</span> : null}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={doFormat} className="rounded border px-2 py-0.5">Format</button>
          <button onClick={toggleWrap} className="rounded border px-2 py-0.5">{wrap ? 'No wrap' : 'Wrap'}</button>
          <button onClick={toggleTheme} className="rounded border px-2 py-0.5">{theme === 'vs-dark' ? 'Light' : 'Dark'}</button>
        </div>
      </div>
      <Editor
        height="100%"
        theme={theme}
        language={language}
        value={code}
        onMount={onMount}
        onChange={(val) => sandpack.updateFile(activePath, val ?? '')}
        options={{
          wordWrap: wrap ? 'on' : 'off',
          scrollBeyondLastLine: false,
          minimap: { enabled: false },
          fontSize: 14,
          automaticLayout: true,
          tabSize: 2,
          renderWhitespace: 'selection',
        }}
      />
    </div>
  )
}

