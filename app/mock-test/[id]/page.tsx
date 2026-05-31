"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { mockResultsUrl, mockTakeUrl } from "../../lib/mock-test-runner";
import type { MockTestSkill } from "../../lib/mock-test-types";

const SKILL_STYLE: Record<MockTestSkill, { btn: string; text: string }> = {
  Reading: { btn: "bg-green-600 hover:bg-green-700", text: "text-green-700" },
  Writing: { btn: "bg-blue-600 hover:bg-blue-700", text: "text-blue-700" },
  Speaking: { btn: "bg-purple-600 hover:bg-purple-700", text: "text-purple-700" },
  Listening: { btn: "bg-orange-600 hover:bg-orange-700", text: "text-orange-700" },
};

export default function MockTestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const mockId = params.id as string;

  const [test, setTest] = useState<{
    title: string;
    description: string | null;
    test_type: MockTestSkill;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/mock-tests/${mockId}`);
    if (res.ok) {
      const json = await res.json();
      setTest(json.test);
    }
    setLoading(false);
  }, [mockId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleStart() {
    setStarting(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push(`/login?next=/mock-test/${mockId}`);
      return;
    }

    const attemptRes = await fetch(`/api/mock-tests/${mockId}/attempt`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (!attemptRes.ok) {
      const json = await attemptRes.json().catch(() => ({}));
      alert(json.error || "Could not start the mock test. Please try again or contact support.");
      setStarting(false);
      return;
    }

    const { attempt } = await attemptRes.json();
    if (attempt?.status === "submitted" && attempt?.id) {
      router.push(mockResultsUrl(mockId, attempt.id));
      return;
    }

    router.push(mockTakeUrl(mockId));
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading…</p>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-700">Mock test not found.</p>
        <Link href="/mock-test" className="text-indigo-700 underline">
          Back
        </Link>
      </div>
    );
  }

  const style = SKILL_STYLE[test.test_type];

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-6">
      <div className="max-w-lg mx-auto text-center">
        <Link href="/mock-test" className={`text-sm hover:underline ${style.text}`}>
          ← All mock tests
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mt-8">{test.title}</h1>
        <p className={`text-sm font-medium mt-2 ${style.text}`}>{test.test_type} mock test</p>
        {test.description && <p className="text-gray-600 mt-4">{test.description}</p>}

        <button
          type="button"
          onClick={() => void handleStart()}
          disabled={starting}
          className={`mt-10 w-full text-white font-bold py-4 rounded-xl text-lg transition disabled:opacity-60 ${style.btn}`}
        >
          {starting ? "Starting…" : "Start"}
        </button>
      </div>
    </div>
  );
}
