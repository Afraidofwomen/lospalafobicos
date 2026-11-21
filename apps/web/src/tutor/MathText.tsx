import { Latex } from './Latex'

/** Texto del tutor con fórmulas entre `$…$`. */
export function MathText({ text }: { text: string }) {
  const parts = text.split(/(\$[^$]+\$)/g)
  return (
    <>
      {parts.map((part, i) =>
        part.length > 2 && part.startsWith('$') && part.endsWith('$') ? (
          <Latex key={i} latex={part.slice(1, -1)} />
        ) : (
          part
        ),
      )}
    </>
  )
}
