import type { Metadata } from "next";
import { BackendProvider } from "@/lib/store/backend-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "Discord Music Bot",
  description: "Control panel for the Discord music bot backend.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <BackendProvider>{children}</BackendProvider>
      </body>
    </html>
  );
}
