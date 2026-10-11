import { Boxes, ClipboardList, Gauge, Route, ShieldCheck, Sparkles, Users } from 'lucide-react'

/** Picks the sidebar icon for a nav label from `navByRole`. */
export function navIcon(item) {
  if (item.includes('Impact') || item.includes('reports')) return <Sparkles size={16} />
  if (item.includes('Pickup') || item.includes('demand')) return <ClipboardList size={16} />
  if (item.includes('approval')) return <ShieldCheck size={16} />
  if (item.includes('Route') || item.includes('Fleet')) return <Route size={16} />
  if (item.includes('Partner') || item.includes('Campus') || item.includes('Student')) return <Users size={16} />
  if (item.includes('monitor')) return <Gauge size={16} />
  return <Boxes size={16} />
}
