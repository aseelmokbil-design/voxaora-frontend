"use client";
import { useEffect, useRef, useCallback } from "react";
import { DriverAvailableOrder } from "@/lib/api";

const WS_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000")
  .replace(/^http/, "ws");

type WSMessage =
  | { type: "connected"; driver_id: string }
  | { type: "new_order"; order: DriverAvailableOrder & { __taken?: boolean } }
  | { type: "pong" }
  | { type: "error"; detail: string };

interface Options {
  token: string | null;
  enabled: boolean;
  onNewOrder: (order: DriverAvailableOrder) => void;
  onOrderTaken: (orderId: string) => void;
  onLocationInterval?: number; // ms, default 8000
}

export function useDriverWS({
  token, enabled, onNewOrder, onOrderTaken, onLocationInterval = 8000,
}: Options) {
  const wsRef  = useRef<WebSocket | null>(null);
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const geoRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Sound ──────────────────────────────────────────────────────────────────
  const playAlert = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const now = ctx.currentTime;
      // Three ascending tones
      [0, 0.18, 0.36].forEach((delay, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.value = 660 + i * 110;
        gain.gain.setValueAtTime(0, now + delay);
        gain.gain.linearRampToValueAtTime(0.45, now + delay + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.32);
        osc.start(now + delay);
        osc.stop(now + delay + 0.35);
      });
    } catch {
      // AudioContext not available (SSR or policy)
    }
  }, []);

  // ── GPS location sender ────────────────────────────────────────────────────
  const sendLocation = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => {
        wsRef.current?.send(JSON.stringify({
          type: "location",
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }));
      },
      () => {},
      { enableHighAccuracy: true, timeout: 5000 },
    );
  }, []);

  // ── Connect / disconnect ───────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled || !token) return;

    const ws = new WebSocket(`${WS_URL}/api/v1/driver/ws?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      // Start GPS interval
      geoRef.current = setInterval(sendLocation, onLocationInterval);
      // Start ping interval
      pingRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "ping" }));
      }, 25000);
    };

    ws.onmessage = (e) => {
      try {
        const msg: WSMessage = JSON.parse(e.data);
        if (msg.type === "new_order") {
          if (msg.order.__taken) {
            onOrderTaken(msg.order.id);
          } else {
            playAlert();
            onNewOrder(msg.order as DriverAvailableOrder);
          }
        }
      } catch {
        // ignore
      }
    };

    ws.onclose = () => {
      if (geoRef.current)  clearInterval(geoRef.current);
      if (pingRef.current) clearInterval(pingRef.current);
    };

    return () => {
      if (geoRef.current)  clearInterval(geoRef.current);
      if (pingRef.current) clearInterval(pingRef.current);
      ws.close();
    };
  }, [enabled, token, onNewOrder, onOrderTaken, playAlert, sendLocation, onLocationInterval]);
}
