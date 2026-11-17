'use client';

import { FormEvent, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Member = { id: string; member_number: string; first_name: string; last_name: string; email: string | null; status: string; home_branch_id: string | null };
type Branch = { id: string; organization_id: string; name: string };
type Plan = { id: string; name: string; duration_days: number };
type Visit = { id: string; member_id: string; branch_id: string; event_type: string; source: string; occurred_at: string };
type ClassItem = { id: string; title: string; starts_at: string; ends_at: string; status: string; capacity: number };
type Notice = { kind: 'good' | 'bad'; text: string } | null;

export default function Dashboard() {
  const [session, setSession] = useState<any>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [stats, setStats] = useState({ activeMemberships: 0, todayCheckins: 0, inside: null as number | null, capacity: null as number | null, occupancyUpdated: '' });
  const [activePage, setActivePage] = useState<'overview' | 'members' | 'attendance' | 'classes' | 'settings'>('overview');
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', member_number: '', plan_id: '' });

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, current) => setSession(current));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => { if (session) void refresh(); }, [session]);

  async function refresh() {
    if (!supabase) return;
    setBusy(true);
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const [memberResult, branchResult, planResult, membershipCount, checkinCount, occupancyResult, visitResult, classResult] = await Promise.all([
      supabase.from('members').select('id,member_number,first_name,last_name,email,status,home_branch_id').order('created_at', { ascending: false }).limit(100),
      supabase.from('branches').select('id,organization_id,name').eq('is_active', true).order('name'),
      supabase.from('membership_plans').select('id,name,duration_days').eq('is_active', true).order('name'),
      supabase.from('memberships').select('id', { count: 'exact', head: true }).eq('status', 'active').lte('starts_at', new Date().toISOString()).gte('ends_at', new Date().toISOString()),
      supabase.from('attendance_events').select('id', { count: 'exact', head: true }).eq('event_type', 'check_in').gte('occurred_at', startOfDay.toISOString()),
      supabase.from('occupancy_snapshots').select('inside_count,capacity,captured_at').order('captured_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('attendance_events').select('id,member_id,branch_id,event_type,source,occurred_at').order('occurred_at', { ascending: false }).limit(20),
      supabase.from('classes').select('id,title,starts_at,ends_at,status,capacity').eq('status', 'scheduled').gte('starts_at', new Date().toISOString()).order('starts_at').limit(20),
    ]);
    setMembers(memberResult.data ?? []);
    setBranches(branchResult.data ?? []);
    setPlans(planResult.data ?? []);
    setVisits(visitResult.data ?? []);
    setClasses(classResult.data ?? []);
    setStats({ activeMemberships: membershipCount.count ?? 0, todayCheckins: checkinCount.count ?? 0, inside: occupancyResult.data?.inside_count ?? null, capacity: occupancyResult.data?.capacity ?? null, occupancyUpdated: occupancyResult.data?.captured_at ?? '' });
    if (memberResult.error) setNotice({ kind: 'bad', text: memberResult.error.message });
    setBusy(false);
  }

  async function signIn(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    const result = authMode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    if (result.error) setNotice({ kind: 'bad', text: result.error.message });
    else if (authMode === 'signup' && !result.data.session) setNotice({ kind: 'good', text: 'Check your email to confirm your account. An organization owner must then assign your staff role.' });
    setBusy(false);
  }

  async function addMember(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !branches[0]) {
      setNotice({ kind: 'bad', text: 'No active branch is available. Apply the GymOS migration and seed first.' });
      return;
    }
    setBusy(true);
    const memberNumber = form.member_number.trim() || `GYM-${Date.now().toString().slice(-7)}`;
    const result = await supabase.rpc('create_member_with_membership', {
      p_branch_id: branches[0].id,
      p_member_number: memberNumber,
      p_first_name: form.first_name,
      p_last_name: form.last_name,
      p_email: form.email,
      p_plan_id: form.plan_id || plans[0]?.id,
    });
    if (result.error) setNotice({ kind: 'bad', text: result.error.message });
    else {
      setForm({ first_name: '', last_name: '', email: '', member_number: '', plan_id: '' });
      setShowForm(false);
      setNotice({ kind: 'good', text: `Member ${memberNumber} created.` });
      await refresh();
    }
    setBusy(false);
  }

  async function signOut() { await supabase?.auth.signOut(); setMembers([]); }
  async function createLinkCode(memberId: string) {
    if (!supabase) return;
    const { data, error } = await supabase.functions.invoke('create-member-link-code', { body: { member_id: memberId } });
    setNotice(error ? { kind: 'bad', text: error.message } : { kind: 'good', text: `One-time member code: ${data.code} · Expires in 15 minutes. Share it with the member privately.` });
  }
  async function recordManualCheckIn(member: Member) {
    if (!supabase || !member.home_branch_id) return;
    const reason = window.prompt(`Manual check-in for ${member.first_name} ${member.last_name}. Add a note (optional):`, 'Front desk check-in');
    if (reason === null) return;
    setBusy(true);
    const { error } = await supabase.rpc('record_manual_check_in', {
      p_member_id: member.id,
      p_branch_id: member.home_branch_id,
      p_reason: reason,
    });
    setNotice(error ? { kind: 'bad', text: error.message } : { kind: 'good', text: `Manual check-in recorded for ${member.first_name} ${member.last_name}.` });
    await refresh();
    setBusy(false);
  }

  if (!supabase) return <main className="center"><section className="auth-card"><div className="brand-mark">G</div><h1>Connect GymOS</h1><p>Copy <code>apps/admin/.env.local.example</code> to <code>apps/admin/.env.local</code> and add your Supabase URL and publishable key.</p></section></main>;

  if (!session) return <main className="center"><form className="auth-card" onSubmit={signIn}>
    <div className="brand-mark">G</div><p className="eyebrow">LOCAL GYM OPERATIONS</p><h1>{authMode === 'login' ? 'Welcome back' : 'Create your login'}</h1>
    <p className="muted">Staff accounts need an owner-assigned role before they can access gym records.</p>
    {notice && <p className={`notice ${notice.kind}`}>{notice.text}</p>}
    <label>Email<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>
    <label>Password<input type="password" minLength={8} autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} required value={password} onChange={e => setPassword(e.target.value)} /></label>
    <button className="button primary" disabled={busy}>{busy ? 'Please wait…' : authMode === 'login' ? 'Sign in' : 'Create account'}</button>
    <button type="button" className="text-button" onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setNotice(null); }}>{authMode === 'login' ? 'Create a staff login' : 'Back to sign in'}</button>
  </form></main>;

  const visibleMembers = members.filter(m => `${m.first_name} ${m.last_name} ${m.member_number} ${m.email ?? ''}`.toLowerCase().includes(search.toLowerCase()));
  const activeCount = stats.activeMemberships;
  const nav = (id: typeof activePage, label: string, icon: string) => <a className={`nav-item ${activePage === id ? 'selected' : ''}`} href={`#${id}`} onClick={(event) => { event.preventDefault(); setActivePage(id); }}><span>{icon}</span><span>{label}</span>{id === 'members' && <b>{members.length}</b>}</a>;
  const liveOccupancy = stats.inside === null ? 'No feed' : `${stats.inside}${stats.capacity ? ` / ${stats.capacity}` : ''}`;
  return <main className="layout">
    <aside className="sidebar"><a className="brand" href="#"><span className="brand-mark">G</span><span>gymOS<small>FITNESS CLUB</small></span></a><p className="nav-title">WORKSPACE</p>{nav('overview','Overview','◫')}{nav('members','Members','♙')}{nav('attendance','Attendance','◷')}{nav('classes','Classes','▦')}{nav('settings','Check-in options','⚙')}<div className="sidebar-bottom"><p>Running locally on your computer. Member data stays in your Supabase project.</p><button className="text-button" onClick={signOut}>Sign out</button></div></aside>
    <section className="main"><header className="topbar"><span>Workspace <b>/</b> Overview</span><span className="profile">{session.user.email}</span></header><div className="content"><div className="heading"><div><p className="eyebrow">YOUR GYM, AT A GLANCE</p><h1>Good day 👋</h1><p className="muted">A clear view of your members and daily operations.</p></div><button className="button primary" onClick={() => { setNotice(null); setShowForm(!showForm); }}>＋ Add member</button></div>
    {notice && <p className={`notice ${notice.kind}`}>{notice.text}</p>}
    {activePage === 'overview' && <><div className="stats"><article className="panel stat"><span>Members</span><strong>{members.length}</strong><small>Database records visible to your role</small></article><article className="panel stat"><span>Active memberships</span><strong>{activeCount}</strong><small>Active on today’s date</small></article><article className="panel stat"><span>Check-ins today</span><strong>{stats.todayCheckins}</strong><small>Attendance events recorded today</small></article><article className="panel stat"><span>Latest occupancy</span><strong>{liveOccupancy}</strong><small>{stats.occupancyUpdated ? `Feed updated ${new Date(stats.occupancyUpdated).toLocaleTimeString()}` : 'Awaiting the first occupancy snapshot'}</small></article></div><div className="overview-grid"><section className="panel table-panel"><div className="panel-heading"><div><h2>Recent attendance</h2><p>Latest records read from the database.</p></div><button className="button secondary" onClick={() => setActivePage('attendance')}>View all</button></div><div className="table-wrap"><table><thead><tr><th>MEMBER ID</th><th>BRANCH ID</th><th>EVENT</th><th>SOURCE</th><th>TIME</th></tr></thead><tbody>{visits.slice(0,5).map(v=><tr key={v.id}><td>{v.member_id.slice(0,8)}</td><td>{v.branch_id.slice(0,8)}</td><td>{v.event_type}</td><td>{v.source}</td><td>{new Date(v.occurred_at).toLocaleString()}</td></tr>)}{!visits.length&&<tr><td colSpan={5} className="empty">No attendance events yet.</td></tr>}</tbody></table></div></section><section className="panel table-panel"><div className="panel-heading"><div><h2>Upcoming classes</h2><p>Scheduled in your permitted organization.</p></div><button className="button secondary" onClick={() => setActivePage('classes')}>View all</button></div>{classes.slice(0,4).map(c=><div className="mini-row" key={c.id}><span><strong>{c.title}</strong><small>{new Date(c.starts_at).toLocaleString()}</small></span><b>{c.capacity} spots</b></div>)}{!classes.length&&<p className="empty">No upcoming classes.</p>}</section></div></>}
    {activePage === 'members' && <section className="panel table-panel"><div className="panel-heading"><div><h2>Members</h2><p>Search the member records you are allowed to view.</p></div><button className="button secondary" onClick={() => void refresh()}>{busy ? 'Refreshing…' : 'Refresh'}</button></div><label className="search">⌕ <input placeholder="Search name, email or member number" value={search} onChange={e => setSearch(e.target.value)} /></label><div className="table-wrap"><table><thead><tr><th>MEMBER</th><th>MEMBER NUMBER</th><th>STATUS</th><th>EMAIL</th><th>MEMBER ACTIONS</th></tr></thead><tbody>{visibleMembers.map(m => <tr key={m.id}><td>{m.first_name} {m.last_name}</td><td>{m.member_number}</td><td><span className={`status ${m.status}`}>{m.status}</span></td><td>{m.email || '—'}</td><td><button className="text-button" onClick={() => void createLinkCode(m.id)}>Generate code</button><button className="text-button" disabled={busy || m.status !== 'active'} onClick={() => void recordManualCheckIn(m)}>Manual check-in</button></td></tr>)}{!visibleMembers.length && <tr><td colSpan={5} className="empty">{busy ? 'Loading members…' : 'No member records yet. Add one to begin.'}</td></tr>}</tbody></table></div></section>}
    {activePage === 'attendance' && <section className="panel table-panel"><div className="panel-heading"><div><h2>Attendance</h2><p>Database feed. QR scans are one-time and validated server-side.</p></div><button className="button secondary" onClick={() => void refresh()}>Refresh</button></div><div className="table-wrap"><table><thead><tr><th>MEMBER ID</th><th>BRANCH ID</th><th>EVENT</th><th>SOURCE</th><th>TIME</th></tr></thead><tbody>{visits.map(v=><tr key={v.id}><td>{v.member_id}</td><td>{v.branch_id}</td><td>{v.event_type}</td><td>{v.source}</td><td>{new Date(v.occurred_at).toLocaleString()}</td></tr>)}{!visits.length&&<tr><td colSpan={5} className="empty">No attendance events yet.</td></tr>}</tbody></table></div></section>}
    {activePage === 'classes' && <section className="panel table-panel"><div className="panel-heading"><div><h2>Upcoming classes</h2><p>Schedule reads directly from GymOS.</p></div><button className="button secondary" onClick={() => void refresh()}>Refresh</button></div><div className="table-wrap"><table><thead><tr><th>CLASS</th><th>STARTS AT</th><th>ENDS AT</th><th>CAPACITY</th><th>STATUS</th></tr></thead><tbody>{classes.map(c=><tr key={c.id}><td>{c.title}</td><td>{new Date(c.starts_at).toLocaleString()}</td><td>{new Date(c.ends_at).toLocaleTimeString()}</td><td>{c.capacity}</td><td>{c.status}</td></tr>)}{!classes.length&&<tr><td colSpan={5} className="empty">No scheduled classes.</td></tr>}</tbody></table></div></section>}
    {activePage === 'settings' && <div className="settings-grid"><section className="panel table-panel"><h2>Check-in options</h2><p>Choose the mode that matches the gym’s installed access system.</p><div className="mini-row"><span><strong>Secure GymOS QR</strong><small>Available now · expiring one-time credentials and server validation</small></span><b>Ready</b></div><div className="mini-row"><span><strong>Staff manual check-in</strong><small>For front-desk fallback; record the reason and staff member</small></span><b>Schema ready</b></div><div className="mini-row"><span><strong>Existing scanner or barcode feed</strong><small>Connect through a provider adapter after identifying the vendor</small></span><b>Needs vendor</b></div><div className="mini-row"><span><strong>NFC</strong><small>Requires the gym’s reader and a native development build; not supported by Expo Go</small></span><b>Later</b></div></section><section className="panel table-panel"><h2>Current pilot data</h2><p>All displayed metrics are fetched from Supabase. Seed records are synthetic.</p><div className="mini-row"><span><strong>Supabase project</strong><small>GymOS · Frankfurt</small></span><b>Connected</b></div><div className="mini-row"><span><strong>Branch</strong><small>{branches[0]?.name ?? 'No branch in your scope'}</small></span><b>{branches.length}</b></div><div className="mini-row"><span><strong>Active plan choices</strong><small>Seeded sample membership plans</small></span><b>{plans.length}</b></div></section></div>}
    <p className="disclaimer">Dashboard access is enforced by Supabase Auth and row-level security. Counts are live database queries; seeded rows are synthetic examples, not real gym activity.</p>
    </div></section>
  </main>;
}
