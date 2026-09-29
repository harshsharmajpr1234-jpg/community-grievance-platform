import React, { useEffect, useState } from "react";
import { FlatList, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { api, qs } from "../api/client";
import { L, useAuth } from "../context/auth";
import { Badge, Button, Card, Input, Loading, Muted, Title, colors, s } from "../ui";
import { ComplaintItem } from "./ComplaintScreens";

export function HomeScreen({ navigation }: { navigation: any }) {
  const { lang, user } = useAuth();
  const [stats, setStats] = useState<{ total: number; resolved: number; pending: number; activeNotices: number } | null>(null);
  const [recent, setRecent] = useState<any[]>([]);
  useEffect(() => {
    api<typeof stats>("/api/stats").then(setStats).catch(() => {});
    api<{ items: any[] }>("/api/complaints?pageSize=5").then((r) => setRecent(r.items)).catch(() => {});
  }, []);
  const tiles = [
    ["📝", L(lang, "जनसमस्या दर्ज करें", "Submit complaint"), "SubmitComplaint"],
    ["🔎", L(lang, "शिकायत ट्रैक करें", "Track complaint"), "TrackComplaint"],
    ["🏗️", L(lang, "विकास कार्य", "Development"), "Development"],
    ["🏛️", L(lang, "सरकारी सेवाएँ", "Services"), "Services"],
  ];
  return (
    <ScrollView contentContainerStyle={s.screen}>
      <View style={{ backgroundColor: colors.blue, borderRadius: 20, padding: 20, marginBottom: 14 }}>
        <Text style={{ color: "#fff", fontSize: 20, fontWeight: "800" }}>Jan Samasya Nivaran Manch</Text>
        <Text style={{ color: "#bfdbfe", marginTop: 4 }}>एक क्षेत्र — एक मंच — जनहित की आवाज़</Text>
        <Text style={{ color: "#dcfce7", marginTop: 8, fontStyle: "italic" }}>हम साथ हैं, तो समाधान हैं...</Text>
        {!user && <Button title={L(lang, "लॉगिन / पंजीकरण", "Login / Register")} kind="secondary" onPress={() => navigation.navigate("Login")} />}
      </View>
      {stats && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
          {[[L(lang, "कुल", "Total"), stats.total], [L(lang, "समाधान", "Resolved"), stats.resolved], [L(lang, "लंबित", "Pending"), stats.pending], [L(lang, "सूचनाएँ", "Notices"), stats.activeNotices]].map(([k, v]) => (
            <View key={String(k)} style={[s.card, { flexBasis: "47%", marginBottom: 0, alignItems: "center" }]}>
              <Text style={{ fontSize: 24, fontWeight: "800", color: colors.blue }}>{v}</Text>
              <Muted>{k}</Muted>
            </View>
          ))}
        </View>
      )}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        {tiles.map(([icon, label, screen]) => (
          <Pressable key={screen} onPress={() => navigation.navigate(screen)} style={[s.card, { flexBasis: "47%", marginBottom: 0 }]}>
            <Text style={{ fontSize: 26 }}>{icon}</Text>
            <Text style={{ fontWeight: "700", marginTop: 4 }}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={{ fontWeight: "800", fontSize: 16, marginBottom: 8 }}>{L(lang, "हाल की सार्वजनिक शिकायतें", "Recent public complaints")}</Text>
      {recent.map((c) => <ComplaintItem key={c.id} c={c} lang={lang} onPress={() => navigation.navigate("ComplaintDetails", { code: c.code })} />)}
    </ScrollView>
  );
}

function useList<T>(path: string) {
  const [items, setItems] = useState<T[] | null>(null);
  const [q, setQ] = useState("");
  useEffect(() => {
    const t = setTimeout(() => api<{ items: T[] }>(`${path}${qs({ q, pageSize: 30 })}`).then((r) => setItems(r.items)).catch(() => setItems([])), 300);
    return () => clearTimeout(t);
  }, [path, q]);
  return { items, q, setQ };
}

export function NoticesScreen() {
  const { lang } = useAuth();
  const { items, q, setQ } = useList<any>("/api/notices");
  return (
    <View style={s.screen}>
      <Input placeholder={L(lang, "सूचना खोजें…", "Search notices…")} value={q} onChangeText={setQ} />
      {!items ? <Loading /> : (
        <FlatList data={items} keyExtractor={(n) => n.id} renderItem={({ item: n }) => (
          <Card>
            <Badge text={n.category.replace(/_/g, " ")} />
            <Text style={{ fontSize: 16, fontWeight: "700", marginTop: 6 }}>{lang === "hi" ? n.titleHi || n.title : n.title}</Text>
            <Text style={{ marginTop: 4 }}>{lang === "hi" ? n.descriptionHi || n.description : n.description}</Text>
            <Muted>{new Date(n.publishDate).toLocaleDateString("en-IN")}{n.isDemo ? " • DEMO" : ""}</Muted>
          </Card>
        )} ListEmptyComponent={<Muted>{L(lang, "कोई सूचना नहीं।", "No notices.")}</Muted>} />
      )}
    </View>
  );
}

export function DevelopmentScreen() {
  const { lang } = useAuth();
  const { items, q, setQ } = useList<any>("/api/development");
  return (
    <View style={s.screen}>
      <Input placeholder={L(lang, "परियोजना खोजें…", "Search projects…")} value={q} onChangeText={setQ} />
      {!items ? <Loading /> : (
        <FlatList data={items} keyExtractor={(p) => p.id} renderItem={({ item: p }) => (
          <Card>
            <Badge text={p.status.replace(/_/g, " ")} color={colors.green} />
            <Text style={{ fontSize: 16, fontWeight: "700", marginTop: 6 }}>{lang === "hi" ? p.nameHi || p.name : p.name}</Text>
            <Muted>{p.location} {p.department ? `• ${p.department}` : ""}</Muted>
            <View style={{ height: 8, backgroundColor: "#e2e8f0", borderRadius: 4, marginTop: 8 }}><View style={{ width: `${p.progress}%`, height: 8, backgroundColor: colors.green, borderRadius: 4 }} /></View>
            <Muted>{p.progress}%{p.isDemo ? " • DEMO" : ""}</Muted>
          </Card>
        )} />
      )}
    </View>
  );
}

export function ServicesScreen() {
  const { lang } = useAuth();
  const { items, q, setQ } = useList<any>("/api/services");
  return (
    <View style={s.screen}>
      <Input placeholder={L(lang, "सेवा खोजें…", "Search services…")} value={q} onChangeText={setQ} />
      {!items ? <Loading /> : (
        <FlatList data={items} keyExtractor={(x) => x.id} renderItem={({ item: x }) => (
          <Card>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 16, fontWeight: "700", flex: 1 }}>{lang === "hi" ? x.nameHi || x.name : x.name}</Text>
              <Badge text={x.isOfficial ? L(lang, "आधिकारिक", "Official") : L(lang, "सामुदायिक", "Community")} color={x.isOfficial ? colors.green : colors.muted} />
            </View>
            <Muted>{x.department}</Muted>
            {x.description && <Text style={{ marginTop: 4 }}>{x.description}</Text>}
            {x.phone && <Button title={`📞 ${x.phone}`} kind="secondary" onPress={() => Linking.openURL(`tel:${x.phone}`)} />}
            {x.website && <Button title={`🌐 ${L(lang, "वेबसाइट", "Website")}`} kind="secondary" onPress={() => Linking.openURL(x.website)} />}
            {x.notes && <Muted>{x.notes}</Muted>}
          </Card>
        )} />
      )}
    </View>
  );
}

export function CommunityScreen() {
  const { lang } = useAuth();
  const { items, q, setQ } = useList<any>("/api/community");
  return (
    <View style={s.screen}>
      <Input placeholder={L(lang, "पोस्ट खोजें…", "Search posts…")} value={q} onChangeText={setQ} />
      {!items ? <Loading /> : (
        <FlatList data={items} keyExtractor={(p) => p.id} renderItem={({ item: p }) => (
          <Card>
            <Badge text={p.type.replace(/_/g, " ")} />
            <Text style={{ fontSize: 16, fontWeight: "700", marginTop: 6 }}>{p.title}</Text>
            <Text style={{ marginTop: 4 }}>{p.content}</Text>
            <Muted>{p.authorName} • {new Date(p.createdAt).toLocaleDateString("en-IN")}</Muted>
          </Card>
        )} />
      )}
    </View>
  );
}

export { Title };
