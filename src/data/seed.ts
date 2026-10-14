import type { SeedData } from '../lib/types'

const avatarFrom = (value: string) => value.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

type LeadRow = {
  company: string
  category: string
  stage: 'New' | 'Contacted' | 'Lost'
  state: string
  nextAction: string
  nextActionDate: string
  source: string
  note: string
}

const leadRows: LeadRow[] = [
  { company: 'Agape Dental Clinic', category: 'Dental', stage: 'Contacted', state: 'No response', nextAction: 'Plan deliberate future follow-up', nextActionDate: '2026-11-07', source: '23 Sep contact', note: 'No response as of 14 Oct; park until a planned follow-up window.' },
  { company: 'Crown Dental Clinic', category: 'Dental', stage: 'Contacted', state: 'No response', nextAction: 'Plan deliberate future follow-up', nextActionDate: '2026-11-07', source: '23 Sep contact', note: 'No response as of 14 Oct; park until a planned follow-up window.' },
  { company: 'Dental Suite', category: 'Dental', stage: 'Contacted', state: 'Awaiting reply', nextAction: 'Wait for reply', nextActionDate: '2026-10-21', source: '12 Oct first contact', note: 'Preview shared; no reply recorded.' },
  { company: 'MYGA Medical Centre', category: 'Medical Clinic', stage: 'Contacted', state: 'Acknowledged', nextAction: 'Wait for doctor response', nextActionDate: '2026-10-21', source: '12 Oct first contact', note: 'Clinic acknowledged receipt and will forward preview to its doctor.' },
  { company: 'MedExo Private Clinic', category: 'Medical Clinic', stage: 'Contacted', state: 'Awaiting reply', nextAction: 'Wait for reply', nextActionDate: '2026-10-21', source: '12 Oct first contact', note: 'Preview shared; no reply recorded.' },
  { company: 'The Choice Medical Center', category: 'Medical Clinic', stage: 'Lost', state: 'Scrapped', nextAction: 'Do not revive', nextActionDate: '2026-10-14', source: 'Lead tracker', note: 'Scrapped — do not revive.' },
  { company: 'Eyesave Optical', category: 'Optometrist', stage: 'Contacted', state: 'Awaiting reply', nextAction: 'Wait for reply', nextActionDate: '2026-10-21', source: '12 Oct WhatsApp contact', note: 'WhatsApp contact confirmed active; no substantive reply recorded.' },
  { company: 'Vision Sense Optometrists', category: 'Optometrist', stage: 'Contacted', state: 'Acknowledged', nextAction: 'Wait for substantive reply', nextActionDate: '2026-10-21', source: '12 Oct first contact', note: 'Automated acknowledgement only; no substantive reply recorded.' },
  { company: 'City Physiotherapy Clinic', category: 'Physiotherapy', stage: 'Contacted', state: 'No response', nextAction: 'Plan deliberate future follow-up', nextActionDate: '2026-11-07', source: '23 Sep contact', note: 'No response as of 14 Oct; park until a planned follow-up window.' },
  { company: 'Synergy Physiotherapy', category: 'Physiotherapy', stage: 'New', state: 'Not yet contacted', nextAction: 'Verify demo and primary CTA', nextActionDate: '2026-10-15', source: 'Demo URL supplied', note: 'Verify live page and contact actions before preparing first contact.' },
  { company: 'Tshidilong Physiotherapy Clinic', category: 'Physiotherapy', stage: 'Contacted', state: 'No response', nextAction: 'Plan deliberate future follow-up', nextActionDate: '2026-11-07', source: '23 Sep contact', note: 'No response as of 14 Oct; park until a planned follow-up window.' },
  { company: 'Dental Hub', category: 'Dental', stage: 'New', state: 'Not yet contacted', nextAction: 'Verify demo and primary CTA', nextActionDate: '2026-10-15', source: 'Demo URL supplied', note: 'Verify live page and contact actions before preparing first contact.' },
  { company: 'Princess Marina Dental Clinic', category: 'Dental', stage: 'Lost', state: 'Scrapped', nextAction: 'Do not revive', nextActionDate: '2026-10-14', source: 'Lead tracker', note: 'Scrapped — public clinic; do not revive.' },
  { company: 'The Orthodontic Centre', category: 'Dental', stage: 'New', state: 'Not yet contacted', nextAction: 'Verify demo and primary CTA', nextActionDate: '2026-10-16', source: 'Demo URL supplied', note: 'Verify live page and contact actions before preparing first contact.' },
  { company: 'Dr M H Khan Surgery', category: 'Medical Clinic', stage: 'New', state: 'Not yet contacted', nextAction: 'Verify demo and primary CTA', nextActionDate: '2026-10-16', source: 'Demo URL supplied', note: 'Verify live page and contact actions before preparing first contact.' },
  { company: 'Everest Lodge – Phase 2', category: 'Hospitality', stage: 'Contacted', state: 'Awaiting reply', nextAction: 'Wait; no further routine nudge', nextActionDate: '2026-10-21', source: '12 Oct Facebook Messenger follow-up', note: 'Earlier reply on 17 Sep said they would review; do not send another routine chase.' },
  { company: 'Alive Medical Clinic', category: 'Medical Clinic', stage: 'Contacted', state: 'Parked', nextAction: 'Park unless reply', nextActionDate: '2026-11-07', source: '23 Sep final follow-up', note: 'Park unless the prospect replies.' },
  { company: 'Botlhe Medical Center', category: 'Medical Clinic', stage: 'Contacted', state: 'Parked', nextAction: 'Park unless reply', nextActionDate: '2026-11-07', source: '23 Sep final follow-up', note: 'Park unless the prospect replies.' },
  { company: 'Hilltop Medical Centre', category: 'Medical Clinic', stage: 'Contacted', state: 'Parked', nextAction: 'Park unless reply', nextActionDate: '2026-11-07', source: '23 Sep final follow-up', note: 'Park unless the prospect replies.' },
]

