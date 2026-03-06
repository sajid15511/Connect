"use client";

import { useCallback, useRef, useEffect } from "react";
import { useAppStore } from "@/stores/app-store";
import { getSocket } from "@/hooks/use-socket";

interface UseCallParams {
  userId: string;
}

export function useCall({ userId }: UseCallParams) {
  const { callState, setCallState } = useAppStore();
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const socket = getSocket();
        if (callState?.peerId) {
          socket?.emit("call:ice-candidate", {
            to: callState.peerId,
            candidate: event.candidate,
          });
        }
      }
    };

    pc.ontrack = (event) => {
      remoteStreamRef.current = event.streams[0];
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [callState?.peerId]);

  const startCall = useCallback(
    async (peerId: string, peerName: string, type: "audio" | "video") => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: type === "video",
        });

        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        const pc = createPeerConnection();
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const socket = getSocket();
        socket?.emit("call:initiate", {
          to: peerId,
          signal: offer,
          type,
        });

        setCallState({
          peerId,
          peerName,
          type,
          direction: "outgoing",
          status: "ringing",
        });
      } catch (err) {
        console.error("Failed to start call:", err);
      }
    },
    [createPeerConnection, setCallState]
  );

  const acceptCall = useCallback(async () => {
    if (!callState?.signal) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callState.type === "video",
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = createPeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(callState.signal as RTCSessionDescriptionInit));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      const socket = getSocket();
      socket?.emit("call:accept", {
        to: callState.peerId,
        signal: answer,
      });

      setCallState({ ...callState, status: "connected" });
    } catch (err) {
      console.error("Failed to accept call:", err);
    }
  }, [callState, createPeerConnection, setCallState]);

  const rejectCall = useCallback(() => {
    if (!callState) return;
    const socket = getSocket();
    socket?.emit("call:reject", { to: callState.peerId });
    setCallState(null);
  }, [callState, setCallState]);

  const endCall = useCallback(() => {
    if (callState) {
      const socket = getSocket();
      socket?.emit("call:end", { to: callState.peerId });
    }

    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    setCallState(null);
  }, [callState, setCallState]);

  // Handle ICE candidates
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onIceCandidate = ({ candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    };

    socket.on("call:ice-candidate", onIceCandidate);
    return () => {
      socket.off("call:ice-candidate", onIceCandidate);
    };
  }, []);

  // Handle accepted signal (for outgoing calls)
  useEffect(() => {
    if (callState?.direction === "outgoing" && callState.status === "connected" && callState.signal) {
      peerConnectionRef.current?.setRemoteDescription(
        new RTCSessionDescription(callState.signal as RTCSessionDescriptionInit)
      );
    }
  }, [callState]);

  return {
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    localVideoRef,
    remoteVideoRef,
    callState,
  };
}
