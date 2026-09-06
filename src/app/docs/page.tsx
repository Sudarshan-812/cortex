import type { Metadata } from "next";
import DocsContent from "./DocsContent";

export const metadata: Metadata = {
  title: "Docs",
  description: "Learn how to use Cortex - connect Google Drive, ask questions in plain language, and open the cited source behind every answer.",
};

export default function DocsPage() {
  return <DocsContent />;
}
