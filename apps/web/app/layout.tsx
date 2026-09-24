import type { Metadata } from "next";
import { Inter, Syncopate } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";


/**
 * Syncopate solo per i titoli: e' largo, meccanico, automobilistico, e su una
 * riga breve come "Panda 1.2 Easy" funziona benissimo. Come testo corrente
 * sarebbe illeggibile, e la direzione grafica lo abbinava a un monospace che
 * rende faticosi proprio i numeri che devono convincere — prezzo e chilometri.
 */
const titoli = Syncopate({
  variable: "--font-titoli",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

const testo = Inter({
  variable: "--font-corpo",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Lab Piattaforma",
  description: "Le offerte del tuo venditore di fiducia.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="it"
      className={cn("h-full antialiased font-sans", titoli.variable, testo.variable)}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
