import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { DOCUMENT_KIND_LABELS, type StoreDocument } from '../../types/db'
import { fetchDocuments, deleteDocument } from './api'
import { formatMoney } from '../../lib/format'
import { useConfirm } from '../../components/DialogProvider'
import { useToast } from '../../components/ToastProvider'
import { EmptyState } from '../../components/EmptyState'
import { DocumentIcon, PlusIcon, TrashIcon } from '../../components/icons'

export function DocumentsPage() {
  const [documents, setDocuments] = useState<StoreDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const confirm = useConfirm()
  const toast = useToast()
  const navigate = useNavigate()

  const load = () => {
    setLoading(true)
    fetchDocuments()
      .then(setDocuments)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleDelete = async (doc: StoreDocument) => {
    if (!(await confirm(`Apagar "${doc.title}"? Essa ação não pode ser desfeita.`, { danger: true }))) return
    await deleteDocument(doc.id)
    toast.success('Documento apagado.')
    load()
  }

  return (
    <div>
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-stone-100">Documentos</h1>
        <Link to="/documentos/novo" className="btn-primary inline-flex items-center gap-1.5">
          <PlusIcon className="h-4 w-4" />
          Novo documento
        </Link>
      </header>

      {loading && <p className="text-sm text-stone-400">Carregando…</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      {!loading && !error && documents.length === 0 && (
        <EmptyState icon={DocumentIcon} title="Nenhum documento cadastrado ainda" />
      )}

      {documents.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-stone-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-900 text-stone-400">
              <tr>
                <th className="px-3 py-2 font-medium">Título</th>
                <th className="hidden px-3 py-2 font-medium sm:table-cell">Tipo</th>
                <th className="hidden px-3 py-2 font-medium sm:table-cell">Data</th>
                <th className="hidden px-3 py-2 font-medium md:table-cell">Fornecedor</th>
                <th className="px-3 py-2 font-medium">Valor</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800">
              {documents.map((d) => (
                <tr
                  key={d.id}
                  onClick={() => navigate(`/documentos/${d.id}`)}
                  className="cursor-pointer transition hover:bg-stone-900"
                >
                  <td className="px-3 py-2 text-stone-100">
                    {d.title}
                    <span className="block text-xs text-stone-500 sm:hidden">
                      {[
                        DOCUMENT_KIND_LABELS[d.kind],
                        d.doc_date ? new Date(`${d.doc_date}T00:00:00`).toLocaleDateString('pt-BR') : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </td>
                  <td className="hidden px-3 py-2 text-stone-400 sm:table-cell">{DOCUMENT_KIND_LABELS[d.kind]}</td>
                  <td className="hidden px-3 py-2 text-stone-400 sm:table-cell">
                    {d.doc_date ? new Date(`${d.doc_date}T00:00:00`).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td className="hidden px-3 py-2 text-stone-400 md:table-cell">{d.supplier_name ?? '—'}</td>
                  <td className="px-3 py-2 text-stone-400">
                    {d.total_amount == null ? '—' : formatMoney(d.total_amount)}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <button
                      type="button"
                      aria-label="Apagar"
                      onClick={(e) => {
                        e.stopPropagation()
                        void handleDelete(d)
                      }}
                      className="tap-icon hover:text-red-400"
                    >
                      <TrashIcon />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
