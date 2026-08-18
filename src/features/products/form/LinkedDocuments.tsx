import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { DOCUMENT_KIND_LABELS, type StoreDocument } from '../../../types/db'
import { fetchDocumentsForProduct, unlinkProductFromDocument } from '../../documents/api'
import { DocumentIcon, UnlinkIcon } from '../../../components/icons'
import { Section } from './Field'

/**
 * Documentos que cobrem este produto (nota de compra, certificado…). O vínculo
 * é criado do lado do documento (`/documentos/:id`); aqui é só a visão inversa
 * e o desvincular — mesma divisão do `LinkedDocuments` do catálogo pessoal.
 */
export function LinkedDocuments({ productId }: { productId: string }) {
  const [documents, setDocuments] = useState<StoreDocument[]>([])

  const load = () => {
    fetchDocumentsForProduct(productId).then(setDocuments).catch(() => {})
  }

  useEffect(load, [productId])

  const handleUnlink = async (documentId: string) => {
    await unlinkProductFromDocument(documentId, productId)
    load()
  }

  return (
    <Section title="Documentos" icon={<DocumentIcon />}>
      {documents.length === 0 && (
        <p className="text-sm text-stone-400">
          Nenhum documento vinculado. O vínculo é feito na ficha do{' '}
          <Link to="/documentos" className="text-amber-500 hover:underline">
            documento
          </Link>
          .
        </p>
      )}
      <ul className="divide-y divide-stone-800">
        {documents.map((d) => (
          <li key={d.id} className="flex items-center gap-2 py-2">
            <Link to={`/documentos/${d.id}`} className="min-w-0 flex-1">
              <span className="block truncate text-sm text-stone-100">{d.title}</span>
              <span className="block truncate text-xs text-stone-500">{DOCUMENT_KIND_LABELS[d.kind]}</span>
            </Link>
            <button
              type="button"
              aria-label="Desvincular"
              onClick={() => void handleUnlink(d.id)}
              className="tap-icon"
            >
              <UnlinkIcon />
            </button>
          </li>
        ))}
      </ul>
    </Section>
  )
}
