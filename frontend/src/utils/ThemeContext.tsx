import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { storage } from "@/src/utils/storage";
import { lightColors, darkColors } from "@/src/theme";

export type ThemeChoice = "light" | "dark" | "system";
const THEME_KEY = "constroi_facil_theme";

type ThemeContextValue = {
  colors: typeof lightColors;
  isDark: boolean;
  choice: ThemeChoice;
  setChoice: (c: ThemeChoice) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  colors: lightColors,
  isDark: false,
  choice: "system",
  setChoice: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [choice, setChoiceState] = useState<ThemeChoice>("system");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await storage.getItem<string>(THEME_KEY, "");
      if (saved === "light" || saved === "dark" || saved === "system") setChoiceState(saved);
      setLoaded(true);
    })();
  }, []);

  const setChoice = (c: ThemeChoice) => {
    setChoiceState(c);
    storage.setItem(THEME_KEY, c).catch(() => {});
  };

  const isDark = choice === "dark" || (choice === "system" && systemScheme === "dark");
  const value = useMemo<ThemeContextValue>(
    () => ({ colors: isDark ? darkColors : lightColors, isDark, choice, setChoice }),
    [isDark, choice]
  );

  // Avoid a light->dark flash: wait for the saved preference to load before rendering.
  if (!loaded) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
