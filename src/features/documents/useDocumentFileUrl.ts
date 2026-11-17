import { useQuery } from '@tanstack/react-query'
import { signedUrl } from '../../lib/storage'

/** URL assinada de um arquivo do bucket "documents" (equivalente ao `useSignedUrl('documents', …)` do catálogo). */
export function useDocumentFileUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ['document-file-url', path],
    queryFn: () => signedUrl(path!, 3600, 'documents'),
    enabled: !!path,
    staleTime: 50 * 60 * 1000,
  })
}
