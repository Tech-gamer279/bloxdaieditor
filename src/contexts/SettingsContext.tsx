import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "light" | "dark" | "system";
export type Language = "en" | "es" | "fr" | "de" | "pt" | "ja";

interface SettingsContextType {
  theme: Theme;
  setTheme: (t: Theme) => void;
  language: Language;
  setLanguage: (l: Language) => void;
  resolvedTheme: "light" | "dark";
}

const SettingsContext = createContext<SettingsContextType>({
  theme: "system", setTheme: () => {}, language: "en", setLanguage: () => {}, resolvedTheme: "dark",
});

export const useSettings = () => useContext(SettingsContext);

export const LANGUAGES: { code: Language; label: string }[] = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "pt", label: "Português" },
  { code: "ja", label: "日本語" },
];

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>(() => (localStorage.getItem("bloxd:theme") as Theme) || "dark");
  const [language, setLanguageState] = useState<Language>(() => (localStorage.getItem("bloxd:lang") as Language) || "en");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const apply = () => {
      const sys = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
      const r = theme === "system" ? sys : theme;
      setResolvedTheme(r);
      document.documentElement.classList.toggle("light", r === "light");
    };
    apply();
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    if (theme === "system") { mq.addEventListener("change", apply); return () => mq.removeEventListener("change", apply); }
  }, [theme]);

  const setTheme = (t: Theme) => { setThemeState(t); localStorage.setItem("bloxd:theme", t); };
  const setLanguage = (l: Language) => { setLanguageState(l); localStorage.setItem("bloxd:lang", l); };

  return (
    <SettingsContext.Provider value={{ theme, setTheme, language, setLanguage, resolvedTheme }}>
      {children}
    </SettingsContext.Provider>
  );
};
