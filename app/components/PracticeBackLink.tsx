"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { readPracticeListReturn } from "../lib/practice-navigation";

type Props = {
  fallback: string;
  className?: string;
  children: React.ReactNode;
};

/** Back from a task list to the page the user came from (dashboard, /practice, etc.). */
export default function PracticeBackLink({ fallback, className, children }: Props) {
  const [href, setHref] = useState(fallback);

  useEffect(() => {
    setHref(readPracticeListReturn(fallback));
  }, [fallback]);

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
