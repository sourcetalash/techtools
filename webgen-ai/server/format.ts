import prettier from 'prettier'

export async function formatFiles(files: Record<string, string>): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  for (const [path, code] of Object.entries(files)) {
    out[path] = await formatByPath(path, code)
  }
  return out
}

async function formatByPath(path: string, code: string): Promise<string> {
  try {
    const options: prettier.Options = await resolveOptions(path)
    return await prettier.format(code, options)
  } catch {
    return code
  }
}

async function resolveOptions(path: string): Promise<prettier.Options> {
  const base: prettier.Options = { semi: false, singleQuote: true, tabWidth: 2, useTabs: false, printWidth: 100 }
  if (path.endsWith('.ts') || path.endsWith('.tsx')) return { ...base, parser: 'typescript' }
  if (path.endsWith('.js') || path.endsWith('.jsx')) return { ...base, parser: 'babel' }
  if (path.endsWith('.json')) return { ...base, parser: 'json' }
  if (path.endsWith('.css')) return { ...base, parser: 'css' }
  if (path.endsWith('.html') || path.endsWith('.vue')) return { ...base, parser: 'html' }
  return base
}

export function normalizePaths(files: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(files)) {
    const p = k.startsWith('/') ? k : '/' + k
    out[p.replace(/\\/g, '/')] = v
  }
  return out
}

