import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Track your maintenance | Real Performance Garage",
  description: "View your maintenance ticket progress, parts, services, and total.",
};

export default function TrackLayout({ children }: { children: React.ReactNode }) {
  return children;
}
