import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  ClipboardCheck,
  Clock3,
  Command,
  Download,
  ExternalLink,
  Filter,
  FolderKanban,
  Inbox,
  LayoutDashboard,
  ListFilter,
  Mail,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  UserRound,
  Users,
  X,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { loadInitialDataset } from './data/importer'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import { loadWorkspaceFromSupabase, persistLead, persistOutreach, persistResearchVerification, persistToggle } from './lib/workspaceRepository'
import type { Activity, Client, FollowUp, Lead, LeadStage, Project, ResearchItem, SeedData } from './lib/types'

type View = 'overview' | 'leads' | 'clients' | 'projects' | 'outreach' | 'calendar' | 'research' | 'qa'
type Drawer = 'lead' | 'outreach' | null

const navItems: Array<{ id: View; label: string; icon: LucideIcon; count?: number }> = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'leads', label: 'Lead CRM', icon: Target, count: 12 },
  { id: 'clients', label: 'Clients', icon: Users },
  { id: 'projects', label: 'Website projects', icon: FolderKanban, count: 4 },
  { id: 'outreach', label: 'Outreach', icon: Send },
  { id: 'calendar', label: 'Follow-up calendar', icon: CalendarDays, count: 4 },
  { id: 'research', label: 'Research verification', icon: ShieldCheck, count: 2 },
  { id: 'qa', label: 'QA checklists', icon: ClipboardCheck, count: 3 },
]

const pageMeta: Record<View, { eyebrow: string; title: string; description: string }> = {
  overview: { eyebrow: '', title: 'Keep the next handoff visible.', description: 'A focused, live view of the work that keeps Pula moving.' },
  leads: { eyebrow: 'Pipeline / lead CRM', title: 'Know who is next.', description: 'Every lead, stage, and next action in one operating view.' },
  clients: { eyebrow: 'Relationships / client workspace', title: 'Stay close to the work.', description: 'Client context that travels with every project and follow-up.' },
  projects: { eyebrow: 'Delivery / website projects', title: 'Move the work forward.', description: 'A clean view of ownership, milestones, and launch readiness.' },
  outreach: { eyebrow: 'Growth / outreach log', title: 'Make every touchpoint count.', description: 'A durable record of how relationships are being built.' },
  calendar: { eyebrow: 'Execution / follow-up calendar', title: 'Nothing falls between tabs.', description: 'The next promise, date, and owner — kept together.' },
  research: { eyebrow: 'Evidence / research verification', title: 'Work from what is true.', description: 'Keep findings sourced, reviewed, and ready to act on.' },
  qa: { eyebrow: 'Launch / QA checklists', title: 'Make ready mean ready.', description: 'A visible last mile for every digital launch.' },
}

const toISO = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const addDays = (iso: string, days: number) => { const next = new Date(`${iso}T12:00:00`); next.setDate(next.getDate() + days); return toISO(next) }
const TODAY = toISO(new Date())

const STAGE_WEIGHTS: Record<string, number> = { New: 0.1, Contacted: 0.25, Qualified: 0.5, Proposal: 0.75, Won: 1, Lost: 0 }

