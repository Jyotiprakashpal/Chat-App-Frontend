


import { Stack, useRouter, useSegments } from "expo-router";
import { useContext, useEffect } from "react";
import AuthProvider, { AuthContext } from "./context/Authcontext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const segments = useSegments();
  const router = useRouter();
  const { user, isLoading } = useContext(AuthContext);

  const inAuthGroup = segments[0] === "auth";

  useEffect(() => {
    if (isLoading) return;

    if (!user && !inAuthGroup) {
      router.replace("/auth");
    } else if (user && inAuthGroup) {
      router.replace("/main/home");
    }
  }, [user, isLoading, inAuthGroup, router]);

  if (isLoading) {
    return <Stack screenOptions={{ headerShown: false }} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
