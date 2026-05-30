import type { Metadata } from "next";
import "./globals.css";
import { fontSans, fontVariables } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "RPG Hub",
  description: "RPG Hub ERP System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full antialiased ${fontVariables}`}>
      <body className={`${fontSans.className} min-h-full flex flex-col`}>
        {children}
      </body>
    </html>
  );
}
