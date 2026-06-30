import DiffMatchPatch from 'diff-match-patch'

const dmp = new DiffMatchPatch()

export interface DiffSpan {
  type: 'equal' | 'insert' | 'delete'
  text: string
}

export function wordDiff(before: string, after: string): DiffSpan[] {
  // diff_linesToChars_ returns { chars1, chars2, lineArray } in JS
  const { chars1, chars2, lineArray } = dmp.diff_linesToChars_(before, after)
  const diffs = dmp.diff_main(chars1, chars2, false)
  dmp.diff_charsToLines_(diffs, lineArray)
  dmp.diff_cleanupSemantic(diffs)

  return diffs.map(([op, text]) => ({
    type: op === 1 ? 'insert' : op === -1 ? 'delete' : 'equal',
    text,
  }))
}
