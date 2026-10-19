'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  saveInvoice, updateInvoice, deleteInvoice, duplicateInvoice, lineItemId,
  getOffers, seedDefaultOffers,
} from '@/lib/crm-store'
import type { Invoice, InvoiceLineItem, RecurringOverride } from '@/lib/crm-types'
import { liveOverrides, monthLabel, upcomingMonthKeys } from '@/lib/recurring-override'
import { confirmAction } from '@/app/admin/ConfirmHost'
import PrivacyToggle from '@/components/os/PrivacyToggle'
import { currencyOptions } from '@/lib/fx'
import { usePeople } from '@/components/os/usePeople'
import { buildCatalog, CATALOG_GROUPS, CATALOG_GROUP_LABEL, STRATEGY_SESSION, type CatalogItem } from '@/lib/invoice-catalog'

function addDays(d: string, n: number): string {
  const dt = new Date(d)
  dt.setDate(dt.getDate() + n)
  return dt.toISOString().slice(0, 10)
}

const today = () => new Date().toISOString().slice(0, 10)

function nextNumber(): string {
  if (typeof window === 'undefined') return String(new Date().getFullYear()) + '126'
  try {
    const stored = JSON.parse(localStorage.getItem('ju_invoices') ?? '[]') as { number: string }[]
    if (!stored.length) return String(new Date().getFullYear()) + '126'
    const nums = stored.map(i => parseInt(i.number, 10)).filter(n => !isNaN(n))
    return String(Math.max(...nums) + 1)
  } catch { return String(new Date().getFullYear()) + '126' }
}

const EMPTY_ITEM = (): InvoiceLineItem => ({ id: lineItemId(), name: '', description: '', quantity: 1, price: 0 })

function strategyLines(intro: boolean): InvoiceLineItem[] {
  const lines: InvoiceLineItem[] = [{ id: lineItemId(), ...STRATEGY_SESSION.line, quantity: 1, price: STRATEGY_SESSION.price }]
  if (intro && STRATEGY_SESSION.introDiscount > 0) lines.push({ id: lineItemId(), name: 'Precio de introducción', description: 'Tarifa de la primera sesión', quantity: 1, price: -STRATEGY_SESSION.introDiscount })
  return lines
}

const isBlankLine = (li: InvoiceLineItem) => !li.name.trim() && !(li.description ?? '').trim() && !li.price

export type InvoicePreset = 'strategy' | 'strategy-intro'

const TERMS_DEFAULT = `Plazo de pago: 7 días desde la fecha de la factura.

Formas de pago: transferencia bancaria (datos abajo) o tarjeta con el link de pago.`

type Contact = { name: string; email: string; company: string; phone: string; address: string }

export type InvoicePrefill = {
  clientName?: string
  clientEmail?: string
  clientCompany?: string
  clientPhone?: string
  clientAddress?: string
  clientVat?: string
}

