import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, PhoneOff, Volume2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { VoiceParticipant } from "./types";

interface Props {
  channelId: string;
  channelName: string;
  userId: string;
  username: string;
}

// Simple WebRTC mesh — works for ~2-4 people
const ICE = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

const VoiceRoom = ({ channelId, channelName, userId, username }: Props) => {
  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
  const [muted, setMuted] = useState(false);
  const [connected, setConnected] = useState(false);
  const localStream = useRef<MediaStream | null>(null);
  const peers = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audioEls = useRef<Map<string, HTMLAudioElement>>(new Map());
  const pollRef = useRef<number | null>(null);
  const lastSignalAt = useRef<string>(new Date(Date.now() - 60000).toISOString());

  const sendSignal = async (toUser: string, kind: string, payload: any) => {
    await supabase.from("voice_signals").insert({
      channel_id: channelId, from_user: userId, to_user: toUser, kind, payload,
    });
  };

  const createPeer = (otherId: string, initiator: boolean) => {
    if (peers.current.has(otherId)) return peers.current.get(otherId)!;
    const pc = new RTCPeerConnection(ICE);
    peers.current.set(otherId, pc);
    localStream.current?.getTracks().forEach((t) => pc.addTrack(t, localStream.current!));
    pc.onicecandidate = (e) => { if (e.candidate) sendSignal(otherId, "ice", e.candidate.toJSON()); };
    pc.ontrack = (e) => {
      let el = audioEls.current.get(otherId);
      if (!el) {
        el = new Audio();
        el.autoplay = true;
        audioEls.current.set(otherId, el);
      }
      el.srcObject = e.streams[0];
    };
    if (initiator) {
      (async () => {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignal(otherId, "offer", offer);
      })();
    }
    return pc;
  };

  const fetchParticipants = async () => {
    const { data } = await supabase.from("voice_participants").select("*").eq("channel_id", channelId);
    if (data) setParticipants(data as VoiceParticipant[]);
    return data || [];
  };

  const pollSignals = async () => {
    const { data } = await supabase
      .from("voice_signals")
      .select("*")
      .eq("to_user", userId)
      .eq("channel_id", channelId)
      .gt("created_at", lastSignalAt.current)
      .order("created_at");
    if (!data || data.length === 0) return;
    for (const s of data) {
      lastSignalAt.current = s.created_at;
      const pc = createPeer(s.from_user, false);
      try {
        if (s.kind === "offer") {
          await pc.setRemoteDescription(s.payload as any);
          const ans = await pc.createAnswer();
          await pc.setLocalDescription(ans);
          await sendSignal(s.from_user, "answer", ans);
        } else if (s.kind === "answer") {
          await pc.setRemoteDescription(s.payload as any);
        } else if (s.kind === "ice") {
          await pc.addIceCandidate(s.payload as any);
        }
      } catch (e) { console.error("signal err", e); }
    }
    // cleanup processed signals
    await supabase.from("voice_signals").delete().in("id", data.map((d) => d.id));
  };

  const join = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStream.current = stream;
      await supabase.from("voice_participants").upsert(
        { channel_id: channelId, user_id: userId, username },
        { onConflict: "channel_id,user_id" }
      );
      setConnected(true);
      const list = await fetchParticipants();
      // initiate to existing peers (only those with smaller id to avoid double-offer)
      for (const p of list) {
        if (p.user_id !== userId && p.user_id < userId) createPeer(p.user_id, true);
      }
      pollRef.current = window.setInterval(pollSignals, 1000);
    } catch (e: any) {
      toast({ title: "Mic error", description: e.message, variant: "destructive" });
    }
  };

  const leave = async () => {
    if (pollRef.current) clearInterval(pollRef.current);
    peers.current.forEach((p) => p.close());
    peers.current.clear();
    audioEls.current.forEach((a) => { a.srcObject = null; });
    audioEls.current.clear();
    localStream.current?.getTracks().forEach((t) => t.stop());
    localStream.current = null;
    await supabase.from("voice_participants").delete().eq("channel_id", channelId).eq("user_id", userId);
    setConnected(false);
  };

  useEffect(() => {
    fetchParticipants();
    const ch = supabase
      .channel(`voice-${channelId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "voice_participants", filter: `channel_id=eq.${channelId}` }, () => {
        fetchParticipants();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
      if (connected) leave();
    };
    // eslint-disable-next-line
  }, [channelId]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    localStream.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Volume2 className="h-4 w-4 text-muted-foreground" />
        <span className="font-semibold">{channelName}</span>
        <span className="text-xs text-muted-foreground ml-2">{participants.length} connected</span>
      </div>
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {participants.map((p) => (
            <div key={p.id} className="bg-card border border-border rounded-xl p-4 flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center font-bold">
                {(p.username || "?").slice(0, 2).toUpperCase()}
              </div>
              <span className="text-sm truncate w-full text-center">{p.username || "anonymous"}</span>
            </div>
          ))}
          {participants.length === 0 && (
            <div className="col-span-full text-center text-muted-foreground py-12">No one is here yet</div>
          )}
        </div>
      </div>
      <div className="border-t border-border p-3 flex items-center justify-center gap-2">
        {!connected ? (
          <Button variant="neon" onClick={join}>
            <Mic className="h-4 w-4" /> Join voice
          </Button>
        ) : (
          <>
            <Button variant={muted ? "destructive" : "secondary"} size="sm" onClick={toggleMute}>
              {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              {muted ? "Unmute" : "Mute"}
            </Button>
            <Button variant="destructive" size="sm" onClick={leave}>
              <PhoneOff className="h-4 w-4" /> Leave
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default VoiceRoom;
