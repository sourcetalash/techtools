import { proxy } from 'valtio'

export type ActivityItem = { role: 'system' | 'user' | 'assistant', text: string }

export type AppState = {
  prompt: string
  type: 'static' | 'react' | 'vue' | 'angular' | 'next' | null
  files: Record<string, string>
  activity: ActivityItem[]
}

export const appState = proxy<AppState>({
  prompt: '',
  type: null,
  files: {
    '/index.html': '<!doctype html>\n<html>\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>Loading...</title>\n  </head>\n  <body>\n    <h1>Generating project...</h1>\n  </body>\n</html>\n',
  },
  activity: [],
})

