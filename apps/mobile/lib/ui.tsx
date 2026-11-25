import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export const colors = {
  ink: '#f4f7fb',
  muted: '#91a2b5',
  line: '#263545',
  canvas: '#080d14',
  lime: '#c8f169',
  deep: '#111a25',
  white: '#ffffff',
  glass: '#172331',
  accent: '#c8f169',
  mint: '#72b7ff',
};

export function Page({ children }: { children: React.ReactNode }) {
  return <View style={styles.page}>
    <View pointerEvents="none" style={styles.ambientTop} />
    <View pointerEvents="none" style={styles.ambientLeft} />
    <View pointerEvents="none" style={styles.ambientBottom} />
    <View style={styles.content}>{children}</View>
  </View>;
}

export function Title({ eyebrow, children }: { eyebrow?: string; children: React.ReactNode }) {
  return <View style={styles.title}>
    {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
    <Text style={styles.titleText}>{children}</Text>
  </View>;
}

export function Card({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return <View style={[styles.card, dark && styles.darkCard]}>{children}</View>;
}

export function Action({ title, onPress, secondary = false, disabled = false }: {
  title: string; onPress: () => void; secondary?: boolean; disabled?: boolean;
}) {
  return <Pressable disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.action, secondary && styles.secondary, disabled && styles.disabled, pressed && !disabled && styles.pressed]}>
    <Text style={[styles.actionText, secondary && styles.secondaryText]}>{title}</Text>
  </Pressable>;
}

export function Field({ label, value, onChangeText, placeholder, secureTextEntry = false, keyboardType = 'default' }: {
  label: string; value: string; onChangeText: (value: string) => void; placeholder?: string;
  secureTextEntry?: boolean; keyboardType?: 'default' | 'email-address' | 'number-pad';
}) {
  return <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <TextInput accessibilityLabel={label} style={styles.input} value={value} onChangeText={onChangeText}
      placeholder={placeholder} placeholderTextColor="#718398" secureTextEntry={secureTextEntry}
      autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'} keyboardType={keyboardType} />
  </View>;
}

export function Message({ children, error = false }: { children: React.ReactNode; error?: boolean }) {
  return <Text style={[styles.message, error && styles.error]}>{children}</Text>;
}

export function Loading() {
  return <View style={styles.loading}><ActivityIndicator color={colors.lime} /><Text style={styles.loadingText}>Loading GymOS…</Text></View>;
}

export const ui = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  muted: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  strong: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  stat: { color: colors.ink, fontSize: 24, fontWeight: '800' },
  label: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 0.9 },
});

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.canvas, paddingHorizontal: 18, paddingTop: 12, overflow: 'hidden' },
  content: { flex: 1, zIndex: 1 },
  ambientTop: { position: 'absolute', top: -160, right: -90, width: 340, height: 340, borderRadius: 170, backgroundColor: '#1d3344', opacity: 0.58 },
  ambientLeft: { position: 'absolute', top: '38%', left: -180, width: 300, height: 300, borderRadius: 150, backgroundColor: '#142535', opacity: 0.48 },
  ambientBottom: { position: 'absolute', bottom: -190, right: -90, width: 340, height: 340, borderRadius: 170, backgroundColor: '#1b2b25', opacity: 0.42 },
  title: { gap: 5, marginTop: 8, marginBottom: 4 },
  eyebrow: { fontSize: 10, letterSpacing: 1.7, color: colors.lime, fontWeight: '900' },
  titleText: { color: colors.ink, fontSize: 28, lineHeight: 35, fontWeight: '900', letterSpacing: -0.6 },
  card: { backgroundColor: colors.deep, borderWidth: 1, borderColor: colors.line, borderRadius: 22, padding: 17, gap: 11, shadowColor: '#000000', shadowOpacity: 0.2, shadowRadius: 20, shadowOffset: { width: 0, height: 9 }, elevation: 4 },
  darkCard: { backgroundColor: '#172534', borderColor: '#35495a' },
  action: { minHeight: 48, borderRadius: 15, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  actionText: { color: '#101820', fontSize: 13, fontWeight: '900', letterSpacing: 0.2 },
  secondary: { backgroundColor: '#172331', borderWidth: 1, borderColor: colors.line },
  secondaryText: { color: colors.ink },
  disabled: { opacity: 0.5 },
  pressed: { transform: [{ scale: 0.985 }], opacity: 0.9 },
  field: { gap: 7 },
  label: { fontSize: 11, color: colors.muted, fontWeight: '800' },
  input: { height: 50, borderRadius: 15, backgroundColor: '#111a25', borderWidth: 1, borderColor: colors.line, paddingHorizontal: 15, fontSize: 14, color: colors.ink },
  message: { padding: 13, borderRadius: 15, backgroundColor: '#26391f', color: colors.lime, fontSize: 11, lineHeight: 17, overflow: 'hidden' },
  error: { backgroundColor: '#3b2527', color: '#ffaaa2' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: colors.deep, minHeight: 110, borderRadius: 16 },
  loadingText: { color: colors.muted, fontSize: 12 },
});
