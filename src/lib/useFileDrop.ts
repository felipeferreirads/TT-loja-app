import { useRef, useState, type DragEvent } from 'react'

/**
 * Arrastar-e-soltar de arquivos numa área. `accept` segue a sintaxe do
 * atributo `accept` do `<input type="file">` (ex.: "application/pdf,image/*");
 * arquivos fora dele são descartados em silêncio. Sem `accept`, aceita tudo.
 * Espalhe `dropProps` no elemento-alvo e use `isDragging` pro destaque visual.
 */
export function useFileDrop({
  onFiles,
  accept,
  multiple = true,
  disabled = false,
}: {
  onFiles: (files: File[]) => void
  accept?: string
  multiple?: boolean
  disabled?: boolean
}) {
  const [isDragging, setIsDragging] = useState(false)
  // dragenter/dragleave disparam também ao cruzar filhos — o contador evita o
  // destaque piscar.
  const depth = useRef(0)

  const matches = (file: File) => {
    if (!accept) return true
    return accept.split(',').some((raw) => {
      const rule = raw.trim().toLowerCase()
      if (!rule) return false
      if (rule.startsWith('.')) return file.name.toLowerCase().endsWith(rule)
      if (rule.endsWith('/*')) return file.type.toLowerCase().startsWith(rule.slice(0, -1))
      return file.type.toLowerCase() === rule
    })
  }

  const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer.types).includes('Files')

  const dropProps = {
    onDragEnter: (e: DragEvent) => {
      if (disabled || !hasFiles(e)) return
      e.preventDefault()
      depth.current += 1
      setIsDragging(true)
    },
    onDragOver: (e: DragEvent) => {
      if (disabled || !hasFiles(e)) return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
    },
    onDragLeave: (e: DragEvent) => {
      if (disabled || !hasFiles(e)) return
      depth.current = Math.max(0, depth.current - 1)
      if (depth.current === 0) setIsDragging(false)
    },
    onDrop: (e: DragEvent) => {
      if (disabled || !hasFiles(e)) return
      e.preventDefault()
      depth.current = 0
      setIsDragging(false)
      let files = Array.from(e.dataTransfer.files).filter(matches)
      if (!multiple) files = files.slice(0, 1)
      if (files.length > 0) onFiles(files)
    },
  }

  return { isDragging, dropProps }
}

/** Classes de destaque enquanto um arquivo é arrastado sobre a área. */
export const DROP_ACTIVE_CLASS = 'border-amber-500 bg-amber-500/10'
