import { Crown, Shield, MessageCircle } from "lucide-react";
import type { Member } from "./types";

interface Props {
  members: Member[];
  onlineIds: Set<string>;
  onDM: (userId: string) => void;
}

const roleIcon = (r: string) =>
  r === "owner" ? <Crown className="h-3 w-3 text-yellow-400" /> : r === "admin" ? <Shield className="h-3 w-3 text-primary" /> : null;

const MemberList = ({ members, onlineIds, onDM }: Props) => {
  const online = members.filter((m) => onlineIds.has(m.user_id));
  const offline = members.filter((m) => !onlineIds.has(m.user_id));

  const Row = ({ m, dim }: { m: Member; dim?: boolean }) => (
    <button
      onClick={() => onDM(m.user_id)}
      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-secondary/50 group ${dim ? "opacity-50" : ""}`}
    >
      <div className="relative">
        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold overflow-hidden">
          {m.avatar_url ? <img src={m.avatar_url} className="w-full h-full object-cover" /> : (m.username || "?").slice(0, 2).toUpperCase()}
        </div>
        {!dim && <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-card" />}
      </div>
      <span className="flex-1 text-left text-sm truncate">{m.username || "anonymous"}</span>
      {roleIcon(m.role)}
      <MessageCircle className="h-3 w-3 opacity-0 group-hover:opacity-100 text-muted-foreground" />
    </button>
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
