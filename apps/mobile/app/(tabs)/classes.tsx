import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, ScrollView, Text, View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Action, Card, Message, Page, Title, colors, ui } from '@/lib/ui';

type ClassItem = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  branches: { name: string } | null;
  trainers: { display_name: string } | null;
};

function ClassCard({ item, index, onBook, busy }: { item: ClassItem; index: number; onBook: (id: string) => void; busy: boolean }) {
  const entrance = useRef(new Animated.Value(0)).current;
  const start = new Date(item.starts_at);
  useEffect(() => {
    Animated.timing(entrance, { toValue: 1, duration: 420, delay: index * 80, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [entrance, index]);

  return <Animated.View style={{ opacity: entrance, transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }}>
    <Card>
      <View style={{ flexDirection: 'row', gap: 13, alignItems: 'center' }}>
        <View style={styles.dateBadge}>
          <Text style={styles.month}>{start.toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}</Text>
          <Text style={styles.day}>{start.getDate()}</Text>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.classTitle}>{item.title}</Text>
          <Text style={ui.muted}>{start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {item.branches?.name ?? 'Your club'}</Text>
        </View>
        <Text style={styles.sparkle}>✦</Text>
      </View>
      <View style={styles.divider} />
      <View style={ui.row}>
        <Text style={ui.muted}>Coach · {item.trainers?.display_name ?? 'GymOS trainer'}</Text>
        <Text style={styles.capacity}>{item.capacity} spots</Text>
      </View>
      <Action title={busy ? 'Booking…' : 'Book a spot'} onPress={() => onBook(item.id)} disabled={busy} />
    </Card>
  </Animated.View>;
}

export default function Classes() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState('');

  useEffect(() => { void load(); }, []);

  async function load() {
    if (!supabase) return;
    const { data, error: loadError } = await supabase.from('classes')
      .select('id,title,starts_at,ends_at,capacity,branches(name),trainers(display_name)')
      .eq('status', 'scheduled').gte('starts_at', new Date().toISOString()).order('starts_at').limit(25);
    if (loadError) setError(loadError.message);
    setClasses((data ?? []) as unknown as ClassItem[]);
  }

  async function book(id: string) {
    if (!supabase) return;
    setBusyId(id); setError(''); setMessage('');
    const { error: bookingError } = await supabase.rpc('book_class', { p_class_id: id });
    if (bookingError) setError(bookingError.message);
    else setMessage('You’re booked. See you in class!');
    await load(); setBusyId('');
  }

  return <Page><ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
    <Title eyebrow="MOVE WITH US">Classes</Title>
    <Text style={ui.muted}>Find your next favorite session.</Text>
    {error ? <Message error>{error}</Message> : null}
    {message ? <Message>{message}</Message> : null}
    {classes.length ? classes.map((item, index) => <ClassCard key={item.id} item={item} index={index} onBook={id => void book(id)} busy={busyId === item.id} />)
      : <Card><Text style={ui.strong}>No upcoming classes yet</Text><Text style={ui.muted}>Your club’s next sessions will show up here.</Text></Card>}
  </ScrollView></Page>;
}

const styles = {
  dateBadge: { width: 51, height: 58, borderRadius: 15, backgroundColor: 'rgba(200,241,105,0.42)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', alignItems: 'center' as const, justifyContent: 'center' as const, gap: 1 },
  month: { color: colors.accent, fontSize: 9, fontWeight: '900' as const, letterSpacing: 0.8 },
  day: { color: colors.ink, fontSize: 20, fontWeight: '900' as const },
  classTitle: { color: colors.ink, fontSize: 15, fontWeight: '800' as const },
  sparkle: { color: colors.accent, fontSize: 19 },
  divider: { height: 1, backgroundColor: 'rgba(50,75,58,0.09)' },
  capacity: { color: colors.accent, fontSize: 10, fontWeight: '800' as const },
};
