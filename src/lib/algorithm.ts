import type { LearningWord, VocabEntry } from '../types'
import {
  INITIAL_NEEDED,
  REVIEW_STAGES_DAYS,
  todayStr
} from '../types'

/** Shuffle array (Fisher–Yates) */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Pick random item from array, excluding one by ID */
export function pickRandomExcluding<T extends { id: string }>(
  arr: T[],
  excludeId: string | null
): T | null {
  if (arr.length === 0) return null
  if (arr.length === 1) return arr[0]
  const candidates = excludeId ? arr.filter(w => w.id !== excludeId) : arr
  if (candidates.length === 0) return arr[0]
  return candidates[Math.floor(Math.random() * candidates.length)]
}

/** Add days to a YYYY-MM-DD string */
export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Create a new learning word from vocab entry */
export function toLearningWord(entry: VocabEntry): LearningWord {
  return {
    ...entry,
    streak: 0,
    needed: INITIAL_NEEDED,
    reviewStage: 0,
    nextReview: todayStr()
  }
}

/** Get words due for review (nextReview <= today) */
export function getDueReviews(learnedWords: LearningWord[]): LearningWord[] {
  const today = todayStr()
  return learnedWords.filter((w) => w.nextReview <= today)
}

/** After correct answer in review: advance stage and schedule next */
export function processCorrectReview(word: LearningWord): LearningWord {
  const nextStage = Math.min(
    word.reviewStage + 1,
    REVIEW_STAGES_DAYS.length - 1
  )
  const days = REVIEW_STAGES_DAYS[nextStage]
  return {
    ...word,
    reviewStage: nextStage,
    nextReview: addDays(todayStr(), days)
  }
}

/** After wrong answer in review: reset to stage 0, review tomorrow */
export function processWrongReview(word: LearningWord): LearningWord {
  return {
    ...word,
    reviewStage: 0,
    nextReview: addDays(todayStr(), 1)
  }
}

type WordType = 'der' | 'die' | 'das' | 'verb' | 'adjective' | 'other'

const VERB_ENDINGS = ['en', 'ern', 'eln']
const ADJ_ENDINGS = ['ig', 'lich', 'bar', 'sam', 'haft', 'los', 'voll', 'reich', 'arm', 'wert']

function getWordType(german: string): WordType {
  const lower = german.toLowerCase().trim()
  
  if (lower.startsWith('der ')) return 'der'
  if (lower.startsWith('die ')) return 'die'
  if (lower.startsWith('das ')) return 'das'
  
  const mainWord = lower.split(' ').pop() ?? lower
  
  for (const ending of VERB_ENDINGS) {
    if (mainWord.endsWith(ending) && mainWord.length > 3) return 'verb'
  }
  
  for (const ending of ADJ_ENDINGS) {
    if (mainWord.endsWith(ending) && mainWord.length > ending.length + 2) return 'adjective'
  }
  
  return 'other'
}

/** Pick 4 wrong options: mix of same-type and others from pool */
export function pickWrongOptions(
  pool: LearningWord[],
  currentWord: LearningWord
): string[] {
  const currentType = getWordType(currentWord.german)
  
  const candidates = pool.filter(
    (w) => w.id !== currentWord.id && w.russian !== currentWord.russian
  )
  
  const sameType = shuffle(candidates.filter(w => getWordType(w.german) === currentType))
  const otherType = shuffle(candidates.filter(w => getWordType(w.german) !== currentType))
  
  const picked: string[] = []
  const used = new Set<string>()
  
  const addUnique = (words: LearningWord[], count: number) => {
    for (const w of words) {
      if (picked.length >= count || used.has(w.russian)) continue
      picked.push(w.russian)
      used.add(w.russian)
    }
  }
  
  addUnique(sameType, 2)
  addUnique(otherType, 4)
  addUnique(sameType, 4)
  
  return shuffle(picked)
}

/** Build 5 options: 1 correct + 4 wrong, shuffled */
export function buildOptions(
  pool: LearningWord[],
  correctWord: LearningWord
): string[] {
  const wrong = pickWrongOptions(pool, correctWord)
  const options = [correctWord.russian, ...wrong]
  return shuffle(options)
}

/** Build options for review using pool + learned words as wrong-option source */
export function buildReviewOptions(
  pool: LearningWord[],
  learnedWords: LearningWord[],
  correctWord: LearningWord
): string[] {
  const candidates = [...pool, ...learnedWords]
  const wrong = pickWrongOptions(candidates, correctWord)
  const options = [correctWord.russian, ...wrong]
  return shuffle(options)
}
