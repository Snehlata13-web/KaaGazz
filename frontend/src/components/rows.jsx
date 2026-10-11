import { ArrowUpRight, CalendarDays, Check, Clock3, FileCheck2, MoreHorizontal } from 'lucide-react'
import { Status } from './ui'

export function JourneyStep({ label, done, active }) {
  return (
    <div className={`journey-step ${done ? 'done' : ''} ${active ? 'active' : ''}`}>
      <span>{done ? <Check size={12} /> : active ? <Clock3 size={12} /> : null}</span>
      <small>{label}</small>
    </div>
  )
}

export function RequestRow({ title, meta, status, tone, onOpen }) {
  return (
    <div className="request-row">
      <div className={`request-icon request-${tone}`}><FileCheck2 size={16} /></div>
      <div><strong>{title}</strong><small>{meta}</small></div>
      <Status tone={tone}>{status}</Status>
      {onOpen
        ? <button className="row-arrow" onClick={onOpen} aria-label={`Open ${title}`}><ArrowUpRight size={15} /></button>
        : <MoreHorizontal size={16} className="dots" />}
    </div>
  )
}

export function AllocationRow({ date, title, meta, status, tone }) {
  return (
    <div className="allocation-row">
      <div className="allocation-date"><strong>{date}</strong><CalendarDays size={13} /></div>
      <div><strong>{title}</strong><small>{meta}</small></div>
      <Status tone={tone}>{status}</Status>
    </div>
  )
}

export function RecyclerRow({ id, area, stops, load, date, status, tone, onOpen }) {
  return (
    <div className="table-row">
      <strong className="route-id">{id}</strong>
      <div><strong>{area}</strong><small>{stops}</small></div>
      <strong>{load}</strong>
      <span>{date}</span>
      <Status tone={tone}>{status}</Status>
      <button className="row-arrow" onClick={onOpen} aria-label={`Open ${id}`}><ArrowUpRight size={16} /></button>
    </div>
  )
}

export function Region({ city, amount, detail, status, tone }) {
  return (
    <div className="region-row-item">
      <div className={`region-dot region-${tone}`} />
      <div><strong>{city}</strong><small>{detail}</small></div>
      <b>{amount}</b>
      <Status tone={tone}>{status}</Status>
    </div>
  )
}

export function HealthRow({ icon: Icon, label, value, note }) {
  return (
    <div className="health-row">
      <span className="health-icon"><Icon size={16} /></span>
      <div><strong>{label}</strong><small>{note}</small></div>
      <b>{value}</b>
      <ArrowUpRight size={15} className="dots" />
    </div>
  )
}