const formatCurrency = (value: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value)
const formatDate = (value: string, options?: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-GB', options ?? { day: '2-digit', month: 'short' }).format(new Date(`${value}T12:00:00`))
const initialsFrom = (value: string) => value.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()

function downloadCSV(filename: string, headers: string[], rows: Array<Array<string | number>>) {
  const cell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`
  const csv = [headers, ...rows].map((row) => row.map(cell).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

/* ------------------------------------------------------------------ */
/* Demo-mode persistence seam (Supabase path stays untouched)          */
/* ------------------------------------------------------------------ */

interface DemoOverrides {
  followUps?: Record<string, boolean>
  qa?: Record<string, boolean>
  leads?: Lead[]
  outreach?: SeedData['outreach']
}

const DEMO_STORAGE_KEY = 'pula-os-demo-overrides-v1'

function readDemoOverrides(): DemoOverrides {
  try { return JSON.parse(localStorage.getItem(DEMO_STORAGE_KEY) ?? '{}') as DemoOverrides } catch { return {} }
}

function writeDemoOverrides(patch: Partial<DemoOverrides>) {
  try { localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify({ ...readDemoOverrides(), ...patch })) } catch { /* storage unavailable */ }
}

function applyDemoOverrides(data: SeedData): SeedData {
  if (isSupabaseConfigured) return data
  const overrides = readDemoOverrides()
  return {
    ...data,
    leads: overrides.leads?.length ? [...overrides.leads, ...data.leads] : data.leads,
    outreach: overrides.outreach?.length ? [...overrides.outreach, ...data.outreach] : data.outreach,
    followUps: data.followUps.map((item) => overrides.followUps?.[item.id] !== undefined ? { ...item, done: overrides.followUps![item.id] } : item),
    qa: data.qa.map((item) => overrides.qa?.[item.id] !== undefined ? { ...item, done: overrides.qa![item.id] } : item),
  }
}

function useAuth() {
  const [session, setSession] = useState<Awaited<ReturnType<NonNullable<typeof supabase>['auth']['getSession']>>['data']['session']>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession))
    return () => listener.subscription.unsubscribe()
  }, [])

  return { session, loading }
}

function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [working, setWorking] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return
    setWorking(true)
    setError('')
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) setError(authError.message)
    setWorking(false)
  }

  return (
    <div className="login-page">
      <div className="login-mark"><span>P</span><i>/</i></div>
      <div className="login-card">
        <div className="eyebrow">Private workspace · Pula Digital OS</div>
        <h1>Keep the next handoff visible.</h1>
        <p>Sign in with your team account to access the operations ledger.</p>
        <form onSubmit={handleSubmit} className="login-form">
          <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@studio.com" required /></label>
          <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Your password" required /></label>
          {error && <div className="form-error"><AlertCircle size={15} />{error}</div>}
          <button className="button button-primary button-wide" type="submit" disabled={working}>{working ? 'Signing in…' : 'Enter workspace'} <ArrowUpRight size={16} /></button>
        </form>
        <div className="login-foot"><ShieldCheck size={15} /> Access is limited to authorized internal users.</div>
      </div>
    </div>
  )
}

function App() {
  const auth = useAuth()
  if (auth.loading) return <div className="loading-screen"><div className="loading-mark">P<span>/</span></div><span>Opening your workspace…</span></div>
  if (isSupabaseConfigured && !auth.session) return <LoginScreen />
  return <Workspace sessionEmail={auth.session?.user.email} />
}

function Workspace({ sessionEmail }: { sessionEmail?: string }) {
  const [view, setView] = useState<View>('overview')
  const [data, setData] = useState<SeedData>(() => applyDemoOverrides(loadInitialDataset()))
  const [query, setQuery] = useState('')
  const [drawer, setDrawer] = useState<Drawer>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState(data.clients[0]?.id ?? '')
  const [selectedProjectId, setSelectedProjectId] = useState(data.projects[0]?.id ?? '')
  const [selectedDate, setSelectedDate] = useState(TODAY)
  const [stageFilter, setStageFilter] = useState<'All' | LeadStage>('All')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    let active = true
    loadWorkspaceFromSupabase().then((snapshot) => {
      if (active && snapshot) setData((current) => applyDemoOverrides(loadInitialDataset(snapshot)))
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen((open) => !open)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const metrics = useMemo(() => {
    const openLeads = data.leads.filter((lead) => !['Won', 'Lost'].includes(lead.stage))
    const windowStart = TODAY
    const windowEnd = addDays(TODAY, 7)
    const prevStart = addDays(TODAY, -7)
    const prevEnd = addDays(TODAY, -1)
    const inWindow = (date: string, from: string, to: string) => date >= from && date <= to
    const due = data.followUps.filter((item) => !item.done && inWindow(item.date, windowStart, windowEnd)).length
    const duePrev = data.followUps.filter((item) => !item.done && inWindow(item.date, prevStart, prevEnd)).length
    const weeklyFollowUps = Array.from({ length: 8 }, (_, index) => {
      const from = addDays(TODAY, (index - 7) * 7)
      const to = addDays(from, 6)
      return data.followUps.filter((item) => inWindow(item.date, from, to) && !item.done).length
    })
    const pipeline = openLeads.reduce((sum, lead) => sum + lead.value, 0)
    return {
      openLeads: openLeads.length,
      proposalOpen: openLeads.filter((lead) => lead.stage === 'Proposal').length,
      stalledLeads: openLeads.filter((lead) => lead.nextActionDate < TODAY).length,
      pipeline,
      weighted: Math.round(openLeads.reduce((sum, lead) => sum + lead.value * (STAGE_WEIGHTS[lead.stage] ?? 0), 0)),
      won: data.leads.filter((lead) => lead.stage === 'Won').reduce((sum, lead) => sum + lead.value, 0),
      due,
      dueDelta: due - duePrev,
      weeklyFollowUps,
      readiness: data.projects.length ? Math.round(data.projects.reduce((sum, project) => sum + project.readiness, 0) / data.projects.length) : 0,
      qaPct: data.qa.length ? Math.round((data.qa.filter((item) => item.done).length / data.qa.length) * 100) : 0,
    }
  }, [data])

  const filteredLeads = useMemo(() => data.leads.filter((lead) => {
    const matchesQuery = `${lead.name} ${lead.company} ${lead.role}`.toLowerCase().includes(query.toLowerCase())
    const matchesStage = stageFilter === 'All' || lead.stage === stageFilter
    return matchesQuery && matchesStage
  }), [data.leads, query, stageFilter])

  function updateData(updater: (current: SeedData) => SeedData) {
    setData((current) => updater(current))
  }

  function toggleFollowUp(id: string) {
    setData((current) => {
      const target = current.followUps.find((item) => item.id === id)
      if (target) {
        void persistToggle('follow_ups', id, !target.done)
        writeDemoOverrides({ followUps: { ...readDemoOverrides().followUps, [id]: !target.done } })
      }
      return { ...current, followUps: current.followUps.map((item) => item.id === id ? { ...item, done: !item.done } : item) }
    })
  }

  function toggleQA(id: string) {
    setData((current) => {
      const target = current.qa.find((item) => item.id === id)
      if (target) {
        void persistToggle('qa_items', id, !target.done)
        writeDemoOverrides({ qa: { ...readDemoOverrides().qa, [id]: !target.done } })
      }
      return { ...current, qa: current.qa.map((item) => item.id === id ? { ...item, done: !item.done, issue: item.done ? item.issue : undefined } : item) }
    })
  }

  function verifyResearch(id: string) {
    void persistResearchVerification(id)
    updateData((current) => ({ ...current, research: current.research.map((item) => item.id === id ? { ...item, status: 'Verified', confidence: Math.max(item.confidence, 84), updatedAt: TODAY } : item) }))
  }

  function addLead(lead: Lead) {
    void persistLead(lead)
    writeDemoOverrides({ leads: [lead, ...readDemoOverrides().leads ?? []] })
    updateData((current) => ({ ...current, leads: [lead, ...current.leads] }))
    setDrawer(null)
  }

  function addOutreach(outreach: SeedData['outreach'][number]) {
    void persistOutreach(outreach)
    writeDemoOverrides({ outreach: [outreach, ...readDemoOverrides().outreach ?? []] })
    updateData((current) => ({ ...current, outreach: [outreach, ...current.outreach], activities: [{ id: `activity-${Date.now()}`, type: 'outreach', title: 'New outreach logged', detail: `${outreach.company} · ${outreach.channel}`, timestamp: 'Just now', initials: initialsFrom(outreach.contact), tone: 'amber' }, ...current.activities] }))
    setDrawer(null)
  }

  function exportLeads() {
    downloadCSV(`pula-leads-${TODAY}.csv`, ['Name', 'Company', 'Role', 'Email', 'Stage', 'Owner', 'Value', 'Next action', 'Next action date'], data.leads.map((lead) => [lead.name, lead.company, lead.role, lead.email, lead.stage, lead.owner, lead.value, lead.nextAction, lead.nextActionDate]))
  }

  function exportFollowUps() {
    downloadCSV(`pula-follow-ups-${TODAY}.csv`, ['Title', 'Date', 'Time', 'Owner', 'Related', 'Priority', 'Status'], data.followUps.map((item) => [item.title, item.date, item.time, item.owner, `${item.relatedType}: ${item.relatedName}`, item.priority, item.done ? 'Done' : 'Open']))
  }

  const paletteActions = useMemo(() => ({
    exportLeads,
    exportFollowUps,
    addLead: () => setDrawer('lead'),
    addOutreach: () => setDrawer('outreach'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [data])

  const meta = pageMeta[view]
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup"><div className="brand-symbol">P<span>/</span></div><div><strong>Pula</strong><small>Digital OS</small></div></div>
        <div className="rail-caption">Workspace</div>
        <nav className="main-nav">
          {navItems.map((item) => {
            const Icon = item.icon
            const dynamicCount = item.id === 'leads' ? metrics.openLeads : item.id === 'projects' ? data.projects.filter((project) => project.status !== 'Paused').length : item.id === 'calendar' ? data.followUps.filter((followUp) => !followUp.done && followUp.date <= TODAY).length : item.id === 'research' ? data.research.filter((research) => research.status !== 'Verified').length : item.id === 'qa' ? new Set(data.qa.map((qa) => qa.projectId)).size : undefined
            return <button key={item.id} className={`nav-item ${view === item.id ? 'active' : ''}`} onClick={() => { setView(item.id); setQuery('') }}><Icon size={17} strokeWidth={view === item.id ? 2.3 : 1.8} /><span>{item.label}</span>{dynamicCount !== undefined && <b>{dynamicCount}</b>}</button>
          })}
        </nav>
        <div className="sidebar-bottom">
          <button className="nav-item palette-trigger" onClick={() => setPaletteOpen(true)}><Command size={17} /><span>Quick find</span><kbd>⌘K</kbd></button>
          <button className="nav-item"><Settings2 size={17} /><span>Workspace settings</span></button>
          <div className="user-chip"><div className="avatar avatar-navy">{sessionEmail ? initialsFrom(sessionEmail) : 'PT'}</div><div><strong>{sessionEmail ?? 'Pula team'}</strong><small>{sessionEmail ? 'Authenticated' : 'Demo workspace'}</small></div><MoreHorizontal size={16} /></div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar"><button className="mobile-menu"><Menu size={20} /></button><div className="breadcrumbs"><span>Pula Digital OS</span><ChevronRight size={13} /><strong>{meta.eyebrow.split(' / ')[0]}</strong></div><div className="topbar-actions"><button className="palette-hint" onClick={() => setPaletteOpen(true)}><Search size={13} /><span>Quick find</span><kbd>⌘K</kbd></button><div className={`connection-pill ${isSupabaseConfigured ? 'connected' : ''}`}><span></span>{isSupabaseConfigured ? 'Supabase connected' : 'Demo dataset'}</div><button className="icon-button" title={`${data.followUps.filter((item) => !item.done && item.date <= TODAY).length} follow-ups due`} onClick={() => setView('calendar')}><Bell size={18} /><i></i></button><button className="avatar avatar-teal">PT</button></div></header>
        <div className="content-wrap">
          <section className="page-heading"><div><div className="eyebrow">{view === 'overview' ? formatDate(TODAY, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : meta.eyebrow}</div><h1>{meta.title}</h1><p>{meta.description}</p></div><div className="heading-actions">{view === 'overview' && <><button className="button button-secondary" onClick={exportLeads}><Download size={15} /> Leads CSV</button><button className="button button-secondary" onClick={exportFollowUps}><Download size={15} /> Follow-ups CSV</button><button className="button button-secondary" onClick={() => setView('calendar')}><CalendarDays size={16} /> Open calendar</button></>}{view === 'leads' && <button className="button button-primary" onClick={() => setDrawer('lead')}><Plus size={16} /> Add lead</button>}{view === 'outreach' && <button className="button button-primary" onClick={() => setDrawer('outreach')}><Plus size={16} /> Log outreach</button>}</div></section>
          <div className="workspace-rule"></div>
          {view === 'overview' && <Overview data={data} metrics={metrics} onNavigate={setView} onToggleFollowUp={toggleFollowUp} />}
          {view === 'leads' && <LeadsView leads={filteredLeads} stageFilter={stageFilter} setStageFilter={setStageFilter} query={query} setQuery={setQuery} showFilters={showFilters} setShowFilters={setShowFilters} onAdd={() => setDrawer('lead')} />}
          {view === 'clients' && <ClientsView data={data} selectedClientId={selectedClientId} setSelectedClientId={setSelectedClientId} />}
          {view === 'projects' && <ProjectsView data={data} selectedProjectId={selectedProjectId} setSelectedProjectId={setSelectedProjectId} onNavigate={setView} />}
          {view === 'outreach' && <OutreachView data={data} query={query} setQuery={setQuery} onAdd={() => setDrawer('outreach')} />}
          {view === 'calendar' && <CalendarView data={data} selectedDate={selectedDate} setSelectedDate={setSelectedDate} onToggle={toggleFollowUp} />}
          {view === 'research' && <ResearchView data={data} onVerify={verifyResearch} />}
          {view === 'qa' && <QAView data={data} selectedProjectId={selectedProjectId} setSelectedProjectId={setSelectedProjectId} onToggle={toggleQA} />}
        </div>
        <footer className="app-footer"><span><Sparkles size={14} /> Pula Ink workspace · built for the next action</span><span>Last synced <strong>just now</strong></span></footer>
      </main>
      {drawer === 'lead' && <LeadDrawer onClose={() => setDrawer(null)} onSave={addLead} />}
      {drawer === 'outreach' && <OutreachDrawer data={data} onClose={() => setDrawer(null)} onSave={addOutreach} />}
      {paletteOpen && <CommandPalette data={data} onClose={() => setPaletteOpen(false)} onNavigate={(next) => { setView(next); setQuery('') }} onSelectClient={(id) => { setSelectedClientId(id); setView('clients') }} onSelectProject={(id) => { setSelectedProjectId(id); setView('projects') }} actions={paletteActions} />}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Enhanced overview dashboard                                         */
/* ------------------------------------------------------------------ */

interface Metrics {
  openLeads: number
  proposalOpen: number
  stalledLeads: number
  pipeline: number
  weighted: number
  won: number
  due: number
  dueDelta: number
  weeklyFollowUps: number[]
  readiness: number
  qaPct: number
}

interface AlertItem { icon: LucideIcon; tone: 'coral' | 'amber' | 'teal' | 'navy'; title: string; meta: string; view: View }

function buildAlerts(data: SeedData): AlertItem[] {
  const alerts: AlertItem[] = []
  data.followUps.filter((item) => !item.done && item.date < TODAY).forEach((item) => alerts.push({ icon: Clock3, tone: 'coral', title: `Overdue: ${item.title}`, meta: `${item.relatedName} · ${item.owner} · was due ${formatDate(item.date)}`, view: 'calendar' }))
  data.followUps.filter((item) => !item.done && item.date === TODAY && item.priority === 'High').forEach((item) => alerts.push({ icon: Zap, tone: 'coral', title: `Due today: ${item.title}`, meta: `${item.relatedName} · ${item.owner} · ${item.time}`, view: 'calendar' }))
  data.leads.filter((lead) => !['Won', 'Lost'].includes(lead.stage) && lead.nextActionDate < TODAY).forEach((lead) => alerts.push({ icon: Target, tone: 'amber', title: `Stalled: ${lead.company}`, meta: `${lead.name} · ${lead.stage} · ${formatCurrency(lead.value)} · action slipped ${formatDate(lead.nextActionDate)}`, view: 'leads' }))
  data.clients.filter((client) => client.health !== 'Healthy').forEach((client) => alerts.push({ icon: Users, tone: client.health === 'At risk' ? 'coral' : 'amber', title: `${client.health}: ${client.company}`, meta: `${client.name} · ${client.industry} · owner ${client.owner}`, view: 'clients' }))
  data.qa.filter((item) => !item.done && item.issue).forEach((item) => {
    const project = data.projects.find((entry) => entry.id === item.projectId)
    alerts.push({ icon: ClipboardCheck, tone: 'coral', title: `Open issue: ${item.label}`, meta: `${project?.name ?? 'Project'} · ${item.issue}`, view: 'qa' })
  })
  data.research.filter((item) => item.status !== 'Verified').forEach((item) => alerts.push({ icon: ShieldCheck, tone: 'amber', title: `Unverified: ${item.subject}`, meta: `${item.subjectType} · confidence ${item.confidence}% · ${item.status}`, view: 'research' }))
  data.projects.filter((project) => project.status === 'Paused').forEach((project) => alerts.push({ icon: FolderKanban, tone: 'navy', title: `Paused: ${project.name}`, meta: `${project.domain} · owner ${project.owner}`, view: 'projects' }))
  const toneRank = { coral: 0, amber: 1, teal: 2, navy: 3 }
  return alerts.sort((a, b) => toneRank[a.tone] - toneRank[b.tone]).slice(0, 7)
}

function Overview({ data, metrics, onNavigate, onToggleFollowUp }: { data: SeedData; metrics: Metrics; onNavigate: (view: View) => void; onToggleFollowUp: (id: string) => void }) {
  const [activityFilter, setActivityFilter] = useState<'all' | Activity['type']>('all')
  const alerts = useMemo(() => buildAlerts(data), [data])
  const upcoming = data.followUps.filter((item) => !item.done && item.date >= TODAY).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)).slice(0, 4)
  const visibleActivities = activityFilter === 'all' ? data.activities : data.activities.filter((activity) => activity.type === activityFilter)
  return <>
    <section className="pulse-grid">
      <Metric label="Open leads" value={String(metrics.openLeads)} detail={`${metrics.proposalOpen} in proposal · ${metrics.stalledLeads} stalled`} icon={Target} tone="navy" onClick={() => onNavigate('leads')} />
      <Metric label="Pipeline value" value={formatCurrency(metrics.pipeline)} detail={`${formatCurrency(metrics.weighted)} weighted · ${formatCurrency(metrics.won)} won`} icon={BarChart3} tone="amber" onClick={() => onNavigate('leads')} />
      <Metric label="Follow-ups · 7 days" value={String(metrics.due)} detail={`next 7 days vs ${Math.max(metrics.due - metrics.dueDelta, 0)} last week`} icon={Clock3} tone="coral" onClick={() => onNavigate('calendar')} delta={metrics.dueDelta} spark={metrics.weeklyFollowUps} />
      <Metric label="Avg. readiness" value={`${metrics.readiness}%`} detail={`${metrics.qaPct}% of QA checks complete`} icon={ClipboardCheck} tone="teal" onClick={() => onNavigate('qa')} />
    </section>
    <div className="section-kicker"><span>Today’s pulse</span><span className="kicker-line"></span><span>{formatDate(TODAY, { day: '2-digit', month: 'short' }).toUpperCase()} · LIVE</span></div>
    <section className="insight-grid">
      <div className="panel attention-panel">
        <PanelHeader eyebrow="Needs attention" title="Attention inbox" action="Open calendar" onAction={() => onNavigate('calendar')} />
        {alerts.length ? <div className="attention-list">{alerts.map((alert, index) => { const Icon = alert.icon; return <button key={`${alert.title}-${index}`} className={`attention-row tone-${alert.tone}`} onClick={() => onNavigate(alert.view)}><span className="attention-icon"><Icon size={15} /></span><span className="attention-main"><strong>{alert.title}</strong><small>{alert.meta}</small></span><ChevronRight size={15} /></button> })}</div> : <div className="inbox-clear"><CheckCircle2 size={20} /><strong>All clear.</strong><span>No overdue work, stalled leads, or open issues right now.</span></div>}
      </div>
      <div className="panel funnel-panel">
        <PanelHeader eyebrow="Pipeline" title="Stage funnel" action="Lead CRM" onAction={() => onNavigate('leads')} />
        <StageFunnel leads={data.leads} />
      </div>
    </section>
    <section className="insight-grid secondary">
      <div className="panel load-panel">
        <PanelHeader eyebrow="Follow-up load" title="Weekly rhythm" action="Calendar" onAction={() => onNavigate('calendar')} />
        <WeeklyLoad followUps={data.followUps} />
      </div>
      <div className="panel mix-panel">
        <PanelHeader eyebrow="Outreach" title="Channel mix" action="Outreach log" onAction={() => onNavigate('outreach')} />
        <ChannelMix outreach={data.outreach} />
      </div>
    </section>
    <section className="dashboard-grid">
      <div className="panel priority-panel"><PanelHeader eyebrow="Next actions" title="Priority queue" action="See calendar" onAction={() => onNavigate('calendar')} /><div className="queue-list">{upcoming.map((item) => <FollowUpRow key={item.id} item={item} onToggle={onToggleFollowUp} />)}</div><button className="panel-footer-link" onClick={() => onNavigate('calendar')}>View all follow-ups <ArrowUpRight size={14} /></button></div>
      <div className="panel calendar-panel"><PanelHeader eyebrow="This week" title="Follow-up rhythm" action="Open full view" onAction={() => onNavigate('calendar')} /><MiniCalendar followUps={data.followUps} /><div className="calendar-summary"><span className="summary-dot dot-amber"></span><strong>{data.followUps.filter((item) => !item.done && item.date >= TODAY && item.date <= addDays(TODAY, 7)).length}</strong><span>open commitments in the next 7 days</span></div></div>
    </section>
    <section className="dashboard-grid lower-grid">
      <div className="panel project-panel"><PanelHeader eyebrow="Delivery pulse" title="Active website projects" action="See projects" onAction={() => onNavigate('projects')} />{data.projects.slice(0, 3).map((project) => <ProjectRow key={project.id} project={project} />)}</div>
      <div className="panel activity-panel">
        <PanelHeader eyebrow="Latest movement" title="Activity stream" action="" />
        <div className="activity-filters">{(['all', 'lead', 'outreach', 'project', 'research', 'qa', 'follow-up'] as const).map((type) => <button key={type} className={activityFilter === type ? 'selected' : ''} onClick={() => setActivityFilter(type)}>{type === 'all' ? 'All' : type}</button>)}</div>
        {visibleActivities.map((activity) => <ActivityRow key={activity.id} activity={activity} />)}
      </div>
    </section>
  </>
}

function Metric({ label, value, detail, icon: Icon, tone, onClick, delta, spark }: { label: string; value: string; detail: string; icon: LucideIcon; tone: string; onClick: () => void; delta?: number; spark?: number[] }) {
  return <button className={`metric-card metric-${tone}`} onClick={onClick}><div className="metric-top"><span>{label}</span><Icon size={17} /></div><div className="metric-value-row"><strong>{value}</strong>{delta !== undefined && <span className={`delta-badge ${delta > 0 ? 'delta-up' : delta < 0 ? 'delta-down' : 'delta-flat'}`}>{delta > 0 ? <TrendingUp size={12} /> : delta < 0 ? <TrendingDown size={12} /> : <Circle size={10} />}{delta > 0 ? `+${delta}` : delta}</span>}</div>{spark && <Sparkline values={spark} tone={tone} />}<small>{detail}</small><div className="metric-bar"><i></i></div></button>
}

function Sparkline({ values, tone }: { values: number[]; tone: string }) {
  const color = tone === 'coral' ? 'var(--coral)' : tone === 'amber' ? 'var(--amber)' : tone === 'teal' ? 'var(--teal)' : '#315574'
  const max = Math.max(...values, 1)
  const points = values.map((value, index) => `${(index / (values.length - 1)) * 100},${28 - (value / max) * 24}`).join(' ')
  return <svg className="sparkline" viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true"><polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" /></svg>
}

function StageFunnel({ leads }: { leads: Lead[] }) {
  const stages: LeadStage[] = ['New', 'Contacted', 'Qualified', 'Proposal', 'Won']
  const rows = stages.map((stage) => ({ stage, count: leads.filter((lead) => lead.stage === stage).length, value: leads.filter((lead) => lead.stage === stage).reduce((sum, lead) => sum + lead.value, 0) }))
  const max = Math.max(...rows.map((row) => row.count), 1)
  return <div className="funnel-list">{rows.map((row) => <button key={row.stage} className="funnel-row"><span className="funnel-stage">{row.stage}</span><span className="funnel-track"><i style={{ width: `${(row.count / max) * 100}%` }}></i></span><span className="funnel-count">{row.count}</span><span className="funnel-value">{formatCurrency(row.value)}</span></button>)}</div>
}

function WeeklyLoad({ followUps }: { followUps: FollowUp[] }) {
  const weeks = Array.from({ length: 8 }, (_, index) => {
    const from = addDays(TODAY, (index - 7) * 7)
    const to = addDays(from, 6)
    const items = followUps.filter((item) => item.date >= from && item.date <= to)
    return { from, to, open: items.filter((item) => !item.done).length, done: items.filter((item) => item.done).length, isCurrent: index === 7 }
  })
  const max = Math.max(...weeks.map((week) => week.open + week.done), 1)
  return <div className="weekly-bars">
    {weeks.map((week) => <div key={week.from} className={`weekly-col ${week.isCurrent ? 'current' : ''}`}><div className="weekly-stacks" title={`${formatDate(week.from)} – ${formatDate(week.to)}: ${week.open} open, ${week.done} done`}><i className="stack-done" style={{ height: `${(week.done / max) * 100}%` }}></i><i className="stack-open" style={{ height: `${(week.open / max) * 100}%` }}></i></div><span>{formatDate(week.from, { day: '2-digit' })}</span></div>)}
    <div className="weekly-legend"><span><i className="stack-open"></i> Open</span><span><i className="stack-done"></i> Done</span></div>
  </div>
}

const MIX_COLORS = ['#17324d', '#d97706', '#2d8074', '#c65c50', '#5a7c99', '#82909e', '#315574', '#b08968']

function ChannelMix({ outreach }: { outreach: SeedData['outreach'] }) {
  const entries = Object.entries(outreach.reduce<Record<string, number>>((acc, item) => { acc[item.channel] = (acc[item.channel] ?? 0) + 1; return acc }, {})).sort((a, b) => b[1] - a[1])
  const total = entries.reduce((sum, [, count]) => sum + count, 0) || 1
  const replied = outreach.filter((item) => item.outcome === 'Replied' || item.outcome === 'Meeting booked').length
  const radius = 42
  const circumference = 2 * Math.PI * radius
  let offset = 0
  return <div className="mix-chart">
    <div className="mix-donut">
      <svg viewBox="0 0 100 100">
        {entries.map(([channel, count], index) => {
          const fraction = count / total
          const dash = `${fraction * circumference} ${circumference}`
          const rotate = (offset / total) * 360
          offset += count
          return <circle key={channel} cx="50" cy="50" r={radius} fill="none" stroke={MIX_COLORS[index % MIX_COLORS.length]} strokeWidth="13" strokeDasharray={dash} transform={`rotate(${rotate - 90} 50 50)`} />
        })}
      </svg>
      <div className="mix-center"><strong>{total}</strong><span>touchpoints</span></div>
    </div>
    <div className="mix-side">
      <div className="mix-legend">{entries.map(([channel, count], index) => <span key={channel}><i style={{ background: MIX_COLORS[index % MIX_COLORS.length] }}></i>{channel}<b>{count}</b></span>)}</div>
      <div className="mix-stat"><span>Reply rate</span><strong>{Math.round((replied / total) * 100)}%</strong><small>{replied} of {total} touchpoints replied or booked</small></div>
    </div>
  </div>
}

function PanelHeader({ eyebrow, title, action, onAction }: { eyebrow: string; title: string; action: string; onAction?: () => void }) {
  return <div className="panel-header"><div><div className="eyebrow">{eyebrow}</div><h2>{title}</h2></div>{action && <button className="text-button" onClick={onAction}>{action} <ArrowUpRight size={14} /></button>}</div>
}

function FollowUpRow({ item, onToggle }: { item: FollowUp; onToggle: (id: string) => void }) {
  return <div className={`queue-row ${item.done ? 'is-done' : ''}`}><button className="check-button" onClick={() => onToggle(item.id)}>{item.done ? <Check size={14} /> : <Circle size={17} />}</button><div className="queue-main"><strong>{item.title}</strong><span>{item.relatedName} · {item.owner}</span></div><div className="queue-time"><b className={`priority-dot priority-${item.priority.toLowerCase()}`}></b><span>{formatDate(item.date)}</span><small>{item.time}</small></div></div>
}

function MiniCalendar({ followUps }: { followUps: FollowUp[] }) {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const today = new Date(`${TODAY}T12:00:00`)
  const mondayOffset = (today.getDay() + 6) % 7
  const dates = Array.from({ length: 7 }, (_, index) => addDays(TODAY, index - mondayOffset))
  return <div className="mini-calendar"><div className="mini-month"><strong>{new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(today)}</strong><span>Week {weekNumber(today)}</span></div><div className="mini-days">{days.map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div><div className="mini-dates">{dates.map((date) => { const count = followUps.filter((item) => item.date === date && !item.done).length; return <span key={date} className={`${date === TODAY ? 'today' : ''} ${count ? 'has-dot' : ''}`}>{Number(date.slice(-2))}<i>{count ? count : ''}</i></span> })}</div></div>
}

function weekNumber(date: Date) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNumber = target.getUTCDay() || 7
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber)
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1))
  return Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function ProjectRow({ project }: { project: Project }) {
  return <div className="project-row"><div className="project-thumb" style={{ background: project.accent }}><span>{project.name.slice(0, 1)}</span></div><div className="project-row-main"><strong>{project.name}</strong><span>{project.domain} · {project.owner}</span></div><div className="project-row-progress"><div><span>{project.readiness}% ready</span><b>{project.status}</b></div><div className="progress-track"><i style={{ width: `${project.readiness}%` }}></i></div></div></div>
}

function ActivityRow({ activity }: { activity: Activity }) {
  return <div className="activity-row"><div className={`activity-avatar activity-${activity.tone}`}>{activity.initials}</div><div><strong>{activity.title}</strong><span>{activity.detail}</span></div><time>{activity.timestamp}</time></div>
}

/* ------------------------------------------------------------------ */
/* Command palette (⌘K)                                                */
/* ------------------------------------------------------------------ */

interface PaletteActions {
  exportLeads: () => void
  exportFollowUps: () => void
  addLead: () => void
  addOutreach: () => void
}

function CommandPalette({ data, onClose, onNavigate, onSelectClient, onSelectProject, actions }: { data: SeedData; onClose: () => void; onNavigate: (view: View) => void; onSelectClient: (id: string) => void; onSelectProject: (id: string) => void; actions: PaletteActions }) {
  const [paletteQuery, setPaletteQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const items = useMemo(() => {
    const list: Array<{ id: string; label: string; hint: string; icon: LucideIcon; run: () => void }> = [
      ...navItems.map((item) => ({ id: `nav-${item.id}`, label: item.label, hint: 'Go to view', icon: item.icon, run: () => onNavigate(item.id) })),
      ...data.leads.map((lead) => ({ id: lead.id, label: `${lead.name} · ${lead.company}`, hint: `Lead · ${lead.stage} · ${formatCurrency(lead.value)}`, icon: Target, run: () => onNavigate('leads') })),
      ...data.clients.map((client) => ({ id: client.id, label: `${client.company} · ${client.name}`, hint: `Client · ${client.health}`, icon: Users, run: () => onSelectClient(client.id) })),
      ...data.projects.map((project) => ({ id: project.id, label: project.name, hint: `Project · ${project.status} · ${project.readiness}% ready`, icon: FolderKanban, run: () => onSelectProject(project.id) })),
      ...data.followUps.filter((item) => !item.done).map((item) => ({ id: item.id, label: item.title, hint: `Follow-up · ${formatDate(item.date)} · ${item.owner}`, icon: CalendarDays, run: () => onNavigate('calendar') })),
      { id: 'add-lead', label: 'Add lead', hint: 'Action', icon: Plus, run: actions.addLead },
      { id: 'add-outreach', label: 'Log outreach', hint: 'Action', icon: Send, run: actions.addOutreach },
      { id: 'export-leads', label: 'Export leads CSV', hint: 'Action', icon: Download, run: actions.exportLeads },
      { id: 'export-followups', label: 'Export follow-ups CSV', hint: 'Action', icon: Download, run: actions.exportFollowUps },
    ]
    const term = paletteQuery.trim().toLowerCase()
    return term ? list.filter((item) => `${item.label} ${item.hint}`.toLowerCase().includes(term)) : list
  }, [data, paletteQuery, actions, onNavigate, onSelectClient, onSelectProject])

  useEffect(() => {
    inputRef.current?.focus()
    setActiveIndex(0)
  }, [])

  useEffect(() => { setActiveIndex(0) }, [paletteQuery])

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'ArrowDown') { event.preventDefault(); setActiveIndex((index) => Math.min(index + 1, items.length - 1)) }
    if (event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex((index) => Math.max(index - 1, 0)) }
    if (event.key === 'Enter' && items[activeIndex]) { items[activeIndex].run(); onClose() }
    if (event.key === 'Escape') onClose()
  }

  return (
    <div className="palette-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="palette" role="dialog" aria-label="Quick find">
        <div className="palette-input"><Search size={16} /><input ref={inputRef} value={paletteQuery} onChange={(event) => setPaletteQuery(event.target.value)} onKeyDown={handleKeyDown} placeholder="Search leads, clients, projects — or jump anywhere" /><kbd>esc</kbd></div>
        <div className="palette-list">
          {items.length ? items.slice(0, 12).map((item, index) => { const Icon = item.icon; return <button key={item.id} className={index === activeIndex ? 'active' : ''} onMouseEnter={() => setActiveIndex(index)} onClick={() => { item.run(); onClose() }}><Icon size={15} /><span className="palette-label">{item.label}</span><span className="palette-hint">{item.hint}</span></button> }) : <div className="palette-empty"><Inbox size={16} /><span>No matches for “{paletteQuery}”.</span></div>}
        </div>
        <div className="palette-foot"><span><kbd>↑↓</kbd> navigate</span><span><kbd>↵</kbd> open</span><span><kbd>esc</kbd> close</span></div>
      </div>
    </div>
  )
}

function LeadsView({ leads, stageFilter, setStageFilter, query, setQuery, showFilters, setShowFilters, onAdd }: { leads: Lead[]; stageFilter: 'All' | LeadStage; setStageFilter: (value: 'All' | LeadStage) => void; query: string; setQuery: (value: string) => void; showFilters: boolean; setShowFilters: (value: boolean) => void; onAdd: () => void }) {
  const stages: Array<'All' | LeadStage> = ['All', 'New', 'Contacted', 'Qualified', 'Proposal', 'Won']
  return <section className="module-section"><div className="module-toolbar"><div className="search-field"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, company, or role" /></div><div className="toolbar-actions"><button className={`button button-secondary ${showFilters ? 'is-active' : ''}`} onClick={() => setShowFilters(!showFilters)}><Filter size={15} /> Filters</button><button className="button button-primary" onClick={onAdd}><Plus size={15} /> Add lead</button></div></div>{showFilters && <div className="filter-strip">{stages.map((stage) => <button key={stage} className={stageFilter === stage ? 'selected' : ''} onClick={() => setStageFilter(stage)}>{stage}<span>{stage === 'All' ? leads.length : leads.filter((lead) => lead.stage === stage).length}</span></button>)}</div>}<div className="table-panel"><div className="table-caption"><span><strong>{leads.length}</strong> leads in view</span><span>Sorted by next action <ChevronDown size={14} /></span></div><div className="data-table leads-table"><div className="table-head"><span>Lead / company</span><span>Stage</span><span>Owner</span><span>Opportunity</span><span>Next action</span><span></span></div>{leads.map((lead) => <LeadTableRow key={lead.id} lead={lead} />)}</div></div><div className="module-note"><Sparkles size={15} /><span>Tip: keep the next action concrete. “Send scope options” beats “follow up.”</span></div></section>
}

function LeadTableRow({ lead }: { lead: Lead }) {
  const stale = !['Won', 'Lost'].includes(lead.stage) && lead.nextActionDate < TODAY
  return <div className="table-row lead-row"><div className="lead-identity"><div className="avatar avatar-amber">{lead.avatar}</div><div><strong>{lead.name}</strong><span>{lead.company} · {lead.role}</span></div></div><span><StatusBadge label={lead.stage} tone={lead.stage === 'Qualified' ? 'teal' : lead.stage === 'Proposal' ? 'amber' : lead.stage === 'Won' ? 'navy' : 'muted'} /></span><span className="owner-cell"><span className="owner-dot">{initialsFrom(lead.owner)}</span>{lead.owner}</span><strong className="value-cell">{formatCurrency(lead.value)}</strong><div className="next-action"><strong>{lead.nextAction}</strong><span className={stale ? 'stale-date' : ''}>{stale ? 'Overdue · ' : ''}{formatDate(lead.nextActionDate)}</span></div><button className="row-more"><MoreHorizontal size={17} /></button></div>
}

function StatusBadge({ label, tone }: { label: string; tone: 'teal' | 'amber' | 'navy' | 'coral' | 'muted' }) {
  return <span className={`status-badge badge-${tone}`}><i></i>{label}</span>
}

function ClientsView({ data, selectedClientId, setSelectedClientId }: { data: SeedData; selectedClientId: string; setSelectedClientId: (id: string) => void }) {
  const client = data.clients.find((item) => item.id === selectedClientId) ?? data.clients[0]
  if (!client) return null
  const projects = data.projects.filter((project) => project.clientId === client.id)
  const clientOutreach = data.outreach.filter((item) => item.clientId === client.id || data.leads.find((lead) => lead.id === item.leadId)?.company === client.company)
  const followUps = data.followUps.filter((item) => item.relatedId === client.id || item.relatedName === client.company)
  const research = data.research.filter((item) => item.subject === client.company || item.subject === client.name)
  return <section className="clients-layout"><div className="client-list panel"><div className="list-header"><div className="eyebrow">Relationships</div><h2>Clients <span>{data.clients.length}</span></h2><div className="search-field compact"><Search size={15} /><input placeholder="Find a client" /></div></div>{data.clients.map((item) => <button key={item.id} className={`client-list-row ${item.id === client.id ? 'selected' : ''}`} onClick={() => setSelectedClientId(item.id)}><div className={`avatar ${item.id === client.id ? 'avatar-amber' : 'avatar-soft'}`}>{item.avatar}</div><div><strong>{item.company}</strong><span>{item.name} · {item.industry}</span></div><span className={`health-dot health-${item.health.toLowerCase().replace(' ', '-')}`}></span></button>)}</div><div className="client-workspace"><div className="client-hero"><div><div className="eyebrow">Client workspace</div><h2>{client.company}</h2><p>{client.name} · {client.industry} · working with Pula since {formatDate(client.since, { month: 'long', year: 'numeric' })}</p></div><div className="client-hero-actions"><StatusBadge label={client.health} tone={client.health === 'Healthy' ? 'teal' : client.health === 'Watch' ? 'amber' : 'coral'} /><button className="button button-secondary"><Mail size={15} /> Contact</button></div></div><div className="client-stat-row"><div><span>Projects</span><strong>{projects.length}</strong></div><div><span>Open follow-ups</span><strong>{followUps.filter((item) => !item.done).length}</strong></div><div><span>Touchpoints</span><strong>{clientOutreach.length}</strong></div><div><span>Research confidence</span><strong>{research[0]?.confidence ?? 0}%</strong></div></div><div className="client-detail-grid"><div className="panel inner-panel"><PanelHeader eyebrow="Delivery" title="Related projects" action="" />{projects.length ? projects.map((project) => <ProjectRow key={project.id} project={project} />) : <EmptyState label="No projects yet" />}</div><div className="panel inner-panel"><PanelHeader eyebrow="Stay close" title="Next follow-ups" action="" />{followUps.length ? followUps.map((item) => <FollowUpRow key={item.id} item={item} onToggle={() => {}} />) : <EmptyState label="No follow-ups scheduled" />}</div></div></div></section>
}

function ProjectsView({ data, selectedProjectId, setSelectedProjectId, onNavigate }: { data: SeedData; selectedProjectId: string; setSelectedProjectId: (id: string) => void; onNavigate: (view: View) => void }) {
  const selected = data.projects.find((project) => project.id === selectedProjectId) ?? data.projects[0]
  return <section className="projects-layout"><div className="project-board"><div className="board-heading"><div><div className="eyebrow">Delivery board</div><h2>{data.projects.length} active projects</h2></div><div className="board-legend"><span><i className="legend-dot dot-teal"></i> On track</span><span><i className="legend-dot dot-amber"></i> Needs attention</span></div></div><div className="project-cards">{data.projects.map((project) => <button key={project.id} className={`project-card ${project.id === selected?.id ? 'selected' : ''}`} onClick={() => setSelectedProjectId(project.id)}><div className="project-card-top"><span className="project-index">0{data.projects.indexOf(project) + 1}</span><StatusBadge label={project.status} tone={project.status === 'Live' ? 'teal' : project.status === 'Review' ? 'amber' : project.status === 'Paused' ? 'coral' : 'muted'} /></div><div className="project-card-art" style={{ background: project.accent }}><span>{project.name.split(' ')[0].slice(0, 2).toUpperCase()}</span><ArrowUpRight size={16} /></div><strong>{project.name}</strong><span>{project.domain}</span><div className="project-card-foot"><small>{project.owner}</small><b>{project.readiness}%</b></div><div className="progress-track"><i style={{ width: `${project.readiness}%` }}></i></div></button>)}</div></div>{selected && <div className="project-detail panel"><div className="detail-flag" style={{ background: selected.accent }}><FolderKanban size={18} /><span>Project brief</span><button><MoreHorizontal size={17} /></button></div><div className="eyebrow">{selected.status} · {selected.domain}</div><h2>{selected.name}</h2><p>{selected.description}</p><div className="detail-owner"><div className="avatar avatar-navy">{initialsFrom(selected.owner)}</div><div><span>Project owner</span><strong>{selected.owner}</strong></div><div className="detail-date"><span>Next milestone</span><strong>{selected.nextMilestone}</strong><small className={selected.milestoneDate < TODAY ? 'stale-date' : ''}>{selected.milestoneDate < TODAY ? 'Passed · ' : ''}{formatDate(selected.milestoneDate)}</small></div></div><div className="readiness-block"><div><span>Launch readiness</span><strong>{selected.readiness}%</strong></div><div className="readiness-track"><i style={{ width: `${selected.readiness}%` }}></i></div><small>{data.qa.filter((item) => item.projectId === selected.id && item.done).length} of {data.qa.filter((item) => item.projectId === selected.id).length} QA checks complete</small></div><button className="button button-primary button-wide" onClick={() => onNavigate('qa')}>Open QA checklist <ArrowUpRight size={15} /></button></div>}</section>
}

function OutreachView({ data, query, setQuery, onAdd }: { data: SeedData; query: string; setQuery: (value: string) => void; onAdd: () => void }) {
  const items = data.outreach.filter((item) => `${item.company} ${item.contact} ${item.channel} ${item.outcome}`.toLowerCase().includes(query.toLowerCase()))
  const thisMonth = data.outreach.filter((item) => item.date.slice(0, 7) === TODAY.slice(0, 7)).length
  const replied = data.outreach.filter((item) => item.outcome === 'Replied' || item.outcome === 'Meeting booked').length
  const meetings = data.outreach.filter((item) => item.outcome === 'Meeting booked').length
  const best = Object.entries(data.outreach.reduce<Record<string, number>>((acc, item) => { acc[item.channel] = (acc[item.channel] ?? 0) + 1; return acc }, {})).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'
  return <section className="module-section"><div className="module-toolbar"><div className="search-field"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search company, contact, or outcome" /></div><div className="toolbar-actions"><button className="button button-secondary"><ListFilter size={15} /> All channels</button><button className="button button-primary" onClick={onAdd}><Plus size={15} /> Log outreach</button></div></div><div className="outreach-summary"><div><span>Touchpoints this month</span><strong>{thisMonth}</strong></div><div><span>Reply rate</span><strong>{data.outreach.length ? Math.round((replied / data.outreach.length) * 100) : 0}%</strong></div><div><span>Meetings booked</span><strong>{meetings}</strong></div><div><span>Best channel</span><strong>{best}</strong></div></div><div className="table-panel"><div className="table-caption"><span><strong>{items.length}</strong> recent touchpoints</span><span>Newest first <ChevronDown size={14} /></span></div><div className="data-table outreach-table"><div className="table-head"><span>Contact</span><span>Channel</span><span>Date</span><span>Outcome</span><span>Note</span><span></span></div>{items.map((item) => <div className="table-row outreach-row" key={item.id}><div className="lead-identity"><div className="avatar avatar-soft">{initialsFrom(item.contact)}</div><div><strong>{item.contact}</strong><span>{item.company}</span></div></div><span className="channel-cell"><ChannelIcon channel={item.channel} />{item.channel}</span><span className="date-cell">{formatDate(item.date)}</span><span><StatusBadge label={item.outcome} tone={item.outcome === 'Replied' || item.outcome === 'Meeting booked' ? 'teal' : item.outcome === 'Follow-up' ? 'amber' : 'muted'} /></span><span className="note-cell">{item.note}</span><button className="row-more"><MoreHorizontal size={17} /></button></div>)}</div></div></section>
}

function ChannelIcon({ channel }: { channel: string }) { return channel === 'Email' ? <Mail size={14} /> : channel === 'LinkedIn' ? <span className="linkedin-icon">in</span> : channel === 'WhatsApp' ? <MessageCircle size={14} /> : <Clock3 size={14} /> }

function CalendarView({ data, selectedDate, setSelectedDate, onToggle }: { data: SeedData; selectedDate: string; setSelectedDate: (value: string) => void; onToggle: (id: string) => void }) {
  const anchor = new Date(`${selectedDate}T12:00:00`)
  const mondayOffset = (anchor.getDay() + 6) % 7
  const dates = Array.from({ length: 7 }, (_, index) => addDays(selectedDate, index - mondayOffset))
  const visible = data.followUps.filter((item) => item.date === selectedDate)
  return <section className="calendar-layout"><div className="calendar-main panel"><div className="calendar-heading"><div><div className="eyebrow">{new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(anchor)} · Week {weekNumber(anchor)}</div><h2>Follow-up calendar</h2></div><button className="button button-secondary" onClick={() => setSelectedDate(TODAY)}><CalendarDays size={15} /> Today</button></div><div className="calendar-week">{dates.map((date) => <button key={date} className={`${selectedDate === date ? 'selected' : ''} ${date === TODAY ? 'is-today' : ''}`} onClick={() => setSelectedDate(date)}><span>{new Intl.DateTimeFormat('en-GB', { weekday: 'short' }).format(new Date(`${date}T12:00:00`))}</span><strong>{Number(date.slice(-2))}</strong><i>{data.followUps.filter((item) => item.date === date && !item.done).length || ''}</i></button>)}</div><div className="agenda-heading"><div><div className="eyebrow">{formatDate(selectedDate, { weekday: 'long', day: 'numeric', month: 'long' })}</div><h3>{visible.length ? `${visible.length} commitments` : 'Clear runway'}</h3></div><span>{visible.filter((item) => item.done).length} complete</span></div><div className="agenda-list">{visible.length ? visible.map((item) => <AgendaRow key={item.id} item={item} onToggle={onToggle} />) : <EmptyState label="No follow-ups scheduled for this day" />}</div></div><aside className="calendar-side"><div className="panel week-panel"><PanelHeader eyebrow="Week at a glance" title="Open commitments" action="" />{data.followUps.filter((item) => !item.done).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)).slice(0, 5).map((item) => <div className="week-row" key={item.id}><span className={`priority-dot priority-${item.priority.toLowerCase()}`}></span><div><strong>{item.title}</strong><small>{formatDate(item.date)} · {item.owner}{item.date < TODAY ? ' · overdue' : ''}</small></div></div>)}</div><div className="calendar-note"><Sparkles size={17} /><strong>Make the promise visible.</strong><span>Follow-ups are shared across leads, clients, and projects so context stays attached.</span></div></aside></section>
}

function AgendaRow({ item, onToggle }: { item: FollowUp; onToggle: (id: string) => void }) { return <div className={`agenda-row ${item.done ? 'is-done' : ''}`}><div className="agenda-time"><strong>{item.time}</strong><span>{item.owner}</span></div><div className="agenda-bar"></div><div className="agenda-content"><div><strong>{item.title}</strong><span>{item.relatedType} · {item.relatedName}</span></div><button className={`agenda-check ${item.done ? 'done' : ''}`} onClick={() => onToggle(item.id)}>{item.done ? <Check size={15} /> : <Circle size={15} />}</button></div></div> }

function ResearchView({ data, onVerify }: { data: SeedData; onVerify: (id: string) => void }) {
  const [researchFilter, setResearchFilter] = useState<'All' | 'Needs review' | 'Unverified'>('All')
  const visible = researchFilter === 'All' ? data.research : data.research.filter((item) => item.status === researchFilter)
  return <section className="research-layout"><div className="research-main panel"><div className="research-summary"><div><div className="eyebrow">Evidence queue</div><h2>Verify before you act.</h2><p>Keep the source, confidence, and reviewer note attached to every finding.</p></div><div className="research-count"><strong>{data.research.filter((item) => item.status !== 'Verified').length}</strong><span>need review</span></div></div><div className="research-filter"><button className={researchFilter === 'All' ? 'selected' : ''} onClick={() => setResearchFilter('All')}>All findings <span>{data.research.length}</span></button><button className={researchFilter === 'Needs review' ? 'selected' : ''} onClick={() => setResearchFilter('Needs review')}>Needs review <span>{data.research.filter((item) => item.status === 'Needs review').length}</span></button><button className={researchFilter === 'Unverified' ? 'selected' : ''} onClick={() => setResearchFilter('Unverified')}>Unverified <span>{data.research.filter((item) => item.status === 'Unverified').length}</span></button></div><div className="research-list">{visible.map((item) => <ResearchRow key={item.id} item={item} onVerify={onVerify} />)}</div></div><aside className="research-side"><div className="panel"><PanelHeader eyebrow="Verification health" title="Confidence mix" action="" /><div className="confidence-chart"><div className="confidence-ring"><strong>{Math.round(data.research.reduce((sum, item) => sum + item.confidence, 0) / data.research.length)}%</strong><span>average</span></div><div className="confidence-legend"><span><i className="dot-teal"></i> Verified <b>{data.research.filter((item) => item.status === 'Verified').length}</b></span><span><i className="dot-amber"></i> Needs review <b>{data.research.filter((item) => item.status === 'Needs review').length}</b></span><span><i className="dot-coral"></i> Unverified <b>{data.research.filter((item) => item.status === 'Unverified').length}</b></span></div></div></div><div className="source-note"><ExternalLink size={16} /><strong>Source discipline</strong><span>Every finding should have a link a teammate can open in one click.</span></div></aside></section>
}

function ResearchRow({ item, onVerify }: { item: ResearchItem; onVerify: (id: string) => void }) { return <article className="research-row"><div className="research-row-top"><div><span className="subject-type">{item.subjectType}</span><h3>{item.subject}</h3></div><StatusBadge label={item.status} tone={item.status === 'Verified' ? 'teal' : item.status === 'Needs review' ? 'amber' : 'coral'} /></div><p>{item.finding}</p><div className="research-row-foot"><a href={item.source} target="_blank" rel="noreferrer"><ExternalLink size={13} /> {item.source.replace('https://', '')}</a><span>Confidence <strong>{item.confidence}%</strong></span><span>Updated {formatDate(item.updatedAt)}</span>{item.status !== 'Verified' && <button className="button button-small button-secondary" onClick={() => onVerify(item.id)}><CheckCircle2 size={14} /> Verify</button>}</div><div className="reviewer-note"><UserRound size={13} /> {item.reviewerNote}</div></article> }

function QAView({ data, selectedProjectId, setSelectedProjectId, onToggle }: { data: SeedData; selectedProjectId: string; setSelectedProjectId: (id: string) => void; onToggle: (id: string) => void }) {
  const project = data.projects.find((item) => item.id === selectedProjectId) ?? data.projects[0]
  const items = data.qa.filter((item) => item.projectId === project?.id)
  const done = items.filter((item) => item.done).length
  const sections = Array.from(new Set(items.map((item) => item.section)))
  return <section className="qa-layout"><div className="qa-main panel"><div className="qa-heading"><div><div className="eyebrow">Launch readiness</div><h2>Final mile, made visible.</h2><p>Check the experience, record the issue, and make ready mean ready.</p></div><div className="qa-score"><strong>{items.length ? Math.round((done / items.length) * 100) : 0}%</strong><span>ready</span></div></div><div className="qa-project-switcher"><span>Checking</span>{data.projects.map((item) => <button key={item.id} className={item.id === project?.id ? 'selected' : ''} onClick={() => setSelectedProjectId(item.id)}>{item.name}</button>)}</div><div className="qa-progress"><div><span>{done} of {items.length} checks complete</span><strong>{project?.status}</strong></div><div className="progress-track"><i style={{ width: `${items.length ? (done / items.length) * 100 : 0}%` }}></i></div></div><div className="qa-sections">{sections.map((section) => <div className="qa-section" key={section}><div className="qa-section-heading"><span>{section}</span><small>{items.filter((item) => item.section === section && item.done).length}/{items.filter((item) => item.section === section).length}</small></div>{items.filter((item) => item.section === section).map((item) => <button className={`qa-row ${item.done ? 'done' : ''}`} key={item.id} onClick={() => onToggle(item.id)}><span className="qa-check">{item.done ? <Check size={14} /> : <Circle size={16} />}</span><span><strong>{item.label}</strong>{item.issue && <small><AlertCircle size={12} /> {item.issue}</small>}</span><ChevronRight size={15} /></button>)}</div>)}</div></div><aside className="qa-side"><div className="panel"><PanelHeader eyebrow="QA standard" title="Ready when…" action="" /><ul className="qa-standard"><li><CheckCircle2 size={16} /><span>Every critical path works end to end.</span></li><li><CheckCircle2 size={16} /><span>Open issues have an owner and a next action.</span></li><li><CheckCircle2 size={16} /><span>Client-facing content is approved.</span></li></ul></div><div className="qa-callout"><ClipboardCheck size={19} /><strong>{project?.readiness === 100 ? 'Ready to ship.' : 'Keep the evidence close.'}</strong><span>{project?.readiness === 100 ? 'This project has a clean handoff path.' : 'A completed check is a shared promise, not just a tick.'}</span></div></aside></section>
}

function LeadDrawer({ onClose, onSave }: { onClose: () => void; onSave: (lead: Lead) => void }) {
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [stage, setStage] = useState<LeadStage>('New')
  function submit(event: FormEvent) { event.preventDefault(); onSave({ id: `lead-${Date.now()}`, name, company, role: 'New contact', email, location: '—', source: 'Manual', stage, owner: 'Pula team', value: 0, nextAction: 'Qualify lead', nextActionDate: addDays(TODAY, 2), lastTouched: TODAY, avatar: initialsFrom(name || company) }) }
  return <DrawerShell title="Add a lead" eyebrow="Lead CRM / new record" onClose={onClose}><form className="drawer-form" onSubmit={submit}><p className="drawer-intro">Create a clean starting record. The next action can be refined after the first touchpoint.</p><label>Contact name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Ivana Horvat" required /></label><label>Company<input value={company} onChange={(event) => setCompany(event.target.value)} placeholder="e.g. Studio Feral" required /></label><label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="hello@company.com" required /></label><label>Stage<select value={stage} onChange={(event) => setStage(event.target.value as LeadStage)}>{['New', 'Contacted', 'Qualified', 'Proposal'].map((option) => <option key={option}>{option}</option>)}</select></label><div className="drawer-actions"><button type="button" className="button button-secondary" onClick={onClose}>Cancel</button><button type="submit" className="button button-primary"><Plus size={15} /> Add lead</button></div></form></DrawerShell>
}

function OutreachDrawer({ data, onClose, onSave }: { data: SeedData; onClose: () => void; onSave: (outreach: SeedData['outreach'][number]) => void }) {
  const [contact, setContact] = useState('')
  const [company, setCompany] = useState('')
  const [channel, setChannel] = useState<SeedData['outreach'][number]['channel']>('Email')
  const [outcome, setOutcome] = useState<SeedData['outreach'][number]['outcome']>('No reply')
  const [note, setNote] = useState('')
  function submit(event: FormEvent) { event.preventDefault(); onSave({ id: `outreach-${Date.now()}`, company, contact, channel, outcome, note: note || 'No note added.', date: TODAY, leadId: data.leads.find((lead) => lead.company.toLowerCase() === company.toLowerCase())?.id }) }
  return <DrawerShell title="Log outreach" eyebrow="Growth / new touchpoint" onClose={onClose}><form className="drawer-form" onSubmit={submit}><p className="drawer-intro">Keep the context attached to the relationship so the next touch starts informed.</p><label>Contact<input value={contact} onChange={(event) => setContact(event.target.value)} placeholder="e.g. Mila Petrovic" required /></label><label>Company<input value={company} onChange={(event) => setCompany(event.target.value)} placeholder="e.g. Northline Studio" required /></label><div className="form-two-col"><label>Channel<select value={channel} onChange={(event) => setChannel(event.target.value as typeof channel)}>{['Email', 'LinkedIn', 'Call', 'WhatsApp', 'Instagram', 'Facebook Messenger', 'Other'].map((option) => <option key={option}>{option}</option>)}</select></label><label>Outcome<select value={outcome} onChange={(event) => setOutcome(event.target.value as typeof outcome)}>{['No reply', 'Replied', 'Meeting booked', 'Not a fit', 'Follow-up'].map((option) => <option key={option}>{option}</option>)}</select></label></div><label>Note<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="What happened? What should the next person know?" rows={4} /></label><div className="drawer-actions"><button type="button" className="button button-secondary" onClick={onClose}>Cancel</button><button type="submit" className="button button-primary"><Send size={15} /> Log touchpoint</button></div></form></DrawerShell>
}

function DrawerShell({ title, eyebrow, onClose, children }: { title: string; eyebrow: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><aside className="drawer"><div className="drawer-header"><div><div className="eyebrow">{eyebrow}</div><h2>{title}</h2></div><button className="icon-button" onClick={onClose}><X size={18} /></button></div>{children}</aside></div>
}

function EmptyState({ label }: { label: string }) { return <div className="empty-state"><Circle size={17} /><span>{label}</span></div> }

export default App
