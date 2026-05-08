import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { profilesApi, snippetsApi } from "@/lib/demo-data";
import { updateProfile } from "@/lib/demo-auth";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import FriendManager from "@/components/FriendManager";
import MediaUpload from "@/components/MediaUpload";
import {
  ArrowLeft,
  Camera,
  Save,
  Code2,
  Heart,
  Eye,
  Trophy,
  MessageSquare,
  User,
} from "lucide-react";

type Profile = {
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  rank_points: number;
};

type Stats = {
  snippetCount: number;
  totalLikes: number;
  totalViews: number;
  forumPosts: number;
};

function getRankTitle(points: number): string {
  if (points >= 1000) return "Owner";
  if (points >= 500) return "Legend";
  if (points >= 200) return "Master";
  if (points >= 100) return "Expert";
  if (points >= 50) return "Pro";
  if (points >= 20) return "Coder";
  if (points >= 5) return "Beginner";
  return "Newbie";
}

const RANK_COLORS: Record<string, string> = {
  Owner: "text-red-500",
  Legend: "text-yellow-400",
  Master: "text-purple-400",
  Expert: "text-blue-400",
  Pro: "text-emerald-400",
  Coder: "text-cyan-400",
  Beginner: "text-muted-foreground",
  Newbie: "text-muted-foreground",
};

const ProfilePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<Profile>({
    username: "",
    bio: "",
    avatar_url: null,
    rank_points: 0,
  });
  const [stats, setStats] = useState<Stats>({
    snippetCount: 0,
    totalLikes: 0,
    totalViews: 0,
    forumPosts: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchProfile();
    fetchStats();
  }, [user]);

  if (!user) {
    return null;
  }

  const fetchProfile = () => {
    if (!user) return;
    
    // Get from demo data or use user's auth info
    const existingProfile = profilesApi.get(user.id);
    if (existingProfile) {
      setProfile(existingProfile);
    } else {
      // Create initial profile from user data
      const newProfile: Profile = {
        username: user.username,
        bio: null,
        avatar_url: user.avatar_url || null,
        rank_points: 10,
      };
      profilesApi.upsert({ user_id: user.id, ...newProfile });
      setProfile(newProfile);
    }
    setLoading(false);
  };

  const fetchStats = () => {
    if (!user) return;
    
    const snippets = snippetsApi.getAll().filter(s => s.user_id === user.id);
    setStats({
      snippetCount: snippets.length,
      totalLikes: snippets.reduce((sum, s) => sum + (s.likes || 0), 0),
      totalViews: snippets.reduce((sum, s) => sum + (s.views || 0), 0),
      forumPosts: 0, // Demo - no forum posts tracked
    });
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    
    // Update in demo data
    profilesApi.upsert({
      user_id: user.id,
      username: profile.username?.trim() || null,
      bio: profile.bio?.trim() || null,
      avatar_url: profile.avatar_url,
      rank_points: profile.rank_points,
    });
    
    // Update in auth
    await updateProfile({ username: profile.username?.trim() || undefined });
    
    toast({ title: "Saved", description: "Profile updated successfully" });
    setSaving(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Too large", description: "Avatar must be under 2MB", variant: "destructive" });
      return;
    }

    // Create a local URL for the avatar (demo mode)
    const avatarUrl = URL.createObjectURL(file);
    
    setProfile((p) => ({ ...p, avatar_url: avatarUrl }));
    profilesApi.upsert({
      user_id: user.id,
      username: profile.username,
      bio: profile.bio,
      avatar_url: avatarUrl,
      rank_points: profile.rank_points,
    });
    
    toast({ title: "Avatar updated", description: "Note: In demo mode, avatars are temporary" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading profile...</div>
      </div>
    );
  }

  const rank = getRankTitle(profile.rank_points);
  const rankColor = RANK_COLORS[rank];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center h-14 px-4 gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <h1 className="text-lg font-bold text-foreground">My Profile</h1>
        </div>
      </header>

      <main className="container px-4 py-8 max-w-2xl mx-auto space-y-6">
        {/* Avatar + Name */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative group">
            <Avatar className="h-24 w-24 border-2 border-primary/30">
              <AvatarImage src={profile.avatar_url || user.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                <User className="h-10 w-10" />
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 rounded-full bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            >
              <Camera className="h-6 w-6 text-foreground" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>

          <div className="text-center">
            <p className="text-xl font-bold text-foreground">
              {profile.username || user.username || user.email || "Anonymous"}
            </p>
            <div className="flex items-center justify-center gap-2 mt-1">
              <Trophy className={`h-4 w-4 ${rankColor}`} />
              <span className={`text-sm font-semibold ${rankColor}`}>{rank}</span>
              <span className="text-xs text-muted-foreground">- {profile.rank_points} pts</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Code2, label: "Snippets", value: stats.snippetCount, color: "text-primary" },
            { icon: Heart, label: "Likes", value: stats.totalLikes, color: "text-red-400" },
            { icon: Eye, label: "Views", value: stats.totalViews, color: "text-blue-400" },
            { icon: MessageSquare, label: "Posts", value: stats.forumPosts, color: "text-emerald-400" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border border-border bg-card p-4 text-center"
            >
              <stat.icon className={`h-5 w-5 mx-auto mb-1 ${stat.color}`} />
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        <MediaUpload userId={user.id} title="Profile Media" description="Upload images, screenshots, and attachments to personalize your profile." uploadFolder="profile-media" />
        <FriendManager userId={user.id} />

        {/* Edit form */}
        <div className="rounded-lg border border-border bg-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Edit Profile
          </h2>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Username</label>
            <Input
              value={profile.username || ""}
              onChange={(e) => setProfile((p) => ({ ...p, username: e.target.value }))}
              placeholder="Your display name"
              maxLength={30}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Bio</label>
            <Textarea
              value={profile.bio || ""}
              onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
              placeholder="Tell us about yourself..."
              maxLength={200}
              rows={3}
            />
            <p className="text-xs text-muted-foreground text-right">
              {(profile.bio || "").length}/200
            </p>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;
