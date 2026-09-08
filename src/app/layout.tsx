import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  display: "swap",
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
      className={`${poppins.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#f8fafc]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
