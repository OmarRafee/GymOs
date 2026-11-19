import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/lib/session';
import { Action, Card, Message, Page, Title, colors, ui } from '@/lib/ui';

type Member = { id: string; first_name: string; last_name: string; member_number: string; status: string; home_branch_id: string | null };
type Occupancy = { inside_count: number; capacity: number | null };

export default function Home() {
  const { session } = useSession();
  const [member, setMember] = useState<Member | null>(null);
  const [membership, setMembership] = useState<any>(null);
  const [occupancy, setOccupancy] = useState<Occupancy | null>(null);
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

    const [planResult, occupancyResult] = await Promise.all([
      supabase.from('memberships').select('status,starts_at,ends_at,freeze_until,membership_plans(name)')
        .eq('member_id', row.id).order('ends_at', { ascending: false }).limit(1).maybeSingle(),
      row.home_branch_id
        ? supabase.from('occupancy_snapshots').select('inside_count,capacity').eq('branch_id', row.home_branch_id)
          .order('captured_at', { ascending: false }).limit(1).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);
    if (planResult.error) setError(planResult.error.message);
    if (occupancyResult.error) setError(occupancyResult.error.message);
    setMembership(planResult.data);
    setOccupancy(occupancyResult.data);
  }

  const occupancyPercent = occupancy?.capacity
    ? Math.max(0, Math.min(100, Math.round((occupancy.inside_count / occupancy.capacity) * 100)))
    : null;

  return <Page><ScrollView contentContainerStyle={{ gap: 15, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
    <Title eyebrow="YOUR CLUB">{member ? `Hi, ${member.first_name}` : 'Welcome to GymOS'}</Title>
    {error ? <Message error>{error}</Message> : null}
    {!member ? <Card>
      <Text style={ui.strong}>Connect your membership</Text>
      <Text style={ui.muted}>Link the member record from your club to see your plan, classes, and digital card.</Text>
      <Link href="/link-member" asChild><Action title="Link membership" onPress={() => {}} /></Link>
    </Card> : <>
      <Card dark>
        <View style={ui.row}>
          <Text style={{ color: colors.lime, fontSize: 10, fontWeight: '800', letterSpacing: 1.2 }}>MEMBER OVERVIEW</Text>
          <View style={{ backgroundColor: 'rgba(200,241,105,0.16)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 }}>
            <Text style={{ color: colors.lime, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>{membership?.status ?? member.status}</Text>
          </View>
        </View>
        <Text style={{ color: 'white', fontSize: 25, fontWeight: '800' }}>{member.first_name} {member.last_name}</Text>
        <Text style={{ color: '#bdcabe', fontSize: 12 }}>Member ID · {member.member_number}</Text>
        <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.14)', marginVertical: 3 }} />
        <Text style={{ color: '#dce6df', fontSize: 12, fontWeight: '600' }}>{membership?.membership_plans?.name ?? 'Your gym plan'}</Text>
        <Text style={{ color: '#aebeb2', fontSize: 11 }}>
          {membership?.status === 'frozen' && membership.freeze_until
            ? `Frozen until ${new Date(membership.freeze_until).toLocaleDateString()}`
            : `Plan ends ${membership?.ends_at ? new Date(membership.ends_at).toLocaleDateString() : '—'}`}
        </Text>
      </Card>

      <Card>
        <View style={ui.row}>
          <View style={{ gap: 4 }}><Text style={ui.label}>CLUB RIGHT NOW</Text><Text style={ui.strong}>Occupancy</Text></View>
          <Text style={{ color: colors.ink, fontSize: 27, fontWeight: '800' }}>{occupancyPercent === null ? '—' : `${occupancyPercent}%`}</Text>
        </View>
        <View style={{ height: 9, borderRadius: 9, backgroundColor: 'rgba(38,64,47,0.1)', overflow: 'hidden' }}>
          <View style={{ height: '100%', width: `${occupancyPercent ?? 0}%`, borderRadius: 9, backgroundColor: colors.accent }} />
        </View>
        <Text style={ui.muted}>{occupancyPercent === null ? 'Live occupancy is not available yet.' : 'Live estimate for your home club'}</Text>
      </Card>

      <Card>
        <View style={ui.row}><Text style={ui.strong}>Ready for your next session?</Text><Text style={{ color: colors.accent, fontSize: 19 }}>✦</Text></View>
        <Text style={ui.muted}>Find a class that fits your day and book your spot.</Text>
        <Link href="/(tabs)/classes" asChild><Action title="Explore classes" secondary onPress={() => {}} /></Link>
      </Card>
    </>}
  </ScrollView></Page>;
}
