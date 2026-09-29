import React, { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, Pressable, ScrollView, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { API_URL, api, getToken, qs } from "../api/client";
import { L, useAuth } from "../context/auth";
import { Badge, Button, Card, ErrorText, Input, Loading, Muted, STATUS_COLORS, Title, colors, s } from "../ui";

type Category = { id: string; nameEn: string; nameHi: string; icon: string | null };
type Area = { id: string; name: string; nameHi: string | null; type: string };
type Complaint = { id: string; code: string; title: string; status: string; priority: string; createdAt: string; category: { nameEn: string; nameHi: string } | null; area: { name: string; nameHi: string | null } | null };
type Detail = Complaint & { description: string; department: string | null; isOwner: boolean; updates: { id: string; message: string | null; newStatus: string | null; createdAt: string; byUser: boolean }[]; documents: { id: string; url: string; kind: string; originalName: string }[] };

const STATUS_HI: Record<string, string> = { SUBMITTED: "दर्ज", VERIFIED: "सत्यापित", ASSIGNED: "सौंपी गई", FORWARDED: "अग्रेषित", IN_PROGRESS: "प्रगति पर", ACTION_TAKEN: "कार्रवाई की गई", RESOLVED: "समाधान", REJECTED: "अस्वीकृत", DUPLICATE: "डुप्लिकेट", NEEDS_INFORMATION: "जानकारी आवश्यक", CLOSED: "बंद" };
export const statusLabel = (st: string, lang: "hi" | "en") => (lang === "hi" ? STATUS_HI[st] ?? st : st.replace(/_/g, " "));

export function ComplaintItem({ c, lang, onPress }: { c: Complaint; lang: "hi" | "en"; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontFamily: "monospace", color: colors.blue, fontWeight: "700" }}>{c.code}</Text>
          <Badge text={statusLabel(c.status, lang)} color={STATUS_COLORS[c.status]} />
        </View>
        <Text style={{ fontSize: 16, fontWeight: "700", marginTop: 6 }}>{c.title}</Text>
        <Muted>{c.category ? (lang === "hi" ? c.category.nameHi : c.category.nameEn) : ""} {c.area ? `• ${c.area.name}` : ""} • {new Date(c.createdAt).toLocaleDateString("en-IN")}</Muted>
      </Card>
    </Pressable>
  );
}

