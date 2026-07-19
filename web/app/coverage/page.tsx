import type { Metadata } from "next";
import { CoverageChart } from "./CoverageChart";
import coverage from "./coverage.json";

export const metadata: Metadata = {
  title: "Hebrew widening coverage — Semitic Search",
  description:
    "Which of the 15 Semitic Stretch Hebrew fonts widen which of the 19 stretchable letters, with infinite-extension letters marked separately.",
};

export default function CoveragePage() {
  return <CoverageChart data={coverage as never} />;
}
