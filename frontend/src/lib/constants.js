import { Factory, Library, ShieldCheck, Users } from 'lucide-react'

export const roleOptions = [
  { id: 'institution', label: 'School / College', icon: Library, detail: 'Raise pickups and track campus impact' },
  { id: 'ngo', label: 'NGO partner', icon: Users, detail: 'Request notebooks and manage allocations' },
  { id: 'recycler', label: 'Recycler partner', icon: Factory, detail: 'Manage automated routes and loads' },
  { id: 'admin', label: 'Platform admin', icon: ShieldCheck, detail: 'Monitor the full circular network' },
]

export const roleMeta = {
  institution: { name: 'Greenfield College', short: 'Institution', initials: 'GC' },
  ngo: { name: 'Bright Futures Foundation', short: 'NGO partner', initials: 'BF' },
  recycler: { name: 'EcoMill Logistics', short: 'Recycler partner', initials: 'EL' },
  admin: { name: 'KaaGazz Operations', short: 'Platform admin', initials: 'KO' },
}

// Sidebar items per role. The first entry is always the landing section.
export const navByRole = {
  institution: ['Overview', 'Pickup requests', 'Impact ledger', 'Campus profile'],
  ngo: ['Overview', 'Material demand', 'Allocations', 'Student reach', 'Profile'],
  recycler: ['Overview', 'Route queue', 'Load history', 'Fleet & capacity', 'Profile'],
  admin: ['Overview', 'Registration approvals', 'Network monitor', 'Partner directory', 'Impact reports'],
}

export const MATERIAL_TYPES = ['Rough notebooks', 'Exam answer sheets', 'Assignments', 'Library files']

export const DEMAND_ITEM_TYPES = [
  { value: 'UPCYCLED_NOTEBOOK', label: 'Upcycled notebooks' },
  { value: 'BLANK_PAPER_BUNDLE', label: 'Blank paper bundles' },
  { value: 'MIXED_STATIONERY', label: 'Mixed stationery' },
]

// Dispatch lifecycle a recycler can move a route through from the UI.
export const DISPATCH_STATUS_FLOW = [
  { value: 'IN_TRANSIT', label: 'Start collection' },
  { value: 'COLLECTED', label: 'Mark collected' },
  { value: 'SORTED', label: 'Mark sorted' },
  { value: 'COMPLETED', label: 'Close route' },
]
