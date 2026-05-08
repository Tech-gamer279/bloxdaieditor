import { Crown, Shield, ShieldAlert, MessageCircle } from "lucide-react";
import type { Member } from "./types";

interface Props {
  members: Member[];
  onlineIds: Set<string>;
  onDM: (userId: string) => void;
  onBan: (member: Member) => void;
  currentUserId: string;
  isAdmin: boolean;
}

const roleIcon = (r: string) =>
  r === "owner" ? <Crown className="h-3 w-3 text-yellow-400" /> : r === "admin" ? <Shield className="h-3 w-3 text-primary" /> : null;

const MemberList = ({ members, onlineIds, onDM, onBan, currentUserId, isAdmin }: Props) => {
  const online = members.filter((m) => onlineIds.has(m.user_id));
  const offline = members.filter((m) => !onlineIds.has(m.user_id));

  const Row = ({ m, dim }: { m: Member; dim?: boolean }) => (
    <div className={`w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-secondary/50 group ${dim ? "opacity-50" : ""}`}>
      <button
        type="button"
        onClick={() => onDM(m.user_id)}
        className="flex-1 flex items-center gap-2 text-left"
      >
        <div className="relative">
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold overflow-hidden">
            {m.avatar_url ? <img src={m.avatar_url} className="w-full h-full object-cover" /> : (m.username || "?").slice(0, 2).toUpperCase()}
          </div>
          {!dim && <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-card" />}
        </div>
        <span className="flex-1 text-sm truncate">{m.username || "anonymous"}</span>
        {roleIcon(m.role)}
      </button>
      {isAdmin && currentUserId !== m.user_id && m.role !== "owner" && (
        <button
          type="button"
          onClick={() => onBan(m)}
          className="p-1 rounded hover:bg-secondary/70 text-amber-400"
          title="Ban member"
        >
          <ShieldAlert className="h-4 w-4" />
        </button>
      )}
      <MessageCircle className="h-3 w-3 opacity-0 group-hover:opacity-100 text-muted-foreground" />
    </div>
  );

  return (
    <div className="w-52 shrink-0 bg-card/40 border-l border-border overflow-y-auto p-2 hidden md:block">
      {online.length > 0 && (
        <>
          <div className="text-[10px] uppercase font-bold text-muted-foreground px-2 py-1">Online — {online.length}</div>
          {online.map((m) => <Row key={m.id} m={m} />)}
        </>
      )}
      {offline.length > 0 && (
        <>
          <div className="text-[10px] uppercase font-bold text-muted-foreground px-2 py-1 mt-2">Offline — {offline.length}</div>
          {offline.map((m) => <Row key={m.id} m={m} dim />)}
        </>
      )}
    </div>
  );
};

export default MemberList;
