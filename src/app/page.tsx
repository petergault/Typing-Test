"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Lesson1StoredData, readProgress, resetProgress } from "@/lib/progress";

const getStars = (count?: number) => {
  if (!count) return "★";
  return "★".repeat(Math.max(count, 1)).padEnd(5, "☆");
};

export default function Home() {
  const [lesson1, setLesson1] = useState<Lesson1StoredData | null>(null);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  useEffect(() => {
    const stored = readProgress();
    if (stored && stored.lesson1) {
      setLesson1(stored.lesson1);
    }
  }, []);

  const handleReset = () => {
    setResetError(null);
    setResetting(true);
    try {
      resetProgress();
      setLesson1(null);
    } catch (error) {
      setResetError("We could not clear progress on this browser.");
    } finally {
      setResetting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-purple-50 text-slate-800">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-12">
        <header className="flex flex-col gap-3 rounded-3xl bg-white/80 p-6 shadow-lg ring-1 ring-slate-100 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-purple-600">Quill Typing</p>
            <h1 className="text-3xl font-black text-slate-900">Lesson 1: Home Row Heroes</h1>
            <p className="mt-2 text-base text-slate-700">
              Learn touch typing with friendly drills, a mini-game, and real-time feedback. Start with F and J and build great habits.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:items-end">
            <Link
              href="/lesson/1"
              className="inline-flex items-center justify-center rounded-full bg-purple-600 px-6 py-3 text-lg font-semibold text-white shadow-lg shadow-purple-200 transition hover:translate-y-0.5 hover:bg-purple-700"
            >
              Start Lesson 1
            </Link>
            <button
              type="button"
              onClick={handleReset}
              className="text-sm font-semibold text-slate-600 underline-offset-4 hover:underline"
              disabled={resetting}
            >
              {resetting ? "Clearing…" : "Start fresh on this device"}
            </button>
            {resetError ? <p className="text-xs text-red-600">{resetError}</p> : null}
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl bg-white/80 p-6 shadow-md ring-1 ring-slate-100">
            <h2 className="text-xl font-bold text-slate-900">What&apos;s inside Lesson 1</h2>
            <ul className="mt-4 space-y-2 text-sm leading-relaxed text-slate-700">
              <li>✓ Posture and home row warm-up</li>
              <li>✓ Friendly F-only and J-only drills with instant feedback</li>
              <li>✓ Alternating F/J challenge with positive streak celebrations</li>
              <li>✓ F &amp; J mini-game that rewards accuracy over spamming</li>
              <li>✓ Summary with stars, accuracy, and local progress saving</li>
            </ul>
            <p className="mt-4 text-xs text-slate-500">
              Progress is saved in this browser only. If you share this device, tap “Start fresh” so the next student begins at the start.
            </p>
          </div>

          <div className="rounded-3xl bg-gradient-to-br from-white to-sky-50 p-6 shadow-md ring-1 ring-slate-100">
            <h2 className="text-xl font-bold text-slate-900">Lesson 1 status</h2>
            {lesson1 ? (
              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <p className="flex items-center gap-2 text-base font-semibold text-green-700">
                  <span className="text-2xl">✔</span> Completed on this device
                </p>
                <p>Last accuracy: {(lesson1.lastAccuracy ? Math.round(lesson1.lastAccuracy * 100) : 0)}%</p>
                <p>Last stars: {getStars(lesson1.lastStars)}</p>
                <p>Best stars: {getStars(lesson1.bestStars)}</p>
                {lesson1.bestGameScore !== undefined ? <p>Best game score: {lesson1.bestGameScore}</p> : null}
                <p className="text-xs text-slate-500">Data stays on this browser. Clearing cookies or using another device will remove it.</p>
              </div>
            ) : (
              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <p className="flex items-center gap-2 text-base font-semibold text-slate-800">
                  <span className="text-2xl">🌟</span> You haven&apos;t completed Lesson 1 yet.
                </p>
                <p>Click “Start Lesson 1” to begin. We&apos;ll guide you with on-screen keys and encouraging tips.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