export function InvoiceEditor({ invoice, prefill, preset }: { invoice?: Invoice; prefill?: InvoicePrefill; preset?: InvoicePreset }) {
  const router = useRouter()
  const isEdit = !!invoice

  const [currency, setCurrency] = useState<'USD' | 'EUR' | 'AWG'>((invoice?.currency as 'USD' | 'EUR' | 'AWG') || 'EUR')
  const [clientName, setClientName] = useState(invoice?.clientName ?? prefill?.clientName ?? '')
  const [clientEmail, setClientEmail] = useState(invoice?.clientEmail ?? prefill?.clientEmail ?? '')
  const [clientCompany, setClientCompany] = useState(invoice?.clientCompany ?? prefill?.clientCompany ?? '')
  const [clientAddress, setClientAddress] = useState(invoice?.clientAddress ?? prefill?.clientAddress ?? '')
  const [clientPhone, setClientPhone] = useState(invoice?.clientPhone ?? prefill?.clientPhone ?? '')

  const [clientVat, setClientVat] = useState(invoice?.clientVat ?? prefill?.clientVat ?? '')
  const presetOn = !invoice && !!preset
  const [projectTitle, setProjectTitle] = useState(invoice?.projectTitle ?? (presetOn ? STRATEGY_SESSION.title : ''))
  const [issueDate, setIssueDate] = useState(invoice?.issueDate ?? today())
  const [dueDate, setDueDate] = useState(invoice?.dueDate ?? addDays(today(), 7))
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>(invoice?.lineItems?.length ? invoice.lineItems
    : presetOn ? strategyLines(preset === 'strategy-intro') : [EMPTY_ITEM()])
  const [notes, setNotes] = useState(invoice?.notes ?? (presetOn ? STRATEGY_SESSION.note : ''))

  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  useEffect(() => {
    seedDefaultOffers()
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after mount
    setCatalog(buildCatalog(getOffers()))
  }, [])
  const [terms] = useState(TERMS_DEFAULT)
  const [saving, setSaving] = useState(false)

  const [taxAdded, setTaxAdded] = useState(!!(invoice?.taxRate || invoice?.taxLabel || invoice?.taxes))
  const [taxLabel, setTaxLabel] = useState(invoice?.taxLabel ?? 'IVA')
  const [taxRate, setTaxRate] = useState<number>(invoice?.taxRate ?? 0)

  const [recurring, setRecurring] = useState(!!invoice?.recurring)

  const [cardPayment, setCardPayment] = useState(invoice?.cardPayment !== false)
  const [paymentUrl, setPaymentUrl] = useState(invoice?.paymentUrl ?? '')
  const [paymentUrlLabel, setPaymentUrlLabel] = useState(invoice?.paymentUrlLabel ?? '')
  const [recurringDay, setRecurringDay] = useState<number>(invoice?.recurringDay === 15 ? 15 : 1)

  const [overrides, setOverrides] = useState<Record<string, RecurringOverride>>(invoice?.recurringOverrides ?? {})
  const [ovMonth, setOvMonth] = useState('')
  const [ovAmount, setOvAmount] = useState('')
  const [ovNote, setOvNote] = useState('')

  const [pickerOpen, setPickerOpen] = useState(false)
  const [search, setSearch] = useState('')

  const subtotal = lineItems.reduce((s, li) => s + li.quantity * li.price, 0)
  const taxAmount = taxAdded ? Math.round(subtotal * (taxRate || 0)) / 100 : 0
  const total = subtotal + taxAmount
  const amountPaid = invoice?.amountPaid ?? 0
  const balance = total - amountPaid
  const displayNumber = invoice?.number ?? nextNumber()

  const people = usePeople()
  const contacts: Contact[] = people.map(p => ({ name: p.name, email: p.email, company: p.company, phone: p.phone, address: p.address }))
  const filtered = contacts.filter(c => !search || `${c.name} ${c.email} ${c.company}`.toLowerCase().includes(search.toLowerCase()))

  function fmt(n: number) {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency, minimumFractionDigits: 2 }).format(n)
  }

  function applyStrategy(intro: boolean) {
    setProjectTitle(STRATEGY_SESSION.title)
    setLineItems(strategyLines(intro))
    setNotes(STRATEGY_SESSION.note)
    setCurrency('EUR')
  }
  function addLine() { setLineItems(prev => [...prev, EMPTY_ITEM()]) }

  function addFromCatalog(key: string) {
    const item = catalog.find(c => c.key === key)
    if (!item) return
    const line: InvoiceLineItem = { id: lineItemId(), name: item.name, description: item.description, quantity: 1, price: item.price }
    const blank = lineItems.every(isBlankLine)
    setLineItems(prev => [...prev.filter(li => !isBlankLine(li)), line])
    if (blank && item.price > 0) {
      if (!projectTitle.trim()) setProjectTitle(item.key.startsWith('strategy') ? STRATEGY_SESSION.title : item.name)
      if (item.currency === 'USD' || item.currency === 'EUR') setCurrency(item.currency)
    }
  }
  function updateLine(id: string, patch: Partial<InvoiceLineItem>) {
    setLineItems(prev => prev.map(li => li.id === id ? { ...li, ...patch } : li))
  }
  function removeLine(id: string) { setLineItems(prev => prev.filter(li => li.id !== id)) }

  const ovMonths = upcomingMonthKeys(recurringDay, 6).filter(k => !overrides[k])
  const ovLive = liveOverrides(overrides)
  function addOverride() {
    const amount = parseFloat(ovAmount)
    const key = ovMonth || ovMonths[0]
    if (!key || !Number.isFinite(amount) || amount < 0) return
    setOverrides(prev => ({ ...prev, [key]: { amount, note: ovNote.trim() || undefined } }))
    setOvMonth(''); setOvAmount(''); setOvNote('')
  }
  function removeOverride(key: string) {
    setOverrides(prev => { const next = { ...prev }; delete next[key]; return next })
  }

  function pickContact(c: Contact) {
    setClientName(c.name); setClientEmail(c.email); setClientCompany(c.company)
    setClientPhone(c.phone); setClientAddress(c.address); setPickerOpen(false); setSearch('')
  }

  function fields(status: Invoice['status']) {
    return {
      clientName, clientEmail, clientCompany, clientAddress, clientPhone, clientVat,
      projectTitle, lineItems, taxes: taxAmount,
      taxLabel: taxAdded ? taxLabel : undefined, taxRate: taxAdded ? taxRate : undefined,
      amountPaid, currency, status, notes, issueDate, dueDate,
      recurring, recurringDay: recurring ? recurringDay : undefined,
      recurringOverrides: recurring && Object.keys(overrides).length ? overrides : undefined,
      cardPayment,
      paymentUrl: paymentUrl.trim() || undefined,
      paymentUrlLabel: paymentUrlLabel.trim() || undefined,
    }
  }

  function persist(status: Invoice['status']): Invoice {
    if (isEdit) {
      updateInvoice(invoice!.id, { ...fields(status) })
      return { ...invoice!, ...fields(status) }
    }
    return saveInvoice(fields(status))
  }

  async function saveClose() {

    if (!clientName.trim()) { await confirmAction({ message: 'Añade primero el nombre del cliente.', detail: 'Una factura necesita un destinatario.', confirmLabel: 'OK', cancelLabel: 'Cerrar', destructive: false }); return }
    setSaving(true)
    persist(isEdit ? (invoice!.status) : 'draft')
    router.push('/admin/invoices')
  }

  async function send() {
    if (!clientName.trim()) { await confirmAction({ message: 'Añade primero el nombre del cliente.', detail: 'Una factura necesita un destinatario.', confirmLabel: 'OK', cancelLabel: 'Cerrar', destructive: false }); return }
    setSaving(true)

    const alreadyPaid = invoice?.status === 'paid'
    const inv = persist(alreadyPaid ? 'paid' : 'sent')
    try {
      await fetch('/api/send-invoice', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: inv.id, invoiceNumber: inv.number, clientName, clientEmail, clientCompany,
          projectTitle, lineItems, taxes: taxAmount, amountPaid, currency, dueDate, issueDate, notes,
        }),
      })
    } catch (e) {

      console.error('[invoice] send failed', inv.number, e)
      setSaving(false)
      await confirmAction({ message: 'La factura se guardó, pero el email no se envió.', detail: 'Inténtalo de nuevo o envía el enlace a mano.', confirmLabel: 'OK', cancelLabel: 'Cerrar', destructive: false })
      return
    }
    updateInvoice(inv.id, {
      status: alreadyPaid ? 'paid' : 'sent',
      sentAt: new Date().toISOString(),
    })
    router.push('/admin/invoices')
  }

  function markPaid() {
    if (!invoice) return
    updateInvoice(invoice.id, { status: 'paid', amountPaid: total, paidAt: new Date().toISOString() })
    router.push('/admin/invoices')
  }
  function duplicate() {
    if (!invoice) return
    const dup = duplicateInvoice(invoice.id)
    if (dup) router.push(`/admin/invoices/${dup.id}`)
  }
  async function remove() {
    if (!invoice) return
    if (!(await confirmAction({ message: `¿Eliminar la factura #${invoice.number}?`, detail: 'No se puede deshacer.' }))) return
    deleteInvoice(invoice.id)
    router.push('/admin/invoices')
  }

  const inp: React.CSSProperties = { border: '1px solid var(--os-line)', borderRadius: 4, padding: '8px 10px', fontSize: 13, color: 'var(--os-text)', outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'Arial, sans-serif' }
  const lbl: React.CSSProperties = { fontSize: 11.5, fontWeight: 700, color: 'var(--os-text-faint)', marginBottom: 5, display: 'block', textTransform: 'uppercase', letterSpacing: 0.4 }
  const statusColor = invoice?.status === 'paid' ? '#16a34a' : invoice?.status === 'overdue' ? '#dc2626' : invoice?.status === 'sent' ? '#2563eb' : '#0E71AC'

  return (
    <div className="os-inv-editor" style={{ maxWidth: 880, margin: '0 auto' }}>
      {}
      <div className="os-inv-bar" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <Link href="/admin/invoices" style={{ color: 'var(--os-text-faint)', textDecoration: 'none', fontSize: 20, lineHeight: 1 }}>←</Link>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--os-text)' }}>{isEdit ? `Factura #${invoice!.number}` : 'Nueva factura'}</div>
        <span style={{ padding: '3px 10px', background: statusColor + '18', color: statusColor, borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{({ draft: 'Borrador', sent: 'Enviada', paid: 'Pagada', overdue: 'Vencida', void: 'Anulada' } as Record<string, string>)[invoice?.status ?? 'draft'] ?? invoice?.status}</span>
        {invoice?.proposalId && (
          <Link href={`/admin/proposals/${invoice.proposalId}/edit`} style={{ fontSize: 11.5, color: 'var(--os-accent)', fontWeight: 600, textDecoration: 'none' }}>↳ de la propuesta</Link>
        )}
        <div className="os-inv-actions" style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <PrivacyToggle />
          <div className="os-inv-currency" style={{ display: 'flex', border: '1px solid var(--os-line)', borderRadius: 8, overflow: 'hidden' }}>
            {}
            {currencyOptions(invoice?.currency).map(c => (
              <button key={c} type="button" onClick={() => setCurrency(c)} style={{ padding: '7px 16px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12, background: currency === c ? 'var(--os-accent)' : 'var(--os-card)', color: currency === c ? '#fff' : 'var(--os-text-faint)' }}>{c}</button>
            ))}
          </div>
          {isEdit && invoice!.status !== 'paid' && (
            <button type="button" onClick={markPaid} className="os-inv-act" style={{ padding: '8px 14px', background: 'var(--os-card)', border: '1px solid var(--os-good)', color: 'var(--os-good)', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 12.5 }}>Marcar pagada</button>
          )}
          {isEdit && <button type="button" onClick={duplicate} className="os-inv-act" style={{ padding: '8px 12px', background: 'var(--os-card)', border: '1px solid var(--os-line)', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 12.5, color: 'var(--os-text-muted)' }}>Duplicar</button>}
          <button type="button" onClick={saveClose} disabled={saving} className="os-inv-act" style={{ padding: '8px 16px', background: 'var(--os-card)', border: '1px solid var(--os-line)', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 12.5, color: 'var(--os-text-muted)' }}>Guardar y cerrar</button>
          <button type="button" onClick={send} disabled={saving} className="os-inv-act os-inv-send" style={{ padding: '8px 20px', background: 'var(--os-accent)', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 12.5, color: '#fff' }}>{invoice?.sentAt ? 'Reenviar factura' : 'Enviar factura'}</button>
        </div>
      </div>

      {}
      <div className="os-inv-doc" style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 4, boxShadow: '0 1px 8px rgba(0,0,0,0.06)', padding: '40px 48px', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 13 }}>
        {}
        <div className="os-inv-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div className="os-inv-logo" style={{ width: 80, height: 80, background: '#0C2A43', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
            <Image src="/icon.png" alt="José Unstoppable" width={64} height={64} style={{ objectFit: 'contain' }} />
          </div>
          <div className="os-inv-meta" style={{ textAlign: 'right' }}>
            <div className="os-inv-number" style={{ fontSize: 20, fontWeight: 900, color: '#0C2A43', marginBottom: 10 }}>Factura #{displayNumber}</div>
            <div className="os-inv-dates" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 12px', alignItems: 'center', fontSize: 12.5 }}>
              <span style={{ color: '#888' }}>Fecha de emisión:</span>
              <input type="date" value={issueDate} onChange={e => { setIssueDate(e.target.value); setDueDate(addDays(e.target.value, 7)) }} style={{ ...inp, width: 130, padding: '4px 8px', fontSize: 12.5 }} />
              <span style={{ color: '#888' }}>Vencimiento:</span>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={{ ...inp, width: 130, padding: '4px 8px', fontSize: 12.5 }} />
              <span style={{ color: '#888' }}>Comercial:</span>
              <span style={{ fontWeight: 600 }}>José Unstoppable</span>
            </div>
          </div>
        </div>

        {}
        <div className="os-collapse" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, paddingBottom: 24, marginBottom: 24, borderBottom: '1px solid #eee', fontSize: 12.5, color: '#555', lineHeight: 1.8 }}>
          <div>
            <div style={{ fontWeight: 700, color: '#0C2A43', fontSize: 13, marginBottom: 2 }}>José Unstoppable</div>
            <div style={{ color: '#0C2A43', fontWeight: 500 }}>Coaching online 1:1</div>
            <div>{process.env.NEXT_PUBLIC_BUSINESS_ADDRESS}</div>
            <div>hola@joseunstoppable.com</div>
          </div>
          <div>
            <div>Web: joseunstoppable.com</div>
            <div>IBAN: {process.env.NEXT_PUBLIC_BANK_IBAN}</div>
          </div>
        </div>

        {}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <label style={{ ...lbl, marginBottom: 0 }}>Cliente *</label>
            <div style={{ position: 'relative' }}>
              <button type="button" onClick={() => { setPickerOpen(o => !o); setSearch('') }} style={{ background: '#f3edff', color: '#0E71AC', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>
                {clientName ? 'Cambiar contacto' : 'Elegir de contactos'}
              </button>
              {pickerOpen && (
                <div className="os-inv-picker" style={{ position: 'absolute', top: '110%', left: 0, zIndex: 200, width: 320, background: '#fff', border: '1px solid #e5e0f0', borderRadius: 10, boxShadow: '0 12px 30px rgba(15,0,32,0.15)', padding: 8 }}>
                  <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar contactos…" style={{ ...inp, marginBottom: 6 }} />
                  <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                    {filtered.map((c, i) => (
                      <button key={i} type="button" onClick={() => pickContact(c)} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', borderRadius: 6, padding: '8px 10px', cursor: 'pointer', fontSize: 13 }}>
                        <div className="os-private" style={{ fontWeight: 700, color: '#0C2A43' }}>{c.name || c.email}</div>
                        <div className="os-private" style={{ fontSize: 11.5, color: '#999' }}>{[c.company, c.email].filter(Boolean).join(' · ')}</div>
                      </button>
                    ))}
                    {filtered.length === 0 && <div style={{ padding: '12px 10px', color: '#bbb', fontSize: 12.5 }}>No hay contactos que coincidan. Escribe los datos abajo.</div>}
                  </div>
                </div>
              )}
            </div>
          </div>
          {pickerOpen && <div onClick={() => setPickerOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 100 }} />}
          <div className="os-inv-pair" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 8 }}>
            <input className="os-private" style={inp} value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Nombre del cliente *" />
            <input className="os-private" style={inp} value={clientCompany} onChange={e => setClientCompany(e.target.value)} placeholder="Empresa" />
          </div>
          <div className="os-inv-pair" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 8 }}>
            <input className="os-private" style={inp} type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="Email" />
            <input className="os-private" style={inp} value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="Teléfono" />
          </div>
          <textarea style={{ ...inp, resize: 'none', display: 'block', marginBottom: 8 } as React.CSSProperties} rows={2} value={clientAddress} className="os-inv-address os-private" onChange={e => setClientAddress(e.target.value)} placeholder="Dirección de facturación (opcional)" />
          <input className="os-private" style={inp} value={clientVat} onChange={e => setClientVat(e.target.value)} placeholder="NIF / CIF (p. ej. 12345678Z)" />
        </div>

        {}
        <div style={{ marginBottom: 24 }}>
          <label style={lbl}>Concepto de la factura</label>
          <input style={{ ...inp, fontSize: 14 }} value={projectTitle} onChange={e => setProjectTitle(e.target.value)} placeholder="p. ej. Programa Imparable 90 días, junio 2026" />
        </div>

        {}
        {!invoice && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#777' }}>Relleno rápido:</span>
          <button type="button" className="os-btn os-btn-ghost os-btn-sm" onClick={() => applyStrategy(false)}>{STRATEGY_SESSION.title} ({STRATEGY_SESSION.price} €)</button>
        </div>}

        {}
        <table className="os-inv-lines" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
          <thead>
            <tr style={{ background: '#E4F4FD' }}>
              <th style={{ padding: '9px 12px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#555' }}>Producto o servicio</th>
              <th style={{ padding: '9px 8px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#555', width: 80 }}>Cantidad</th>
              <th style={{ padding: '9px 8px', textAlign: 'right', fontSize: 12, fontWeight: 700, color: '#555', width: 110 }}>Precio</th>
              <th style={{ padding: '9px 12px', textAlign: 'right', fontSize: 12, fontWeight: 700, color: '#555', width: 110 }}>Total línea</th>
              <th style={{ width: 32 }} />
            </tr>
          </thead>
          <tbody>
            {lineItems.map((li, i) => (
              <tr key={li.id} style={{ borderBottom: '1px solid #E4F4FD', background: i % 2 === 0 ? '#fff' : '#fdfcff' }}>
                <td className="os-inv-line-item" style={{ padding: '10px 12px 10px 12px' }}>
                  <input value={li.name} onChange={e => updateLine(li.id, { name: e.target.value })} placeholder="Nombre del concepto" style={{ ...inp, fontWeight: 600, border: 'none', background: 'transparent', padding: '2px 0', marginBottom: 2 }} />
                  <input value={li.description ?? ''} onChange={e => updateLine(li.id, { description: e.target.value })} placeholder="Escribe una descripción" style={{ ...inp, fontSize: 12, color: '#999', border: 'none', background: 'transparent', padding: '2px 0' }} />
                </td>
                <td className="os-inv-line-qty" data-label="Cant." style={{ padding: '10px 8px' }}>
                  <input type="number" min={1} inputMode="numeric" value={li.quantity} onChange={e => updateLine(li.id, { quantity: Number(e.target.value) })} style={{ ...inp, textAlign: 'center', padding: '6px' }} />
                </td>
                <td className="os-inv-line-price" data-label="Precio" style={{ padding: '10px 8px' }}>
                  <input type="number" min={0} step="0.01" inputMode="decimal" value={li.price} onChange={e => updateLine(li.id, { price: Number(e.target.value) })} style={{ ...inp, textAlign: 'right', padding: '6px 8px' }} />
                </td>
                <td className="os-inv-line-total" data-label="Total línea" style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, fontSize: 13 }}>{fmt(li.quantity * li.price)}</td>
                <td className="os-inv-line-remove" style={{ padding: '10px 4px' }}>
                  {lineItems.length > 1 && <button type="button" aria-label="Quitar línea" onClick={() => removeLine(li.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: 14, padding: 0, lineHeight: 1 }}>✕</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, padding: '8px 0 20px' }}>
          {catalog.length > 0 && (
            <select value="" onChange={e => addFromCatalog(e.target.value)} aria-label="Añadir una línea desde tus ofertas"
              style={{ ...inp, width: 'auto', minWidth: 240, maxWidth: '100%', fontSize: 13, fontWeight: 700, color: '#0E71AC', cursor: 'pointer' }}>
              <option value="">+ Añadir desde tus ofertas…</option>
              {CATALOG_GROUPS.map(g => (
                <optgroup key={g} label={CATALOG_GROUP_LABEL[g]}>
                  {catalog.filter(c => c.group === g).map(c => (
                    <option key={c.key} value={c.key}>{c.name} ({c.price < 0 ? '-' : ''}{c.currency} {Math.abs(c.price).toLocaleString('es-ES')}{c.suffix ?? ''})</option>
                  ))}
                </optgroup>
              ))}
            </select>
          )}
          <button type="button" onClick={addLine} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#0E71AC', fontWeight: 700, fontSize: 13, padding: 0 }}>+ Añadir línea en blanco</button>
        </div>

        {}
        <div className="os-inv-totals" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
          <div className="os-minfree" style={{ minWidth: 300 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }}>
              <span style={{ color: '#666', fontSize: 13 }}>Subtotal</span>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{fmt(subtotal)}</span>
            </div>

            {}
            {taxAdded ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid #eee' }}>
                <input value={taxLabel} onChange={e => setTaxLabel(e.target.value)} placeholder="Impuesto" style={{ ...inp, width: 90, padding: '4px 8px', fontSize: 12.5 }} />
                <input type="number" min={0} step="0.1" value={taxRate} onChange={e => setTaxRate(Number(e.target.value))} style={{ ...inp, width: 64, padding: '4px 8px', fontSize: 12.5, textAlign: 'right' }} />
                <span style={{ fontSize: 12.5, color: '#888' }}>%</span>
                <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 600 }}>{fmt(taxAmount)}</span>
                <button type="button" onClick={() => { setTaxAdded(false); setTaxRate(0) }} title="Quitar impuesto" style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: 14 }}>✕</button>
              </div>
            ) : (
              <div style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}>
                <button type="button" onClick={() => setTaxAdded(true)} style={{ background: 'none', border: 'none', color: '#0E71AC', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', padding: 0 }}>+ Añadir impuesto</button>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #eee' }}>
              <span style={{ fontWeight: 700, fontSize: 13.5 }}>Total factura</span>
              <span style={{ fontWeight: 800, fontSize: 14 }}>{fmt(total)}</span>
            </div>
            {amountPaid > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                <span style={{ color: '#666', fontSize: 13 }}>Importe pagado</span>
                <span style={{ fontSize: 13, color: '#16a34a' }}>-{fmt(amountPaid)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: '#E4F4FD', borderRadius: 6, marginTop: 4 }}>
              <span style={{ fontWeight: 800, fontSize: 13.5 }}>Pendiente de pago</span>
              <span style={{ fontWeight: 900, fontSize: 15, color: '#0C2A43' }}>{fmt(balance)}</span>
            </div>
          </div>
        </div>

        {}
        <div style={{ background: '#F1F8FD', border: '1px solid #E4F4FD', borderRadius: 8, padding: '12px 16px', marginBottom: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#0C2A43' }}>
            <input type="checkbox" checked={cardPayment} onChange={e => setCardPayment(e.target.checked)} />
            Ofrecer pago con tarjeta en esta factura
          </label>
          <div style={{ fontSize: 12, color: '#666', marginTop: 6, lineHeight: 1.5 }}>
            {cardPayment
              ? 'Puede pagar con tarjeta por Stripe o por transferencia. La tarjeta es más rápida para él y el dinero tarda unos días en llegarte.'
              : 'Solo transferencia. El botón de tarjeta se oculta y verá tus datos bancarios.'}
          </div>

          {}
          <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ flex: '2 1 260px' }}>
              <label style={lbl}>Tu propio enlace de pago</label>
              <input
                style={inp}
                value={paymentUrl}
                onChange={e => setPaymentUrl(e.target.value)}
                placeholder="Opcional. Pega un enlace de pago"
              />
            </div>
            <div style={{ flex: '1 1 150px' }}>
              <label style={lbl}>Texto del botón</label>
              <input
                style={inp}
                value={paymentUrlLabel}
                onChange={e => setPaymentUrlLabel(e.target.value)}
                placeholder="Pagar esta factura"
              />
            </div>
          </div>
          <div style={{ fontSize: 12, color: '#666', marginTop: 6, lineHeight: 1.5 }}>
            <strong>Normalmente déjalo vacío.</strong> El pago con tarjeta por Stripe ya lo gestiona
            la casilla de arriba, por el importe exacto. Pega algo aquí (un enlace de Stripe o
            PayPal) solo si este cliente paga así; se convertirá en el botón principal,
            encima de la opción de tarjeta.
          </div>
        </div>

        {}
        <div style={{ background: '#F1F8FD', border: '1px solid #E4F4FD', borderRadius: 8, padding: '12px 16px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#0C2A43' }}>
            <input type="checkbox" checked={recurring} onChange={e => setRecurring(e.target.checked)} />
            Hacer esta factura recurrente cada mes
          </label>
          {recurring && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#666' }}>
              Cobrar el día
              <select value={recurringDay} onChange={e => setRecurringDay(Number(e.target.value))} style={{ ...inp, width: 90, padding: '5px 8px' }}>
                <option value={1}>1</option>
                <option value={15}>15</option>
              </select>
              de cada mes
            </span>
          )}
          {recurring && <span style={{ fontSize: 11.5, color: '#b6adc9', width: '100%' }}>Cada mes se genera y se envía por email una copia nueva automáticamente.</span>}

          {}
          {recurring && (
            <div style={{ width: '100%', borderTop: '1px solid #E4F4FD', paddingTop: 12, marginTop: 4 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0C2A43', marginBottom: 2 }}>Cobrar un importe distinto un mes concreto</div>
              <div style={{ fontSize: 11.5, color: '#8b839a', marginBottom: 10 }}>
                The usual amount stays {fmt(total)}. Only the month you pick below is billed differently, then it goes back by itself.
              </div>
              {ovLive.length > 0 && (
                <div style={{ display: 'grid', gap: 6, marginBottom: 10 }}>
                  {ovLive.map(([key, ov]) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#0C2A43', background: '#fff', border: '1px solid #E4F4FD', borderRadius: 8, padding: '8px 12px' }}>
                      <span style={{ fontWeight: 700, minWidth: 120 }}>{monthLabel(key)}</span>
                      <span style={{ fontWeight: 800, color: '#0E71AC' }}>{fmt(ov.amount)}</span>
                      {ov.note && <span style={{ color: '#8b839a', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ov.note}</span>}
                      <button type="button" onClick={() => removeOverride(key)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#8b839a', cursor: 'pointer', fontSize: 12.5, fontWeight: 600 }}>Quitar</button>
                    </div>
                  ))}
                </div>
              )}
              {ovMonths.length > 0 && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <select value={ovMonth || ovMonths[0]} onChange={e => setOvMonth(e.target.value)} style={{ ...inp, width: 160, padding: '6px 8px' }}>
                    {ovMonths.map(k => <option key={k} value={k}>{monthLabel(k)}</option>)}
                  </select>
                  <input type="number" min={0} step="1" placeholder="Importe" value={ovAmount} onChange={e => setOvAmount(e.target.value)}
                    style={{ ...inp, width: 110, padding: '6px 8px' }} />
                  <input type="text" placeholder="Motivo (aparece en la factura), opcional" value={ovNote} onChange={e => setOvNote(e.target.value)} maxLength={120}
                    style={{ ...inp, flex: 1, minWidth: 200, padding: '6px 8px' }} />
                  <button type="button" onClick={addOverride} disabled={!ovAmount}
                    style={{ padding: '7px 14px', borderRadius: 12, border: '1px solid #0E71AC', background: ovAmount ? '#0E71AC' : '#fff', color: ovAmount ? '#fff' : '#0E71AC', fontWeight: 700, fontSize: 12.5, cursor: ovAmount ? 'pointer' : 'default' }}>
                    Aplicar a ese mes
                  </button>
                  {!invoice?.recurring && <span style={{ width: '100%', fontSize: 11.5, color: '#b6adc9' }}>Se guarda con la factura.</span>}
                </div>
              )}
            </div>
          )}
        </div>

        {}
        <div style={{ marginBottom: 20 }}>
          <label style={lbl}>Notas</label>
          <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Una nota para el cliente, p. ej. «Gracias por confiar en mí»." style={{ ...inp, resize: 'vertical' } as React.CSSProperties} />
        </div>

        {}
        <div>
          <label style={lbl}>Términos y condiciones</label>
          <div style={{ ...inp, whiteSpace: 'pre-wrap', color: '#666', fontSize: 12, lineHeight: 1.7, background: '#fafafa' }}>{terms}</div>
        </div>
      </div>

      {isEdit && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '14px 0' }}>
          <button type="button" onClick={remove} style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>Eliminar factura</button>
        </div>
      )}
      <div style={{ height: 40 }} />
    </div>
  )
}
