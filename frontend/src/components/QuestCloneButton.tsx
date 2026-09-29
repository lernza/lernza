import { useState } from "react"
import { cloneQuest, type QuestCloneSource, type QuestCloneResult } from "@/lib/questClone"

interface Props {
  quest: QuestCloneSource
  currentUserId: string
  onCloned?: (newQuest: QuestCloneResult) => void
}

export function QuestCloneButton({ quest, currentUserId, onCloned }: Props) {
  const [isCloning, setIsCloning] = useState(false)
  const handleClone = () => {
    setIsCloning(true)
    try {
      const cloned = cloneQuest(quest, currentUserId, () => Math.random().toString(36).slice(2, 10))
      onCloned?.(cloned)
      alert(`Quest cloned as draft ${cloned.id} — learner data not copied`)
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setIsCloning(false)
    }
  }
  return (
    <button onClick={handleClone} disabled={isCloning}>
      {isCloning ? "Cloning…" : "Clone Quest"}
    </button>
  )
}
export default QuestCloneButton
