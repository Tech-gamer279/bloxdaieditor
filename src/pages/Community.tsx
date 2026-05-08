import Header from "@/components/Header";
import Community from "@/components/community/Community";
import { useState } from "react";
import NewSnippetDialog from "@/components/NewSnippetDialog";
import type { Snippet } from "@/components/SnippetCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const CommunityPage = () => {
  const { user } = useAuth();
  const [showNewDialog, setShowNewDialog] = useState(false);

  const handleNewSnippet = async (snippet: Snippet) => {
    if (!user) {
      toast({ title: "Sign in required", description: "You need to sign in to share snippets", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("snippets").insert({
      title: snippet.title,
      code: snippet.code,
      author_name: snippet.author || "anonymous",
      user_id: user.id,
    });
    if (error) {
      toast({ title: "Error", description: "Failed to share snippet", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onNewSnippet={() => setShowNewDialog(true)} />
      <main className="container px-4 py-6">
        <Community />
      </main>
      <NewSnippetDialog open={showNewDialog} onClose={() => setShowNewDialog(false)} onSubmit={handleNewSnippet} />
    </div>
  );
};

export default CommunityPage;
