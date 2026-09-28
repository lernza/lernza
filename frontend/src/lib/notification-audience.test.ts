import { describe, it, expect } from "vitest"
import {
  isLearnerSubject,
  resolveViewerRole,
  shouldNotifyViewer,
  NO_PARTICIPATION,
  type ViewerParticipation,
} from "./notification-audience"

const LEARNER = "GLEARNER0000000000000000000000000000000000AA"
const OTHER_LEARNER = "GOTHER00000000000000000000000000000000000BB"
const CREATOR = "GCREATOR0000000000000000000000000000000000CC"

const creatorOfQuest7: ViewerParticipation = {
  address: CREATOR,
  ownedQuestIds: [7],
  enrolledQuestIds: [],
}

const learnerOfQuest7: ViewerParticipation = {
  address: LEARNER,
  ownedQuestIds: [],
  enrolledQuestIds: [7],
}

const bothRolesQuest7: ViewerParticipation = {
  address: CREATOR,
  ownedQuestIds: [7],
  enrolledQuestIds: [7],
}

describe("resolveViewerRole", () => {
  it("returns null with no connected address", () => {
    expect(
      resolveViewerRole({ type: "milestone_completed", questId: 7 }, NO_PARTICIPATION)
    ).toBeNull()
  })

  it("suppresses events for quests the viewer has no part in", () => {
    // The regression this module exists for: the event stream sees the whole
    // network, so a viewer must not be notified about quest 8 at all.
    const event = {
      type: "milestone_completed",
      questId: 8,
      enrollee: OTHER_LEARNER,
    }
    expect(resolveViewerRole(event, learnerOfQuest7)).toBeNull()
    expect(shouldNotifyViewer(event, learnerOfQuest7)).toBe(false)
  })

  it("routes quest status changes to the creator", () => {
    expect(resolveViewerRole({ type: "quest_archived", questId: 7 }, creatorOfQuest7)).toBe(
      "creator"
    )
    expect(resolveViewerRole({ type: "quest_archived", questId: 7 }, learnerOfQuest7)).toBe(
      "learner"
    )
  })

  it("reports 'both' when the viewer created and enrolled in the same quest", () => {
    expect(resolveViewerRole({ type: "reward_distributed", questId: 7 }, bothRolesQuest7)).toBe(
      "both"
    )
  })

  it("treats a quest the viewer no longer appears in as theirs when the payload names them", () => {
    // Participation lists are a snapshot; a dispute against a learner's earlier
    // submission must still reach them.
    const stale: ViewerParticipation = {
      address: LEARNER,
      ownedQuestIds: [],
      enrolledQuestIds: [],
    }
    const event = { type: "dispute_initiated", questId: 9, enrollee: LEARNER }
    expect(resolveViewerRole(event, stale)).toBe("learner")
  })

  it("suppresses network-wide events with no addressable recipient", () => {
    // `admin_transferred` and `quest_ttl_extended` name no participant, so
    // there is no way to tell whether they concern the viewer.
    expect(resolveViewerRole({ type: "admin_transferred" }, bothRolesQuest7)).toBeNull()
    expect(
      resolveViewerRole({ type: "quest_ttl_extended", questId: 7 }, creatorOfQuest7)
    ).toBeNull()
  })

  describe("creator-only events", () => {
    it("notifies the creator of a new enrollee", () => {
      const event = {
        type: "enrollee_added",
        questId: 7,
        enrollee: LEARNER,
        // Third payload slot is the quest owner.
        actor: CREATOR,
      }
      expect(resolveViewerRole(event, creatorOfQuest7)).toBe("creator")
    })

    it("suppresses a new-enrollee alert for a learner who merely joined", () => {
      const event = { type: "enrollee_added", questId: 7, enrollee: OTHER_LEARNER, actor: CREATOR }
      expect(resolveViewerRole(event, learnerOfQuest7)).toBeNull()
    })

    it("still reaches the creator when the owned-quest list is stale", () => {
      const stale: ViewerParticipation = {
        address: CREATOR,
        ownedQuestIds: [],
        enrolledQuestIds: [],
      }
      const event = { type: "enrollee_added", questId: 7, enrollee: LEARNER, actor: CREATOR }
      expect(resolveViewerRole(event, stale)).toBe("creator")
    })
  })

  it("fails closed for an unrecognised event type", () => {
    // A newly added event with no routing decision must not default to a toast
    // for every connected wallet.
    expect(resolveViewerRole({ type: "some_future_event", questId: 7 }, bothRolesQuest7)).toBeNull()
  })
})

describe("isLearnerSubject", () => {
  it("is true only when the viewer is the account the event is about", () => {
    const event = { type: "reward_distributed", questId: 7, enrollee: LEARNER }
    expect(isLearnerSubject(event, learnerOfQuest7)).toBe(true)
    expect(isLearnerSubject(event, creatorOfQuest7)).toBe(false)
  })

  it("is false for a creator about their own reward funding", () => {
    // Funding is the creator's action; phrasing it as a learner notification
    // would be wrong even though the creator receives the event.
    const event = { type: "reward_funded", questId: 7, authority: CREATOR }
    expect(isLearnerSubject(event, creatorOfQuest7)).toBe(false)
  })
})
