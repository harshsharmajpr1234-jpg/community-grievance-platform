import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";

export const colors = { blue: "#1d4ed8", blueDark: "#1e3a8a", green: "#16a34a", bg: "#f8fafc", text: "#0f172a", muted: "#64748b", border: "#e2e8f0", white: "#ffffff", red: "#dc2626", amber: "#d97706" };

export const STATUS_COLORS: Record<string, string> = { SUBMITTED: "#0284c7", VERIFIED: "#4f46e5", ASSIGNED: "#7c3aed", FORWARDED: "#0891b2", IN_PROGRESS: "#d97706", ACTION_TAKEN: "#65a30d", RESOLVED: "#16a34a", REJECTED: "#e11d48", DUPLICATE: "#64748b", NEEDS_INFORMATION: "#ea580c", CLOSED: "#334155" };

export function Button({ title, onPress, kind = "primary", disabled, loading }: { title: string; onPress: () => void; kind?: "primary" | "secondary" | "danger"; disabled?: boolean; loading?: boolean }) {
  const bg = kind === "primary" ? colors.blue : kind === "danger" ? colors.red : colors.white;
  const fg = kind === "secondary" ? colors.blue : colors.white;
  return (
    <Pressable accessibilityRole="button" disabled={disabled || loading} onPress={onPress} style={[s.btn, { backgroundColor: bg, borderColor: kind === "secondary" ? colors.blue : bg, opacity: disabled ? 0.6 : 1 }]}>
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[s.btnText, { color: fg }]}>{title}</Text>}
    </Pressable>
  );
}

export function Input(props: TextInputProps & { label?: string }) {
  return (
    <View style={{ marginBottom: 12 }}>
      {props.label && <Text style={s.label}>{props.label}</Text>}
      <TextInput placeholderTextColor={colors.muted} {...props} style={[s.input, props.multiline && { minHeight: 100, textAlignVertical: "top" }, props.style]} />
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Badge({ text, color = colors.blue }: { text: string; color?: string }) {
  return (
    <View style={{ backgroundColor: `${color}22`, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, alignSelf: "flex-start" }}>
      <Text style={{ color, fontSize: 12, fontWeight: "700" }}>{text}</Text>
    </View>
  );
}

export function Title({ children }: { children: React.ReactNode }) {
  return <Text style={s.title}>{children}</Text>;
}
export function Muted({ children }: { children: React.ReactNode }) {
  return <Text style={{ color: colors.muted, fontSize: 13 }}>{children}</Text>;
}
export function ErrorText({ children }: { children?: string | null }) {
  return children ? <Text style={{ color: colors.red, marginBottom: 10 }}>{children}</Text> : null;
}
export function Loading() {
  return <ActivityIndicator style={{ marginTop: 40 }} color={colors.blue} size="large" />;
}

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  btn: { minHeight: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, borderWidth: 1, marginVertical: 6 },
  btnText: { fontSize: 16, fontWeight: "700" },
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, backgroundColor: colors.white, fontSize: 16, color: colors.text },
  label: { fontSize: 14, fontWeight: "600", color: "#334155", marginBottom: 6 },
  card: { backgroundColor: colors.white, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: "800", color: colors.text, marginBottom: 8 },
});
