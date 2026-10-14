export type LeadStage = 'New' | 'Contacted' | 'Qualified' | 'Proposal' | 'Won' | 'Lost'
export type ProjectStatus = 'Discovery' | 'In build' | 'Review' | 'Live' | 'Paused'
export type OutreachChannel = 'Email' | 'LinkedIn' | 'Call' | 'WhatsApp' | 'Instagram' | 'Facebook Messenger' | 'Other'
export type OutreachOutcome = 'No reply' | 'Replied' | 'Meeting booked' | 'Not a fit' | 'Follow-up'
export type ResearchStatus = 'Unverified' | 'Needs review' | 'Verified'
export type ActivityType = 'lead' | 'outreach' | 'project' | 'research' | 'qa' | 'follow-up'

export interface Lead {
  id: string
  name: string
  company: string
  role: string
  email: string
  location: string
  source: string
  stage: LeadStage
  owner: string
  value: number
  nextAction: string
  nextActionDate: string
  lastTouched: string
  avatar: string
  notes?: string
}

export interface Client {
  id: string
  name: string
  company: string
  industry: string
  email: string
  health: 'Healthy' | 'Watch' | 'At risk'
  owner: string
  since: string
  avatar: string
}

export interface Project {
  id: string
  name: string
  domain: string
  clientId: string
  status: ProjectStatus
  owner: string
  nextMilestone: string
  milestoneDate: string
  readiness: number
  description: string
  accent: string
}

export interface Outreach {
  id: string
  leadId?: string
  clientId?: string
  company: string
  contact: string
  channel: OutreachChannel
  date: string
  outcome: OutreachOutcome
  note: string
}

export interface FollowUp {
  id: string
  title: string
  date: string
  time: string
  owner: string
  relatedType: 'Lead' | 'Client' | 'Project'
  relatedId: string
  relatedName: string
  done: boolean
  priority: 'High' | 'Medium' | 'Low'
}

export interface ResearchItem {
  id: string
  subject: string
  subjectType: 'Lead' | 'Client' | 'Project'
  finding: string
  source: string
  status: ResearchStatus
  confidence: number
  reviewerNote: string
  updatedAt: string
}

export interface QAItem {
  id: string
  projectId: string
  label: string
  section: string
  done: boolean
  issue?: string
}

export interface Activity {
  id: string
  type: ActivityType
  title: string
  detail: string
  timestamp: string
  initials: string
  tone: 'navy' | 'amber' | 'teal' | 'coral'
}

export interface SeedData {
  leads: Lead[]
  clients: Client[]
  projects: Project[]
  outreach: Outreach[]
  followUps: FollowUp[]
  research: ResearchItem[]
  qa: QAItem[]
  activities: Activity[]
}
