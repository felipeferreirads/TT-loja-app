import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { formatDate } from '../../../lib/format'
import { documentDate, documentTitle, fetchDocumentsForProduct, unlinkProductFromDocument } from '../../documents/api'
import { useConfirm } from '../../../components/DialogProvider'
import { DocumentIcon, PlusIcon, UnlinkIcon } from '../../../components/icons'
import { Section } from './Field'

/**
 * Documentos que cobrem este produto (nota de compra, comprovantes…) — mesma
 * divisão do `LinkedDocuments` do catálogo pessoal: o vínculo é feito na
 * página do documento; aqui fica a visão inversa e o desvincular.
 */
export function LinkedDocuments({ productId }: { productId: string }) {
  const confirm = useConfirm()
  const queryClient = useQueryClient()
  const { data: documents = [] } = useQuery({
    queryKey: ['product-documents', productId],
    queryFn: () => fetchDocumentsForProduct(productId),
  })

  const handleUnlink = async (documentId: string) => {
    if (!(await confirm('Desvincular este documento do produto?', { danger: true }))) return
    await unlinkProductFromDocument(documentId, productId)
    queryClient.invalidateQueries({ queryKey: ['product-documents', productId] })
    queryClient.invalidateQueries({ queryKey: ['document-products', documentId] })
  }

  return (
    <Section title="Documentos" icon={<DocumentIcon />}>
      {documents.length === 0 && (
        <p className="text-sm text-stone-400">Nenhum documento vinculado. O vínculo é feito na página do documento.</p>
      )}
      <ul className="divide-y divide-stone-800">
        {documents.map((d) => (
          <li key={d.id} className="flex items-center gap-2 py-2">
            <Link to={`/documentos/${d.id}`} className="min-w-0 flex-1">
              <span className="block truncate text-sm text-stone-100">{d.supplier_name || documentTitle(d)}</span>
              <span className="block truncate text-xs text-stone-500">
                {documentTitle(d)} · {formatDate(documentDate(d))}
              </span>
            </Link>
            <button type="button" aria-label="Desvincular" title="Desvincular" onClick={() => void handleUnlink(d.id)} className="tap-icon">
              <UnlinkIcon />
            </button>
          </li>
        ))}
      </ul>
      <Link to={`/documentos/novo?product=${productId}`} className="link inline-flex items-center gap-1 text-sm">
        <PlusIcon /> Novo documento
      </Link>
    </Section>
  )
}
