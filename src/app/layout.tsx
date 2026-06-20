import type { Metadata } from "next";
import { Mona_Sans, Anton, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { SyncManager } from "@/components/SyncManager";
import { UndoSnackbar } from "@/components/UndoSnackbar";

// Body / UI: Mona Sans — GitHub's typeface, used for all non-FIFA text.
const monaSans = Mona_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

// FIFA parts only (.font-display): Anton — ultra-bold condensed display.
const anton = Anton({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Figurinhas Copa do Mundo 2026",
  description: "Acompanhe sua coleção de figurinhas Panini da Copa do Mundo 2026.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${monaSans.variable} ${anton.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SyncManager />
        <Header />
        {children}
        <UndoSnackbar />
      </body>
    </html>
  );
}
