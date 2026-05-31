"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { PRACTICE_LIST_RETURN_KEY } from "../lib/practice-navigation";

const LIST_PAGE = /^\/practice\/(reading|writing|speaking|listening)$/;

/** Remember the page before opening a section task list. */
export default function PracticeLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const prevPathRef = useRef<string | null>(null);

  useEffect(() => {
    const prev = prevPathRef.current;
    if (pathname && LIST_PAGE.test(pathname) && prev && !LIST_PAGE.test(prev)) {
      sessionStorage.setItem(PRACTICE_LIST_RETURN_KEY, prev);
    }
    prevPathRef.current = pathname ?? null;
  }, [pathname]);

  return <>{children}</>;
}
