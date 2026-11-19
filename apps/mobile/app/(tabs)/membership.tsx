import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/lib/session';
import { Action, Card, Message, Page, Title, colors, ui } from '@/lib/ui';

type PlanRow = {
  id: string;
  status: string;
  starts_at: string;
  ends_at: string;
  freeze_until: string | null;
  membership_plans: { name: string } | null;
};
type PlanOption = { id: string; name: string; description: string | null; duration_days: number; price_minor: number; currency: string };
type PlanEvent = { id: string; event_type: string; occurred_at: string; reason: string | null };

const freezeChoices = [7, 14, 30];

export default function Membership() {
  const { session } = useSession();
  const [rows, setRows] = useState<PlanRow[]>([]);
  const [options, setOptions] = useState<PlanOption[]>([]);
  const [events, setEvents] = useState<PlanEvent[]>([]);
  const [freezeDays, setFreezeDays] = useState(7);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => { void load(); }, [session?.user.id]);

  async function load() {
    if (!supabase || !session) return;
    setError('');
    const { data: link, error: linkError } = await supabase.from('member_user_links')
      .select('member_id').eq('user_id', session.user.id).is('revoked_at', null).maybeSingle();
    if (linkError) { setError(linkError.message); return; }
    if (!link) { setRows([]); setOptions([]); setEvents([]); return; }

    const [membershipResult, planResult] = await Promise.all([
      supabase.from('memberships').select('id,status,starts_at,ends_at,freeze_until,membership_plans(name)')
        .eq('member_id', link.member_id).order('starts_at', { ascending: false }),
      supabase.from('membership_plans').select('id,name,description,duration_days,price_minor,currency')
        .eq('is_active', true).order('price_minor'),
    ]);
    if (membershipResult.error) setError(membershipResult.error.message);
    if (planResult.error) setError(planResult.error.message);
    const memberships = (membershipResult.data ?? []) as unknown as PlanRow[];
    setRows(memberships);
    setOptions((planResult.data ?? []) as PlanOption[]);

    if (memberships.length) {
      const { data: eventRows, error: eventError } = await supabase.from('membership_events')
        .select('id,event_type,occurred_at,reason').in('membership_id', memberships.map(row => row.id))
        .order('occurred_at', { ascending: false }).limit(20);
      if (eventError) setError(eventError.message);
      setEvents((eventRows ?? []) as PlanEvent[]);
    } else setEvents([]);
  }

  async function freeze(membershipId: string) {
    if (!supabase) return;
    setBusyId(membershipId); setError(''); setMessage('');
    const { error: actionError } = await supabase.rpc('freeze_my_membership', { p_membership_id: membershipId, p_days: freezeDays });
    if (actionError) setError(actionError.message);
    else setMessage(`Your plan is frozen for ${freezeDays} days. The end date has been extended to protect your remaining time.`);
    await load(); setBusyId('');
  }

  async function resume(membershipId: string) {
    if (!supabase) return;
    setBusyId(membershipId); setError(''); setMessage('');
    const { error: actionError } = await supabase.rpc('resume_my_membership', { p_membership_id: membershipId });
    if (actionError) setError(actionError.message);
    else setMessage('Your membership is active again.');
    await load(); setBusyId('');
  }

  const date = (value: string) => new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

  return <Page><ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
    <Title eyebrow="YOUR MEMBERSHIP">Plan & history</Title>
    {error ? <Message error>{error}</Message> : null}
    {message ? <Message>{message}</Message> : null}

    {rows.length ? rows.map(row => <Card key={row.id}>
      <View style={ui.row}>
        <View style={{ flex: 1, gap: 4 }}><Text style={ui.label}>MEMBERSHIP</Text><Text style={{ color: colors.ink, fontSize: 19, fontWeight: '800' }}>{row.membership_plans?.name ?? 'Gym plan'}</Text></View>
        <View style={{ borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: row.status === 'frozen' ? 'rgba(219,167,76,0.18)' : 'rgba(103,158,116,0.16)' }}>
          <Text style={{ color: row.status === 'frozen' ? '#936523' : colors.accent, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>{row.status}</Text>
        </View>
      </View>
      <Text style={ui.muted}>Started {date(row.starts_at)} · Ends {date(row.ends_at)}</Text>

      {row.status === 'active' ? <>
        <Text style={ui.label}>FREEZE YOUR PLAN</Text>
        <Text style={ui.muted}>Pause your membership and add the same number of days to its end date.</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {freezeChoices.map(days => <Pressable key={days} onPress={() => setFreezeDays(days)} accessibilityRole="radio" accessibilityState={{ selected: freezeDays === days }}
            style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: freezeDays === days ? colors.deep : colors.line, backgroundColor: freezeDays === days ? 'rgba(200,241,105,0.52)' : 'rgba(255,255,255,0.55)' }}>
            <Text style={{ color: colors.ink, fontSize: 12, fontWeight: '800' }}>{days} days</Text>
          </Pressable>)}
        </View>
        <Action title={busyId === row.id ? 'Updating plan…' : `Freeze for ${freezeDays} days`} onPress={() => void freeze(row.id)} disabled={Boolean(busyId)} />
      </> : row.status === 'frozen' ? <>
        <Text style={ui.muted}>{row.freeze_until ? `Scheduled through ${date(row.freeze_until)}. You can resume early at any time.` : 'Your plan is paused.'}</Text>
        <Action title={busyId === row.id ? 'Updating plan…' : 'Resume membership'} onPress={() => void resume(row.id)} disabled={Boolean(busyId)} />
      </> : null}
    </Card>) : <Card><Text style={ui.strong}>No plan history yet</Text><Text style={ui.muted}>Your club memberships will appear here after your account is linked.</Text></Card>}

    <View style={styles.sectionHeading}><Text style={ui.label}>AT YOUR CLUB</Text><Text style={styles.sectionTitle}>Available plans</Text></View>
    {options.length ? options.map(plan => <Card key={plan.id}>
      <View style={ui.row}><Text style={[ui.strong, { flex: 1 }]}>{plan.name}</Text><Text style={styles.price}>{plan.price_minor === 0 ? 'Ask club' : `${plan.currency} ${(plan.price_minor / 100).toFixed(0)}`}</Text></View>
      <Text style={ui.muted}>{plan.duration_days} days{plan.description ? ` · ${plan.description}` : ''}</Text>
      <Text style={styles.optionHint}>Ask your front desk to change or purchase this plan.</Text>
    </Card>) : <Card><Text style={ui.muted}>No other plan options are published yet.</Text></Card>}

    <View style={styles.sectionHeading}><Text style={ui.label}>YOUR RECORD</Text><Text style={styles.sectionTitle}>Plan activity</Text></View>
    {events.length ? events.map(event => <Card key={event.id}>
      <View style={ui.row}><Text style={styles.eventTitle}>{event.event_type.replace(/_/g, ' ')}</Text><Text style={ui.muted}>{date(event.occurred_at)}</Text></View>
      {event.reason ? <Text style={ui.muted}>{event.reason}</Text> : null}
    </Card>) : <Card><Text style={ui.muted}>Your membership changes will be recorded here.</Text></Card>}
  </ScrollView></Page>;
}

const styles = {
  sectionHeading: { gap: 3, marginTop: 6 } as const,
  sectionTitle: { color: colors.ink, fontSize: 20, fontWeight: '800' as const },
  price: { color: colors.accent, fontSize: 13, fontWeight: '800' as const },
  optionHint: { color: colors.muted, fontSize: 10, fontWeight: '600' as const },
  eventTitle: { color: colors.ink, fontSize: 13, fontWeight: '800' as const, textTransform: 'capitalize' as const },
};
