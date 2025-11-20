export type Lesson1StoredData = {
  completed: boolean;
  bestAccuracy?: number;
  bestStars?: number;
  bestSpeed?: number;
  bestGameScore?: number;
  lastAccuracy?: number;
  lastStars?: number;
  lastPlayed?: string;
};

export type StoredData = {
  lesson1?: Lesson1StoredData;
};

const STORAGE_KEY = "quillTypingData";

export const readProgress = (): StoredData | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StoredData;
    if (typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed;
  } catch (error) {
    console.warn("Unable to read progress", error);
    return null;
  }
};

export const writeProgress = (data: StoredData) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn("Unable to save progress", error);
    throw error;
  }
};

export const resetProgress = () => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn("Unable to reset progress", error);
    throw error;
  }
};

export const upsertLesson1 = (lesson: Partial<Lesson1StoredData>) => {
  const existing = readProgress();
  const current = existing && existing !== null ? existing : {};
  const mergedLesson: Lesson1StoredData = {
    completed: lesson.completed ?? current.lesson1?.completed ?? false,
    bestAccuracy: lesson.bestAccuracy ?? current.lesson1?.bestAccuracy,
    bestStars: lesson.bestStars ?? current.lesson1?.bestStars,
    bestSpeed: lesson.bestSpeed ?? current.lesson1?.bestSpeed,
    bestGameScore: lesson.bestGameScore ?? current.lesson1?.bestGameScore,
    lastAccuracy: lesson.lastAccuracy ?? current.lesson1?.lastAccuracy,
    lastStars: lesson.lastStars ?? current.lesson1?.lastStars,
    lastPlayed: lesson.lastPlayed ?? current.lesson1?.lastPlayed,
  };

  const data: StoredData = {
    ...current,
    lesson1: mergedLesson,
  };

  writeProgress(data);
};
