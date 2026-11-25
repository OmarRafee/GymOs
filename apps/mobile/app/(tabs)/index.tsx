import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
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
    if (!link) { setMember(null); setMembership(null); setOccupancy(null); return; }

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
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';
  const expiry = membership?.ends_at ? new Date(membership.ends_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not available';

  return <Page><ScrollView contentContainerStyle={{ gap: 13, paddingBottom: 112 }} showsVerticalScrollIndicator={false}>
    <View style={styles.topbar}>
      <Text style={styles.brand}>GYM<Text style={{ color: colors.lime }}>OS</Text></Text>
      <View style={styles.avatar}><Text style={styles.avatarText}>{member ? member.first_name.slice(0, 1).toUpperCase() : 'G'}</Text></View>
    </View>
    <Text style={ui.muted}>YOUR TRAINING STARTS HERE</Text>
    <Title>{member ? `${greeting}, ${member.first_name}` : 'Welcome to GymOS'}</Title>
    {error ? <Message error>{error}</Message> : null}

    {!member ? <Card>
      <Text style={ui.strong}>Connect your membership</Text>
      <Text style={ui.muted}>Link your club account to see your membership, occupancy and member services.</Text>
      <Link href="/link-member" asChild><Action title="Link membership" onPress={() => {}} /></Link>
    </Card> : <>
      <Card dark>
        <View style={ui.row}>
          <Text style={ui.label}>YOUR GYM RIGHT NOW</Text>
          <Text style={styles.openStatus}>● LIVE</Text>
        </View>
        <Text style={styles.bigNumber}>{occupancy?.inside_count ?? '—'} <Text style={styles.capacityText}>/ {occupancy?.capacity ?? '—'} members</Text></Text>
        <View style={styles.meter}><View style={[styles.meterFill, { width: `${occupancyPercent ?? 0}%` }]} /></View>
        <View style={ui.row}>
          <Text style={ui.muted}>{occupancyPercent === null ? 'Live occupancy is not available yet' : 'Current club occupancy'}</Text>
          <Text style={styles.limeText}>{occupancyPercent === null ? '—' : `${occupancyPercent}% busy`}</Text>
        </View>
      </Card>

      <View style={styles.grid}>
        <Card>
          <Text style={ui.label}>MEMBERSHIP</Text>
          <Text style={styles.statValue}>{membership?.status ?? member.status ?? '—'}</Text>
          <Text style={ui.muted}>Ends {expiry}</Text>
        </Card>
        <Card>
          <Text style={ui.label}>MEMBER ID</Text>
          <Text style={styles.statValue}>#{member.member_number}</Text>
          <Text style={ui.muted}>Your club account</Text>
        </Card>
      </View>

      <View style={ui.row}><Text style={styles.sectionTitle}>QUICK ACCESS</Text><Text style={styles.limeText}>MEMBER SERVICES</Text></View>
      <View style={styles.grid}>
        <Link href="/(tabs)/card" asChild><Pressable style={styles.quickTile}><Text style={styles.quickIcon}>▣</Text><Text style={styles.quickTitle}>Digital pass</Text><Text style={ui.muted}>Your member QR card</Text></View></Link>
        <Link href="/inbody" asChild><View style={styles.quickTile}><Text style={styles.quickIcon}>◉</Text><Text style={styles.quickTitle}>Body progress</Text><Text style={ui.muted}>InBody measurements</Text></View></Link>
      </View>

      <View style={ui.row}><Text style={styles.sectionTitle}>UP NEXT</Text></View>
      <Card>
        <View style={ui.row}><View style={styles.classIcon}><Text style={styles.quickIcon}>▦</Text></View><View style={{ flex: 1, gap: 4 }}><Text style={ui.strong}>Explore gym classes</Text><Text style={ui.muted}>Browse sessions and reserve your spot</Text></View></View>
        <Link href="/(tabs)/classes" asChild><Action title="Explore classes" onPress={() => {}} secondary /></Link>
      </Card>
    </>}
    <Text style={styles.footer}>GYMOS · TRAIN WITH PURPOSE</Text>
  </ScrollView></Page>;
}

const styles = {
  topbar: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, marginTop: 4, marginBottom: 4 },
  brand: { color: colors.white, fontSize: 21, fontWeight: '900' as const, letterSpacing: -0.8 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#263a4b', alignItems: 'center' as const, justifyContent: 'center' as const, borderWidth: 1, borderColor: '#3a5061' },
  avatarText: { color: colors.lime, fontSize: 15, fontWeight: '900' as const },
  openStatus: { color: colors.lime, fontSize: 10, fontWeight: '900' as const },
  bigNumber: { color: colors.white, fontSize: 38, fontWeight: '900' as const, letterSpacing: -1.5 },
  capacityText: { color: colors.muted, fontSize: 14, fontWeight: '600' as const, letterSpacing: 0 },
  meter: { height: 8, backgroundColor: '#293746', borderRadius: 10, overflow: 'hidden' as const },
  meterFill: { height: '100%' as const, borderRadius: 10, backgroundColor: colors.lime },
  limeText: { color: colors.lime, fontSize: 11, fontWeight: '800' as const },
  grid: { flexDirection: 'row' as const, gap: 11 },
  statValue: { color: colors.white, fontSize: 21, fontWeight: '900' as const, textTransform: 'capitalize' as const },
  sectionTitle: { color: colors.white, fontSize: 14, fontWeight: '900' as const, letterSpacing: 0.3 },
  quickTile: { flex: 1, minHeight: 118, backgroundColor: colors.deep, borderWidth: 1, borderColor: '#263545', borderRadius: 19, padding: 15, gap: 6 },
  quickIcon: { color: colors.lime, fontSize: 23, fontWeight: '800' as const },
  quickTitle: { color: colors.white, fontSize: 13, fontWeight: '900' as const },
  classIcon: { width: 43, height: 43, borderRadius: 14, backgroundColor: '#253747', alignItems: 'center' as const, justifyContent: 'center' as const },
  footer: { color: '#718398', fontSize: 9, fontWeight: '800' as const, letterSpacing: 1.4, textAlign: 'center' as const, marginTop: 8 },
};
