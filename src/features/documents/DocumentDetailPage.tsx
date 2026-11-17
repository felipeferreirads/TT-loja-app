// Copiado do catálogo pessoal (`src/features/documents/DocumentDetailPage.tsx`)
// — mesma ficha, mesmas seções. Diferenças da loja: produtos no lugar de
// itens, venda vinculada, sem i18n, sem PIN, sem botão de ocultar valores e
// sem exportar PDF (o PDF do catálogo depende da ficha do espécime).
import { type ReactNode, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { amountDifference, documentAmountsTotal, sumByCurrency, sumItemPrices } from './totals'
import { countryName, formatDate, formatMoney } from '../../lib/format'
import { useAlert, useConfirm } from '../../components/DialogProvider'
import { Flag } from '../../components/Flag'
import { FileViewer } from '../../components/FileViewer'
import {
  ArrowLeftIcon,
  LinkIcon,
  UnlinkIcon,
  DocumentIcon,
  PackageIcon,
  CurrencyCircleIcon,
  TruckIcon,
  StackIcon,
  NotesIcon,
  PhotoIcon,
  PencilIcon,
  CashIcon,
} from '../../components/icons'
import {
  documentBadge,
  documentDate,
  documentNumber,
  formatTitular,
  fetchDocument,
  fetchDocumentFiles,
  fetchDocumentPayments,
  fetchDocumentItems,
  fetchProductsForDocument,
  filesOfPayment,
  linkProductsToDocument,
  unlinkProductFromDocument,
} from './api'
import type { DocumentFile, StoreProduct } from '../../types/db'
import { useCoverUrls } from '../products/queries'
import { fetchSuppliers } from '../suppliers/api'
import { fetchSales } from '../sales/api'
import { PickProductsDialog } from './PickProductsDialog'
import { useDocumentFileUrl } from './useDocumentFileUrl'
import { DocumentItemsTable, itemsSum as nfeItemsTotal } from './DocumentItemsEditor'

export function DocumentDetailPage() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 pb-24">
      <DocumentDetail />
    </div>
  )
}

