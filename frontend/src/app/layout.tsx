import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DATAEKO × meshIQ | IBM MQ Economic Assessment Intake Wizard",
  description:
    "Enterprise discovery intake and deterministic economic assessment modeling for IBM MQ messaging environments.",
};

import { AuthProvider } from "../context/AuthContext";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-[#F7F8FA] antialiased">
      <body className={`${inter.className} min-h-full flex flex-col bg-[#F7F8FA] text-[#172033]`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
