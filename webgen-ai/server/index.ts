import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import pino from 'pino'
import { z } from 'zod'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { formatFiles, normalizePaths } from './format'
import fs from 'node:fs/promises'
import path from 'node:path'

const logger = pino({ level: process.env.LOG_LEVEL || 'info' })
const app = express()
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "script-src": ["'self'", "'unsafe-inline'", "blob:"],
      "style-src": ["'self'", "'unsafe-inline'", "https:"],
      "img-src": ["'self'", "data:", "blob:", "https:"],
      "connect-src": ["'self'", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}))
app.use(cors({ origin: true, credentials: false }))
app.use(compression())
app.use(express.json({ limit: '2mb' }))
app.use(rateLimit({ windowMs: 60_000, max: 60 }))

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY
if (!GEMINI_API_KEY) {
  logger.warn('GEMINI_API_KEY is not set; backend will return 503 for AI routes')
}

const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-pro'

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.post('/api/capture', async (req, res) => {
  try {
    const schema = z.object({ dataUrl: z.string().url().startsWith('data:image/png'), name: z.string().optional() })
    const parsed = schema.parse(req.body)
    const base64 = parsed.dataUrl.split(',')[1]
    const buf = Buffer.from(base64, 'base64')
    const fname = (parsed.name || `ui-capture-${Date.now()}.png`).replace(/[^a-zA-Z0-9._-]/g, '_')
    const dir = path.join(process.cwd(), 'captures')
    await fs.mkdir(dir, { recursive: true })
    const fpath = path.join(dir, fname)
    await fs.writeFile(fpath, buf)
    res.json({ ok: true, file: `captures/${fname}` })
  } catch (e: any) {
    res.status(400).json({ error: 'invalid_payload' })
  }
})

const generateSchema = z.object({ prompt: z.string().min(1), type: z.enum(['static','react','vue','angular','next']) })
app.post('/api/generate', async (req, res) => {
  if (!GEMINI_API_KEY) return res.status(503).json({ error: 'AI service unavailable' })
  const parse = generateSchema.safeParse(req.body)
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() })
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: modelName })
    // Enhance prompt first
    const enhancedPrompt = await enhancePrompt(model, parse.data.prompt)
    const system = `You are an expert software generator. Output a JSON mapping file paths to content (UTF-8). No markdown. Minimal but complete ${parse.data.type} project that runs in a browser-only environment.`
    const user = `Enhanced brief:\n${enhancedPrompt}`
    const text = await aiGenerateWithRetry(model, system + '\n\n' + user)
    const jsonStart = text.indexOf('{')
    const jsonEnd = text.lastIndexOf('}') + 1
    const jsonStr = text.slice(jsonStart, jsonEnd)
    const raw = JSON.parse(jsonStr)
    const files = normalizePaths(raw)
    const formatted = await formatFiles(files)
    res.json({ files: formatted, enhancedPrompt })
  } catch (e: any) {
    logger.error({ err: e }, 'generate failed, falling back')
    try {
      const enhancedPrompt = heuristicEnhance(parse.data.prompt)
      const fallback = await generateFallback(enhancedPrompt, parse.data.type)
      const formatted = await formatFiles(fallback)
      return res.json({ files: formatted, source: 'fallback', enhancedPrompt })
    } catch (inner: any) {
      logger.error({ err: inner }, 'fallback generation failed')
      return res.status(500).json({ error: 'generation_failed' })
    }
  }
})

const chatSchema = z.object({ message: z.string().min(1), state: z.object({ type: z.enum(['static','react','vue','angular','next']).nullable(), files: z.record(z.string()) }) })
app.post('/api/chat', async (req, res) => {
  if (!GEMINI_API_KEY) return res.status(503).json({ error: 'AI service unavailable' })
  const parse = chatSchema.safeParse(req.body)
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() })
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: modelName })
    const system = `You are a refactoring agent. Given current project files as JSON and a request, output full updated files as JSON object (path->content). No markdown.`
    const enhancedMessage = await enhancePrompt(model, parse.data.message)
    const user = `Project type: ${parse.data.state.type}\nEnhanced user request: ${enhancedMessage}\nCurrent files JSON: ${JSON.stringify(parse.data.state.files)}`
    const text = await aiGenerateWithRetry(model, system + '\n\n' + user)
    const jsonStart = text.indexOf('{')
    const jsonEnd = text.lastIndexOf('}') + 1
    const jsonStr = text.slice(jsonStart, jsonEnd)
    const raw = JSON.parse(jsonStr)
    const files = normalizePaths(raw)
    const formatted = await formatFiles(files)
    res.json({ files: formatted })
  } catch (e: any) {
    logger.error({ err: e }, 'chat failed, applying heuristic')
    // Heuristic: append a comment to the most likely entry file
    const current = parse.data.state.files
    const files = { ...current }
    const target = Object.keys(files).find((p) => p.endsWith('index.html') || p.endsWith('App.tsx') || p.endsWith('App.vue') || p.endsWith('main.ts') || p.endsWith('pages/index.tsx'))
    if (target) {
      files[target] = files[target] + `\n<!-- ${parse.data.message} -->\n`
    }
    const formatted = await formatFiles(files)
    res.json({ files: formatted, source: 'fallback' })
  }
})

