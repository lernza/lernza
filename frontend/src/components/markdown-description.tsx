interface MarkdownDescriptionProps {
  content: string
}

function parseMarkdownText(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const parts: Array<{ type: 'text' | 'url', value: string }> = []
  let lastIndex = 0

  text.replace(urlRegex, (url, index) => {
    if (index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, index) })
    }
    parts.push({ type: 'url', value: url })
    lastIndex = index + url.length
    return url
  })

  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) })
  }

  return parts.length === 0 ? [{ type: 'text' as const, value: text }] : parts
}

export function MarkdownDescription({ content }: MarkdownDescriptionProps) {
  const paragraphs = content.split(/\n\n+/).filter(p => p.trim())

  return (
    <div className="prose prose-sm max-w-none break-words">
      {paragraphs.map((para, idx) => {
        const lines = para.split('\n')
        return (
          <p key={idx} className="whitespace-pre-wrap">
            {lines.map((line, lineIdx) => {
              const parts = parseMarkdownText(line)
              return (
                <span key={lineIdx}>
                  {parts.map((part, partIdx) => {
                    if (part.type === 'url') {
                      return (
                        <a
                          key={partIdx}
                          href={part.value}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {part.value}
                        </a>
                      )
                    }
                    return <span key={partIdx}>{part.value}</span>
                  })}
                  {lineIdx < lines.length - 1 && <br />}
                </span>
              )
            })}
          </p>
        )
      })}
    </div>
  )
}
