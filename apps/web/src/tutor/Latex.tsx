import { useMemo } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

interface Props {
  latex: string
  display?: boolean
  className?: string
}

export function Latex({ latex, display = false, className }: Props) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(latex, {
        throwOnError: false,
        displayMode: display,
        strict: 'ignore',
      })
    } catch {
      return latex
    }
  }, [latex, display])

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
