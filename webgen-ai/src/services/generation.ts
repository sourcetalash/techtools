import { GoogleGenerativeAI } from '@google/generative-ai'
import type { AppState } from '../state/store'

const GEMINI_API_KEY = (typeof window !== 'undefined' ? (window as any).env?.GEMINI_API_KEY : undefined) || import.meta.env.VITE_GEMINI_API_KEY

function hasApiKey() {
  return typeof GEMINI_API_KEY === 'string' && GEMINI_API_KEY.length > 0
}

export type GeneratedFiles = Record<string, string>

export async function generateProjectFiles(prompt: string, type: 'static' | 'react' | 'vue' | 'angular' | 'next'): Promise<GeneratedFiles> {
  // Try backend first for enterprise use (key secured server-side)
  try {
    const resp = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, type }),
    })
    if (resp.ok) {
      const data = await resp.json()
      if (data.enhancedPrompt) {
        ;(window as any).__lastEnhancedPrompt = data.enhancedPrompt
      }
      return normalizeFiles(data.files as GeneratedFiles, type)
    }
  } catch {}
  if (!hasApiKey()) {
    return fallbackMock(prompt, type)
  }
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY as string)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' })
    const system = `You are an expert software generator. Output a JSON object mapping file paths to UTF-8 text content. Do not wrap in markdown. Only valid JSON.`
    const user = buildPrompt(prompt, type)
    const res = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: system + '\n\n' + user }] }] })
    const text = res.response.text()
    const jsonStart = text.indexOf('{')
    const jsonEnd = text.lastIndexOf('}') + 1
    const jsonStr = text.slice(jsonStart, jsonEnd)
    const files = JSON.parse(jsonStr) as GeneratedFiles
    return normalizeFiles(files, type)
  } catch (e) {
    return fallbackMock(prompt, type)
  }
}

export async function applyChatChange(message: string, state: AppState): Promise<{ files: GeneratedFiles, summary: string }> {
  try {
    const resp = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, state: { type: state.type, files: state.files } }),
    })
    if (resp.ok) {
      const data = await resp.json()
      return { files: normalizeFiles(data.files as GeneratedFiles, (state.type || 'static') as any), summary: 'Updated project files.' }
    }
  } catch {}
  if (!hasApiKey()) {
    const files = { ...state.files }
    const target = Object.keys(files).find((p) => p.endsWith('index.html') || p.endsWith('App.tsx') || p.endsWith('App.vue'))
    if (target) {
      files[target] = files[target] + `\n<!-- ${message} -->\n`
    }
    return { files, summary: 'Applied a mock change to the project.' }
  }
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY as string)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' })
    const system = `You are a code refactoring agent. Given current project files as JSON and a request, output full updated files as JSON (path->content), no markdown.`
    const user = `Project type: ${state.type}\nUser request: ${message}\nCurrent files JSON: ${JSON.stringify(state.files)}`
    const res = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: system + '\n\n' + user }] }] })
    const text = res.response.text()
    const jsonStart = text.indexOf('{')
    const jsonEnd = text.lastIndexOf('}') + 1
    const jsonStr = text.slice(jsonStart, jsonEnd)
    const files = JSON.parse(jsonStr) as GeneratedFiles
    return { files: normalizeFiles(files, (state.type || 'static') as any), summary: 'Updated project files.' }
  } catch (e) {
    return { files: state.files, summary: 'Failed to apply change.' }
  }
}

function buildPrompt(prompt: string, type: 'static' | 'react' | 'vue' | 'angular' | 'next') {
  const base = `Generate a minimal but complete ${type} website project. Keep it modern, vibrant, professional with responsive layout, accessible colors, and smooth subtle animations. Prefer Inter font or system fallback. Include necessary config files for running in a browser-only environment (no servers). Keep file count small.`
  return `${base}\nUser prompt: ${prompt}`
}

function normalizeFiles(files: GeneratedFiles, type: 'static' | 'react' | 'vue' | 'angular' | 'next'): GeneratedFiles {
  // Ensure leading slash for Sandpack
  const out: GeneratedFiles = {}
  for (const [k, v] of Object.entries(files)) {
    const path = (k.startsWith('/') ? k : '/' + k).replace(/\\/g, '/')
    out[path] = v
  }
  // Basic fallbacks if model misses
  if (type === 'static' && !out['/index.html']) {
    out['/index.html'] = '<!doctype html>\n<html><head><title>Site</title></head><body><h1>Hello</h1></body></html>'
  }
  return out
}