export function SubmitComplaintScreen({ navigation }: { navigation: any }) {
  const { lang, user } = useAuth();
  const [meta, setMeta] = useState<{ categories: Category[]; areas: Area[] } | null>(null);
  const [form, setForm] = useState({ categoryId: "", title: "", description: "", areaId: "", address: "", priority: "MEDIUM" });
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [images, setImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<{ categories: Category[]; areas: Area[] }>("/api/meta").then(setMeta).catch((e) => setError(e.message));
  }, []);
  if (!user) return <View style={s.screen}><Card><Text>{L(lang, "शिकायत दर्ज करने के लिए लॉगिन करें।", "Please login to register a complaint.")}</Text><Button title={L(lang, "लॉगिन", "Login")} onPress={() => navigation.navigate("Login")} /></Card></View>;
  if (!meta) return <Loading />;

  async function pickImage() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7, allowsMultipleSelection: true, selectionLimit: 6 - images.length });
    if (!res.canceled) setImages([...images, ...res.assets].slice(0, 6));
  }
  async function useGps() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return Alert.alert(L(lang, "अनुमति आवश्यक", "Permission needed"));
    const pos = await Location.getCurrentPositionAsync({});
    setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
  }
  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ complaint: Complaint }>("/api/complaints", { method: "POST", json: { ...form, areaId: form.areaId || undefined, address: form.address || undefined, ...(coords ?? {}) } });
      const token = await getToken();
      for (const img of images) {
        const fd = new FormData();
        fd.append("file", { uri: img.uri, name: img.fileName ?? "photo.jpg", type: img.mimeType ?? "image/jpeg" } as unknown as Blob);
        await fetch(`${API_URL}/api/complaints/${r.complaint.id}/documents`, { method: "POST", headers: { authorization: `Bearer ${token}` }, body: fd }).catch(() => {});
      }
      Alert.alert(L(lang, "शिकायत दर्ज हुई", "Complaint registered"), `${L(lang, "आपकी शिकायत सफलतापूर्वक दर्ज हो गई है।", "Your complaint has been registered successfully.")}\n${r.complaint.code}`);
      navigation.replace("ComplaintDetails", { code: r.complaint.code });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const localities = meta.areas.filter((a) => a.type === "LOCALITY" || a.type === "STREET");
  return (
    <ScrollView contentContainerStyle={s.screen}>
      <Title>{L(lang, "जनसमस्या दर्ज करें", "Register a public issue")}</Title>
      <ErrorText>{error}</ErrorText>
      <Text style={s.label}>{L(lang, "श्रेणी", "Category")}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        {meta.categories.map((c) => (
          <Pressable key={c.id} onPress={() => setForm({ ...form, categoryId: c.id })} style={{ borderWidth: 1, borderColor: form.categoryId === c.id ? colors.blue : colors.border, backgroundColor: form.categoryId === c.id ? "#dbeafe" : "#fff", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }}>
            <Text>{c.icon} {lang === "hi" ? c.nameHi : c.nameEn}</Text>
          </Pressable>
        ))}
      </View>
      <Input label={L(lang, "शीर्षक", "Title")} value={form.title} onChangeText={(t) => setForm({ ...form, title: t })} maxLength={200} />
      <Input label={L(lang, "विस्तृत विवरण", "Detailed description")} value={form.description} onChangeText={(t) => setForm({ ...form, description: t })} multiline maxLength={5000} />
      <Text style={s.label}>{L(lang, "क्षेत्र / कॉलोनी", "Locality")}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        {localities.map((a) => (
          <Pressable key={a.id} onPress={() => setForm({ ...form, areaId: form.areaId === a.id ? "" : a.id })} style={{ borderWidth: 1, borderColor: form.areaId === a.id ? colors.green : colors.border, backgroundColor: form.areaId === a.id ? "#dcfce7" : "#fff", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 }}>
            <Text>{lang === "hi" ? a.nameHi || a.name : a.name}</Text>
          </Pressable>
        ))}
      </View>
      <Input label={L(lang, "पता / लैंडमार्क", "Address / landmark")} value={form.address} onChangeText={(t) => setForm({ ...form, address: t })} maxLength={300} />
      <Text style={s.label}>{L(lang, "प्राथमिकता", "Priority")}</Text>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
        {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
          <Pressable key={p} onPress={() => setForm({ ...form, priority: p })} style={{ flex: 1, alignItems: "center", borderWidth: 1, borderColor: form.priority === p ? colors.blue : colors.border, borderRadius: 10, paddingVertical: 10, backgroundColor: form.priority === p ? "#dbeafe" : "#fff" }}>
            <Text style={{ fontSize: 12 }}>{p}</Text>
          </Pressable>
        ))}
      </View>
      <Button title={coords ? `📍 ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}` : L(lang, "📡 GPS लोकेशन जोड़ें (वैकल्पिक)", "📡 Add GPS location (optional)")} kind="secondary" onPress={useGps} />
      <Button title={L(lang, `📷 फोटो जोड़ें (${images.length}/6)`, `📷 Add photos (${images.length}/6)`)} kind="secondary" onPress={pickImage} />
      <Button title={L(lang, "शिकायत जमा करें", "Submit complaint")} onPress={submit} loading={busy} disabled={!form.categoryId || form.title.length < 5 || form.description.length < 20} />
    </ScrollView>
  );
}

export function MyComplaintsScreen({ navigation }: { navigation: any }) {
  const { lang, user } = useAuth();
  const [items, setItems] = useState<Complaint[] | null>(null);
  const load = useCallback(() => {
    if (!user) return setItems([]);
    api<{ items: Complaint[] }>(`/api/complaints${qs({ mine: true, pageSize: 50 })}`).then((r) => setItems(r.items)).catch(() => setItems([]));
  }, [user]);
  useEffect(() => navigation.addListener("focus", load), [navigation, load]);
  if (!user) return <View style={s.screen}><Card><Text>{L(lang, "अपनी शिकायतें देखने के लिए लॉगिन करें।", "Login to see your complaints.")}</Text><Button title={L(lang, "लॉगिन", "Login")} onPress={() => navigation.navigate("Login")} /><Button title={L(lang, "आईडी से ट्रैक करें", "Track by ID")} kind="secondary" onPress={() => navigation.navigate("TrackComplaint")} /></Card></View>;
  if (!items) return <Loading />;
  return (
    <View style={s.screen}>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1 }}><Button title={L(lang, "＋ नई शिकायत", "＋ New complaint")} onPress={() => navigation.navigate("SubmitComplaint")} /></View>
        <View style={{ flex: 1 }}><Button title={L(lang, "🔎 ट्रैक", "🔎 Track")} kind="secondary" onPress={() => navigation.navigate("TrackComplaint")} /></View>
      </View>
      <FlatList data={items} keyExtractor={(c) => c.id} renderItem={({ item }) => <ComplaintItem c={item} lang={lang} onPress={() => navigation.navigate("ComplaintDetails", { code: item.code })} />} ListEmptyComponent={<Muted>{L(lang, "कोई शिकायत नहीं।", "No complaints yet.")}</Muted>} />
    </View>
  );
}

