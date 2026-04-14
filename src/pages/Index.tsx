import { useState } from "react";
import Header from "@/components/Header";
import SnippetCard from "@/components/SnippetCard";
import type { Snippet } from "@/components/SnippetCard";
import SnippetView from "@/components/SnippetView";
import NewSnippetDialog from "@/components/NewSnippetDialog";
import AiChat from "@/components/AiChat";
import { Code2, Sparkles } from "lucide-react";

const sampleSnippets: Snippet[] = [
  {
    id: "1",
    title: "Auto Block Placer",
    code: `// Auto Block Placer for Bloxd.io
function autoPlace(blockType, pattern) {
  const grid = getWorldGrid();
  const pos = player.getPosition();
  
  for (let x = 0; x < pattern.width; x++) {
    for (let z = 0; z < pattern.depth; z++) {
      placeBlock(pos.x + x, pos.y, pos.z + z, blockType);
      wait(50); // Prevent rate limiting
    }
  }
  console.log("Pattern placed successfully!");
}

autoPlace("stone", { width: 10, depth: 10 });`,
    author: "BlockMaster",
    likes: 42,
    views: 156,
    createdAt: "2024-03-10",
  },
  {
    id: "2",
    title: "PvP Auto-Shield",
    code: `// PvP Auto-Shield Script
const SHIELD_RADIUS = 3;
const SHIELD_BLOCK = "obsidian";

function activateShield() {
  const pos = player.getPosition();
  for (let angle = 0; angle < 360; angle += 30) {
    const rad = (angle * Math.PI) / 180;
    const x = Math.round(pos.x + SHIELD_RADIUS * Math.cos(rad));
    const z = Math.round(pos.z + SHIELD_RADIUS * Math.sin(rad));
    placeBlock(x, pos.y, z, SHIELD_BLOCK);
    placeBlock(x, pos.y + 1, z, SHIELD_BLOCK);
  }
}

onKeyPress("F", activateShield);`,
    author: "PvPKing",
    likes: 89,
    views: 312,
    createdAt: "2024-03-08",
  },
  {
    id: "3",
    title: "Terrain Scanner",
    code: `// Scan nearby terrain for resources
function scanTerrain(radius) {
  const resources = {};
  const pos = player.getPosition();
  
  for (let x = -radius; x <= radius; x++) {
    for (let y = -radius; y <= radius; y++) {
      for (let z = -radius; z <= radius; z++) {
        const block = getBlock(pos.x+x, pos.y+y, pos.z+z);
        if (block && block !== "air") {
          resources[block] = (resources[block] || 0) + 1;
        }
      }
    }
  }
  return resources;
}

console.table(scanTerrain(5));`,
    author: "Explorer99",
    likes: 34,
    views: 201,
    createdAt: "2024-03-12",
  },
];

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
