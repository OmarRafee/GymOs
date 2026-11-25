import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export const colors = {
  ink: '#17251d',
  muted: '#718078',
  line: 'rgba(255,255,255,0.72)',
  canvas: '#e8f0eb',
  lime: '#d4f477',
  deep: '#14251b',
  white: '#ffffff',
  glass: 'rgba(255,255,255,0.62)',
  accent: '#527b60',
  mint: '#b9d8c4',
};

export function Page({ children }: { children: React.ReactNode }) {
  return <View style={styles.page}>
    <View pointerEvents="none" style={styles.ambientTop} />
    <View pointerEvents="none" style={styles.ambientLeft} />
    <View pointerEvents="none" style={styles.ambientBottom} />
    <View pointerEvents="none" style={styles.highlight} />
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
  return <View style={[styles.card, dark && styles.darkCard]}>
    <View pointerEvents="none" style={[styles.cardSheen, dark && styles.darkSheen]} />
    {children}
  </View>;
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
  page: { flex: 1, backgroundColor: colors.canvas, paddingHorizontal: 18, paddingTop: 12, overflow: 'hidden' },
  content: { flex: 1, zIndex: 1 },
  ambientTop: { position: 'absolute', top: -125, right: -75, width: 310, height: 310, borderRadius: 155, backgroundColor: '#d5ed9e', opacity: 0.72 },
  ambientLeft: { position: 'absolute', top: '34%', left: -150, width: 300, height: 300, borderRadius: 150, backgroundColor: '#c0ded0', opacity: 0.64 },
  ambientBottom: { position: 'absolute', bottom: -155, right: -70, width: 340, height: 340, borderRadius: 170, backgroundColor: '#c5d9c9', opacity: 0.58 },
  highlight: { position: 'absolute', top: 0, left: 0, right: 0, height: 170, backgroundColor: 'rgba(255,255,255,0.20)' },
  title: { gap: 5, marginTop: 8, marginBottom: 4 },
  eyebrow: { fontSize: 10, letterSpacing: 1.7, color: colors.accent, fontWeight: '900' },
  titleText: { color: colors.ink, fontSize: 28, lineHeight: 35, fontWeight: '900', letterSpacing: -0.6 },
  card: { position: 'relative', overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.58)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.82)', borderRadius: 23, padding: 17, gap: 11, shadowColor: '#284233', shadowOpacity: 0.09, shadowRadius: 22, shadowOffset: { width: 0, height: 9 }, elevation: 4 },
  cardSheen: { position: 'absolute', top: 0, left: 14, right: 14, height: 1, backgroundColor: 'rgba(255,255,255,0.95)' },
  darkCard: { backgroundColor: 'rgba(19,39,27,0.94)', borderColor: 'rgba(255,255,255,0.22)', shadowColor: '#0c1c12', shadowOpacity: 0.18 },
  darkSheen: { backgroundColor: 'rgba(255,255,255,0.28)' },
  action: { minHeight: 48, borderRadius: 16, backgroundColor: colors.deep, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, shadowColor: colors.deep, shadowOpacity: 0.14, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  actionText: { color: colors.white, fontSize: 13, fontWeight: '900', letterSpacing: 0.2 },
  secondary: { backgroundColor: 'rgba(255,255,255,0.62)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)', shadowOpacity: 0.04 },
  secondaryText: { color: colors.ink },
  disabled: { opacity: 0.5 },
  pressed: { transform: [{ scale: 0.985 }], opacity: 0.9 },
  field: { gap: 7 },
  label: { fontSize: 11, color: '#58675e', fontWeight: '800' },
  input: { height: 50, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.72)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 15, fontSize: 14, color: colors.ink },
  message: { padding: 13, borderRadius: 15, backgroundColor: 'rgba(239,247,231,0.88)', color: '#486b36', fontSize: 11, lineHeight: 17, overflow: 'hidden' },
  error: { backgroundColor: 'rgba(255,240,237,0.94)', color: '#a24439' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: colors.canvas },
  loadingText: { color: colors.muted, fontSize: 12 },
});
