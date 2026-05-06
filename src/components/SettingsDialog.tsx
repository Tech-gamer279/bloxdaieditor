import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useSettings, LANGUAGES, type Theme } from "@/contexts/SettingsContext";
import { Sun, Moon, Monitor, Star } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props { open: boolean; onClose: () => void; }

const SettingsDialog = ({ open, onClose }: Props) => {
  const { theme, setTheme, language, setLanguage } = useSettings();

  const themes: { value: Theme; label: string; icon: any }[] = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Settings</DialogTitle></DialogHeader>
        <Tabs defaultValue="appearance">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="language">Language</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>
          <TabsContent value="appearance" className="space-y-3 py-3">
            <p className="text-sm text-muted-foreground">Choose how Bloxd looks.</p>
            <div className="grid grid-cols-3 gap-2">
              {themes.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-colors ${theme === value ? "border-primary bg-primary/10" : "border-border hover:bg-secondary/40"}`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs font-medium">{label}</span>
                </button>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="language" className="space-y-3 py-3">
            <p className="text-sm text-muted-foreground">Pick your preferred language.</p>
            <div className="grid grid-cols-2 gap-2">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLanguage(l.code)}
                  className={`px-3 py-2 rounded-lg border text-sm text-left transition-colors ${language === l.code ? "border-primary bg-primary/10" : "border-border hover:bg-secondary/40"}`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="about" className="space-y-4 py-3">
            <div>
              <h3 className="font-semibold">Bloxd.code</h3>
              <p className="text-sm text-muted-foreground">A community for Bloxd.io creators — share snippets, chat, build together.</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Enjoying the app?</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => toast({ title: "Thanks for the rating!", description: `You rated us ${n} star${n > 1 ? "s" : ""}.` })}
                    className="p-2 hover:bg-secondary rounded transition-colors"
                  >
                    <Star className="h-5 w-5 text-yellow-400" fill="currentColor" />
                  </button>
                ))}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => toast({ title: "Thanks!", description: "We appreciate your support." })}>
              Rate us on the Store
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
