import { isSupabaseConfigured, supabase } from './supabase'
import type { Client, FollowUp, Lead, Project, QAItem, ResearchItem, SeedData } from './types'

type Row = Record<string, unknown>
const text = (row: Row, key: string, fallback = '') => typeof row[key] === 'string' ? row[key] as string : fallback
const number = (row: Row, key: string, fallback = 0) => typeof row[key] === 'number' ? row[key] as number : fallback
const bool = (row: Row, key: string, fallback = false) => typeof row[key] === 'boolean' ? row[key] as boolean : fallback

export async function loadWorkspaceFromSupabase(): Promise<Partial<SeedData> | null> {
  if (!isSupabaseConfigured || !supabase) return null
  try {
    const [leadsResult, clientsResult, projectsResult, followUpsResult, researchResult, qaResult, outreachResult] = await Promise.all([
      supabase.from('leads').select('*').order('created_at', { ascending: false }),
      supabase.from('clients').select('*').order('created_at', { ascending: false }),
      supabase.from('projects').select('*').order('created_at', { ascending: false }),
      supabase.from('follow_ups').select('*').order('date', { ascending: true }),
      supabase.from('research_items').select('*').order('updated_at', { ascending: false }),
      supabase.from('qa_items').select('*').order('created_at', { ascending: true }),
      supabase.from('outreach').select('*').order('date', { ascending: false }),
    ])
    if ([leadsResult, clientsResult, projectsResult, followUpsResult, researchResult, qaResult, outreachResult].some((result) => result.error)) return null
    const leads = ((leadsResult.data ?? []) as Row[]).map((row): Lead => ({ id: text(row, 'id'), name: text(row, 'name'), company: text(row, 'company'), role: text(row, 'role'), email: text(row, 'email'), location: text(row, 'location'), source: text(row, 'source'), stage: text(row, 'stage', 'New') as Lead['stage'], owner: text(row, 'owner_name', 'Pula team'), value: number(row, 'value'), nextAction: text(row, 'next_action', 'Qualify lead'), nextActionDate: text(row, 'next_action_date', '2026-10-20'), lastTouched: text(row, 'last_touched', '2026-10-14'), avatar: text(row, 'avatar', text(row, 'name').slice(0, 2).toUpperCase()), notes: text(row, 'notes') }))
    const clients = ((clientsResult.data ?? []) as Row[]).map((row): Client => ({ id: text(row, 'id'), name: text(row, 'name'), company: text(row, 'company'), industry: text(row, 'industry'), email: text(row, 'email'), health: text(row, 'health', 'Healthy') as Client['health'], owner: text(row, 'owner_name', 'Pula team'), since: text(row, 'since', '2026-01-01'), avatar: text(row, 'avatar', text(row, 'name').slice(0, 2).toUpperCase()) }))
    const projects = ((projectsResult.data ?? []) as Row[]).map((row): Project => ({ id: text(row, 'id'), name: text(row, 'name'), domain: text(row, 'domain'), clientId: text(row, 'client_id'), status: text(row, 'status', 'Discovery') as Project['status'], owner: text(row, 'owner_name', 'Pula team'), nextMilestone: text(row, 'next_milestone', 'Next milestone'), milestoneDate: text(row, 'milestone_date', '2026-10-20'), readiness: number(row, 'readiness'), description: text(row, 'description'), accent: text(row, 'accent', '#D6DDEA') }))
    const followUps = ((followUpsResult.data ?? []) as Row[]).map((row): FollowUp => ({ id: text(row, 'id'), title: text(row, 'title'), date: text(row, 'date'), time: text(row, 'time', '09:00'), owner: text(row, 'owner_name', 'Pula team'), relatedType: text(row, 'related_type', 'Lead') as FollowUp['relatedType'], relatedId: text(row, 'related_id'), relatedName: text(row, 'related_name'), done: bool(row, 'done'), priority: text(row, 'priority', 'Medium') as FollowUp['priority'] }))
    const research = ((researchResult.data ?? []) as Row[]).map((row): ResearchItem => ({ id: text(row, 'id'), subject: text(row, 'subject'), subjectType: text(row, 'subject_type', 'Lead') as ResearchItem['subjectType'], finding: text(row, 'finding'), source: text(row, 'source'), status: text(row, 'status', 'Unverified') as ResearchItem['status'], confidence: number(row, 'confidence'), reviewerNote: text(row, 'reviewer_note'), updatedAt: text(row, 'updated_at', '2026-10-14') }))
    const qa = ((qaResult.data ?? []) as Row[]).map((row): QAItem => ({ id: text(row, 'id'), projectId: text(row, 'project_id'), label: text(row, 'label'), section: text(row, 'section'), done: bool(row, 'done'), issue: text(row, 'issue') || undefined }))
    const outreach = ((outreachResult.data ?? []) as Row[]).map((row) => ({ id: text(row, 'id'), leadId: text(row, 'lead_id') || undefined, clientId: text(row, 'client_id') || undefined, company: text(row, 'company'), contact: text(row, 'contact'), channel: text(row, 'channel', 'Email') as SeedData['outreach'][number]['channel'], date: text(row, 'date', '2026-10-14'), outcome: text(row, 'outcome', 'No reply') as SeedData['outreach'][number]['outcome'], note: text(row, 'note') }))
    if (!leads.length && !clients.length && !projects.length && !followUps.length && !research.length && !qa.length && !outreach.length) return null
    return { leads, clients, projects, followUps, research, qa, outreach }
  } catch {
    return null
  }
}

export async function persistLead(lead: Lead) {
  if (!supabase) return
  await supabase.from('leads').insert({ name: lead.name, company: lead.company, role: lead.role, email: lead.email, location: lead.location, source: lead.source, stage: lead.stage, value: lead.value, next_action: lead.nextAction, next_action_date: lead.nextActionDate, last_touched: lead.lastTouched, avatar: lead.avatar, notes: lead.notes })
}

export async function persistOutreach(outreach: SeedData['outreach'][number]) {
  if (!supabase) return
  await supabase.from('outreach').insert({ lead_id: outreach.leadId ?? null, client_id: outreach.clientId ?? null, company: outreach.company, contact: outreach.contact, channel: outreach.channel, date: outreach.date, outcome: outreach.outcome, note: outreach.note })
}

export async function persistToggle(table: 'follow_ups' | 'qa_items', id: string, done: boolean) {
  if (!supabase) return
  await supabase.from(table).update({ done }).eq('id', id)
}

export async function persistResearchVerification(id: string) {
  if (!supabase) return
  await supabase.from('research_items').update({ status: 'Verified', confidence: 84, updated_at: '2026-10-14' }).eq('id', id)
}