function DocumentDetail() {
  const alert = useAlert()
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [picking, setPicking] = useState(false)
  const money = (value: number, currency: string) => formatMoney(value, currency)

  const { data: d, isLoading, error } = useQuery({
    queryKey: ['document', id],
    queryFn: () => fetchDocument(id!),
    enabled: !!id,
  })
  const { data: linkedProducts, isLoading: loadingLinked } = useQuery({
    queryKey: ['document-products', id],
    queryFn: () => fetchProductsForDocument(id!),
    enabled: !!id,
  })
  const { data: coverUrls } = useCoverUrls()
  const { data: suppliers } = useQuery({ queryKey: ['suppliers'], queryFn: fetchSuppliers })
  const { data: sales } = useQuery({ queryKey: ['sales'], queryFn: fetchSales })
  const { data: files } = useQuery({
    queryKey: ['document-files', id],
    queryFn: () => fetchDocumentFiles(id!),
    enabled: !!id,
  })

  const { data: payments } = useQuery({
    queryKey: ['document-payments', id],
    queryFn: () => fetchDocumentPayments(id!),
    enabled: !!id,
  })

  const { data: nfeItems } = useQuery({
    queryKey: ['document-items', id],
    queryFn: () => fetchDocumentItems(id!),
    enabled: !!id,
  })
  const { data: xmlUrl } = useDocumentFileUrl(d?.xml_url)

  const paymentTotals = useMemo(() => sumByCurrency(payments ?? []), [payments])
  const itemsSum = useMemo(
    () => sumItemPrices(linkedProducts ?? []),
    [linkedProducts],
  )

  if (isLoading) return <p className="py-12 text-center text-stone-500">{'Carregando…'}</p>
  if (error || !d) return <p className="py-12 text-center text-red-400">{(error as Error)?.message}</p>

  const products = linkedProducts ?? []
  const supplier = d.supplier_id ? suppliers?.find((s) => s.id === d.supplier_id) : undefined
  const sale = d.store_sale_id ? sales?.find((s) => s.id === d.store_sale_id) : undefined

  // Valores da compra (0201) e conferência com os demais valores na MESMA moeda.
  const cur = d.amounts_currency || 'BRL'
  const amountsTotal = documentAmountsTotal(d)
  const checks: { label: string; value: number; reference: number; referenceLabel: string }[] = []
  const addCheck = (label: string, value: number | null | undefined, reference: number | null, referenceLabel: string) => {
    if (value != null && reference != null) checks.push({ label, value, reference, referenceLabel })
  }
  if (d.has_nfe && cur === 'BRL')
    addCheck('Total das linhas da nota', nfeItemsTotal(nfeItems ?? []), d.goods_amount, 'Valor dos produtos')
  if (d.has_import && cur === 'USD')
    addCheck('Valor declarado na importação', d.goods_usd, d.goods_amount, 'Valor dos produtos')
  if (d.has_payment)
    addCheck('Total dos pagamentos', paymentTotals.find((x) => x.currency === cur)?.total, amountsTotal, 'Valor total')
  addCheck('Custo dos produtos', itemsSum.totals.find((x) => x.currency === cur)?.total, d.goods_amount, 'Valor dos produtos')
  const describeDifference = (value: number, reference: number, referenceLabel: string) => {
    const diff = amountDifference(reference, value)!
    if (diff === 0) return `igual ao ${referenceLabel.toLowerCase()}`
    const amount = money(Math.abs(diff), cur)
    return diff < 0
      ? `${amount} abaixo do ${referenceLabel.toLowerCase()}`
      : `${amount} acima do ${referenceLabel.toLowerCase()}`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          <Link
            to="/documentos"
            title={'Voltar'}
            aria-label={'Voltar'}
            className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-800 text-stone-300 transition hover:bg-stone-700"
          >
            <ArrowLeftIcon className="text-base" />
          </Link>
          <div>
            <div className="flex items-center gap-2 font-mono text-sm text-amber-500">
              <span className="rounded bg-stone-800 px-1.5 py-0.5">{documentBadge(d)}</span>
              <span>{documentNumber(d) || 'sem número'}</span>
            </div>
            <h1 className="text-2xl font-bold text-stone-100">{d.supplier_name || '(sem fornecedor)'}</h1>
            <p className="text-sm text-stone-400">
              {formatTitular(d.holder_name, d.holder_tax_id)} · {formatDate(documentDate(d))}
            </p>
            {supplier && (
              <p className="text-sm text-stone-400">
                Fornecedor (cadastro): <span className="text-stone-200">{supplier.name}</span>
              </p>
            )}
            {sale && (
              <p className="flex items-center gap-1 text-sm text-stone-400">
                <CashIcon className="h-3.5 w-3.5" /> Venda vinculada:{' '}
                <Link to="/vendas" className="link">
                  {new Date(sale.sale_date).toLocaleDateString('pt-BR')} · {sale.customer?.name ?? 'Sem cliente'} · {formatMoney(sale.total)}
                </Link>
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/documentos/${d.id}/editar`}
            className="btn-secondary inline-flex h-9 min-h-9 w-9 items-center justify-center px-0 py-0"
            title={'Editar'}
            aria-label={'Editar'}
          >
            <PencilIcon />
          </Link>
        </div>
      </div>

      {d.general_notes && (
        <section>
          <h2 className="section-title mb-2 flex items-center gap-1.5">
            <NotesIcon className="h-3.5 w-3.5" /> {'Observações'}
          </h2>
          <p className="text-sm whitespace-pre-wrap text-stone-300">{d.general_notes}</p>
        </section>
      )}

      {amountsTotal != null && (
        <section>
          <h2 className="section-title mb-2 flex items-center gap-1.5">
            <CurrencyCircleIcon className="h-3.5 w-3.5" /> {'Valores da compra'}
          </h2>
          <InfoGrid
            items={[
              ['Valor dos produtos', d.goods_amount != null ? money(d.goods_amount, cur) : null],
              ['Frete', d.freight_amount != null ? money(d.freight_amount, cur) : null],
              ['Impostos e taxas', d.fees_amount != null ? money(d.fees_amount, cur) : null],
              ['Valor total', <span className="font-semibold text-amber-400">{money(amountsTotal, cur)}</span>],
            ]}
          />
          {checks.length > 0 && (
            <ul className="mt-3 space-y-1 rounded-lg bg-stone-900/60 px-3 py-2 text-sm">
              {checks.map((c) => {
                const equal = amountDifference(c.reference, c.value) === 0
                return (
                  <li key={c.label}>
                    <span className="text-stone-400">{c.label}:</span>{' '}
                    <span className="text-stone-200">{money(c.value, cur)}</span>{' '}
                    <span className={equal ? 'text-stone-500' : 'text-amber-500'}>
                      ({describeDifference(c.value, c.reference, c.referenceLabel)})
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )}

      {d.has_nfe && (
        <section>
          <h2 className="section-title mb-2 flex items-center gap-1.5">
            <DocumentIcon className="h-3.5 w-3.5" /> {'NF-e'}
          </h2>
          <InfoGrid
            items={[
              ['Número', d.nfe_number],
              ['Série', d.nfe_series],
              ['Data de emissão', d.issue_date ? formatDate(d.issue_date) : null],
              ['Chave de acesso', d.nfe_key],
              ['Protocolo de autorização', d.nfe_protocol],
              ['CNPJ do fornecedor', d.supplier_tax_id],
              ['CPF/CNPJ destinatário', d.recipient_tax_id],
              [
                'Valor atribuído à peça',
                d.item_allocated_value != null ? money(d.item_allocated_value, 'BRL') : null,
              ],
            ]}
          />
          <DocumentItemsTable items={nfeItems ?? []} money={(v) => money(v, 'BRL')} />
          {d.xml_url && (
            <a href={xmlUrl} target="_blank" rel="noreferrer" className="link mt-2 block text-sm">
              {'Ver XML atual'}
            </a>
          )}
          <DocumentFileGrid files={(files ?? []).filter((f) => f.section === 'nfe')} />
        </section>
      )}

      {d.has_import && (
        <>
          <section>
            <h2 className="section-title mb-2 flex items-center gap-1.5">
              <PackageIcon className="h-3.5 w-3.5" /> {'Importação'}
            </h2>
            <InfoGrid
              items={[
                [
                  'País de origem',
                  d.purchase_country ? (
                    <span className="inline-flex items-center gap-1">
                      <Flag code={d.purchase_country} />
                      {countryName(d.purchase_country)}
                    </span>
                  ) : null,
                ],
                ['Nº Invoice', d.invoice_number],
                ['AWB / rastreio', d.awb],
                ['Conteúdo declarado', d.declared_contents],
                ['Peso da remessa', d.shipment_weight_kg != null ? `${d.shipment_weight_kg} kg` : null],
                ['Data de envio', d.shipped_date ? formatDate(d.shipped_date) : null],
                ['Data de entrega', d.arrival_date ? formatDate(d.arrival_date) : null],
                ['Transportadora', d.carrier],
                ['Declaração aduaneira', d.customs_type],
                ['Número da declaração', d.customs_number],
              ]}
            />
          </section>
          <section>
            <h2 className="section-title mb-2 flex items-center gap-1.5">
              <CurrencyCircleIcon className="h-3.5 w-3.5" /> {'Valores declarados'}
            </h2>
            <InfoGrid
              items={[
                ['Valor declarado', d.goods_usd != null ? money(d.goods_usd, 'USD') : null],
                ['Frete', d.freight_usd != null ? money(d.freight_usd, 'USD') : null],
                ['Câmbio', d.exchange_rate != null ? d.exchange_rate.toString() : null],
                [
                  'Impostos / Taxas pagos',
                  d.taxes_brl != null ? money(d.taxes_brl, 'BRL') : null,
                ],
                [
                  'Custo total importação',
                  d.import_cost_brl != null ? money(d.import_cost_brl, 'BRL') : null,
                ],
              ]}
            />
          </section>
        </>
      )}

      {d.has_payment && (
        <section>
          <h2 className="section-title mb-2 flex items-center gap-1.5">
            <CurrencyCircleIcon className="h-3.5 w-3.5" /> {'Comprovante de pagamento'}
          </h2>
          <div className="space-y-3">
            {(payments ?? []).map((p, i) => (
              <div key={p.id}>
                {(payments?.length ?? 0) > 1 && (
                  <p className="mb-1 text-xs font-medium text-stone-400">{`Comprovante ${i + 1}`}</p>
                )}
                <InfoGrid
                  items={[
                    ['Data do pagamento', p.payment_date ? formatDate(p.payment_date) : null],
                    ['Valor pago', p.amount != null ? money(p.amount, p.currency) : null],
                    ['Método', p.method],
                  ]}
                />
                <DocumentFileGrid files={filesOfPayment(files ?? [], p.id, i === 0)} />
              </div>
            ))}
            {(payments ?? []).length === 0 && <DocumentFileGrid files={(files ?? []).filter((f) => f.section === 'payment')} />}
          </div>
          {paymentTotals.length > 0 && (
            <p className="mt-3 text-sm text-stone-300">
              <span className="text-stone-400">{'Total dos comprovantes'}:</span>{' '}
              <span className="font-semibold text-amber-400">
                {paymentTotals.map((x) => money(x.total, x.currency)).join(' + ')}
              </span>
            </p>
          )}
        </section>
      )}

      {d.has_shipping && (
        <section>
          <h2 className="section-title mb-2 flex items-center gap-1.5">
            <TruckIcon className="h-3.5 w-3.5" /> {'Comprovante de Envio'}
          </h2>
          <InfoGrid
            items={[
              ['Transportadora', d.shipping_carrier],
              ['Código de rastreio', d.shipping_tracking],
              ['Data de envio', d.shipping_sent_date ? formatDate(d.shipping_sent_date) : null],
              ['Data de entrega', d.shipping_delivered_date ? formatDate(d.shipping_delivered_date) : null],
            ]}
          />
          <DocumentFileGrid files={(files ?? []).filter((f) => f.section === 'shipping')} />
        </section>
      )}

      {(files ?? []).filter((f) => f.section === 'general').length > 0 && (
        <section>
          <h2 className="section-title mb-2 flex items-center gap-1.5">
            <StackIcon className="h-3.5 w-3.5" /> {'Arquivos'}
          </h2>
          <DocumentFileGrid files={(files ?? []).filter((f) => f.section === 'general')} />
        </section>
      )}

      {d.notes && (
        <section>
          <h2 className="section-title mb-2 flex items-center gap-1.5">
            <NotesIcon className="h-3.5 w-3.5" /> {'Observações dos arquivos'}
          </h2>
          <p className="text-sm whitespace-pre-wrap text-stone-300">{d.notes}</p>
        </section>
      )}

      <section>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="section-title flex items-center gap-1.5">
            <PackageIcon className="h-3.5 w-3.5" /> {`Produtos vinculados (${products.length})`}
          </h2>
          <button
            type="button"
            onClick={() => setPicking(true)}
            className="btn-secondary inline-flex h-9 min-h-9 w-9 items-center justify-center px-0 py-0"
            title="Vincular a este documento um produto que já está cadastrado"
            aria-label="Vincular produto"
          >
            <LinkIcon />
          </button>
        </div>

        {itemsSum.totals.length > 0 && (
          <div className="mb-3 rounded-lg bg-stone-900/60 px-3 py-2 text-sm">
            <span className="text-stone-400">Soma do custo dos produtos:</span>{' '}
            <span className="font-semibold text-amber-400">{itemsSum.totals.map((x) => money(x.total, x.currency)).join(' + ')}</span>
            {itemsSum.withoutPrice > 0 && (
              <p className="mt-0.5 text-xs text-stone-500">
                {itemsSum.withoutPrice === 1
                  ? '1 produto sem custo informado não entra na soma.'
                  : `${itemsSum.withoutPrice} produtos sem custo informado não entram na soma.`}
              </p>
            )}
          </div>
        )}

        {loadingLinked && <p className="text-sm text-stone-500">Carregando…</p>}
        {!loadingLinked && products.length === 0 && <p className="text-sm text-stone-500">Nenhum produto vinculado.</p>}

        {products.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {products.map((p) => (
              <div key={p.id} className="group relative">
                <Link to={`/produtos/${p.id}`} className="block overflow-hidden rounded-xl bg-stone-800">
                  <ProductThumb url={coverUrls?.[p.id]} />
                  <div className="p-2">
                    <p className="font-mono text-xs text-amber-500">{p.sku || '—'}</p>
                    <p className="line-clamp-2 text-sm text-stone-200">{p.name}</p>
                    {p.cost_price != null && <p className="text-xs text-stone-500">Custo {formatMoney(p.cost_price)}</p>}
                  </div>
                </Link>
                <UnlinkButton documentId={d.id} product={p} />
              </div>
            ))}
          </div>
        )}
      </section>

      {picking && (
        <PickProductsDialog
          excludeIds={products.map((p) => p.id)}
          onCancel={() => setPicking(false)}
          onConfirm={async (ids) => {
            try {
              await linkProductsToDocument(d.id, ids)
              setPicking(false)
              queryClient.invalidateQueries({ queryKey: ['document-products', d.id] })
              queryClient.invalidateQueries({ queryKey: ['product-documents'] })
            } catch (err) {
              await alert(err instanceof Error ? err.message : 'Erro ao vincular produtos.')
            }
          }}
        />
      )}
    </div>
  )
}

/** Desvincula o produto deste documento (o produto continua cadastrado). */
function UnlinkButton({ documentId, product }: { documentId: string; product: StoreProduct }) {
  const confirm = useConfirm()
  const alert = useAlert()
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState(false)

  const run = async () => {
    if (!(await confirm(`Desvincular "${product.name}" deste documento? O produto continua cadastrado.`, { danger: true }))) return
    setBusy(true)
    try {
      await unlinkProductFromDocument(documentId, product.id)
      queryClient.invalidateQueries({ queryKey: ['document-products', documentId] })
      queryClient.invalidateQueries({ queryKey: ['product-documents'] })
    } catch (err) {
      await alert(err instanceof Error ? err.message : 'Erro ao desvincular.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={busy}
      title="Desvincular (o produto continua cadastrado)"
      aria-label="Desvincular"
      // Canto superior direito; com mouse, só aparece ao passar sobre o card (no toque fica sempre visível).
      className="absolute top-1.5 right-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-sm text-white transition-opacity hover:bg-red-700 focus-visible:opacity-100 mouse:opacity-0 mouse:group-hover:opacity-100"
    >
      <UnlinkIcon />
    </button>
  )
}

function ProductThumb({ url }: { url?: string }) {
  return url ? (
    <img src={url} alt="" className="aspect-square w-full object-cover" />
  ) : (
    <div className="flex aspect-square w-full items-center justify-center bg-stone-700 text-xl opacity-50">
      <PackageIcon />
    </div>
  )
}

/** Grade de arquivos de uma seção — vazia (`null`) quando não há nenhum, pra quem chama nem precisar checar antes. */
function DocumentFileGrid({ files }: { files: DocumentFile[] }) {
  if (files.length === 0) return null
  return (
    <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {files.map((file) => (
        <DocumentFileTile key={file.id} file={file} />
      ))}
    </div>
  )
}

/** Miniatura de um arquivo: imagem de verdade ou ícone de PDF; legenda embaixo com o ícone do tipo. */
function DocumentFileTile({ file }: { file: DocumentFile }) {
  const { data: url } = useDocumentFileUrl(file.storage_path)
  const [open, setOpen] = useState(false)
  return (
    <button
      type="button"
      disabled={!url}
      onClick={() => setOpen(true)}
      className="block w-full space-y-1 text-left"
    >
      {open && (
        <span onClick={(e) => e.stopPropagation()}>
          <FileViewer file={{ path: file.storage_path, bucket: 'documents', title: file.caption }} onClose={() => setOpen(false)} />
        </span>
      )}
      <div className="relative aspect-square overflow-hidden rounded-lg bg-stone-800">
        {file.kind === 'image' && url ? (
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl opacity-60"><DocumentIcon /></div>
        )}
        {file.kind === 'pdf' && (
          <span className="absolute right-1 bottom-1 rounded bg-black/70 px-1 text-[10px] font-semibold text-white">
            PDF
          </span>
        )}
      </div>
      {file.caption && (
        <p className="flex items-center gap-1 truncate text-xs text-stone-400">
          <span>{file.kind === 'pdf' ? <DocumentIcon /> : <PhotoIcon />}</span>
          <span className="truncate">{file.caption}</span>
        </p>
      )}
    </button>
  )
}

function InfoGrid({ items }: { items: [string, ReactNode][] }) {
  const visible = items.filter(([, v]) => v != null && v !== '')
  if (visible.length === 0) return <p className="text-sm text-stone-500">—</p>
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
      {visible.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-4 border-b border-stone-800 py-1">
          <dt className="text-sm text-stone-500">{label}</dt>
          <dd className="text-right text-sm text-stone-200">{value}</dd>
        </div>
      ))}
    </dl>
  )
}
