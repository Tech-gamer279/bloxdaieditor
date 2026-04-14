import { useState } from "react";
import Header from "@/components/Header";
import SnippetCard from "@/components/SnippetCard";
import type { Snippet } from "@/components/SnippetCard";
import SnippetView from "@/components/SnippetView";
import NewSnippetDialog from "@/components/NewSnippetDialog";
import AiChat from "@/components/AiChat";
import { Code2, Sparkles } from "lucide-react";

const sampleSnippets: Snippet[] = [];

const Index = () => {
  const [snippets, setSnippets] = useState<Snippet[]>(sampleSnippets);
  const [selectedSnippet, setSelectedSnippet] = useState<Snippet | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<"snippets" | "ai">("snippets");

  const handleNewSnippet = (snippet: Snippet) => {
    setSnippets((prev) => [snippet, ...prev]);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onNewSnippet={() => setShowNewDialog(true)} />

      <main className="container px-4 py-6">
        {/* Tab switcher for mobile */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("snippets")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "snippets"
                ? "bg-primary/15 text-primary border border-primary/30"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Code2 className="h-4 w-4" />
            Code Snippets
          </button>
          <button
            onClick={() => setActiveTab("ai")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "ai"
                ? "bg-accent/15 text-accent border border-accent/30"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles className="h-4 w-4" />
            AI Coder
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Snippets panel */}
          <div className={`lg:col-span-3 ${activeTab !== "snippets" ? "hidden lg:block" : ""}`}>
            {selectedSnippet ? (
              <SnippetView snippet={selectedSnippet} onBack={() => setSelectedSnippet(null)} />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Shared Snippets
                  </h2>
                  <span className="text-xs text-muted-foreground">{snippets.length} snippets</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {snippets.map((snippet) => (
                    <SnippetCard
                      key={snippet.id}
                      snippet={snippet}
                      onClick={() => setSelectedSnippet(snippet)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* AI Chat panel */}
          <div className={`lg:col-span-2 ${activeTab !== "ai" ? "hidden lg:block" : ""}`}>
            <AiChat />
          </div>
        </div>
      </main>

      <NewSnippetDialog
        open={showNewDialog}
        onClose={() => setShowNewDialog(false)}
        onSubmit={handleNewSnippet}
      />
    </div>
  );
};

export default Index;