const demoUrls: Record<string, string> = {
  'Dental Hub': 'https://dentalhubgabs.netlify.app/',
  'Synergy Physiotherapy': 'https://synergyphysiogabs.netlify.app/',
  'Dr M H Khan Surgery': 'https://drmhkhan.netlify.app/',
  'The Orthodontic Centre': 'https://orthodonticcentre.netlify.app/',
  'Eyesave Optical': 'https://eyesave-optical.netlify.app/',
  'Everest Lodge – Phase 2': 'https://everestlodgegaborone.netlify.app/',
  'MYGA Medical Centre': 'https://myga-medical-centre.netlify.app/',
  'Vision Sense Optometrists': 'https://vision-sense.netlify.app/',
  'MedExo Private Clinic': 'https://medexo-private-clinic.netlify.app/',
  'Dental Suite': 'https://dental-suite.netlify.app/',
}

const qaReady = new Set(['Dental Hub', 'Synergy Physiotherapy', 'Dr M H Khan Surgery', 'The Orthodontic Centre'])
const sourceRoot = 'Current repository · pula-digital'

const leads = leadRows.map((row) => ({
  id: `lead-${slug(row.company)}`,
  name: row.company,
  company: row.company,
  role: row.category,
  email: '',
  location: 'Botswana',
  source: row.source,
  stage: row.stage,
  owner: 'Nathan',
  value: 0,
  nextAction: row.nextAction,
  nextActionDate: row.nextActionDate,
  lastTouched: row.stage === 'New' ? '2026-10-14' : row.source.includes('23 Sep') ? '2026-09-23' : '2026-10-12',
  avatar: avatarFrom(row.company),
  notes: row.note,
}))

const clients = leadRows.filter((row) => row.stage !== 'Lost').map((row) => ({
  id: `client-${slug(row.company)}`,
  name: row.company,
  company: row.company,
  industry: row.category,
  email: '',
  health: row.state === 'No response' || row.state === 'Parked' ? 'Watch' as const : 'Healthy' as const,
  owner: 'Nathan',
  since: '2026-10-14',
  avatar: avatarFrom(row.company),
}))

