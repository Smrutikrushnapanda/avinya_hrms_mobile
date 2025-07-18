// app/index.tsx
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { InteractionManager } from "react-native";

const Index = () => {
  const router = useRouter();

  useEffect(() => {
    // Delay navigation until after initial render
    InteractionManager.runAfterInteractions(() => {
      router.replace("/(screen)/welcome");
    });
  }, []);

  return null;
};

export default Index;
