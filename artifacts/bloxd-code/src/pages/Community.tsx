import Header from "@/components/Header";
import Community from "@/components/community/Community";

const CommunityPage = () => (
  <div className="min-h-screen bg-background">
    <Header onNewSnippet={() => {}} />
    <main className="container px-4 py-6">
      <Community />
    </main>
  </div>
);

export default CommunityPage;