const projects = leadRows.map((row) => {
  const id = `project-${slug(row.company)}`
  return {
    id,
    name: `${row.company} demo`,
    domain: demoUrls[row.company] ?? `Repository canonical page · ${slug(row.company)}`,
    clientId: `client-${slug(row.company)}`,
    status: row.stage === 'Lost' ? 'Paused' as const : 'Review' as const,
    owner: 'Nathan',
    nextMilestone: row.nextAction,
    milestoneDate: row.nextActionDate,
    readiness: row.stage === 'Lost' ? 0 : qaReady.has(row.company) ? 100 : row.stage === 'New' ? 86 : 72,
    description: row.note,
    accent: row.stage === 'Lost' ? '#F4C9C1' : qaReady.has(row.company) ? '#CFE2DA' : '#D6DDEA',
  }
})

const outreach = [
  { id: 'outreach-eyesave-2026-10-12', leadId: 'lead-eyesave-optical', company: 'Eyesave Optical', contact: 'Contact not recorded', channel: 'WhatsApp' as const, date: '2026-10-12', outcome: 'No reply' as const, note: 'First contact sent by Nathan; active WhatsApp contact confirmed. No substantive reply recorded.' },
  { id: 'outreach-everest-2026-10-12', leadId: 'lead-everest-lodge-phase-2', company: 'Everest Lodge – Phase 2', contact: 'Contact not recorded', channel: 'Facebook Messenger' as const, date: '2026-10-12', outcome: 'Replied' as const, note: 'Follow-up sent after 17 Sep reply that they would review. Awaiting reply; no further routine nudge.' },
  { id: 'outreach-myga-2026-10-12', leadId: 'lead-myga-medical-centre', company: 'MYGA Medical Centre', contact: 'Clinic contact not recorded', channel: 'WhatsApp' as const, date: '2026-10-12', outcome: 'Replied' as const, note: 'Clinic acknowledged receipt and said it would forward the preview to its doctor.' },
  { id: 'outreach-vision-sense-2026-10-12', leadId: 'lead-vision-sense-optometrists', company: 'Vision Sense Optometrists', contact: 'Contact not recorded', channel: 'Other' as const, date: '2026-10-12', outcome: 'No reply' as const, note: 'Automated acknowledgement shown; no substantive reply recorded.' },
  { id: 'outreach-medexo-2026-10-12', leadId: 'lead-medexo-private-clinic', company: 'MedExo Private Clinic', contact: 'Contact not recorded', channel: 'Other' as const, date: '2026-10-12', outcome: 'No reply' as const, note: 'First-contact preview shared; no reply recorded.' },
  { id: 'outreach-dental-suite-2026-10-12', leadId: 'lead-dental-suite', company: 'Dental Suite', contact: 'Contact not recorded', channel: 'Other' as const, date: '2026-10-12', outcome: 'No reply' as const, note: 'First-contact preview shared; no reply recorded.' },
  ...['Agape Dental Clinic', 'Crown Dental Clinic', 'City Physiotherapy Clinic', 'Tshidilong Physiotherapy Clinic'].map((company) => ({ id: `outreach-${slug(company)}-2026-09-23`, leadId: `lead-${slug(company)}`, company, contact: 'Contact not recorded', channel: 'Other' as const, date: '2026-09-23', outcome: 'No reply' as const, note: 'First contact recorded; no response confirmed as of 14 October.' })),
]

