import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import pino from 'pino'
import { z } from 'zod'
import { GoogleGenerativeAI } from '@google/generative-ai'

const logger = pino({ level: process.env.LOG_LEVEL || 'info' })
const app = express()
app.use(helmet())
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

const generateSchema = z.object({ prompt: z.string().min(1), type: z.enum(['static','react','vue','angular','next']) })
app.post('/api/generate', async (req, res) => {
  if (!GEMINI_API_KEY) return res.status(503).json({ error: 'AI service unavailable' })
  const parse = generateSchema.safeParse(req.body)
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() })
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: modelName })
    const system = `You are an expert software generator. Output a JSON mapping file paths to content (UTF-8). No markdown. Minimal but complete ${parse.data.type} project that runs in a browser-only environment.`
    const user = `User prompt: ${parse.data.prompt}`
    const resp = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: system + '\n\n' + user }] }] })
    const text = resp.response.text()
    const jsonStart = text.indexOf('{')
    const jsonEnd = text.lastIndexOf('}') + 1
    const jsonStr = text.slice(jsonStart, jsonEnd)
    const files = JSON.parse(jsonStr)
    res.json({ files })
  } catch (e: any) {
    logger.error({ err: e }, 'generate failed')
    res.status(500).json({ error: 'generation_failed' })
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
    const user = `Project type: ${parse.data.state.type}\nUser request: ${parse.data.message}\nCurrent files JSON: ${JSON.stringify(parse.data.state.files)}`
    const resp = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: system + '\n\n' + user }] }] })
    const text = resp.response.text()
    const jsonStart = text.indexOf('{')
    const jsonEnd = text.lastIndexOf('}') + 1
    const jsonStr = text.slice(jsonStart, jsonEnd)
    const files = JSON.parse(jsonStr)
    res.json({ files })
  } catch (e: any) {
    logger.error({ err: e }, 'chat failed')
    res.status(500).json({ error: 'chat_failed' })
  }
})

const port = Number(process.env.PORT || 5174)
app.listen(port, () => {
  logger.info(`API listening on :${port}`)
})

