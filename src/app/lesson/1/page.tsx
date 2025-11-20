"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import VisualKeyboard from "@/components/VisualKeyboard";
import { Lesson1StoredData, readProgress, resetProgress, upsertLesson1 } from "@/lib/progress";

type Stage =
  | "preflight"
  | "intro"
  | "drillF"
  | "drillJ"
  | "drillMix"
  | "gameTutorial"
  | "game"
  | "summary";

type DrillState = {
  sequence: string[];
  index: number;
  errorsOnPrompt: number;
};

type Letter = {
  id: number;
  type: "F" | "J";
  y: number;
  speed: number;
};

type GameStats = {
  shown: number;
  caught: number;
  missed: number;
  wastedPresses: number;
  score: number;
};

const DRILL_F = Array.from({ length: 10 }, () => "F");
const DRILL_J = Array.from({ length: 10 }, () => "J");
const DRILL_MIX = ["F", "J", "F", "J", "J", "F", "F", "J", "F", "J", "F", "J"];
const POSITIVE_FEEDBACK = ["Nice!", "Great job!", "Yes, that\'s it!", "Awesome!" ];
const ERROR_FEEDBACK = ["Almost! Try again.", "Oops, that was another key.", "Give it another try." ];

const randomItem = (list: string[]) => list[Math.floor(Math.random() * list.length)];

const starCount = (accuracy: number) => {
  if (accuracy >= 0.95) return 5;
  if (accuracy >= 0.9) return 4;
  if (accuracy >= 0.8) return 3;
  if (accuracy >= 0.7) return 2;
  return 1;
};