const followUps = [
  ...['Dental Hub', 'Synergy Physiotherapy'].map((company) => ({ id: `follow-verify-${slug(company)}`, title: 'Verify demo and primary CTA', date: '2026-10-15', time: '09:30', owner: 'Nathan', relatedType: 'Lead' as const, relatedId: `lead-${slug(company)}`, relatedName: company, done: false, priority: 'High' as const })),
  ...['The Orthodontic Centre', 'Dr M H Khan Surgery'].map((company) => ({ id: `follow-verify-${slug(company)}`, title: 'Verify demo and primary CTA', date: '2026-10-16', time: '10:00', owner: 'Nathan', relatedType: 'Lead' as const, relatedId: `lead-${slug(company)}`, relatedName: company, done: false, priority: 'High' as const })),
  { id: 'follow-wait-replies', title: 'Review current reply states', date: '2026-10-21', time: '09:00', owner: 'Nathan', relatedType: 'Lead' as const, relatedId: 'lead-dental-suite', relatedName: 'Eyesave · MYGA · MedExo · Dental Suite · Vision Sense · Everest', done: false, priority: 'Medium' as const },
  { id: 'follow-reconcile-workbook', title: 'Reconcile remaining workbook leads', date: '2026-10-22', time: '14:00', owner: 'Nathan', relatedType: 'Project' as const, relatedId: 'project-pula-digital', relatedName: 'Pula Digital operations', done: false, priority: 'Low' as const },
  { id: 'follow-parked-leads', title: 'Review parked no-response leads', date: '2026-11-07', time: '11:00', owner: 'Nathan', relatedType: 'Lead' as const, relatedId: 'lead-agape-dental-clinic', relatedName: 'Agape · Crown · City · Tshidilong', done: false, priority: 'Low' as const },
]

const research = [
  ...Object.entries(demoUrls).filter(([company]) => ['Dental Hub', 'Synergy Physiotherapy', 'Dr M H Khan Surgery', 'The Orthodontic Centre'].includes(company)).map(([company, source]) => ({ id: `research-${slug(company)}`, subject: company, subjectType: 'Lead' as const, finding: 'Public demo URL was supplied in the current repository; current uptime and primary contact-action checks remain outstanding.', source, status: 'Unverified' as const, confidence: 58, reviewerNote: 'Do not treat a supplied URL as a completed live/CTA verification.', updatedAt: '2026-10-14' })),
  { id: 'research-canonical-register', subject: 'Canonical demo register', subjectType: 'Project' as const, finding: 'The record-authority register identifies one canonical HTML path for each demo and separates it from legacy build copies.', source: 'Repository: operations/record-authority.md', status: 'Verified' as const, confidence: 98, reviewerNote: 'Canonical path authority confirmed in the current record register.', updatedAt: '2026-10-14' },
  { id: 'research-outreach-state', subject: '14 October outreach state', subjectType: 'Lead' as const, finding: 'Current outreach state is controlled by the lead tracker and reconciled with the active sprint and dated outreach log.', source: 'Repository: businesses/leads/lead-tracker.md', status: 'Verified' as const, confidence: 99, reviewerNote: 'Current-stage authority confirmed; historical reports remain separate evidence.', updatedAt: '2026-10-14' },
]

const qaLabels = [
  ['Truth', 'Business name and key public facts match the source record.'],
  ['UX / Conversion', 'Primary CTA and contact path are obvious and usable.'],
  ['Responsive', 'Mobile, tablet, and desktop layouts have been checked.'],
  ['Technical', 'Links, metadata, assets, and runtime behavior are checked.'],
]
const qa = Array.from(qaReady).flatMap((company) => qaLabels.map(([section, label], index) => ({ id: `qa-${slug(company)}-${index}`, projectId: `project-${slug(company)}`, label, section, done: true })))

const activities = [
  { id: 'activity-01', type: 'outreach' as const, title: 'Contact state reconciled', detail: 'Eyesave, MYGA, MedExo, Dental Suite, Vision Sense, Everest', timestamp: 'Today', initials: 'NT', tone: 'amber' as const },
  { id: 'activity-02', type: 'research' as const, title: 'Four demo URLs queued for verification', detail: 'Dental Hub · Synergy · Dr M H Khan · Orthodontic Centre', timestamp: 'Today', initials: 'NT', tone: 'coral' as const },
  { id: 'activity-03', type: 'qa' as const, title: 'Outreach-ready QA records imported', detail: 'Four canonical demo projects marked ready for first contact', timestamp: '25 Sep', initials: 'QA', tone: 'teal' as const },
  { id: 'activity-04', type: 'project' as const, title: 'Canonical path register linked', detail: `${sourceRoot} · legacy copies kept separate`, timestamp: '14 Oct', initials: 'RA', tone: 'navy' as const },
]

export const seedData: SeedData = { leads, clients, projects, outreach, followUps, research, qa, activities }
