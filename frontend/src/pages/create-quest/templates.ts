import { BookOpen, Code2, Trophy, type LucideIcon } from "lucide-react"
import type { Step1Values, Step2Values } from "./types"

export interface QuestTemplate {
  id: TemplateId
  name: string
  shortDescription: string
  icon: LucideIcon
  basics: Step1Values
  milestones: Step2Values["milestones"]
}

export type TemplateId = "course" | "bootcamp" | "skill-challenge"

export const QUEST_TEMPLATES: readonly QuestTemplate[] = [
  {
    id: "course",
    name: "Course",
    shortDescription: "Guide learners through a structured learning path.",
    icon: BookOpen,
    basics: {
      name: "Master the Fundamentals",
      description:
        "Build a strong foundation through practical lessons, exercises, and a final project.",
      category: "Education",
      tags: ["course", "learning"],
    },
    milestones: [
      {
        title: "Learn the fundamentals",
        description: "Complete the introductory lessons and explain the core concepts.",
        rewardAmount: 25,
      },
      {
        title: "Practice with exercises",
        description: "Finish the practice exercises and submit your solutions for review.",
        rewardAmount: 35,
      },
      {
        title: "Complete the final project",
        description: "Build and submit a project that demonstrates what you learned.",
        rewardAmount: 50,
      },
    ],
  },
  {
    id: "bootcamp",
    name: "Bootcamp",
    shortDescription: "Turn an intensive program into clear weekly milestones.",
    icon: Code2,
    basics: {
      name: "Launch Your Skills Bootcamp",
      description:
        "An intensive, project-based program that takes learners from setup to a portfolio-ready result.",
      category: "Bootcamp",
      tags: ["bootcamp", "project"],
    },
    milestones: [
      {
        title: "Set up your environment",
        description: "Install the required tools and submit a working starter project.",
        rewardAmount: 20,
      },
      {
        title: "Build the core feature",
        description: "Implement the main feature and share a short progress update.",
        rewardAmount: 35,
      },
      {
        title: "Ship an end-to-end project",
        description: "Complete the project, document it, and submit a live demo or repository.",
        rewardAmount: 60,
      },
      {
        title: "Present your work",
        description: "Walk through your solution and reflect on what you would improve next.",
        rewardAmount: 35,
      },
    ],
  },
  {
    id: "skill-challenge",
    name: "Skill Challenge",
    shortDescription: "Create a focused, practical challenge with a clear finish line.",
    icon: Trophy,
    basics: {
      name: "30-Day Skill Challenge",
      description:
        "Practice consistently, share your progress, and prove your new skill with a final challenge.",
      category: "Challenge",
      tags: ["challenge", "practice"],
    },
    milestones: [
      {
        title: "Make a plan",
        description: "Define your goal, schedule, and success criteria for the challenge.",
        rewardAmount: 15,
      },
      {
        title: "Show consistent progress",
        description: "Share evidence of regular practice and one lesson learned.",
        rewardAmount: 25,
      },
      {
        title: "Pass the final challenge",
        description: "Complete a practical task that demonstrates your new skill.",
        rewardAmount: 40,
      },
    ],
  },
]
