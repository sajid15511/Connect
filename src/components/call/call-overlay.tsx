"use client";

import { useAppStore } from "@/stores/app-store";
import { useCall } from "@/hooks/use-call";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff } from "lucide-react";
import { useState } from "react";

export function CallOverlay() {
  const { callState, users } = useAppStore();
  const {
    acceptCall,
    rejectCall,
    endCall,
    setMicEnabled,
    setCameraEnabled,
    setLocalVideoRef,
    setRemoteVideoRef,
    setRemoteAudioRef,
  } = useCall();

  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);

  if (!callState) return null;

  const peerName =
    users.find((u) => u._id === callState.peerId)?.name || callState.peerName;

  const toggleMute = () => {
    const nextMuted = !muted;
    setMicEnabled(!nextMuted);
    setMuted(nextMuted);
  };

  const toggleCamera = () => {
    const nextCameraOff = !cameraOff;
    setCameraEnabled(!nextCameraOff);
    setCameraOff(nextCameraOff);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
      <div className="flex flex-col items-center gap-6">
        {/* Remote Video */}
        {callState.type === "video" && callState.status === "connected" ? (
          <div className="relative">
            <video
              ref={setRemoteVideoRef}
              autoPlay
              playsInline
              className="h-[60vh] max-w-[80vw] rounded-xl bg-gray-900 object-cover"
            />
            {/* Local video pip */}
            <video
              ref={setLocalVideoRef}
              autoPlay
              playsInline
              muted
              className="absolute bottom-4 right-4 h-32 w-24 rounded-lg bg-gray-800 object-cover"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <Avatar className="h-24 w-24">
              <AvatarFallback className="text-2xl">
                {peerName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <h2 className="text-xl font-semibold text-white">{peerName}</h2>
            <p className="text-sm text-gray-400">
              {callState.status === "ringing"
                ? callState.direction === "incoming"
                  ? "Incoming call..."
                  : "Calling..."
                : callState.type === "audio"
                ? "Audio call connected"
                : "Connecting..."}
            </p>
          </div>
        )}

        {/* Remote audio sink for audio-only calls and fallback playback */}
        <audio ref={setRemoteAudioRef} autoPlay playsInline className="hidden" />

        {/* Controls */}
        <div className="flex gap-4">
          {callState.status === "ringing" && callState.direction === "incoming" ? (
            <>
              <Button
                onClick={acceptCall}
                size="lg"
                className="rounded-full bg-green-500 hover:bg-green-600"
              >
                <Phone className="mr-2 h-5 w-5" />
                Accept
              </Button>
              <Button
                onClick={rejectCall}
                size="lg"
                variant="destructive"
                className="rounded-full"
              >
                <PhoneOff className="mr-2 h-5 w-5" />
                Decline
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={toggleMute}
                size="icon"
                variant={muted ? "destructive" : "secondary"}
                className="h-12 w-12 rounded-full"
              >
                {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </Button>

              {callState.type === "video" && (
                <Button
                  onClick={toggleCamera}
                  size="icon"
                  variant={cameraOff ? "destructive" : "secondary"}
                  className="h-12 w-12 rounded-full"
                >
                  {cameraOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                </Button>
              )}

              <Button
                onClick={endCall}
                size="icon"
                variant="destructive"
                className="h-12 w-12 rounded-full"
              >
                <PhoneOff className="h-5 w-5" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
