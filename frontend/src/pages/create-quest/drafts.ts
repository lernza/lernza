import type { Step1Values, Step2Values, FormStep } from "./types"

const STORAGE_KEY = "lernza.quest-drafts.v1"
export interface QuestDraft { id: string; updatedAt: number; step1: Step1Values; step2: Step2Values; currentStep: FormStep }

function read(): QuestDraft[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as QuestDraft[] } catch { return [] }
}
function write(drafts: QuestDraft[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts)) }
export const questDrafts = {
  list: () => read().sort((a, b) => b.updatedAt - a.updatedAt),
  save: (draft: Omit<QuestDraft, "updatedAt">) => {
    const next = { ...draft, updatedAt: Date.now() }
    write([next, ...read().filter(item => item.id !== draft.id)])
    return next
  },
  remove: (id: string) => write(read().filter(draft => draft.id !== id)),
}
