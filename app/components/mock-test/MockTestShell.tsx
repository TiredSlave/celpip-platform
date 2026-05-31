"use client";

import Link from "next/link";
import { formatMockTime } from "../../lib/mock-test-times";
import type { MockTestSkill } from "../../lib/mock-test-types";

const SKILL_STYLE: Record<
  MockTestSkill,
  { accent: string; timer: string; btn: string }
> = {
  Reading: {
    accent: "text-green-700",
    timer: "border-green-500 text-green-600 bg-green-50",
    btn: "bg-green-600 hover:bg-green-700",
  },
  Writing: {
    accent: "text-blue-700",
    timer: "border-blue-500 text-blue-600 bg-blue-50",
    btn: "bg-blue-600 hover:bg-blue-700",
  },
  Speaking: {
    accent: "text-purple-700",
    timer: "border-purple-500 text-purple-600 bg-purple-50",
    btn: "bg-purple-600 hover:bg-purple-700",
  },
  Listening: {
    accent: "text-orange-700",
    timer: "border-orange-500 text-orange-600 bg-orange-50",
    btn: "bg-orange-600 hover:bg-orange-700",
  },
};

type Props = {
  skill: MockTestSkill;
  mockTitle: string;
  partLabel: string;
  partTitle: string;
  order: number;
  totalParts: number;
  timeLeft: number;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  children: React.ReactNode;
  backHref?: string;
};

export default function MockTestShell({
  skill,
  mockTitle,
  partLabel,
  partTitle,
  order,
  totalParts,
  timeLeft,
  onNext,
  nextLabel = "Next part",
  nextDisabled = false,
  children,
  backHref,
}: Props) {
  const style = SKILL_STYLE[skill];
  const urgent = timeLeft < 60;

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <div className="bg-white/95 backdrop-blur-md border-b border-gray-200 px-4 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-20 shadow-sm">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-600 truncate mb-0.5">{mockTitle}</p>
          <div className="flex items-baseline gap-2 flex-wrap">
            <h1 className={`text-2xl font-bold text-gray-900 tracking-tight ${style.accent}`}>
              {skill} — {partLabel}
            </h1>
            <span className="text-base text-gray-700 font-medium">{partTitle}</span>
          </div>
          <p className="text-sm text-gray-600 mt-1 font-medium">
            Part {order} of {totalParts}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 font-mono font-bold text-base ${
              urgent ? "border-red-500 text-red-700 bg-red-50" : style.timer
            }`}
          >
            🕐 {formatMockTime(timeLeft)}
          </div>
          <button
            type="button"
            onClick={onNext}
            disabled={nextDisabled}
            className={`px-5 py-2.5 text-white font-semibold rounded-xl text-base transition disabled:opacity-50 shadow-sm ${style.btn}`}
          >
            {nextLabel}
          </button>
        </div>
      </div>

      {backHref && (
        <div className="px-6 sm:px-8 py-2.5 bg-slate-50 border-b border-gray-200">
          <Link href={backHref} className="text-[15px] font-medium text-gray-700 hover:text-gray-900 hover:underline">
            ← Exit mock (progress saved)
          </Link>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">{children}</div>
    </div>
  );
}
