"use client";
import { Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
export function VoiceChannelCard({ channels, player }: { channels: any; player: any }) { return <Card><CardHeader><CardTitle>Голосовой канал</CardTitle><CardDescription>Выберите канал для воспроизведения.</CardDescription></CardHeader><CardContent className="flex flex-col gap-3"><Select onValueChange={(value: string) => player.join(value)}><SelectTrigger><SelectValue placeholder="Выбрать канал" /></SelectTrigger><SelectContent>{channels.data?.map((channel: any) => <SelectItem key={channel.id} value={channel.id}>{channel.name}</SelectItem>)}</SelectContent></Select><Button variant="outline" onClick={() => player.leave()} disabled={!player.data}><Wifi data-icon="inline-start" />Покинуть канал</Button></CardContent></Card>; }
