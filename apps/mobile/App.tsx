import React from "react";
import { Text } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth, L } from "./src/context/auth";
import { LoginScreen, OnboardingScreen, RegisterScreen, SplashScreen } from "./src/screens/AuthScreens";
import { ComplaintDetailsScreen, MyComplaintsScreen, SubmitComplaintScreen, TrackComplaintScreen } from "./src/screens/ComplaintScreens";
import { CommunityScreen, DevelopmentScreen, HomeScreen, NoticesScreen, ServicesScreen } from "./src/screens/InfoScreens";
import { HelpScreen, NotificationsScreen, ProfileScreen, SettingsScreen } from "./src/screens/ProfileScreens";
import { colors } from "./src/ui";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function Tabs() {
  const { lang } = useAuth();
  const icon = (glyph: string) => ({ tabBarIcon: () => <Text style={{ fontSize: 20 }}>{glyph}</Text> });
  return (
    <Tab.Navigator screenOptions={{ tabBarActiveTintColor: colors.blue, headerTintColor: colors.blueDark, tabBarLabelStyle: { fontSize: 11, fontWeight: "600" } }}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: L(lang, "होम", "Home"), ...icon("🏠") }} />
      <Tab.Screen name="Complaints" component={MyComplaintsScreen} options={{ title: L(lang, "शिकायतें", "Complaints"), ...icon("📝") }} />
      <Tab.Screen name="Notices" component={NoticesScreen} options={{ title: L(lang, "सूचनाएँ", "Notices"), ...icon("📢") }} />
      <Tab.Screen name="Community" component={CommunityScreen} options={{ title: L(lang, "समुदाय", "Community"), ...icon("🤝") }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: L(lang, "प्रोफ़ाइल", "Profile"), ...icon("👤") }} />
    </Tab.Navigator>
  );
}

function Root() {
  const { lang } = useAuth();
  return (
    <Stack.Navigator screenOptions={{ headerTintColor: colors.blueDark }}>
      <Stack.Screen name="Splash" component={SplashScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Login" component={LoginScreen} options={{ title: L(lang, "लॉगिन", "Login") }} />
      <Stack.Screen name="Register" component={RegisterScreen} options={{ title: "Register" }} />
      <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
      <Stack.Screen name="SubmitComplaint" component={SubmitComplaintScreen} options={{ title: L(lang, "जनसमस्या दर्ज करें", "Submit Complaint") }} />
      <Stack.Screen name="TrackComplaint" component={TrackComplaintScreen} options={{ title: L(lang, "शिकायत ट्रैक करें", "Track Complaint") }} />
      <Stack.Screen name="ComplaintDetails" component={ComplaintDetailsScreen} options={{ title: L(lang, "शिकायत विवरण", "Complaint Details") }} />
      <Stack.Screen name="Development" component={DevelopmentScreen} options={{ title: L(lang, "विकास कार्य", "Development Works") }} />
      <Stack.Screen name="Services" component={ServicesScreen} options={{ title: L(lang, "सरकारी सेवाएँ", "Government Services") }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: L(lang, "सूचना केंद्र", "Notifications") }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: L(lang, "सेटिंग्स", "Settings") }} />
      <Stack.Screen name="Help" component={HelpScreen} options={{ title: L(lang, "सहायता", "Help") }} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <Root />
      </NavigationContainer>
    </AuthProvider>
  );
}
