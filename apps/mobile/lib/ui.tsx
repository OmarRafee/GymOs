import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export const colors = {
  ink: '#192820',
  muted: '#74847a',
  line: 'rgba(255,255,255,0.82)',
  canvas: '#eaf1ed',
  lime: '#c8f169',
  deep: '#14251b',
  white: '#ffffff',
  glass: 'rgba(255,255,255,0.72)',
  accent: '#527b60',
};

export function Page({ children }: { children: React.ReactNode }) {
  return <View style={styles.page}>
    <View pointerEvents="none" style={styles.glowTop} />
    <View pointerEvents="none" style={styles.glowBottom} />
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
      placeholder={placeholder} placeholderTextColor="#9aa89f" secureTextEntry={secureTextEntry}
      autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'} keyboardType={keyboardType} />
  </View>;
}

export function Message({ children, error = false }: { children: React.ReactNode; error?: boolean }) {
  return <Text style={[styles.message, error && styles.error]}>{children}</Text>;
}

export function Loading() {
  return <View style={styles.loading}><ActivityIndicator color={colors.deep} /><Text style={styles.loadingText}>Loading GymOS…</Text></View>;
}

export const ui = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  muted: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  strong: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  stat: { color: colors.ink, fontSize: 24, fontWeight: '800' },
  label: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 0.7 },
});

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.canvas, paddingHorizontal: 18, paddingTop: 12 },
  content: { flex: 1, zIndex: 1 },
  glowTop: { position: 'absolute', top: -100, right: -78, width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(200,241,105,0.32)' },
  glowBottom: { position: 'absolute', bottom: 25, left: -110, width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(119,177,144,0.18)' },
  title: { gap: 5, marginTop: 8, marginBottom: 4 },
  eyebrow: { fontSize: 10, letterSpacing: 1.5, color: colors.accent, fontWeight: '800' },
  titleText: { color: colors.ink, fontSize: 27, lineHeight: 34, fontWeight: '800' },
  card: { backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 17, gap: 10, shadowColor: '#284233', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  darkCard: { backgroundColor: 'rgba(20,37,27,0.94)', borderColor: 'rgba(255,255,255,0.18)' },
  action: { minHeight: 46, borderRadius: 14, backgroundColor: colors.deep, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  actionText: { color: colors.white, fontSize: 13, fontWeight: '800' },
  secondary: { backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)' },
  secondaryText: { color: colors.ink },
  disabled: { opacity: 0.55 },
  pressed: { transform: [{ scale: 0.985 }], opacity: 0.9 },
  field: { gap: 7 },
  label: { fontSize: 11, color: '#58675e', fontWeight: '700' },
  input: { height: 48, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.76)', borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, fontSize: 14, color: colors.ink },
  message: { padding: 12, borderRadius: 13, backgroundColor: 'rgba(239,247,231,0.88)', color: '#486b36', fontSize: 11, lineHeight: 16 },
  error: { backgroundColor: 'rgba(255,240,237,0.92)', color: '#a24439' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: colors.canvas },
  loadingText: { color: colors.muted, fontSize: 12 },
});
