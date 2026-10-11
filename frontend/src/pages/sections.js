import { PartnerProfilePage } from './PartnerProfilePage'
import { InstitutionOverview } from './institution/Overview'
import { PickupRequests } from './institution/PickupRequests'
import { ImpactLedger } from './institution/ImpactLedger'
import { NgoOverview } from './ngo/Overview'
import { MaterialDemand } from './ngo/MaterialDemand'
import { Allocations } from './ngo/Allocations'
import { StudentReach } from './ngo/StudentReach'
import { RecyclerOverview } from './recycler/Overview'
import { RouteQueue } from './recycler/RouteQueue'
import { LoadHistory } from './recycler/LoadHistory'
import { FleetCapacity } from './recycler/FleetCapacity'
import { AdminOverview } from './admin/Overview'
import { AdminApprovals } from './admin/AdminApprovals'
import { AdminNetworkMonitor } from './admin/AdminNetworkMonitor'
import { AdminPartnerDirectory } from './admin/AdminPartnerDirectory'
import { AdminImpactReports } from './admin/AdminImpactReports'

/**
 * Maps every sidebar label from `navByRole` to the section rendered inside the
 * dashboard shell. Keys must stay in sync with `src/lib/constants.js`.
 */
export const sectionsByRole = {
  institution: {
    Overview: InstitutionOverview,
    'Pickup requests': PickupRequests,
    'Impact ledger': ImpactLedger,
    'Campus profile': PartnerProfilePage,
  },
  ngo: {
    Overview: NgoOverview,
    'Material demand': MaterialDemand,
    Allocations,
    'Student reach': StudentReach,
    Profile: PartnerProfilePage,
  },
  recycler: {
    Overview: RecyclerOverview,
    'Route queue': RouteQueue,
    'Load history': LoadHistory,
    'Fleet & capacity': FleetCapacity,
    Profile: PartnerProfilePage,
  },
  admin: {
    Overview: AdminOverview,
    'Registration approvals': AdminApprovals,
    'Network monitor': AdminNetworkMonitor,
    'Partner directory': AdminPartnerDirectory,
    'Impact reports': AdminImpactReports,
  },
}
