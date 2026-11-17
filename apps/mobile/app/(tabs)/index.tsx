import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/lib/session';
import { Action, Card, Message, Page, Title, colors, ui } from '@/lib/ui';

type Member = { id: string; first_name: string; last_name: string; member_number: string; status: string; home_branch_id: string | null };

export default function Home() {
  const { session } = useSession();
  const [member, setMember] = useState<Member | null>(null);
  const [membership, setMembership] = useState<any>(null);
  const [visits, setVisits] = useState<number | null>(null);
  const [occupancy, setOccupancy] = useState<{ inside_count: number; capacity: number | null } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => { void load(); }, [session?.user.id]);

  async function load() {
    if (!supabase || !session) return;
    setError('');
    const { data: link, error: linkError } = await supabase.from('member_user_links')
      .select('member_id').eq('user_id', session.user.id).is('revoked_at', null).maybeSingle();
    if (linkError) { setError(linkError.message); return; }
    if (!link) { setMember(null); return; }

    const { data: row, error: memberError } = await supabase.from('members')
      .select('id,first_name,last_name,member_number,status,home_branch_id').eq('id', link.member_id).maybeSingle();
    if (memberError) { setError(memberError.message); return; }
    if (!row) return;
    setMember(row);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const [planResult, visitResult, occupancyResult] = await Promise.all([
      supabase.from('memberships').select('status,starts_at,ends_at,membership_plans(name)')
        .eq('member_id', row.id).order('ends_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('attendance_events').select('id', { count: 'exact', head: true })
        .eq('member_id', row.id).eq('event_type', 'check_in').gte('occurred_at', thirtyDaysAgo),
      row.home_branch_id
        ? supabase.from('occupancy_snapshots').select('inside_count,capacity').eq('branch_id', row.home_branch_id)
          .order('captured_at', { ascending: false }).limit(1).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);
    if (planResult.error) setError(planResult.error.message);
    if (visitResult.error) setError(visitResult.error.message);
    if (occupancyResult.error) setError(occupancyResult.error.message);
    setMembership(planResult.data);
    setVisits(visitResult.count ?? 0);
    setOccupancy(occupancyResult.data);
  }

  return <Page><ScrollView contentContainerStyle={{ gap: 15, paddingBottom: 18 }}>
    <Title eyebrow="YOUR CLUB">{member ? `Hi, ${member.first_name} 👋` : 'Welcome to GymOS'}</Title>
    {error ? <Message error>{error}</Message> : null}
    {!member ? <Card>
      <Text style={ui.strong}>Link your gym membership</Text>
      <Text style={ui.muted}>Create your login, then connect the member record held by your gym using a one-time front-desk code.</Text>
      <Link href="/link-member" asChild><Action title="Link membership" onPress={() => {}} /></Link>
    </Card> : <>
      <Card dark>
        <Text style={{ color: colors.lime, fontSize: 10, fontWeight: '700', letterSpacing: 1 }}>MEMBERSHIP</Text>
        <Text style={{ color: 'white', fontSize: 23, fontWeight: '800' }}>{membership?.membership_plans?.name ?? 'Your gym plan'}</Text>
        <Text style={{ color: '#b7c4ba', fontSize: 12 }}>Member {member.member_number} · {membership?.status ?? member.status}</Text>
        <Text style={{ color: '#dce6df', fontSize: 11 }}>Renews {membership?.ends_at ? new Date(membership.ends_at).toLocaleDateString() : 'Ask your club'}</Text>
      </Card>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Card><Text style={ui.muted}>Visits · 30 days</Text><Text style={ui.stat}>{visits ?? '—'}</Text></Card>
        <Card><Text style={ui.muted}>Club occupancy</Text><Text style={ui.stat}>{occupancy ? `${occupancy.inside_count}${occupancy.capacity ? `/${occupancy.capacity}` : ''}` : '—'}</Text></Card>
      </View>
      <Card><Text style={ui.strong}>Your next session</Text><Text style={ui.muted}>No upcoming class booking</Text><Link href="/(tabs)/classes" asChild><Action title="Explore classes" secondary onPress={() => {}} /></Link></Card>
    </>}
  </ScrollView></Page>;
}
