"use client";

import { useBackend } from "@/lib/store/backend-context";
import { ConnectScreen } from "@/components/connect-screen";
import { MusicConsole } from "@/components/music-console";

export default function Home() {
  const { isPaired } = useBackend();
  return isPaired ? <MusicConsole /> : <ConnectScreen />;
}
