"use client";

import { useMemo } from "react";

type KeyHighlightState = "target" | "correct" | "incorrect" | "none";

export type VisualKeyboardProps = {
  targetKey?: string;
  pressedKey?: string;
  wasCorrect?: boolean;
};

const rows = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L", ";"],
  ["Z", "X", "C", "V", "B", "N", "M"],
];

const leftHand = new Set(["Q", "W", "E", "R", "T", "A", "S", "D", "F", "G", "Z", "X", "C", "V", "B"]);
const rightHand = new Set(["Y", "U", "I", "O", "P", "H", "J", "K", "L", ";", "N", "M"]);

const bumpKeys = new Set(["F", "J"]);

const getHighlight = (
  key: string,
  target?: string,
  pressed?: string,
  wasCorrect?: boolean,
): KeyHighlightState => {
  if (pressed && pressed === key && wasCorrect === true) return "correct";
  if (pressed && pressed === key && wasCorrect === false) return "incorrect";
  if (target && target === key) return "target";
  return "none";
};

export function VisualKeyboard({ targetKey, pressedKey, wasCorrect }: VisualKeyboardProps) {
  const rowsMarkup = useMemo(() => {
    return rows.map((row, rowIndex) => (
      <div key={rowIndex} className="flex gap-2 justify-center mb-2">
        {row.map((key) => {
          const highlight = getHighlight(key, targetKey?.toUpperCase(), pressedKey?.toUpperCase(), wasCorrect);
          const isLeft = leftHand.has(key);
          const zoneColor = isLeft ? "bg-orange-50" : "bg-sky-50";
          const highlightClasses: Record<KeyHighlightState, string> = {
            target: "ring-2 ring-yellow-400 shadow-yellow-200",
            correct: "bg-green-100 ring-2 ring-green-400",
            incorrect: "bg-red-100 ring-2 ring-red-400",
            none: zoneColor,
          };
          const bump = bumpKeys.has(key);

          return (
            <div
              key={key}
              className={`relative flex h-12 w-12 items-center justify-center rounded-lg border border-slate-200 text-lg font-semibold text-slate-700 shadow-sm transition-transform ${highlightClasses[highlight]}`}
            >
              {key}
              {bump ? (
                <span className="absolute bottom-1 h-1 w-6 rounded-full bg-amber-500" aria-hidden />
              ) : null}
              {highlight === "correct" && <span className="absolute -top-2 right-1 text-green-600 text-sm">✓</span>}
              {highlight === "incorrect" && <span className="absolute -top-2 right-1 text-red-600 text-sm">✕</span>}
            </div>
          );
        })}
      </div>
    ));
  }, [pressedKey, targetKey, wasCorrect]);

  return (
    <div className="rounded-2xl bg-white/80 p-4 shadow-inner border border-slate-100">
      <div className="mb-3 text-center text-sm text-slate-600">
        Home row anchors F and J are highlighted with bumps. Left-hand keys are light orange; right-hand keys are light blue.
      </div>
      {rowsMarkup}
    </div>
  );
}

export default VisualKeyboard;