export default function LessonPage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [stage, setStage] = useState<Stage>("preflight");
  const [introStep, setIntroStep] = useState<"posture" | "discoverF" | "discoverJ" | "ready">("posture");
  const [introCounts, setIntroCounts] = useState({ F: 0, J: 0 });
  const [drillState, setDrillState] = useState<DrillState>({ sequence: DRILL_F, index: 0, errorsOnPrompt: 0 });
  const [targetKey, setTargetKey] = useState<string>("F");
  const [feedback, setFeedback] = useState<string>("Click begin and press a key to get started.");
  const [lastPressed, setLastPressed] = useState<{ key: string; correct: boolean } | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [keyboardConnected, setKeyboardConnected] = useState(false);
  const [preflightExpired, setPreflightExpired] = useState(false);
  const [needsFocus, setNeedsFocus] = useState(false);
  const [gameLetters, setGameLetters] = useState<Letter[]>([]);
  const [gameStats, setGameStats] = useState<GameStats>({ shown: 0, caught: 0, missed: 0, wastedPresses: 0, score: 0 });
  const [gameTime, setGameTime] = useState(30);
  const [gameDifficulty, setGameDifficulty] = useState<"slow" | "normal" | "fast">("normal");
  const [gameTutorialStep, setGameTutorialStep] = useState(0);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const [storedLesson, setStoredLesson] = useState<Lesson1StoredData | null>(null);
  const lastKeyTimeRef = useRef<number>(Date.now());
  const letterIdRef = useRef(0);
  const summarySavedRef = useRef(false);

  useEffect(() => {
    const stored = readProgress();
    if (stored && stored.lesson1) {
      setStoredLesson(stored.lesson1);
    }
  }, []);

  useEffect(() => {
    if (stage !== "preflight") return;
    setPreflightExpired(false);
    const timer = setTimeout(() => setPreflightExpired(true), 5000);
    return () => clearTimeout(timer);
  }, [stage]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (stage === "summary") return;
      const now = Date.now();
      if (now - lastKeyTimeRef.current > 5000 && typeof document !== "undefined") {
        if (!document.hasFocus()) {
          setNeedsFocus(true);
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [stage]);

  useEffect(() => {
    if (stage === "game") {
      setGameLetters([]);
      setGameStats({ shown: 0, caught: 0, missed: 0, wastedPresses: 0, score: 0 });
      setGameTime(30);
      setGameDifficulty("normal");
      const fallInterval = setInterval(() => {
        setGameLetters((letters) => {
          const updated = letters
            .map((letter) => ({ ...letter, y: letter.y + letter.speed }))
            .filter((letter) => {
              if (letter.y >= 100) {
                setGameStats((prev) => ({ ...prev, missed: prev.missed + 1 }));
                return false;
              }
              return true;
            });
          return updated;
        });
      }, 120);

      const spawnInterval = setInterval(() => {
        setGameLetters((letters) => {
          const difficulty = gameDifficulty === "fast" ? 1.2 : gameDifficulty === "slow" ? 0.7 : 1;
          const speed = 3 * difficulty;
          const type: "F" | "J" = Math.random() > 0.5 ? "F" : "J";
          letterIdRef.current += 1;
          setGameStats((prev) => ({ ...prev, shown: prev.shown + 1 }));
          return [...letters, { id: letterIdRef.current, type, y: 0, speed }];
        });
      }, gameDifficulty === "fast" ? 700 : gameDifficulty === "slow" ? 1400 : 1000);

      const timerInterval = setInterval(() => {
        setGameTime((time) => {
          if (time <= 1) {
            setStage("summary");
            return 0;
          }
          return time - 1;
        });
      }, 1000);

      return () => {
        clearInterval(fallInterval);
        clearInterval(spawnInterval);
        clearInterval(timerInterval);
      };
    }
  }, [stage, gameDifficulty]);

  useEffect(() => {
    if (stage !== "game") return;
    const totalAttempts = gameStats.shown || 1;
    const accuracy = gameStats.caught / totalAttempts;
    if (accuracy > 0.8 && gameDifficulty !== "fast") {
      setGameDifficulty("fast");
    } else if (accuracy < 0.6 && gameDifficulty !== "slow") {
      setGameDifficulty("slow");
    }
  }, [gameStats, stage, gameDifficulty]);

  const handleDrillAdvance = useCallback(
    (nextStage: Stage, sequence: string[], starterFeedback: string, nextTarget: string) => {
      setDrillState({ sequence, index: 0, errorsOnPrompt: 0 });
      setTargetKey(nextTarget);
      setFeedback(starterFeedback);
      setStage(nextStage);
      setStreak(0);
    },
    [],
  );

  const handleCorrect = useCallback(() => {
    setCorrectCount((prev) => prev + 1);
    setStreak((prev) => {
      const next = prev + 1;
      setBestStreak((best) => Math.max(best, next));
      return next;
    });
  }, []);

  const handleError = useCallback(() => {
    setErrorCount((prev) => prev + 1);
    setStreak(0);
  }, []);

  const handleKey = useCallback(
    (rawKey: string) => {
      const key = rawKey.toUpperCase();
      lastKeyTimeRef.current = Date.now();
      setNeedsFocus(false);

      if (stage === "preflight") {
        setKeyboardConnected(true);
        setStage("intro");
        setIntroStep("posture");
        setFeedback("Great! Let's learn posture first.");
        return;
      }

      if (stage === "intro") {
        if (introStep === "discoverF") {
          setLastPressed({ key, correct: key === "F" });
          if (key === "F") {
            handleCorrect();
            setIntroCounts((prev) => {
              const nextF = prev.F + 1;
              setFeedback(`F presses: ${nextF}/3`);
              if (nextF >= 3) {
                setIntroStep("discoverJ");
                setFeedback("Great! Now find J with your right pointer finger.");
                setTargetKey("J");
              }
              return { ...prev, F: nextF };
            });
          } else {
            handleError();
            setFeedback("Oops, try the F key with your left pointer finger.");
          }
        } else if (introStep === "discoverJ") {
          setLastPressed({ key, correct: key === "J" });
          if (key === "J") {
            handleCorrect();
            setIntroCounts((prev) => {
              const nextJ = prev.J + 1;
              setFeedback(`J presses: ${nextJ}/3`);
              if (nextJ >= 3) {
                setIntroStep("ready");
                setFeedback("Awesome! You found F and J. Ready for practice.");
              }
              return { ...prev, J: nextJ };
            });
          } else {
            handleError();
            setFeedback("That was another key. Try J with your right pointer finger.");
          }
        }
        return;
      }

      if (stage === "drillF" || stage === "drillJ" || stage === "drillMix") {
        const expected = drillState.sequence[drillState.index];
        if (!expected) return;
        const isCorrect = key === expected;
        setLastPressed({ key, correct: isCorrect });
        if (isCorrect) {
          handleCorrect();
          const nextIndex = drillState.index + 1;
          const finished = nextIndex >= drillState.sequence.length;
          setFeedback(randomItem(POSITIVE_FEEDBACK));
          setDrillState({ sequence: drillState.sequence, index: nextIndex, errorsOnPrompt: 0 });
          setTargetKey(drillState.sequence[nextIndex] ?? targetKey);
          if (finished) {
            if (stage === "drillF") {
              handleDrillAdvance("drillJ", DRILL_J, "Now press J with your right pointer finger.", "J");
            } else if (stage === "drillJ") {
              handleDrillAdvance("drillMix", DRILL_MIX, "Time to switch between F and J!", DRILL_MIX[0]);
            } else {
              setFeedback("Great switching! Game time next.");
              setStage("gameTutorial");
              setGameTutorialStep(0);
            }
          }
        } else {
          handleError();
          const errorsOnPrompt = drillState.errorsOnPrompt + 1;
          setDrillState({ ...drillState, errorsOnPrompt });
          setFeedback(
            errorsOnPrompt >= 3
              ? "Here's a hint: look at the glowing key on the keyboard below."
              : randomItem(ERROR_FEEDBACK),
          );
        }
        return;
      }

      if (stage === "gameTutorial") {
        const expected = gameTutorialStep === 0 ? "F" : "J";
        setLastPressed({ key, correct: key === expected });
        if (key === expected) {
          setGameTutorialStep((step) => step + 1);
          setFeedback(gameTutorialStep === 0 ? "Great! Now press J when you see it." : "Tutorial done! Let's play.");
          if (gameTutorialStep >= 1) {
            setStage("game");
          }
        } else {
          setFeedback(`That was ${key}. Wait for the letter on screen and press ${expected}.`);
        }
        return;
      }

      if (stage === "game") {
        const matchIndex = gameLetters.findIndex((letter) => letter.type === key);
        setLastPressed({ key, correct: matchIndex !== -1 });
        if (matchIndex !== -1) {
          handleCorrect();
          setGameStats((prev) => ({ ...prev, caught: prev.caught + 1, score: prev.score + 1 }));
          setGameLetters((letters) => letters.filter((letter, i) => i !== matchIndex));
        } else {
          handleError();
          setGameStats((prev) => ({ ...prev, wastedPresses: prev.wastedPresses + 1 }));
          setFeedback("Wait for the matching letter, then press it.");
        }
      }
    },
    [stage, introStep, drillState, targetKey, gameLetters, gameTutorialStep, handleCorrect, handleError, handleDrillAdvance],
  );

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      handleKey(event.key);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleKey]);

  const handleShowMe = () => {
    if (stage === "intro" && introStep === "discoverF") {
      handleKey("F");
    } else if (stage === "intro" && introStep === "discoverJ") {
      handleKey("J");
    }
  };

  const handleSkipPrompt = () => {
    if (!(stage === "drillF" || stage === "drillJ" || stage === "drillMix")) return;
    setErrorCount((prev) => prev + 1);
    const nextIndex = drillState.index + 1;
    const finished = nextIndex >= drillState.sequence.length;
    setDrillState({ sequence: drillState.sequence, index: nextIndex, errorsOnPrompt: 0 });
    setStreak(0);
    setFeedback("Skipping this one. Keep trying!");
    if (finished) {
      if (stage === "drillF") {
        handleDrillAdvance("drillJ", DRILL_J, "Now press J with your right pointer finger.", "J");
      } else if (stage === "drillJ") {
        handleDrillAdvance("drillMix", DRILL_MIX, "Time to switch between F and J!", DRILL_MIX[0]);
      } else {
        setStage("gameTutorial");
        setGameTutorialStep(0);
      }
    } else {
      setTargetKey(drillState.sequence[nextIndex]);
    }
  };

  const totalAttempts = correctCount + errorCount;
  const accuracy = totalAttempts === 0 ? 1 : correctCount / totalAttempts;

  useEffect(() => {
    if (stage !== "summary" || summarySavedRef.current) return;
    summarySavedRef.current = true;
    try {
      const lastStars = starCount(accuracy);
      const bestStars = storedLesson?.bestStars ? Math.max(storedLesson.bestStars, lastStars) : lastStars;
      const bestAccuracy = storedLesson?.bestAccuracy ? Math.max(storedLesson.bestAccuracy, accuracy) : accuracy;
      const bestGameScore = storedLesson?.bestGameScore
        ? Math.max(storedLesson.bestGameScore, gameStats.score)
        : gameStats.score;
      upsertLesson1({
        completed: true,
        lastAccuracy: accuracy,
        lastStars,
        bestStars,
        bestAccuracy,
        bestGameScore,
        lastPlayed: new Date().toISOString(),
      });
      setStoredLesson({
        completed: true,
        lastAccuracy: accuracy,
        lastStars,
        bestStars,
        bestAccuracy,
        bestGameScore,
        lastPlayed: new Date().toISOString(),
      });
      setPersistenceError(null);
    } catch (error) {
      setPersistenceError("We couldn\'t save your progress on this browser, but you finished Lesson 1!");
    }
  }, [stage, accuracy, gameStats.score, storedLesson]);

  const summaryStars = useMemo(() => starCount(accuracy), [accuracy]);

  const stageLabel: Record<Stage, string> = {
    preflight: "Keyboard check",
    intro: "Intro",
    drillF: "Drill F",
    drillJ: "Drill J",
    drillMix: "F/J Alternating",
    gameTutorial: "Game practice",
    game: "Mini-game",
    summary: "Summary",
  };

  const resetLesson = () => {
    setStage("preflight");
    setIntroStep("posture");
    setIntroCounts({ F: 0, J: 0 });
    setDrillState({ sequence: DRILL_F, index: 0, errorsOnPrompt: 0 });
    setTargetKey("F");
    setFeedback("Click begin and press a key to get started.");
    setLastPressed(null);
    setCorrectCount(0);
    setErrorCount(0);
    setStreak(0);
    setBestStreak(0);
    setGameLetters([]);
    setGameStats({ shown: 0, caught: 0, missed: 0, wastedPresses: 0, score: 0 });
    setGameTime(30);
    setGameTutorialStep(0);
    setNeedsFocus(false);
    setKeyboardConnected(false);
    summarySavedRef.current = false;
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-sky-50 text-slate-800">
      <div className="mx-auto max-w-5xl px-4 py-8" ref={containerRef} tabIndex={-1}>
        <div className="mb-6 flex flex-col gap-3 rounded-3xl bg-white/80 p-5 shadow-lg ring-1 ring-slate-100 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-purple-600">Lesson 1</p>
            <h1 className="text-3xl font-black text-slate-900">F &amp; J Fundamentals</h1>
            <p className="text-sm text-slate-600">Stage: {stageLabel[stage]}</p>
          </div>
          <div className="flex flex-col items-start gap-2 text-sm sm:items-end">
            <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              <span className={`h-2 w-2 rounded-full ${keyboardConnected ? "bg-green-500" : "bg-amber-500"}`} />
              Keyboard: {keyboardConnected ? "✅ Connected" : "⚠️ Click to activate"}
            </div>
            <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              <span className={`h-2 w-2 rounded-full ${needsFocus ? "bg-amber-500" : "bg-green-500"}`} />
              Typing capture: {needsFocus ? "Click the banner to refocus" : "Listening"}
            </div>
            <Link
              href="/"
              className="text-sm font-semibold text-purple-700 underline-offset-4 hover:underline"
            >
              Back home
            </Link>
          </div>
        </div>

        {needsFocus && (
          <button
            type="button"
            className="mb-4 w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm font-semibold text-amber-800 shadow-sm"
            onClick={() => {
              containerRef.current?.focus();
              setNeedsFocus(false);
            }}
          >
            Click here if your keys aren&apos;t showing up. We&apos;ll listen again.
          </button>
        )}

        {stage === "preflight" && (
          <section className="rounded-3xl bg-white/90 p-6 shadow-md ring-1 ring-slate-100">
            <h2 className="text-2xl font-bold text-slate-900">Keyboard check</h2>
            <p className="mt-2 text-slate-700">Press any key so we know your keyboard is connected.</p>
            <p className="text-sm text-slate-500">If you are on a tablet or phone, you&apos;ll need a hardware keyboard.</p>
            {preflightExpired ? (
              <div className="mt-4 space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
                <p>We didn&apos;t see any keys. Plug in your keyboard or click try again.</p>
                <div className="flex gap-3">
                  <button
                    className="rounded-full bg-amber-600 px-4 py-2 text-white shadow hover:bg-amber-700"
                    onClick={() => setStage("preflight")}
                  >
                    Try again
                  </button>
                  <Link className="rounded-full border border-amber-300 px-4 py-2 text-amber-700" href="/">
                    Back home
                  </Link>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                Waiting for a key press…
              </div>
            )}
          </section>
        )}

        {stage === "intro" && (
          <section className="rounded-3xl bg-white/90 p-6 shadow-md ring-1 ring-slate-100">
            {introStep === "posture" && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-slate-900">Posture check</h2>
                <ul className="list-disc space-y-2 pl-6 text-slate-700">
                  <li>Sit up tall, feet flat on the floor.</li>
                  <li>Rest your left pointer on F (with the bump) and right pointer on J.</li>
                  <li>Keep eyes on the screen. We&apos;ll show the keys below.</li>
                </ul>
                <button
                  className="rounded-full bg-purple-600 px-4 py-2 text-white shadow hover:bg-purple-700"
                  onClick={() => {
                    setIntroStep("discoverF");
                    setTargetKey("F");
                    setFeedback("Press F three times with your left pointer finger.");
                  }}
                >
                  Begin finding the keys
                </button>
              </div>
            )}

            {introStep !== "posture" && (
              <div className="space-y-3">
                <h2 className="text-xl font-bold text-slate-900">Find the home row bumps</h2>
                <p className="text-slate-700">{feedback}</p>
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                  <span className="rounded-full bg-slate-100 px-3 py-1">F presses: {introCounts.F}/3</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1">J presses: {introCounts.J}/3</span>
                </div>
                <div className="flex gap-3">
                  {introStep !== "ready" && (
                    <button
                      className="rounded-full border border-purple-200 px-4 py-2 text-purple-700 hover:bg-purple-50"
                      onClick={handleShowMe}
                    >
                      Show me where
                    </button>
                  )}
                  {introStep === "ready" && (
                    <button
                      className="rounded-full bg-green-600 px-4 py-2 text-white shadow hover:bg-green-700"
                      onClick={() => handleDrillAdvance("drillF", DRILL_F, "Press F with your left pointer finger.", "F")}
                    >
                      Start practice
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="mt-6">
              <VisualKeyboard targetKey={targetKey} pressedKey={lastPressed?.key} wasCorrect={lastPressed?.correct} />
            </div>
          </section>
        )}

        {(stage === "drillF" || stage === "drillJ" || stage === "drillMix") && (
          <section className="rounded-3xl bg-white/90 p-6 shadow-md ring-1 ring-slate-100">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{stageLabel[stage]}</h2>
                <p className="text-slate-700">{stage === "drillMix" ? "Alternate between F and J" : `Press the ${stage === "drillF" ? "F" : "J"} key.`}</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                <span className="rounded-full bg-slate-100 px-3 py-1">Progress: {drillState.index}/{drillState.sequence.length}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1">Accuracy: {Math.round(accuracy * 100)}%</span>
                <span className="rounded-full bg-slate-100 px-3 py-1">Current streak: {streak}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1">Best streak: {bestStreak}</span>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-4 lg:flex-row">
              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-center rounded-2xl bg-slate-50 p-6 text-5xl font-black text-purple-700 shadow-inner">
                  {drillState.sequence[drillState.index] ?? "✓"}
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  {feedback}
                </div>
                {drillState.errorsOnPrompt >= 3 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    Need a hint? The highlighted key below is the one to press. You can also click “Show me” or skip this prompt.
                  </div>
                )}
                {drillState.errorsOnPrompt >= 7 && (
                  <button
                    className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                    onClick={handleSkipPrompt}
                  >
                    Skip this one and keep going
                  </button>
                )}
              </div>
              <div className="flex-1">
                <VisualKeyboard targetKey={drillState.sequence[drillState.index]} pressedKey={lastPressed?.key} wasCorrect={lastPressed?.correct} />
              </div>
            </div>
          </section>
        )}

        {stage === "gameTutorial" && (
          <section className="rounded-3xl bg-white/90 p-6 shadow-md ring-1 ring-slate-100">
            <h2 className="text-2xl font-bold text-slate-900">Mini-game practice</h2>
            <p className="mt-2 text-slate-700">When you see a falling F press F. When you see J press J.</p>
            <div className="mt-4 flex flex-col gap-4 lg:flex-row">
              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-center rounded-2xl bg-slate-50 p-6 text-5xl font-black text-purple-700 shadow-inner">
                  {gameTutorialStep === 0 ? "F" : "J"}
                </div>
                <p className="text-sm text-slate-700">Press the matching key to continue.</p>
              </div>
              <div className="flex-1">
                <VisualKeyboard targetKey={gameTutorialStep === 0 ? "F" : "J"} pressedKey={lastPressed?.key} wasCorrect={lastPressed?.correct} />
              </div>
            </div>
          </section>
        )}

        {stage === "game" && (
          <section className="rounded-3xl bg-white/90 p-6 shadow-md ring-1 ring-slate-100">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">F &amp; J Catch Game</h2>
                <p className="text-slate-700">Press the matching key before the letter hits the ground. Accuracy beats spamming!</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                <span className="rounded-full bg-slate-100 px-3 py-1">Time left: {gameTime}s</span>
                <span className="rounded-full bg-slate-100 px-3 py-1">Score: {gameStats.score}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1">Caught: {gameStats.caught}</span>
              </div>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <div className="relative h-64 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-b from-sky-50 to-purple-50 shadow-inner">
                  {gameLetters.map((letter) => (
                    <div
                      key={letter.id}
                      className="absolute left-1/2 -translate-x-1/2 rounded-full bg-purple-600 px-4 py-2 text-lg font-bold text-white shadow-lg"
                      style={{ top: `${letter.y}%` }}
                    >
                      {letter.type}
                    </div>
                  ))}
                  {gameLetters.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-500">
                      Letters will appear shortly. Get ready!
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">Tips</p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>Press F for F, J for J.</li>
                  <li>If you miss, that&apos;s okay! Keep trying.</li>
                  <li>Spamming keys doesn&apos;t add points—wait for the letter.</li>
                </ul>
              </div>
            </div>
          </section>
        )}

        {stage === "summary" && (
          <section className="rounded-3xl bg-white/90 p-6 shadow-md ring-1 ring-slate-100">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-green-600">Lesson complete</p>
                <h2 className="text-3xl font-black text-slate-900">Great job!</h2>
                <p className="text-slate-700">You finished Lesson 1. Keep practicing for even stronger accuracy.</p>
              </div>
              <div className="text-3xl">{"★".repeat(summaryStars).padEnd(5, "☆")}</div>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
                <p className="text-sm text-slate-500">Accuracy</p>
                <p className="text-3xl font-black text-slate-900">{Math.round(accuracy * 100)}%</p>
                <p className="text-xs text-slate-500">Keys pressed: {totalAttempts}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
                <p className="text-sm text-slate-500">Best streak</p>
                <p className="text-3xl font-black text-slate-900">{bestStreak}</p>
                <p className="text-xs text-slate-500">Errors: {errorCount}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
                <p className="text-sm text-slate-500">Game</p>
                <p className="text-xl font-bold text-slate-900">Caught {gameStats.caught} / {gameStats.shown}</p>
                <p className="text-xs text-slate-500">Score {gameStats.score}. Wasted presses: {gameStats.wastedPresses}</p>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-sm text-slate-700">
              <p>
                {accuracy >= 0.9
                  ? "Excellent accuracy!"
                  : "Nice work finishing the lesson! Try again to boost your accuracy even more."}
              </p>
              {persistenceError ? <p className="text-red-600">{persistenceError}</p> : null}
              {storedLesson?.bestStars && storedLesson.bestStars > summaryStars ? (
                <p className="text-slate-600">Your best stars: {storedLesson.bestStars}. Every practice helps!</p>
              ) : null}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                className="rounded-full bg-purple-600 px-6 py-3 text-white shadow hover:bg-purple-700"
                onClick={resetLesson}
              >
                Try Lesson 1 again
              </button>
              <Link
                href="/"
                className="rounded-full border border-slate-300 px-6 py-3 text-slate-800 hover:bg-slate-100"
              >
                Back to Home
              </Link>
              <button
                className="rounded-full border border-rose-200 px-4 py-2 text-rose-600 hover:bg-rose-50"
                onClick={() => {
                  try {
                    resetProgress();
                    setStoredLesson(null);
                  } catch (error) {
                    setPersistenceError("We couldn\'t clear saved data, but you can still retry.");
                  }
                }}
              >
                Reset this device
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
