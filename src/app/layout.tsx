import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Global Rec Mun Silva",
  description: "Sistema Integrado de Recaudación Municipal para el Municipio Silva.",
  openGraph: {
    title: "Global Rec Mun Silva",
    description: "Accede al Sistema Integrado de Recaudación del Municipio Silva. Autogestión en línea para contribuyentes y operadores.",
    url: "https://aseosilva.globalrecca.com",
    siteName: "Global Rec Mun Silva",
    locale: "es_VE",
    type: "website",
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#f8fafc]">
        {children}
      </body>
    </html>
  );
}
