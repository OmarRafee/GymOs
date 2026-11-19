import { useEffect, useState } from 'react';
import { Link, router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/lib/session';
import { Action, Card, Message, Page, Title, colors, ui } from '@/lib/ui';

type ProfileMember = { first_name: string; last_name: string; member_number: string };

function MenuRow({ icon, label, detail, href }: { icon: string; label: string; detail: string; href: '/(tabs)/membership' | '/(tabs)/card' | '/(tabs)/classes' | '/link-member' }) {
  return <Link href={href} asChild><Pressable style={styles.menuRow}>
    <View style={styles.menuIcon}><Text style={styles.menuGlyph}>{icon}</Text></View>
    <View style={{ flex: 1, gap: 3 }}><Text style={styles.menuTitle}>{label}</Text><Text style={styles.menuDetail}>{detail}</Text></View>
    <Text style={styles.chevron}>›</Text>
  </Pressable></Link>;
}

export default function Profile() {
  const { session } = useSession();
  const [member, setMember] = useState<ProfileMember | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      if (!supabase || !session) return;
      const { data: link, error: linkError } = await supabase.from('member_user_links')
        .select('member_id').eq('user_id', session.user.id).is('revoked_at', null).maybeSingle();
      if (linkError) { setError(linkError.message); return; }
      if (!link) { setMember(null); return; }
      const { data, error: memberError } = await supabase.from('members')
        .select('first_name,last_name,member_number').eq('id', link.member_id).maybeSingle();
      if (memberError) setError(memberError.message);
      setMember(data);
    }
    void load();
  }, [session?.user.id]);

  async function signOut() {
    await supabase?.auth.signOut();
    router.replace('/login');
  }

  const metadataName = session?.user.user_metadata?.full_name;
  const displayName = member ? `${member.first_name} ${member.last_name}` : (typeof metadataName === 'string' ? metadataName : 'GymOS member');
  const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part: string) => part[0]?.toUpperCase()).join('') || 'G';

  return <Page><ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
    <Title eyebrow="ACCOUNT">Profile</Title>
    {error ? <Message error>{error}</Message> : null}

    <Card dark>
      <View style={styles.identityRow}>
        <View style={styles.avatar}><Text style={styles.initials}>{initials}</Text></View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.email}>{session?.user.email ?? '—'}</Text>
        </View>
        <View style={styles.verified}><Text style={styles.verifiedMark}>✓</Text></View>
      </View>
      <View style={styles.identityDivider} />
      <View style={ui.row}>
        <Text style={styles.memberMeta}>{member ? `MEMBER ID  ${member.member_number}` : 'GYMOS ACCOUNT'}</Text>
        <Text style={styles.memberBadge}>{member ? 'ACTIVE' : 'LINK ACCOUNT'}</Text>
      </View>
    </Card>

    <View style={{ gap: 8 }}>
      <Text style={ui.label}>YOUR GYM</Text>
      <Card>
        <MenuRow icon="▤" label="Plan & history" detail="Membership, freeze, and plan activity" href="/(tabs)/membership" />
        <View style={styles.separator} />
        <MenuRow icon="▣" label="Digital member card" detail="Your secure, refreshing check-in QR" href="/(tabs)/card" />
        <View style={styles.separator} />
        <MenuRow icon="▦" label="Class schedule" detail="Browse and book club sessions" href="/(tabs)/classes" />
      </Card>
    </View>

    <View style={{ gap: 8 }}>
      <Text style={ui.label}>ACCOUNT</Text>
      <Card>
        <MenuRow icon="◎" label="Membership link" detail={member ? 'Your gym account is connected' : 'Connect your club member record'} href="/link-member" />
      </Card>
    </View>

    <Action title="Sign out" onPress={() => void signOut()} secondary />
    <Text style={styles.footer}>GymOS · Your training, all in one place</Text>
  </ScrollView></Page>;
}

const styles = {
  identityRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 },
  avatar: { height: 56, width: 56, borderRadius: 20, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: colors.lime },
  initials: { color: colors.deep, fontSize: 20, fontWeight: '900' as const },
  name: { color: colors.white, fontSize: 17, fontWeight: '800' as const },
  email: { color: '#bdcabe', fontSize: 11 },
  verified: { width: 24, height: 24, alignItems: 'center' as const, justifyContent: 'center' as const, borderRadius: 12, backgroundColor: 'rgba(200,241,105,0.18)' },
  verifiedMark: { color: colors.lime, fontWeight: '900' as const },
  identityDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.13)', marginVertical: 3 },
  memberMeta: { color: '#c6d1c9', fontSize: 9, fontWeight: '800' as const, letterSpacing: 0.6 },
  memberBadge: { color: colors.lime, fontSize: 9, fontWeight: '900' as const, letterSpacing: 0.7 },
  menuRow: { minHeight: 54, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 11 },
  menuIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: 'rgba(200,241,105,0.28)' },
  menuGlyph: { color: colors.deep, fontSize: 17, fontWeight: '800' as const },
  menuTitle: { color: colors.ink, fontSize: 12, fontWeight: '800' as const },
  menuDetail: { color: colors.muted, fontSize: 10 },
  chevron: { color: colors.muted, fontSize: 23, marginRight: 2 },
  separator: { height: 1, backgroundColor: 'rgba(50,75,58,0.08)', marginLeft: 44 },
  footer: { color: colors.muted, fontSize: 10, textAlign: 'center' as const, marginTop: 2 },
};