export function TrackComplaintScreen({ navigation }: { navigation: any }) {
  const { lang } = useAuth();
  const [code, setCode] = useState("");
  const [mobile, setMobile] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function track() {
    setBusy(true);
    setError(null);
    try {
      const d = await api<Detail>("/api/complaints/track", { method: "POST", json: { code, mobile } });
      navigation.navigate("ComplaintDetails", { code: d.code, detail: d });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={s.screen}>
      <Title>{L(lang, "शिकायत की स्थिति देखें", "Track complaint")}</Title>
      <ErrorText>{error}</ErrorText>
      <Input label={L(lang, "शिकायत आईडी", "Complaint ID")} autoCapitalize="characters" value={code} onChangeText={(t) => setCode(t.toUpperCase())} placeholder="DPF-2026-000001" />
      <Input label={L(lang, "पंजीकृत मोबाइल", "Registered mobile")} keyboardType="number-pad" maxLength={10} value={mobile} onChangeText={(t) => setMobile(t.replace(/\D/g, ""))} />
      <Button title={L(lang, "खोजें", "Search")} onPress={track} loading={busy} disabled={mobile.length !== 10 || code.length < 10} />
    </View>
  );
}

export function ComplaintDetailsScreen({ route }: { route: any }) {
  const { lang } = useAuth();
  const { code, detail: preloaded } = route.params as { code: string; detail?: Detail };
  const [d, setD] = useState<Detail | null>(preloaded ?? null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const load = useCallback(() => api<Detail>(`/api/complaints/${code}`).then(setD).catch((e) => setError(e.message)), [code]);
  useEffect(() => {
    if (!preloaded) load();
  }, [load, preloaded]);
  if (error) return <View style={s.screen}><ErrorText>{error}</ErrorText></View>;
  if (!d) return <Loading />;
  async function feedback(isResolved: boolean) {
    try {
      setD(await api<Detail>(`/api/complaints/${d!.code}/feedback`, { method: "POST", json: { isResolved } }));
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    }
  }
  async function addInfo() {
    try {
      setD(await api<Detail>(`/api/complaints/${d!.code}`, { method: "PATCH", json: { message: msg } }));
      setMsg("");
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    }
  }
  return (
    <ScrollView contentContainerStyle={s.screen}>
      <Card>
        <Text style={{ fontFamily: "monospace", color: colors.blue, fontWeight: "700" }}>{d.code}</Text>
        <Badge text={statusLabel(d.status, lang)} color={STATUS_COLORS[d.status]} />
        <Text style={{ fontSize: 20, fontWeight: "800", marginTop: 8 }}>{d.title}</Text>
        <Muted>{d.category ? (lang === "hi" ? d.category.nameHi : d.category.nameEn) : ""} • {d.area?.name ?? ""} • {new Date(d.createdAt).toLocaleString("en-IN")}</Muted>
        {d.department && <Muted>{L(lang, "विभाग", "Department")}: {d.department}</Muted>}
        <Text style={{ marginTop: 10, lineHeight: 22 }}>{d.description}</Text>
      </Card>
      <Card>
        <Text style={{ fontWeight: "800", marginBottom: 8 }}>{L(lang, "टाइमलाइन", "Timeline")}</Text>
        {d.updates.map((u) => (
          <View key={u.id} style={{ borderLeftWidth: 3, borderLeftColor: u.newStatus ? STATUS_COLORS[u.newStatus] : colors.border, paddingLeft: 10, marginBottom: 10 }}>
            <Muted>{new Date(u.createdAt).toLocaleString("en-IN")} {u.byUser ? `• ${L(lang, "निवासी", "Resident")}` : ""}</Muted>
            {u.newStatus && <Text style={{ fontWeight: "700", color: STATUS_COLORS[u.newStatus] }}>{statusLabel(u.newStatus, lang)}</Text>}
            {u.message && <Text>{u.message}</Text>}
          </View>
        ))}
      </Card>
      {d.isOwner && (
        <Card>
          <Text style={{ fontWeight: "800", marginBottom: 8 }}>{L(lang, "आपकी कार्रवाई", "Your actions")}</Text>
          {["ACTION_TAKEN", "RESOLVED", "CLOSED"].includes(d.status) && (
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}><Button title={L(lang, "✅ समस्या हल हो गई", "✅ Resolved")} onPress={() => feedback(true)} /></View>
              <View style={{ flex: 1 }}><Button title={L(lang, "⚠️ अभी भी है", "⚠️ Still exists")} kind="danger" onPress={() => feedback(false)} /></View>
            </View>
          )}
          <Input label={L(lang, "अतिरिक्त जानकारी जोड़ें", "Add information")} value={msg} onChangeText={setMsg} multiline />
          <Button title={L(lang, "भेजें", "Send")} kind="secondary" onPress={addInfo} disabled={msg.trim().length < 3} />
        </Card>
      )}
    </ScrollView>
  );
}