async function generateFallback(prompt: string, type: 'static' | 'react' | 'vue' | 'angular' | 'next'): Promise<Record<string, string>> {
  function escapeHtml(s: string) {
    return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string))
  }
  if (type === 'static') {
    return normalizePaths({
      '/index.html': `<!doctype html>\n<html>\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>Static Site</title>\n    <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">\n    <style>body{font-family:Inter,system-ui;padding:2rem;margin:0;background:#0b1020;color:#e6edf3}header{margin-bottom:1.5rem}section{margin:1rem 0}.card{background:#121a33;border:1px solid #2a2f45;border-radius:12px;padding:16px}</style>\n  </head>\n  <body>\n    <header><h1>Static Site</h1><p>${escapeHtml(prompt)}</p></header>\n    <main>\n      <section class="card"><h2>Features</h2><ul><li>Fast</li><li>Responsive</li><li>Accessible</li></ul></section>\n      <section class="card"><h2>Contact</h2><p>hello@example.com</p></section>\n    </main>\n  </body>\n</html>`,
    })
  }
  if (type === 'react') {
    return normalizePaths({
      '/index.html': `<!doctype html>\n<html>\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>React App</title>\n  </head>\n  <body>\n    <div id="root"></div>\n    <script type="module" src="/src/main.tsx"></script>\n  </body>\n</html>`,
      '/src/main.tsx': `import React from 'react'\nimport { createRoot } from 'react-dom/client'\nimport App from './App'\ncreateRoot(document.getElementById('root')!).render(<App />)`,
      '/src/App.tsx': `export default function App(){ return <div style={{fontFamily:'Inter, system-ui',padding:24,background:'#0b1020',minHeight:'100vh',color:'#e6edf3'}}><h1 style={{marginTop:0}}>React App</h1><p>${escapeHtml(prompt)}</p><section style={{background:'#121a33',border:'1px solid #2a2f45',borderRadius:12,padding:16,marginTop:16}}><h2>Features</h2><ul><li>Fast</li><li>Responsive</li><li>Accessible</li></ul></section></div> }`,
      '/package.json': `{"type":"module","scripts":{"dev":"vite"}}`,
    })
  }
  if (type === 'vue') {
    return normalizePaths({
      '/index.html': `<!doctype html>\n<html>\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>Vue App</title>\n  </head>\n  <body>\n    <div id="app"></div>\n    <script type="module" src="/src/main.js"></script>\n  </body>\n</html>`,
      '/src/main.js': `import { createApp } from 'vue'\nimport App from './App.vue'\ncreateApp(App).mount('#app')`,
      '/src/App.vue': `<template><div style=\"font-family:Inter, system-ui;padding:24px;background:#0b1020;min-height:100vh;color:#e6edf3\"><h1 style=\"margin-top:0\">Vue App</h1><p>${escapeHtml(prompt)}</p><section style=\"background:#121a33;border:1px solid #2a2f45;border-radius:12px;padding:16px;margin-top:16px\"><h2>Features</h2><ul><li>Fast</li><li>Responsive</li><li>Accessible</li></ul></section></div></template>`,
      '/package.json': `{"type":"module","scripts":{"dev":"vite"}}`,
    })
  }
  if (type === 'angular') {
    return normalizePaths({
      '/index.html': `<!doctype html>\n<html>\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>Angular (Lite)</title>\n    <script src="https://unpkg.com/zone.js@0.14.10/bundles/zone.umd.min.js"></script>\n    <script src="https://unpkg.com/core-js-bundle/minified.js"></script>\n    <script src="https://unpkg.com/rxjs@7.8.1/bundles/rxjs.umd.min.js"></script>\n    <script type="module" src="/main.ts"></script>\n  </head>\n  <body>\n    <app-root></app-root>\n  </body>\n</html>`,
      '/main.ts': `import { Component, ɵrenderComponent as renderComponent } from 'https://cdn.skypack.dev/@angular/core@17.3.0?min'\n@Component({ selector: 'app-root', template: '<div style=\'font-family:Inter, system-ui;padding:24px;background:#0b1020;min-height:100vh;color:#e6edf3\'><h1 style=\'margin-top:0\'>Angular (Lite)</h1><p>${escapeHtml(prompt)}</p><section style=\'background:#121a33;border:1px solid #2a2f45;border-radius:12px;padding:16px;margin-top:16px\'><h2>Features</h2><ul><li>Fast</li><li>Responsive</li><li>Accessible</li></ul></section></div>' })\nclass AppComponent {}\nrenderComponent(AppComponent)`,
      '/package.json': `{"type":"module"}`,
    })
  }
  if (type === 'next') {
    return normalizePaths({
      '/index.html': `<!doctype html>\n<html>\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>Next.js (Static Preview)</title>\n  </head>\n  <body>\n    <div id="__next"></div>\n    <script type="module" src="/src/main.tsx"></script>\n  </body>\n</html>`,
      '/src/main.tsx': `import React from 'react'\nimport { createRoot } from 'react-dom/client'\nimport Home from './pages/index'\ncreateRoot(document.getElementById('__next')!).render(<Home />)`,
      '/src/pages/index.tsx': `export default function Home(){ return <div style={{fontFamily:'Inter, system-ui',padding:24,background:'#0b1020',minHeight:'100vh',color:'#e6edf3'}}><h1 style={{marginTop:0}}>Next.js (Static Preview)</h1><p>${escapeHtml(prompt)}</p><section style={{background:'#121a33',border:'1px solid #2a2f45',borderRadius:12,padding:16,marginTop:16}}><h2>Features</h2><ul><li>Fast</li><li>Responsive</li><li>Accessible</li></ul></section></div> }`,
      '/package.json': `{"type":"module"}`,
    })
  }
  return {}
}

