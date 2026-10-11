import { useState } from 'react'
import { PackageCheck, X } from 'lucide-react'
import { DEMAND_ITEM_TYPES } from '../lib/constants'

/** NGO material demand form. Posts to `POST /api/ngo/demands`. */
export function DemandForm({ account, pending, error, onClose, onSubmit }) {
  const [itemType, setItemType] = useState(DEMAND_ITEM_TYPES[0].value)
  const [quantity, setQuantity] = useState('')
  const [city, setCity] = useState(account?.city || '')
  const [deliveryAddress, setDeliveryAddress] = useState(account?.address || '')
  const [notes, setNotes] = useState('')

  const submit = (event) => {
    event.preventDefault()
    onSubmit({
      itemType,
      quantity: Number(quantity),
      city,
      deliveryAddress,
      notes: notes || null,
    })
  }

  return (
    <div className="modal-layer">
      <form className="pickup-modal" onSubmit={submit}>
        <div className="modal-heading">
          <div>
            <span className="eyebrow">New requisition</span>
            <h2>Request materials</h2>
          </div>
          <button type="button" className="close-modal" onClick={onClose}><X size={18} /></button>
        </div>
        <p>Demands are matched automatically against sorted material available in your city.</p>
        <div className="form-two-col">
          <label>Material type
            <select required value={itemType} onChange={(event) => setItemType(event.target.value)}>
              {DEMAND_ITEM_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label>Quantity (bundles)
            <input required min="1" step="1" type="number" value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="e.g. 120" />
          </label>
        </div>
        <label>City
          <input required value={city} onChange={(event) => setCity(event.target.value)} placeholder="Sydney" />
        </label>
        <label>Delivery address
          <textarea required rows="2" value={deliveryAddress} onChange={(event) => setDeliveryAddress(event.target.value)} placeholder="Centre name, street, city" />
        </label>
        <label>Notes (optional)
          <textarea rows="2" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Delivery window, contact person…" />
        </label>
        {error && <div className="form-error">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="outline-action" onClick={onClose}>Cancel</button>
          <button type="submit" className="primary-action" disabled={pending}>
            <PackageCheck size={16} />{pending ? 'Submitting…' : 'Submit demand'}
          </button>
        </div>
      </form>
    </div>
  )
}
