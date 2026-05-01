import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/app/providers/QueryProvider";

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
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
