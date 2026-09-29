import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { api } from "../api/client";
import { L, useAuth, type User } from "../context/auth";
import { Button, Card, ErrorText, Input, Muted, Title, colors, s } from "../ui";

export function SplashScreen({ navigation }: { navigation: any }) {
  const { loading, user } = useAuth();
  useEffect(() => {
    if (!loading) navigation.replace(user ? "Tabs" : "Onboarding");
  }, [loading, user, navigation]);
  return (
    <View style={{ flex: 1, backgroundColor: colors.blue, alignItems: "center", justifyContent: "center", padding: 24 }}>
      <Text style={{ color: "#fff", fontSize: 26, fontWeight: "800", textAlign: "center" }}>Jan Samasya Nivaran Manch</Text>
      <Text style={{ color: "#bfdbfe", marginTop: 8, fontSize: 16, textAlign: "center" }}>एक क्षेत्र — एक मंच — जनहित की आवाज़</Text>
    </View>
  );
}

export function OnboardingScreen({ navigation }: { navigation: any }) {
  const { lang } = useAuth();
  const steps = [
    ["📝", L(lang, "जनसमस्या दर्ज करें", "Register public issues"), L(lang, "फोटो और स्थान के साथ स्थानीय समस्याएँ दर्ज करें।", "Report local problems with photos and location.")],
    ["🔎", L(lang, "स्थिति ट्रैक करें", "Track status"), L(lang, "हर चरण दिनांक व समय के साथ पारदर्शी।", "Every step is transparent with date and time.")],
    ["📢", L(lang, "सूचनाएँ व सेवाएँ", "Notices & services"), L(lang, "सत्यापित सूचनाएँ, विकास कार्य और सरकारी सेवाएँ।", "Verified notices, development works and public services.")],
  ];
  return (
    <ScrollView contentContainerStyle={[s.screen, { justifyContent: "center" }]}>
      {steps.map(([t, d, icon]) => (
        <Card key={t}>
          <Text style={{ fontSize: 28 }}>{icon}</Text>
          <Text style={{ fontSize: 18, fontWeight: "700", marginTop: 6 }}>{t}</Text>
          <Muted>{d}</Muted>
        </Card>
      ))}
      <Button title={L(lang, "रजिस्टर / लॉगिन", "Register / Login")} onPress={() => navigation.navigate("Login")} />
      <Button title={L(lang, "बिना लॉगिन देखें", "Browse without login")} kind="secondary" onPress={() => navigation.replace("Tabs")} />
    </ScrollView>
  );
}

export function LoginScreen({ navigation }: { navigation: any }) {
  const { lang, login } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ token: string; user: User }>("/api/auth/login", { method: "POST", json: { identifier, password } });
      await login(r.token, r.user);
      navigation.reset({ index: 0, routes: [{ name: "Tabs" }] });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <ScrollView contentContainerStyle={s.screen}>
      <Title>{L(lang, "लॉगिन", "Login")}</Title>
      <ErrorText>{error}</ErrorText>
      <Input label={L(lang, "मोबाइल नंबर या ईमेल", "Mobile number or email")} autoCapitalize="none" value={identifier} onChangeText={setIdentifier} placeholder="98XXXXXXXX" />
      <Input label={L(lang, "पासवर्ड", "Password")} secureTextEntry value={password} onChangeText={setPassword} />
      <Button title={L(lang, "लॉगिन करें", "Login")} onPress={submit} loading={busy} disabled={!identifier || !password} />
      <Button title={L(lang, "नया खाता बनाएँ", "Create new account")} kind="secondary" onPress={() => navigation.navigate("Register")} />
      <Muted>{L(lang, "पासवर्ड भूल गए? वेबसाइट पर 'पासवर्ड भूल गए?' से रीसेट करें।", "Forgot password? Reset it via 'Forgot password?' on the website.")}</Muted>
    </ScrollView>
  );
}

type Area = { id: string; name: string; nameHi: string | null; type: string };

export function RegisterScreen({ navigation }: { navigation: any }) {
  const { lang } = useAuth();
  const [areas, setAreas] = useState<Area[]>([]);
  const [form, setForm] = useState({ name: "", mobile: "", email: "", password: "", confirmPassword: "", areaId: "", address: "" });
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  useEffect(() => {
    api<{ areas: Area[] }>("/api/meta")
      .then((m) => setAreas(m.areas.filter((a) => a.type === "LOCALITY" || a.type === "STREET")))
      .catch(() => {});
  }, []);
  const set = (k: keyof typeof form, v: string) => setForm({ ...form, [k]: v });
  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/register", { method: "POST", json: { ...form, email: form.email || undefined, address: form.address || undefined, acceptTerms: true } });
      setDone(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (done) {
    return (
      <View style={s.screen}>
        <Card>
          <Text style={{ fontSize: 20, fontWeight: "800" }}>{L(lang, "पंजीकरण सफल हुआ। कृपया लॉगिन करें।", "Registration successful. Please login.")}</Text>
          <Button title={L(lang, "लॉगिन करें", "Login")} onPress={() => navigation.replace("Login")} />
        </Card>
      </View>
    );
  }
  const localities = areas;
  return (
    <ScrollView contentContainerStyle={s.screen}>
      <Title>{L(lang, "पंजीकरण करें", "Register")}</Title>
      <ErrorText>{error}</ErrorText>
      <Input label={L(lang, "पूरा नाम", "Full name")} value={form.name} onChangeText={(t) => set("name", t)} />
      <Input label={L(lang, "मोबाइल नंबर", "Mobile number")} keyboardType="number-pad" maxLength={10} value={form.mobile} onChangeText={(t) => set("mobile", t.replace(/\D/g, ""))} />
      <Input label={L(lang, "ईमेल (वैकल्पिक)", "Email (optional)")} autoCapitalize="none" keyboardType="email-address" value={form.email} onChangeText={(t) => set("email", t)} />
      <Input label={L(lang, "पासवर्ड (कम से कम 10 अक्षर)", "Password (min 10 characters)")} secureTextEntry value={form.password} onChangeText={(t) => set("password", t)} />
      <Input label={L(lang, "पासवर्ड की पुष्टि करें", "Confirm password")} secureTextEntry value={form.confirmPassword} onChangeText={(t) => set("confirmPassword", t)} />
      <Text style={s.label}>{L(lang, "क्षेत्र / कॉलोनी", "Locality")}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        {localities.map((a) => (
          <Pressable key={a.id} onPress={() => set("areaId", a.id)} style={{ borderWidth: 1, borderColor: form.areaId === a.id ? colors.green : colors.border, backgroundColor: form.areaId === a.id ? "#dcfce7" : "#fff", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 }}>
            <Text>{lang === "hi" ? a.nameHi || a.name : a.name}</Text>
          </Pressable>
        ))}
      </View>
      <Input label={L(lang, "पता (वैकल्पिक)", "Address (optional)")} value={form.address} onChangeText={(t) => set("address", t)} />
      <Pressable onPress={() => setAccepted(!accepted)} style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
        <Text style={{ fontSize: 20 }}>{accepted ? "☑️" : "☐"}</Text>
        <Text style={{ marginLeft: 8, flex: 1 }}>{L(lang, "मैं नियम व शर्तों और गोपनीयता नीति से सहमत हूँ", "I accept the Terms & Conditions and Privacy Policy")}</Text>
      </Pressable>
      <Button
        title={L(lang, "खाता बनाएँ", "Create Account")}
        onPress={submit}
        loading={busy}
        disabled={!accepted || form.mobile.length !== 10 || !form.areaId || form.name.length < 2}
      />
    </ScrollView>
  );
}
