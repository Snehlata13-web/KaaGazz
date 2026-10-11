import { useState } from 'react'
import { Check, Plus, Truck, X } from 'lucide-react'
import { MATERIAL_TYPES } from '../lib/constants'

/** Institution pickup request form. Posts to `POST /api/pickups`. */
export function PickupForm({ account, pending, error, onClose, onSubmit }) {
  const [selected, setSelected] = useState([MATERIAL_TYPES[0]])
  const [weight, setWeight] = useState('')
  const [city, setCity] = useState(account?.city || '')
  const [address, setAddress] = useState(account?.address || '')
  const [preferredDate, setPreferredDate] = useState('')
  const [notes, setNotes] = useState('')

  const toggle = (item) =>
    setSelected((items) => (items.includes(item) ? items.filter((value) => value !== item) : [...items, item]))

  const submit = (event) => {
    event.preventDefault()
    onSubmit({
      materialTypes: selected,
      paperType: selected.join(','),
      estimatedWeightKg: Number(weight),
      city,
      pickupAddress: address,
      preferredDate: preferredDate || null,
      notes: notes || null,
    })
  }

  return (
    <div className="modal-layer">
      <form className="pickup-modal" onSubmit={submit}>
        <div className="modal-heading">
          <div>
            <span className="eyebrow">New collection</span>
            <h2>Raise a pickup request</h2>
          </div>
          <button type="button" className="close-modal" onClick={onClose}><X size={18} /></button>
        </div>
        <p>Your request joins the local queue. KaaGazz schedules a recycler automatically once your area reaches 200 kg.</p>
        <div className="form-two-col">
          <label>Estimated weight (kg)
            <input required min="1" type="number" value={weight} onChange={(event) => setWeight(event.target.value)} placeholder="e.g. 240" />
          </label>
          <label>Preferred date
            <input type="date" value={preferredDate} onChange={(event) => setPreferredDate(event.target.value)} />
          </label>
        </div>
        <label>What are you collecting?</label>
        <div className="material-options">
          {MATERIAL_TYPES.map((item) => (
            <button type="button" className={selected.includes(item) ? 'chosen' : ''} key={item} onClick={() => toggle(item)}>
              {selected.includes(item) ? <Check size={14} /> : <Plus size={14} />}{item}
            </button>
          ))}
        </div>
        <label>City
          <input required value={city} onChange={(event) => setCity(event.target.value)} placeholder="Sydney" />
        </label>
        <label>Pickup location
          <textarea required rows="2" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Building, street, city" />
        </label>
        <label>Notes (optional)
          <textarea rows="2" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Access instructions, contact on site…" />
        </label>
        {error && <div className="form-error">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="outline-action" onClick={onClose}>Cancel</button>
          <button type="submit" className="primary-action" disabled={pending || !selected.length}>
            <Truck size={16} />{pending ? 'Queueing…' : 'Queue pickup'}
          </button>
        </div>
      </form>
    </div>
  )
}
