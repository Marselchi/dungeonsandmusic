"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ApiClient } from "../api/client";
import { BackendSocket, wsUrlFromHttpBaseUrl } from "../ws/client";
import type { ConnectionStatus } from "../ws/types";
import { DEFAULT_BACKEND_URL, loadPersistedBackendUrl, loadPersistedToken, persistBackendUrl, persistToken } from "./persistence";

interface BackendContextValue {
  backendUrl: string;
  setBackendUrl: (url: string) => void;
  token: string | null;
  setToken: (token: string | null) => void;
  api: ApiClient;
  socket: BackendSocket | null;
  socketStatus: ConnectionStatus;
  /** True once a token is set. Does NOT mean the token is valid — pair with a health/guilds call to confirm. */
  isPaired: boolean;
}

const BackendContext = createContext<BackendContextValue | null>(null);

export function BackendProvider({ children }: { children: ReactNode }) {
  // Hydration note: these start at safe defaults on the server-rendered
  // pass and are corrected from localStorage in an effect below, since
  // this whole app is exported statically and localStorage doesn't exist
  // at build/export time.
  const [backendUrl, setBackendUrlState] = useState(DEFAULT_BACKEND_URL);
  const [token, setTokenState] = useState<string | null>(null);
  const [socket, setSocket] = useState<BackendSocket | null>(null);
  const [socketStatus, setSocketStatus] = useState<ConnectionStatus>("idle");

  useEffect(() => {
    setBackendUrlState(loadPersistedBackendUrl());
    setTokenState(loadPersistedToken());
  }, []);

  const setBackendUrl = useCallback((url: string) => {
    persistBackendUrl(url);
    setBackendUrlState(url);
  }, []);

  const setToken = useCallback((next: string | null) => {
    persistToken(next);
    setTokenState(next);
  }, []);

  const api = useMemo(() => new ApiClient({ baseUrl: backendUrl, token }), [backendUrl, token]);

  // (Re)connect the socket whenever the backend URL or token changes.
  useEffect(() => {
    if (!token) {
      setSocket(null);
      setSocketStatus("idle");
      return;
    }

    const next = new BackendSocket(wsUrlFromHttpBaseUrl(backendUrl), token);
    const unsubStatus = next.onStatusChange(setSocketStatus);
    next.connect();
    setSocket(next);

    return () => {
      unsubStatus();
      next.disconnect();
    };
  }, [backendUrl, token]);

  const value: BackendContextValue = {
    backendUrl,
    setBackendUrl,
    token,
    setToken,
    api,
    socket,
    socketStatus,
    isPaired: token !== null,
  };

  return <BackendContext.Provider value={value}>{children}</BackendContext.Provider>;
}

export function useBackend(): BackendContextValue {
  const ctx = useContext(BackendContext);
  if (!ctx) throw new Error("useBackend() must be called within a <BackendProvider>");
  return ctx;
}
