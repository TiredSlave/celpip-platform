"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getPracticeTaskTypeOptions,
  isPracticeTaskTypeActive,
  type PracticeSection,
} from "../lib/practice-task-nav";
import type { ReadingTaskRow } from "../lib/reading-task-types";

type Props = {
  section: PracticeSection;
  currentLabel: string;
  currentTaskType?: string;
  taskRow?: ReadingTaskRow;
  className?: string;
};

const ACCENT: Record<PracticeSection, { trigger: string; active: string }> = {
  reading: {
    trigger: "text-gray-800 hover:text-green-700",
    active: "bg-green-50 text-green-800 font-semibold",
  },
  writing: {
    trigger: "text-gray-800 hover:text-blue-700",
    active: "bg-blue-50 text-blue-800 font-semibold",
  },
  speaking: {
    trigger: "text-gray-900 hover:text-purple-700",
    active: "bg-purple-50 text-purple-800 font-semibold",
  },
  listening: {
    trigger: "text-indigo-900 hover:text-orange-700",
    active: "bg-orange-50 text-orange-900 font-semibold",
  },
};

export function PracticeTaskTypeDropdown({
  section,
  currentLabel,
  currentTaskType,
  taskRow,
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const options = getPracticeTaskTypeOptions(section);
  const accent = ACCENT[section];

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`inline-flex items-center gap-1.5 text-lg font-bold transition ${accent.trigger}`}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="truncate">{currentLabel}</span>
        <span
          className={`text-xs text-gray-500 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          ▾
        </span>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-full z-50 mt-1 min-w-[260px] max-w-[320px] rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
        >
          {options.map(opt => {
            const active = isPracticeTaskTypeActive(section, opt, currentTaskType, taskRow);
            return (
              <button
                key={opt.href}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  setOpen(false);
                  router.push(opt.href);
                }}
                className={`w-full px-4 py-2.5 text-left text-sm transition ${
                  active ? accent.active : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span className="block">{opt.menuLabel}</span>
                {opt.subtitle && (
                  <span className="mt-0.5 block text-xs text-gray-500 line-clamp-2">{opt.subtitle}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
