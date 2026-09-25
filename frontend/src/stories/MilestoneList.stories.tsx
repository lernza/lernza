import type { Meta, StoryObj } from "@storybook/react-vite"
import { MilestonesSection } from "@/components/quest/MilestonesSection"

const meta: Meta<typeof MilestonesSection> = {
  title: "Sections/MilestoneList",
  component: MilestonesSection,
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof MilestonesSection>

const sampleMilestones = [
  {
    id: 1,
    title: "Environment Setup & Hello World",
    description: "Install the Soroban CLI and deploy your first hello-world contract to Testnet.",
    rewardAmount: 500000000,
  },
  {
    id: 2,
    title: "State Storage & Data Types",
    description: "Implement instance and persistent storage counters with TTL extension.",
    rewardAmount: 750000000,
    prerequisiteIds: [1],
  },
  {
    id: 3,
    title: "Authorization & Signature Verification",
    description: "Require authenticated caller signatures for administrative actions.",
    rewardAmount: 1000000000,
    prerequisiteIds: [2],
  },
]

export const InProgress: Story = {
  args: {
    milestones: sampleMilestones,
    completions: [
      {
        milestoneId: 1,
        completed: true,
        evidence: {
          url: "https://stellar.expert/explorer/testnet/tx/12345",
          note: "Deployed contract C1234567890",
        },
      },
      {
        milestoneId: 2,
        completed: false,
      },
      {
        milestoneId: 3,
        completed: false,
      },
    ],
    enrollees: [{ id: 1, address: "GBZXN7PIRZGNMHGA728R4P3" }],
    questId: 1,
    onAddMilestone: () => alert("Add milestone"),
    onVerifyCompletion: (id, evidence) => alert(`Submit verification for ${id}: ${evidence.url}`),
    isVerifying: false,
  },
}

export const AllCompleted: Story = {
  args: {
    milestones: sampleMilestones,
    completions: [
      { milestoneId: 1, completed: true },
      { milestoneId: 2, completed: true },
      { milestoneId: 3, completed: true },
    ],
    enrollees: [{ id: 1, address: "GBZXN7PIRZGNMHGA728R4P3" }],
    questId: 1,
    onAddMilestone: () => alert("Add milestone"),
    onVerifyCompletion: () => {},
    isVerifying: false,
  },
}

export const Empty: Story = {
  args: {
    milestones: [],
    completions: [],
    enrollees: [],
    questId: 1,
    onAddMilestone: () => alert("Add milestone"),
    onVerifyCompletion: () => {},
    isVerifying: false,
  },
}

export const VerifyingSubmission: Story = {
  args: {
    milestones: sampleMilestones,
    completions: [
      { milestoneId: 1, completed: true },
      { milestoneId: 2, completed: false },
      { milestoneId: 3, completed: false },
    ],
    enrollees: [{ id: 1, address: "GBZXN7PIRZGNMHGA728R4P3" }],
    questId: 1,
    onAddMilestone: () => alert("Add milestone"),
    onVerifyCompletion: () => {},
    isVerifying: true,
  },
}