function fallbackMock(prompt: string, type: 'static' | 'react' | 'vue' | 'angular' | 'next'): GeneratedFiles {
  if (type === 'static') {
    return {
      '/index.html': `<!doctype html>\n<html>\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>Static Site</title>\n    <style>body{font-family:system-ui;padding:2rem} header{margin-bottom:1rem}</style>\n  </head>\n  <body>\n    <header><h1>Static Site</h1><p>${escapeHtml(prompt)}</p></header>\n    <main><p>Welcome! Edit via chat.</p></main>\n  </body>\n</html>\n`,
    }
  }
  if (type === 'react') {
    return {
      '/index.html': `<!doctype html>\n<html>\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>React App</title>\n  </head>\n  <body>\n    <div id="root"></div>\n    <script type="module" src="/src/main.tsx"></script>\n  </body>\n</html>`,
      '/src/main.tsx': `import React from 'react'\nimport { createRoot } from 'react-dom/client'\nimport App from './App'\ncreateRoot(document.getElementById('root')!).render(<App />)`,
      '/src/App.tsx': `export default function App(){ return <div style={{fontFamily:'system-ui',padding:16}}><h1>React App</h1><p>${escapeHtml(prompt)}</p></div> }`,
      '/package.json': `{"type":"module","scripts":{"dev":"vite"}}`,
    }
  }
  if (type === 'vue') {
    return {
      '/index.html': `<!doctype html>\n<html>\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>Vue App</title>\n  </head>\n  <body>\n    <div id="app"></div>\n    <script type="module" src="/src/main.js"></script>\n  </body>\n</html>`,
      '/src/main.js': `import { createApp } from 'vue'\nimport App from './App.vue'\ncreateApp(App).mount('#app')`,
      '/src/App.vue': `<template><div style=\"font-family:system-ui;padding:16px\"><h1>Vue App</h1><p>${escapeHtml(prompt)}</p></div></template>`,
      '/package.json': `{"type":"module","scripts":{"dev":"vite"}}`,
    }
  }
  if (type === 'angular') {
    // Minimal Angular-like scaffold that can run without full CLI build, for preview purposes
    return {
      '/index.html': `<!doctype html>\n<html>\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>Angular (Lite)</title>\n    <script src="https://unpkg.com/zone.js@0.14.10/bundles/zone.umd.min.js"></script>\n    <script src="https://unpkg.com/core-js-bundle/minified.js"></script>\n    <script src="https://unpkg.com/rxjs@7.8.1/bundles/rxjs.umd.min.js"></script>\n    <script type="module" src="/main.ts"></script>\n  </head>\n  <body>\n    <app-root></app-root>\n  </body>\n</html>`,
      '/main.ts': `import { Component, NgModule, ɵrenderComponent as renderComponent } from 'https://cdn.skypack.dev/@angular/core@17.3.0?min';\n@Component({ selector: 'app-root', template: '<div style=\'font-family:system-ui;padding:16px\'><h1>Angular (Lite)</h1><p>${escapeHtml(prompt)}</p></div>' })\nclass AppComponent {}\nrenderComponent(AppComponent);`,
      '/package.json': `{"type":"module"}`,
    }
  }
  if (type === 'next') {
    // Minimal Next.js-like static emulation for preview
    return {
      '/index.html': `<!doctype html>\n<html>\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>Next.js (Static Preview)</title>\n  </head>\n  <body>\n    <div id="__next"></div>\n    <script type="module" src="/src/main.tsx"></script>\n  </body>\n</html>`,
      '/src/main.tsx': `import React from 'react'\nimport { createRoot } from 'react-dom/client'\nimport Home from './pages/index'\ncreateRoot(document.getElementById('__next')!).render(<Home />)`,
      '/src/pages/index.tsx': `export default function Home(){ return <div style={{fontFamily:'system-ui',padding:16}}><h1>Next.js (Static Preview)</h1><p>${escapeHtml(prompt)}</p></div> }`,
      '/package.json': `{"type":"module"}`,
    }
  }
  return {}
}

function escapeHtml(s: string) {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string))
}

