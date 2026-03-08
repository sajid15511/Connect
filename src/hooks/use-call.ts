"use client";

import { useCallback, useEffect } from "react";
import { useAppStore } from "@/stores/app-store";
import { getSocket } from "@/hooks/use-socket";

let sharedPeerConnection: RTCPeerConnection | null = null;
let sharedLocalStream: MediaStream | null = null;
let sharedRemoteStream: MediaStream | null = null;
let sharedTargetPeerId: string | null = null;
let sharedAcceptingCall = false;
let sharedRemoteAnswerApplied = false;

let sharedLocalVideoElement: HTMLVideoElement | null = null;
let sharedRemoteVideoElement: HTMLVideoElement | null = null;
let sharedRemoteAudioElement: HTMLAudioElement | null = null;

function attachMediaStream(element: HTMLMediaElement | null, stream: MediaStream | null) {
  if (!element) return;
  if (element.srcObject !== stream) {
    element.srcObject = stream;
  }
}

function syncMediaElements() {
  attachMediaStream(sharedLocalVideoElement, sharedLocalStream);
  attachMediaStream(sharedRemoteVideoElement, sharedRemoteStream);
  attachMediaStream(sharedRemoteAudioElement, sharedRemoteStream);
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

function cleanupSharedCallResources() {
  stopStream(sharedLocalStream);
  stopStream(sharedRemoteStream);

  sharedLocalStream = null;
  sharedRemoteStream = null;

  sharedPeerConnection?.close();
  sharedPeerConnection = null;

  sharedTargetPeerId = null;
  sharedAcceptingCall = false;
  sharedRemoteAnswerApplied = false;

  syncMediaElements();
}

function createPeerConnection() {
  sharedPeerConnection?.close();

  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  });

  pc.onicecandidate = (event) => {
    if (!event.candidate || !sharedTargetPeerId) return;

    const socket = getSocket();
    socket?.emit("call:ice-candidate", {
      to: sharedTargetPeerId,
      candidate: event.candidate,
    });
  };

  pc.ontrack = (event) => {
    sharedRemoteStream = event.streams[0] || null;
    syncMediaElements();
  };

  sharedPeerConnection = pc;
  return pc;
}

export function useCall() {
  const { callState, setCallState } = useAppStore();

  const setLocalVideoRef = useCallback((element: HTMLVideoElement | null) => {
    sharedLocalVideoElement = element;
    syncMediaElements();
  }, []);

  const setRemoteVideoRef = useCallback((element: HTMLVideoElement | null) => {
    sharedRemoteVideoElement = element;
    syncMediaElements();
  }, []);

  const setRemoteAudioRef = useCallback((element: HTMLAudioElement | null) => {
    sharedRemoteAudioElement = element;
    syncMediaElements();
  }, []);

  const setMicEnabled = useCallback((enabled: boolean) => {
    sharedLocalStream?.getAudioTracks().forEach((track) => {
      track.enabled = enabled;
    });
  }, []);

  const setCameraEnabled = useCallback((enabled: boolean) => {
    sharedLocalStream?.getVideoTracks().forEach((track) => {
      track.enabled = enabled;
    });
  }, []);

  const startCall = useCallback(
    async (peerId: string, peerName: string, type: "audio" | "video") => {
      try {
        cleanupSharedCallResources();
        sharedTargetPeerId = peerId;

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: type === "video",
        });

        sharedLocalStream = stream;
        syncMediaElements();

        const pc = createPeerConnection();
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        getSocket()?.emit("call:initiate", {
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
        cleanupSharedCallResources();
        setCallState(null);
      }
    },
    [setCallState]
  );

  const acceptCall = useCallback(async () => {
    if (!callState?.signal || callState.direction !== "incoming" || callState.status !== "ringing") {
      return;
    }

    if (sharedAcceptingCall) return;

    sharedAcceptingCall = true;

    try {
      cleanupSharedCallResources();
      sharedTargetPeerId = callState.peerId;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callState.type === "video",
      });

      sharedLocalStream = stream;
      syncMediaElements();

      const pc = createPeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      if (pc.signalingState !== "stable") {
        throw new Error(`Unexpected signaling state before accepting offer: ${pc.signalingState}`);
      }

      await pc.setRemoteDescription(new RTCSessionDescription(callState.signal as RTCSessionDescriptionInit));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      getSocket()?.emit("call:accept", {
        to: callState.peerId,
        signal: answer,
      });

      setCallState({ ...callState, status: "connected" });
    } catch (err) {
      console.error("Failed to accept call:", err);
      cleanupSharedCallResources();
      setCallState(null);
    } finally {
      sharedAcceptingCall = false;
    }
  }, [callState, setCallState]);

  const rejectCall = useCallback(() => {
    if (!callState) return;

    getSocket()?.emit("call:reject", { to: callState.peerId });
    cleanupSharedCallResources();
    setCallState(null);
  }, [callState, setCallState]);

  const endCall = useCallback(() => {
    if (callState) {
      getSocket()?.emit("call:end", { to: callState.peerId });
    }

    cleanupSharedCallResources();
    setCallState(null);
  }, [callState, setCallState]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onIceCandidate = ({ candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
      if (!sharedPeerConnection || !candidate) return;

      sharedPeerConnection
        .addIceCandidate(new RTCIceCandidate(candidate))
        .catch((err) => {
          // Can happen with duplicate/late candidates during teardown/reconnect.
          console.debug("Ignoring ICE candidate error:", err);
        });
    };

    socket.on("call:ice-candidate", onIceCandidate);
    return () => {
      socket.off("call:ice-candidate", onIceCandidate);
    };
  }, []);

  useEffect(() => {
    if (!callState) {
      cleanupSharedCallResources();
    }
  }, [callState]);

  useEffect(() => {
    const shouldApplyAnswer =
      callState?.direction === "outgoing" &&
      callState.status === "connected" &&
      Boolean(callState.signal);

    if (!shouldApplyAnswer || sharedRemoteAnswerApplied || !sharedPeerConnection) return;

    if (sharedPeerConnection.signalingState !== "have-local-offer") {
      return;
    }

    sharedPeerConnection
      .setRemoteDescription(new RTCSessionDescription(callState.signal as RTCSessionDescriptionInit))
      .then(() => {
        sharedRemoteAnswerApplied = true;
      })
      .catch((err) => {
        console.error("Failed to apply remote answer:", err);
      });
  }, [callState?.direction, callState?.status, callState?.signal]);

  return {
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    setMicEnabled,
    setCameraEnabled,
    setLocalVideoRef,
    setRemoteVideoRef,
    setRemoteAudioRef,
    callState,
  };
}
