import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/lib/session';
import { Card, Message, Page, Title, colors, ui } from '@/lib/ui';

type Measurement = { id: string; measured_at: string; weight_kg: number | null; body_fat_percent: number | null; muscle_mass_kg: number | null; source: string };
function Metric({ label, value, unit }: { label: string; value: number | null; unit: string }) {
  return <View style={{ flex: 1, gap: 4 }}><Text style={ui.label}>{label}</Text><Text style={{ color: colors.ink, fontSize: 21, fontWeight: '900' }}>{value == null ? '—' : Number(value).toFixed(1)}<Text style={{ fontSize: 10, fontWeight: '700' }}> {unit}</Text></Text></View>;
}
export default function InBody() {
  const { session } = useSession(); const [rows, setRows] = useState<Measurement[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  useEffect(() => { let active = true; async function load() {
    if (!supabase || !session) { setLoading(false); return; }
    const { data: link, error: linkError } = await supabase.from('member_user_links').select('member_id').eq('user_id', session.user.id).is('revoked_at', null).maybeSingle();
    if (linkError) { if (active) { setError(linkError.message); setLoading(false); } return; }
    if (!link) { if (active) setLoading(false); return; }
    const { data, error: queryError } = await supabase.from('inbody_measurements').select('id,measured_at,weight_kg,body_fat_percent,muscle_mass_kg,source').eq('member_id', link.member_id).eq('member_visible', true).order('measured_at', { ascending: false }).limit(50);
    if (active) { if (queryError) setError(queryError.message); setRows((data ?? []) as Measurement[]); setLoading(false); }
  } void load(); return () => { active = false; }; }, [session?.user.id]);
  return <Page><ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
    <Title eyebrow="YOUR PROGRESS">InBody results</Title><Text style={ui.muted}>Body-composition measurements shared with you by your gym team.</Text>
    {error ? <Message error>{error}</Message> : null}
    {loading ? <Card><Text style={ui.muted}>Loading your results…</Text></Card> : rows.length ? rows.map(row => <Card key={row.id}>
      <View style={ui.row}><Text style={ui.strong}>{new Date(row.measured_at).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</Text><Text style={{ color: colors.accent, fontSize: 9, fontWeight: '900' }}>{row.source === 'inbody_import' ? 'INBODY' : 'MANUAL'}</Text></View>
      <View style={{ flexDirection: 'row', gap: 12 }}><Metric label="WEIGHT" value={row.weight_kg} unit="kg" /><Metric label="BODY FAT" value={row.body_fat_percent} unit="%" /><Metric label="MUSCLE" value={row.muscle_mass_kg} unit="kg" /></View>
    </Card>) : <Card><Text style={ui.strong}>No shared measurements yet</Text><Text style={ui.muted}>When your gym uploads or enters an InBody result and makes it visible to you, it will appear here.</Text></Card>}
  </ScrollView></Page>;
}
