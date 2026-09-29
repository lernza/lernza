import type { Step1Values, Step2Values } from "./types"

export interface QuestTemplate {
  id: string
  name: string
  description: string
  audience?: string
  step1: Step1Values
  step2: Step2Values
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

/** Pre-built quest templates for common use cases. Creators can edit every field before publishing. */
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
      referralBonus: 10,
    },
    step2: {
      milestones: [
        milestone(
          "Learn the fundamentals",
          "Complete the core lessons and explain the key concepts in your own words.",
          25
        ),
        milestone(
          "Practice with exercises",
          "Submit solutions to the practical exercises and demonstrate your understanding.",
          50,
          [0]
        ),
        milestone(
          "Build a final project",
          "Create and submit a project that applies the skills from the course.",
          100,
          [1]
        ),
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
      referralBonus: 10,
    },
    step2: {
      milestones: [
        milestone(
          "Week 1: Foundations",
          "Complete the onboarding material and submit your first hands-on assignment.",
          50
        ),
        milestone(
          "Week 2: Build",
          "Build a working feature using the techniques covered in the bootcamp.",
          75,
          [0]
        ),
        milestone(
          "Week 3: Collaborate",
          "Review a peer's work and improve your own project using the feedback.",
          75,
          [1]
        ),
        milestone(
          "Week 4: Ship the capstone",
          "Present and submit a polished capstone project for final review.",
          150,
          [2]
        ),
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
      referralBonus: 10,
    },
    step2: {
      milestones: [
        milestone(
          "Study the brief",
          "Review the challenge requirements and outline your approach.",
          25
        ),
        milestone(
          "Complete the challenge",
          "Submit a solution that meets the challenge requirements.",
          75,
          [0]
        ),
      ],
    },
  },
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

export function getQuestTemplate(id: string): QuestTemplate | undefined {
  return QUEST_TEMPLATES.find((t) => t.id === id)
}
