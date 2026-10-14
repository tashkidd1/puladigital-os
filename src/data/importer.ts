import type { SeedData } from '../lib/types'
import { seedData } from './seed'

/**
 * The source repository was not mounted in this sandbox. Keep all seed/import logic
 * behind this function so a future normalized export can replace the demo dataset
 * without changing UI components or touching the source repository.
 */
export function loadInitialDataset(source?: Partial<SeedData>): SeedData {
  return {
    leads: source?.leads ?? seedData.leads,
    clients: source?.clients ?? seedData.clients,
    projects: source?.projects ?? seedData.projects,
    outreach: source?.outreach ?? seedData.outreach,
    followUps: source?.followUps ?? seedData.followUps,
    research: source?.research ?? seedData.research,
    qa: source?.qa ?? seedData.qa,
    activities: source?.activities ?? seedData.activities,
  }
}
