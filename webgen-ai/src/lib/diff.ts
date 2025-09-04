export type FileDiff = {
  created: string[]
  updated: string[]
  deleted: string[]
}

export function diffFiles(before: Record<string, string>, after: Record<string, string>): FileDiff {
  const created: string[] = []
  const updated: string[] = []
  const deleted: string[] = []
  const beforeKeys = new Set(Object.keys(before))
  const afterKeys = new Set(Object.keys(after))

  for (const k of afterKeys) {
    if (!beforeKeys.has(k)) {
      created.push(k)
    } else if ((before[k] ?? '') !== (after[k] ?? '')) {
      updated.push(k)
    }
  }
  for (const k of beforeKeys) {
    if (!afterKeys.has(k)) {
      deleted.push(k)
    }
  }
  return { created, updated, deleted }
}

