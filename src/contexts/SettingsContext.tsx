import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";

interface SettingsContextType {
  theme: "light" | "dark" | "system";
  setTheme: Dispatch<SetStateAction<"light" | "dark" | "system">>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");

  return (
    <SettingsContext.Provider value={{ theme, setTheme }}>
      {children}
    </SettingsContext.Provider>
  );
};