async function aiGenerateWithRetry(model: any, text: string, attempts = 3, timeoutMs = 20000): Promise<string> {
  let lastErr: any
  for (let i = 0; i < attempts; i++) {
    try {
      const controller = new AbortController()
      const id = setTimeout(() => controller.abort(), timeoutMs)
      const resp = await model.generateContent({ contents: [{ role: 'user', parts: [{ text }] }] }, { signal: controller.signal as any })
      clearTimeout(id)
      return resp.response.text()
    } catch (e) {
      lastErr = e
      await new Promise((r) => setTimeout(r, 500 * Math.pow(2, i)))
    }
  }
  throw lastErr
}

async function enhancePrompt(model: any, input: string): Promise<string> {
  const instr = `You are a senior UX engineer and product designer. Rewrite and enrich the following website/app prompt into a concise, detailed brief (<=250 words) including: goals, target audience, pages/sections, components, color palette (HEX), typography, layout, accessibility, performance/SEO, and animation tone. Output plain text only.`
  try {
    const text = await aiGenerateWithRetry(model, instr + '\n\nOriginal prompt:\n' + input)
    return text.trim()
  } catch {
    return heuristicEnhance(input)
  }
}

function heuristicEnhance(input: string): string {
  return [
    'Goals: modern, responsive, accessible UI with fast load and SEO meta.',
    'Audience: general web users; mobile-first experience.',
    'Sections: Hero, Features, CTA, Pricing/Plans, Testimonials, Footer.',
    'Components: Navbar, Cards, Buttons, Badges, Grid, Forms.',
    'Colors: #0b1020, #2b5bd7, #e6edf3, #b9c2cf, #121a33.',
    'Typography: Inter, system-ui; clear hierarchy.',
    'Layout: fluid grid with sensible spacing, sticky nav.',
    'Accessibility: contrast-compliant, semantic HTML, focus styles.',
    'Performance: minimal assets, lazy load images, meta tags.',
    'Animation: subtle transitions (opacity/transform, 150–300ms).',
    'User prompt: ' + input,
  ].join('\n')
}

const port = Number(process.env.PORT || 5174)
app.listen(port, () => {
  logger.info(`API listening on :${port}`)
})

