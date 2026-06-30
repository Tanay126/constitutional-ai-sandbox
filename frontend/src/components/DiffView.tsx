import { wordDiff } from '../lib/diff'

interface Props {
  before: string
  after: string
}

export function DiffView({ before, after }: Props) {
  const spans = wordDiff(before, after)
  return (
    <span className="whitespace-pre-wrap break-words">
      {spans.map((span, i) => {
        if (span.type === 'delete') {
          return <span key={i} className="diff-del">{span.text}</span>
        }
        if (span.type === 'insert') {
          return <span key={i} className="diff-ins">{span.text}</span>
        }
        return <span key={i}>{span.text}</span>
      })}
    </span>
  )
}
