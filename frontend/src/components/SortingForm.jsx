import { useState } from 'react'
import { Sparkles, X } from 'lucide-react'
import { DEMAND_ITEM_TYPES } from '../lib/constants'

/**
 * Recycler sorting result for one dispatch.
 * Posts to `POST /api/operations/dispatches/:dispatchId/sorted`, which triggers
 * automatic allocation to matching NGO demands.
 */
export function SortingForm({ dispatch, pending, error, onClose, onSubmit }) {
  const [itemType, setItemType] = useState(DEMAND_ITEM_TYPES[0].value)
  const [availableQuantity, setAvailableQuantity] = useState('')

  const submit = (event) => {
    event.preventDefault()
    onSubmit({
      city: dispatch.city,
      itemType,
      availableQuantity: Number(availableQuantity),
    })
  }

  return (
    <div className="modal-layer">
      <form className="pickup-modal" onSubmit={submit}>
        <div className="modal-heading">
          <div>
            <span className="eyebrow">Sorting complete</span>
            <h2>Report sorted output</h2>
          </div>
          <button type="button" className="close-modal" onClick={onClose}><X size={18} /></button>
        </div>
        <p>
          Route <b>{dispatch.dispatchId}</b> · {dispatch.city} · {dispatch.totalWeightKg} kg collected.
          Reported output is matched to open NGO demands in this city.
        </p>
        <div className="form-two-col">
          <label>Output type
            <select required value={itemType} onChange={(event) => setItemType(event.target.value)}>
              {DEMAND_ITEM_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label>Available quantity (bundles)
            <input required min="1" step="1" type="number" value={availableQuantity} onChange={(event) => setAvailableQuantity(event.target.value)} placeholder="e.g. 80" />
          </label>
        </div>
        {error && <div className="form-error">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="outline-action" onClick={onClose}>Cancel</button>
          <button type="submit" className="primary-action" disabled={pending}>
            <Sparkles size={16} />{pending ? 'Submitting…' : 'Submit for matching'}
          </button>
        </div>
      </form>
    </div>
  )
}
