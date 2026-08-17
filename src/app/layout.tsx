import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist_Mono, Inter } from "next/font/google";
import localFont from "next/font/local";

import "./globals.css";

/**
 * Tipografia da identidade do Grupo MedCof: Switzer nos títulos, Inter no
 * corpo — as mesmas do site institucional.
 *
 * Ambas são auto-hospedadas (o `next/font` baixa a Inter na build; a Switzer
 * está em `public/fonts`), então a plataforma não depende de CDN de terceiro
 * para renderizar texto.
 */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const switzer = localFont({
  variable: "--font-switzer",
  display: "swap",
  // `fallback` evita o pulo de layout enquanto a fonte carrega.
  fallback: ["system-ui", "sans-serif"],
  src: [
    { path: "../../public/fonts/Switzer-400.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/Switzer-500.woff2", weight: "500", style: "normal" },
    { path: "../../public/fonts/Switzer-600.woff2", weight: "600", style: "normal" },
    { path: "../../public/fonts/Switzer-700.woff2", weight: "700", style: "normal" },
  ],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Central do Marketing · MedCof",
    template: "%s · Central do Marketing",
  },
  description:
    "Plataforma interna do time de marketing da MedCof: ferramentas, processos e convenções em um só lugar.",
  // Plataforma interna: não deve aparecer em buscador nenhum.
  robots: { index: false, follow: false },
  icons: { icon: "/brand/medcof-mark.svg" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${switzer.variable} ${geistMono.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
