import type { Step1Values, Step2Values } from "./types"

export interface QuestTemplate {
  id: "course" | "bootcamp" | "skill-challenge"
  name: string
  description: string
  audience: string
  step1: Step1Values
  step2: Step2Values
}

export const QUEST_TEMPLATES: QuestTemplate[] = [
  {
    id: "course",
    name: "Self-paced course",
    description:
      "Guide learners through a structured curriculum from fundamentals to a final project.",
    audience: "Courses",
    step1: {
      name: "Master the Fundamentals",
      description:
        "Build a strong foundation through guided lessons, practical exercises, and a final project.",
      category: "Education",
      tags: ["course", "learning", "project"],
    },
    step2: {
      milestones: [
        {
          title: "Learn the fundamentals",
          description: "Complete the core lessons and explain the key concepts in your own words.",
          rewardAmount: 25,
        },
        {
          title: "Practice with exercises",
          description:
            "Submit solutions to the practical exercises and demonstrate your understanding.",
          rewardAmount: 50,
        },
        {
          title: "Build a final project",
          description: "Create and submit a project that applies the skills from the course.",
          rewardAmount: 100,
        },
      ],
    },
  },
  {
    id: "bootcamp",
    name: "Intensive bootcamp",
    description: "Turn a focused curriculum into weekly checkpoints with hands-on deliverables.",
    audience: "Bootcamps",
    step1: {
      name: "Launch Your Skills",
      description:
        "An intensive learning sprint with weekly deliverables, peer feedback, and a capstone project.",
      category: "Bootcamp",
      tags: ["bootcamp", "intensive", "capstone"],
    },
    step2: {
      milestones: [
        {
          title: "Week 1: Foundations",
          description:
            "Complete the onboarding material and submit your first hands-on assignment.",
          rewardAmount: 50,
        },
        {
          title: "Week 2: Build",
          description: "Build a working feature using the techniques covered in the bootcamp.",
          rewardAmount: 75,
        },
        {
          title: "Week 3: Collaborate",
          description: "Review a peer's work and improve your own project using the feedback.",
          rewardAmount: 75,
        },
        {
          title: "Week 4: Ship the capstone",
          description: "Present and submit a polished capstone project for final review.",
          rewardAmount: 150,
        },
      ],
    },
  },
  {
    id: "skill-challenge",
    name: "Skill challenge",
    description:
      "Create a short, outcome-focused challenge that rewards learners for proving a skill.",
    audience: "Challenges",
    step1: {
      name: "Prove Your Skills",
      description:
        "Complete a focused challenge and show what you can do with a practical submission.",
      category: "Skill Challenge",
      tags: ["challenge", "practice", "skills"],
    },
    step2: {
      milestones: [
        {
          title: "Study the brief",
          description: "Review the challenge requirements and outline your approach.",
          rewardAmount: 25,
        },
        {
          title: "Complete the challenge",
          description: "Submit a solution that meets the challenge requirements.",
          rewardAmount: 75,
        },
      ],
    },
  },
]

export function getQuestTemplate(id: QuestTemplate["id"]): QuestTemplate {
  const template = QUEST_TEMPLATES.find(item => item.id === id)
  if (!template) throw new Error(`Unknown quest template: ${id}`)
  return template
}
