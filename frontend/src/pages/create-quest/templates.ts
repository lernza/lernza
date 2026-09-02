import type { Step1Values, Step2Values } from "./types"

export interface QuestTemplate {
  id: "course" | "bootcamp" | "skill-challenge"
  name: string
  description: string
  audience: string
  id: "onboarding" | "api-development" | "smart-contract-development" | "frontend-fundamentals"
  name: string
  description: string
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
const milestone = (
  title: string,
  description: string,
  rewardAmount: number,
  prerequisiteIds: number[] = []
) => ({
  title,
  description,
  rewardAmount,
  prerequisiteIds,
})

/** Starter paths are deliberately ordinary form data: creators can edit every field before publishing. */
export const QUEST_TEMPLATES: QuestTemplate[] = [
  {
    id: "onboarding",
    name: "Team onboarding",
    description: "A welcoming, structured path for new contributors.",
    step1: {
      name: "Contributor Onboarding",
      description: "Help new contributors become confident and productive.",
      category: "Onboarding",
      tags: ["team", "getting-started"],
      referralBonus: 10,
    },
    step2: {
      milestones: [
        milestone("Meet the team", "Review the team guide and introduce yourself.", 25),
        milestone(
          "Set up your workspace",
          "Install the required tools and verify your access.",
          50,
          [0]
        ),
        milestone(
          "Ship a first contribution",
          "Complete a small, reviewed contribution.",
          100,
          [1]
        ),
      ],
    },
  },
  {
    id: "api-development",
    name: "API development",
    description: "From endpoint design through testing and documentation.",
    step1: {
      name: "Build a Production API",
      description: "Design, implement, test, and document a useful API.",
      category: "Programming",
      tags: ["api", "backend"],
      referralBonus: 10,
    },
    step2: {
      milestones: [
        milestone(
          "Design the API",
          "Define resources, request and response shapes, and error handling.",
          50
        ),
        milestone(
          "Implement endpoints",
          "Build the API with validation and authentication.",
          100,
          [0]
        ),
        milestone(
          "Test and document",
          "Add integration tests and clear API documentation.",
          75,
          [1]
        ),
      ],
    },
  },
  {
    id: "smart-contract-development",
    name: "Smart-contract development",
    description: "A safe path from contract design to testnet deployment.",
    step1: {
      name: "Smart Contract Fundamentals",
      description: "Build and validate a secure smart contract.",
      category: "Web3",
      tags: ["smart-contracts", "stellar"],
      referralBonus: 10,
    },
    step2: {
      milestones: [
        milestone(
          "Model contract state",
          "Write the contract specification and identify access controls.",
          75
        ),
        milestone(
          "Implement the contract",
          "Build core methods with defensive validation.",
          150,
          [0]
        ),
        milestone(
          "Test and deploy",
          "Add tests and deploy the verified contract to testnet.",
          125,
          [1]
        ),
      ],
    },
  },
  {
    id: "frontend-fundamentals",
    name: "Frontend fundamentals",
    description: "Build accessible, responsive interfaces step by step.",
    step1: {
      name: "Frontend Fundamentals",
      description: "Turn a design into an accessible, responsive web experience.",
      category: "Frontend",
      tags: ["frontend", "web"],
      referralBonus: 10,
    },
    step2: {
      milestones: [
        milestone("Build the layout", "Create semantic page structure and responsive layout.", 50),
        milestone(
          "Add interactions",
          "Implement the essential user flows and state handling.",
          100,
          [0]
        ),
        milestone(
          "Polish accessibility",
          "Test keyboard navigation, labels, and mobile presentation.",
          75,
          [1]
        ),
      ],
    },
  },
]
