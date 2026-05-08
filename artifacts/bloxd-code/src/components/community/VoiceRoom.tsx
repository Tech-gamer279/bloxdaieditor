import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
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

const ICE = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

const VoiceRoom = ({ channelId, channelName, userId, username }: Props) => {
  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
  const [muted, setMuted] = useState(false);
  const [connected, setConnected] = useState(false);
  const localStream = useRef<MediaStream | null>(null);
  const peers = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audioEls = useRef<Map<string, HTMLAudioElement>>(new Map());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const participantPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchParticipants = async () => {
    try {
      const data = await apiFetch(`/community/voice/${channelId}/participants`);
      if (data) setParticipants(data as VoiceParticipant[]);
      return (data || []) as VoiceParticipant[];
    } catch {
      return [] as VoiceParticipant[];
    }
  };

  const createPeer = (otherId: string, initiator: boolean) => {
    if (peers.current.has(otherId)) return peers.current.get(otherId)!;
    const pc = new RTCPeerConnection(ICE);
    peers.current.set(otherId, pc);
    localStream.current?.getTracks().forEach((t) => pc.addTrack(t, localStream.current!));
    pc.ontrack = (e) => {
      let el = audioEls.current.get(otherId);
      if (!el) { el = new Audio(); el.autoplay = true; audioEls.current.set(otherId, el); }
      el.srcObject = e.streams[0];
    };
    if (initiator) {
      (async () => {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
      })();
    }
    return pc;
  };

  const join = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStream.current = stream;
      await apiFetch(`/community/voice/${channelId}/join`, {
        method: "POST",
        body: JSON.stringify({ username }),
      });
      setConnected(true);
      const list = await fetchParticipants();
      for (const p of list) {
        if (p.userId !== userId) createPeer(p.userId, true);
      }
      participantPollRef.current = setInterval(fetchParticipants, 3000);
    } catch (e: unknown) {
      toast({ title: "Mic error", description: (e as Error).message, variant: "destructive" });
    }
  };

  const leave = async () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (participantPollRef.current) clearInterval(participantPollRef.current);
    peers.current.forEach((p) => p.close());
    peers.current.clear();
    audioEls.current.forEach((a) => { a.srcObject = null; });
    audioEls.current.clear();
    localStream.current?.getTracks().forEach((t) => t.stop());
    localStream.current = null;
    try {
      await apiFetch(`/community/voice/${channelId}/leave/${userId}`, { method: "DELETE" });
    } catch {}
    setConnected(false);
  };

  useEffect(() => {
    fetchParticipants();
    participantPollRef.current = setInterval(fetchParticipants, 5000);
    return () => {
      if (participantPollRef.current) clearInterval(participantPollRef.current);
      if (connected) leave();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center font-bold text-lg">
                {(p.username || "?").slice(0, 2).toUpperCase()}
              </div>
              <span className="text-sm truncate w-full text-center">{p.username || "anonymous"}</span>
            </div>
          ))}
          {participants.length === 0 && (
            <div className="col-span-full text-center text-muted-foreground py-12">
              <Volume2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>No one is here yet — join to start talking!</p>
            </div>
          )}
        </div>
      </div>
      <div className="border-t border-border p-3 flex items-center justify-center gap-2">
        {!connected ? (
          <Button variant="neon" onClick={join}><Mic className="h-4 w-4 mr-1" /> Join Voice</Button>
        ) : (
          <>
            <Button variant={muted ? "destructive" : "secondary"} size="sm" onClick={toggleMute}>
              {muted ? <MicOff className="h-4 w-4 mr-1" /> : <Mic className="h-4 w-4 mr-1" />}
              {muted ? "Unmute" : "Mute"}
            </Button>
            <Button variant="destructive" size="sm" onClick={leave}><PhoneOff className="h-4 w-4 mr-1" /> Leave</Button>
          </>
        )}
      </div>
    </div>
  );
};

export default VoiceRoom;
