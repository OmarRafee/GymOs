import { useEffect, useState } from 'react';
import { Link, router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/lib/session';
import { Action, Card, Loading, Message, Page, Title, colors, ui } from '@/lib/ui';

type ProfileMember = {
  first_name: string;
  last_name: string;
  member_number: string;
  status?: string;
};

function MenuRow({ icon, label, detail, href }: {
  icon: string;
  label: string;
  detail: string;
  href: '/(tabs)/membership' | '/(tabs)/card' | '/(tabs)/classes' | '/link-member';
}) {
  return <Link href={href} asChild>
    <Pressable style={({ pressed }) => [styles.menuRow, pressed && { opacity: 0.68 }]}>
      <View style={styles.menuIcon}><Text style={styles.menuGlyph}>{icon}</Text></View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.menuTitle}>{label}</Text>
        <Text style={styles.menuDetail}>{detail}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  </Link>;
}

export default function Profile() {
  const { session } = useSession();
  const [member, setMember] = useState<ProfileMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!supabase || !session) { setLoading(false); return; }
      setLoading(true);
      setError('');
      const { data: link, error: linkError } = await supabase.from('member_user_links')
        .select('member_id').eq('user_id', session.user.id).is('revoked_at', null).maybeSingle();
      if (linkError) {
        if (alive) { setError(linkError.message); setLoading(false); }
        return;
      }
      if (!link) {
        if (alive) { setMember(null); setLoading(false); }
        return;
      }
      const { data, error: memberError } = await supabase.from('members')
        .select('first_name,last_name,member_number,status').eq('id', link.member_id).maybeSingle();
      if (alive) {
        if (memberError) setError(memberError.message);
        setMember(data);
        setLoading(false);
      }
    }
    void load();
    return () => { alive = false; };
  }, [session?.user.id]);

  async function signOut() {
    await supabase?.auth.signOut();
    router.replace('/login');
  }

  const metadataName = session?.user.user_metadata?.full_name;
  const displayName = member
    ? `${member.first_name} ${member.last_name}`
    : (typeof metadataName === 'string' ? metadataName : 'GymOS member');
  const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2)
    .map((part: string) => part[0]?.toUpperCase()).join('') || 'G';

  return <Page>
    <ScrollView contentContainerStyle={{ gap: 15, paddingBottom: 112 }} showsVerticalScrollIndicator={false}>
      <Title eyebrow="YOUR ACCOUNT">Profile</Title>
      {error ? <Message error>{error}</Message> : null}
      {loading ? <Card><Loading /></Card> : <>
        <Card dark>
          <View style={styles.identityRow}>
            <View style={styles.avatar}><Text style={styles.initials}>{initials}</Text></View>
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={styles.name}>{displayName}</Text>
              <Text style={styles.email}>{session?.user.email ?? '—'}</Text>
            </View>
            <View style={styles.verified}><Text style={styles.verifiedMark}>✓</Text></View>
          </View>
          <View style={styles.identityDivider} />
          <View style={ui.row}>
            <View style={{ gap: 4 }}>
              <Text style={styles.metaLabel}>GYM MEMBERSHIP</Text>
              <Text style={styles.memberMeta}>{member ? `MEMBER ID · ${member.member_number}` : 'NO GYM ACCOUNT LINKED'}</Text>
            </View>
            <View style={[styles.memberBadgeWrap, !member && styles.pendingBadge]}>
              <Text style={[styles.memberBadge, !member && styles.pendingText]}>{member ? (member.status ?? 'LINKED').toUpperCase() : 'PENDING'}</Text>
            </View>
          </View>
        </Card>

        <View style={{ gap: 9 }}>
          <Text style={ui.label}>YOUR GYM</Text>
          <Card>
            <MenuRow icon="▤" label="Plan & history" detail="Membership details, freeze and resume" href="/(tabs)/membership" />
            <View style={styles.separator} />
            <MenuRow icon="▣" label="Digital member card" detail="Your secure, refreshing check-in QR" href="/(tabs)/card" />
            <View style={styles.separator} />
            <MenuRow icon="▦" label="Class schedule" detail="Browse and book club sessions" href="/(tabs)/classes" />
          </Card>
        </View>

        <View style={{ gap: 9 }}>
          <Text style={ui.label}>ACCOUNT & PRIVACY</Text>
          <Card>
            <MenuRow icon="◎" label="Gym account connection" detail={member ? 'Your club member record is connected' : 'Link an existing club membership'} href="/link-member" />
          </Card>
        </View>

        <Card>
          <View style={{ gap: 5 }}>
            <Text style={styles.securityTitle}>Your account, your data</Text>
            <Text style={ui.muted}>GymOS only displays membership information connected to your signed-in account.</Text>
          </View>
        </Card>
        <Action title="Sign out" onPress={() => void signOut()} secondary />
        <Text style={styles.footer}>GYMOS  ·  TRAIN WITH PURPOSE</Text>
      </>}
    </ScrollView>
  </Page>;
}

const styles = {
  identityRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 13 },
  avatar: { height: 58, width: 58, borderRadius: 21, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: colors.lime, borderWidth: 3, borderColor: 'rgba(255,255,255,0.22)' },
  initials: { color: colors.deep, fontSize: 20, fontWeight: '900' as const },
  name: { color: colors.white, fontSize: 18, fontWeight: '900' as const, letterSpacing: -0.2 },
  email: { color: '#c3d1c7', fontSize: 11 },
  verified: { width: 27, height: 27, alignItems: 'center' as const, justifyContent: 'center' as const, borderRadius: 14, backgroundColor: 'rgba(212,244,119,0.17)', borderWidth: 1, borderColor: 'rgba(212,244,119,0.3)' },
  verifiedMark: { color: colors.lime, fontWeight: '900' as const, fontSize: 13 },
  identityDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: 2 },
  metaLabel: { color: '#aebeb3', fontSize: 8, fontWeight: '900' as const, letterSpacing: 1.1 },
  memberMeta: { color: '#e2ebe5', fontSize: 10, fontWeight: '800' as const, letterSpacing: 0.45 },
  memberBadgeWrap: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: 'rgba(212,244,119,0.16)' },
  memberBadge: { color: colors.lime, fontSize: 9, fontWeight: '900' as const, letterSpacing: 0.7 },
  pendingBadge: { backgroundColor: 'rgba(255,255,255,0.10)' },
  pendingText: { color: '#d6dfd9' },
  menuRow: { minHeight: 62, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 },
  menuIcon: { width: 38, height: 38, borderRadius: 14, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: 'rgba(200,232,205,0.52)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)' },
  menuGlyph: { color: colors.deep, fontSize: 18, fontWeight: '900' as const },
  menuTitle: { color: colors.ink, fontSize: 12, fontWeight: '900' as const },
  menuDetail: { color: colors.muted, fontSize: 10, lineHeight: 14 },
  chevron: { color: '#819188', fontSize: 25, marginRight: 3 },
  separator: { height: 1, backgroundColor: 'rgba(50,75,58,0.09)', marginLeft: 50 },
  securityTitle: { color: colors.ink, fontSize: 12, fontWeight: '900' as const },
  footer: { color: '#809086', fontSize: 9, fontWeight: '800' as const, letterSpacing: 1.4, textAlign: 'center' as const, marginTop: 1 },
};
