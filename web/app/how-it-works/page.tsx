import type { Metadata } from "next";
import { HowItWorks } from "./HowItWorks";

export const metadata: Metadata = {
  title: "How the widening works — Semitic Search",
  description:
    "Hebrew and Syriac don't have Unicode tatweel like Arabic does. Here's how we added letter widening back via GSUB ligatures, and how the mkmk chain lets three layers of marks stack under a Hebrew letter.",
};

export default function HowItWorksPage() {
  return <HowItWorks />;
}
