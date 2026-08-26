import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Quantum-Thermal Qubit Coherence Optimizer",
  description:
    "AI/physics-based research and simulation framework for temperature-aware quantum-system optimization. FortyGuard Global AI Hackathon '26 — Track 05 Model Designing.",
  keywords: [
    "quantum",
    "qubit",
    "coherence",
    "thermal",
    "optimization",
    "FortyGuard",
    "Pareto",
    "cooling energy",
  ],
  authors: [{ name: "Quantum-Thermal Research" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen`}
        suppressHydrationWarning
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
