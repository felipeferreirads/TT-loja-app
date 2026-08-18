import { useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import type { StoreCustomer, StoreCustomerDocType } from '../../types/db'
import type { StoreCustomerInput } from './api'

interface Props {
  customer: StoreCustomer | null
  onSave: (input: StoreCustomerInput) => Promise<void>
  onClose: () => void
}

export function CustomerFormDialog({ customer, onSave, onClose }: Props) {
  const [name, setName] = useState(customer?.name ?? '')
  const [phone, setPhone] = useState(customer?.phone ?? '')
  const [email, setEmail] = useState(customer?.email ?? '')
  const [docType, setDocType] = useState<StoreCustomerDocType | ''>(customer?.doc_type ?? '')
  const [docNumber, setDocNumber] = useState(customer?.doc_number ?? '')
  const [zip, setZip] = useState(customer?.address_zip ?? '')
  const [street, setStreet] = useState(customer?.address_street ?? '')
  const [number, setNumber] = useState(customer?.address_number ?? '')
  const [complement, setComplement] = useState(customer?.address_complement ?? '')
  const [district, setDistrict] = useState(customer?.address_district ?? '')
  const [city, setCity] = useState(customer?.address_city ?? '')
  const [state, setState] = useState(customer?.address_state ?? '')
  const [notes, setNotes] = useState(customer?.notes ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await onSave({
        name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        doc_type: docType || null,
        doc_number: docNumber.trim() || null,
        address_zip: zip.trim() || null,
        address_street: street.trim() || null,
        address_number: number.trim() || null,
        address_complement: complement.trim() || null,
        address_district: district.trim() || null,
        address_city: city.trim() || null,
        address_state: state.trim() || null,
        notes: notes.trim() || null,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setBusy(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90dvh] w-full max-w-lg space-y-4 overflow-y-auto rounded-xl bg-stone-900 p-5"
      >
        <h2 className="text-lg font-bold text-stone-100">{customer ? 'Editar cliente' : 'Novo cliente'}</h2>

        <label className="block">
          <span className="text-sm text-stone-300">Nome</span>
          <input required value={name} onChange={(e) => setName(e.target.value)} className="input mt-1" />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm text-stone-300">Telefone</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input mt-1" />
          </label>
          <label className="block">
            <span className="text-sm text-stone-300">E-mail</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input mt-1" />
          </label>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <label className="block">
            <span className="text-sm text-stone-300">Documento</span>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as StoreCustomerDocType | '')}
              className="input mt-1"
            >
              <option value="">—</option>
              <option value="cpf">CPF</option>
              <option value="cnpj">CNPJ</option>
            </select>
          </label>
          <label className="col-span-2 block">
            <span className="text-sm text-stone-300">Número do documento</span>
            <input value={docNumber} onChange={(e) => setDocNumber(e.target.value)} className="input mt-1" />
          </label>
        </div>

        <fieldset className="space-y-3 border-t border-stone-800 pt-3">
          <legend className="text-sm font-medium text-stone-300">Endereço</legend>
          <div className="grid grid-cols-3 gap-3">
            <label className="block">
              <span className="text-sm text-stone-300">CEP</span>
              <input value={zip} onChange={(e) => setZip(e.target.value)} className="input mt-1" />
            </label>
            <label className="col-span-2 block">
              <span className="text-sm text-stone-300">Rua</span>
              <input value={street} onChange={(e) => setStreet(e.target.value)} className="input mt-1" />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm text-stone-300">Número</span>
              <input value={number} onChange={(e) => setNumber(e.target.value)} className="input mt-1" />
            </label>
            <label className="block">
              <span className="text-sm text-stone-300">Complemento</span>
              <input value={complement} onChange={(e) => setComplement(e.target.value)} className="input mt-1" />
            </label>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <label className="block">
              <span className="text-sm text-stone-300">Bairro</span>
              <input value={district} onChange={(e) => setDistrict(e.target.value)} className="input mt-1" />
            </label>
            <label className="block">
              <span className="text-sm text-stone-300">Cidade</span>
              <input value={city} onChange={(e) => setCity(e.target.value)} className="input mt-1" />
            </label>
            <label className="block">
              <span className="text-sm text-stone-300">UF</span>
              <input maxLength={2} value={state} onChange={(e) => setState(e.target.value.toUpperCase())} className="input mt-1" />
            </label>
          </div>
        </fieldset>

        <label className="block">
          <span className="text-sm text-stone-300">Notas</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input mt-1 min-h-20" />
        </label>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Cancelar
          </button>
          <button type="submit" disabled={busy} className="btn-primary flex-1">
            {busy ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  )
}
