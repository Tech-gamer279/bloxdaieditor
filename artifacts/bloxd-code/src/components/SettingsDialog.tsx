import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

const languages = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
];

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SettingsDialog = ({ open, onOpenChange }: SettingsDialogProps) => {
  const { theme, setTheme } = useTheme();
  const [selectedLanguage, setSelectedLanguage] = useState("en");

  useEffect(() => {
    const stored = window.localStorage.getItem("bloxdaieditor-language");
    if (stored) setSelectedLanguage(stored);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("bloxdaieditor-language", selectedLanguage);
  }, [selectedLanguage]);

  const handleRate = () => {
    window.open("https://github.com/Tech-gamer279/bloxdaieditor", "_blank");
    toast({ title: "Thanks for rating!", description: "Opening the project page.", variant: "default" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm font-medium">Theme</p>
            <RadioGroup
              value={theme || "system"}
              onValueChange={(value) => setTheme(value as "light" | "dark" | "system")}
              className="grid grid-cols-3 gap-2"
            >
              {[
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
                { value: "system", label: "System" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTheme(option.value as "light" | "dark" | "system")}
                  className={`rounded-lg border px-3 py-2 text-sm transition ${theme === option.value ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-foreground hover:border-primary/70"}`}
                >
                  {option.label}
                </button>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Language</p>
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger>
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Language selection is saved locally.</p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">App feedback</p>
            <Button variant="neon" onClick={handleRate}>
              Rate us on GitHub
            </Button>
            <p className="text-xs text-muted-foreground">Share your thoughts or star the project.</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
