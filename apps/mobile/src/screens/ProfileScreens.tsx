import React, { useEffect, useState } from "react";
import { FlatList, ScrollView, Switch, Text, View } from "react-native";
import { api } from "../api/client";
import { L, useAuth } from "../context/auth";
import { Button, Card, Input, Loading, Muted, Title, s } from "../ui";

export function ProfileScreen({ navigation }: { navigation: any }) {
  const { lang, user, logout, refresh } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  if (!user) return <View style={s.screen}><Card><Text>{L(lang, "आप लॉगिन नहीं हैं।", "You are not logged in.")}</Text><Button title={L(lang, "लॉगिन", "Login")} onPress={() => navigation.navigate("Login")} /></Card></View>;
  return (
    <ScrollView contentContainerStyle={s.screen}>
      <Title>{user.name || L(lang, "निवासी", "Resident")}</Title>
      <Muted>+91 {user.mobileMasked}</Muted>
      <View style={{ height: 12 }} />
      <Input label={L(lang, "नाम", "Name")} value={name} onChangeText={setName} />
      <Button title={L(lang, "सहेजें", "Save")} onPress={async () => { await api("/api/auth/me", { method: "PATCH", json: { name } }); refresh(); }} />
      <Button title={L(lang, "🔔 सूचना केंद्र", "🔔 Notifications")} kind="secondary" onPress={() => navigation.navigate("Notifications")} />
      <Button title={L(lang, "⚙️ सेटिंग्स", "⚙️ Settings")} kind="secondary" onPress={() => navigation.navigate("Settings")} />
      <Button title={L(lang, "❓ सहायता", "❓ Help")} kind="secondary" onPress={() => navigation.navigate("Help")} />
      <Button title={L(lang, "लॉगआउट", "Logout")} kind="danger" onPress={logout} />
    </ScrollView>
  );
}

export function NotificationsScreen() {
  const { lang } = useAuth();
  const [items, setItems] = useState<any[] | null>(null);
  useEffect(() => {
    api<{ items: any[] }>("/api/notifications").then((r) => { setItems(r.items); api("/api/notifications", { method: "PATCH", json: {} }).catch(() => {}); }).catch(() => setItems([]));
  }, []);
  if (!items) return <Loading />;
  return (
    <View style={s.screen}>
      <FlatList data={items} keyExtractor={(n) => n.id} renderItem={({ item: n }) => (
        <Card>
          <Text style={{ fontWeight: n.isRead ? "500" : "800" }}>{n.title}</Text>
          <Text>{n.message}</Text>
          <Muted>{new Date(n.createdAt).toLocaleString("en-IN")}</Muted>
        </Card>
      )} ListEmptyComponent={<Muted>{L(lang, "कोई सूचना नहीं।", "No notifications.")}</Muted>} />
    </View>
  );
}

export function SettingsScreen() {
  const { lang, setLang, user } = useAuth();
  return (
    <View style={s.screen}>
      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontWeight: "700" }}>{L(lang, "भाषा: हिन्दी", "Language: English")}</Text>
          <Switch value={lang === "en"} onValueChange={(v) => setLang(v ? "en" : "hi")} />
        </View>
        <Muted>{L(lang, "हिन्दी | English", "हिन्दी | English")}</Muted>
      </Card>
      {user && <Card><Button title={L(lang, "खाता हटाने का अनुरोध", "Request account deletion")} kind="danger" onPress={() => api("/api/auth/me", { method: "DELETE" })} /></Card>}
    </View>
  );
}

export function HelpScreen() {
  const { lang } = useAuth();
  const faqs = [
    [L(lang, "शिकायत कैसे दर्ज करें?", "How do I register a complaint?"), L(lang, "लॉगिन करें, श्रेणी व विवरण भरें, फोटो जोड़ें और जमा करें। आपको DPF आईडी मिलेगी।", "Login, fill category and details, add photos and submit. You get a DPF ID.")],
    [L(lang, "स्थिति कैसे देखें?", "How do I track?"), L(lang, "'मेरी शिकायतें' या आईडी + मोबाइल से ट्रैक करें।", "Use 'My complaints' or track with ID + mobile.")],
    [L(lang, "आपातकाल?", "Emergency?"), L(lang, "यह आपातकालीन सेवा नहीं है — 112 पर कॉल करें।", "This is not an emergency service — call 112.")],
  ];
  return (
    <ScrollView contentContainerStyle={s.screen}>
      {faqs.map(([q, a]) => <Card key={q}><Text style={{ fontWeight: "700" }}>{q}</Text><Text style={{ marginTop: 4 }}>{a}</Text></Card>)}
    </ScrollView>
  );
}
