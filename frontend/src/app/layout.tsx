import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DATAEKO × meshIQ | IBM MQ Economic Assessment Intake Wizard",
  description:
    "Enterprise discovery intake and deterministic economic assessment modeling for IBM MQ messaging environments.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-slate-100 antialiased">
      <body className={`${inter.className} min-h-full flex flex-col bg-slate-100 text-slate-900`}>
        {children}
      </body>
    </html>
  );
}
