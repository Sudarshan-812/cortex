import type { Metadata } from "next";
import DocsContent from "./DocsContent";

export const metadata: Metadata = {
  title: "Docs",
  description: "Learn how to use Cortex - upload documents, query your knowledge base, and integrate via API.",
};

export default function DocsPage() {
  return <DocsContent />;
}
