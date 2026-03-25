// Mock data for UI development. Replaced by contract calls in production.

export interface Workspace {
  id: number
  owner: string
  name: string
  description: string
  tokenAddr: string
  enrolleeCount: number
  milestoneCount: number
  poolBalance: number
  createdAt: number
}

export interface Milestone {
  id: number
  workspaceId: number
  title: string
  description: string
  rewardAmount: number
}

export interface MilestoneCompletion {
  milestoneId: number
  enrollee: string
  completed: boolean
}

export interface UserStats {
  totalEarned: number
  workspacesOwned: number
  workspacesEnrolled: number
  milestonesCompleted: number
}

export const MOCK_WORKSPACES: Workspace[] = [
  {
    id: 0,
    owner: "GBXR...K2YQ",
    name: "Learn to Code with Alex",
    description:
      "Teaching my brother the fundamentals of programming. From basic syntax to deploying a real application.",
    tokenAddr: "USDC...STELLAR",
    enrolleeCount: 3,
    milestoneCount: 5,
    poolBalance: 2500,
    createdAt: 1710000000,
  },
  {
    id: 1,
    owner: "GBXR...K2YQ",
    name: "Stellar Development Bootcamp",
    description:
      "A structured path to becoming a Stellar developer. Smart contracts, Soroban, DeFi.",
    tokenAddr: "USDC...STELLAR",
    enrolleeCount: 8,
    milestoneCount: 10,
    poolBalance: 10000,
    createdAt: 1709500000,
  },
  {
    id: 2,
    owner: "GCMN...P8TL",
    name: "Design Fundamentals",
    description:
      "Learn UI/UX design principles. From Figma basics to shipping a design system.",
    tokenAddr: "USDC...STELLAR",
    enrolleeCount: 5,
    milestoneCount: 4,
    poolBalance: 1200,
    createdAt: 1709800000,
  },
]

export const MOCK_MILESTONES: Record<number, Milestone[]> = {
  0: [
    {
      id: 0,
      workspaceId: 0,
      title: "Hello World",
      description: "Write your first program in any language",
      rewardAmount: 50,
    },
    {
      id: 1,
      workspaceId: 0,
      title: "Build a CLI Tool",
      description: "Create a command-line application that solves a real problem",
      rewardAmount: 100,
    },
    {
      id: 2,
      workspaceId: 0,
      title: "Build your first API",
      description: "Create a REST API with at least 3 endpoints",
      rewardAmount: 150,
    },
    {
      id: 3,
      workspaceId: 0,
      title: "Deploy to Production",
      description: "Deploy your API to a cloud provider",
      rewardAmount: 200,
    },
    {
      id: 4,
      workspaceId: 0,
      title: "Build a Full-Stack App",
      description: "Frontend + backend + database. Ship it.",
      rewardAmount: 500,
    },
  ],
  1: [
    {
      id: 0,
      workspaceId: 1,
      title: "Set up Stellar CLI",
      description: "Install and configure the Stellar development environment",
      rewardAmount: 100,
    },
    {
      id: 1,
      workspaceId: 1,
      title: "First Soroban Contract",
      description: "Write, test, and deploy a hello-world contract",
      rewardAmount: 200,
    },
  ],
}

export const MOCK_COMPLETIONS: Record<number, MilestoneCompletion[]> = {
  0: [
    { milestoneId: 0, enrollee: "GDVW...N5HS", completed: true },
    { milestoneId: 1, enrollee: "GDVW...N5HS", completed: true },
    { milestoneId: 0, enrollee: "GATH...R2BM", completed: true },
  ],
}

export const MOCK_ENROLLEES: Record<number, string[]> = {
  0: ["GDVW...N5HS", "GATH...R2BM", "GCEF...WXYZ"],
  1: ["GDVW...N5HS", "GBYZ...ABCD"],
}

export const MOCK_USER_STATS: UserStats = {
  totalEarned: 750,
  workspacesOwned: 2,
  workspacesEnrolled: 1,
  milestonesCompleted: 4,
}

export interface PlatformStats {
  totalQuests: number
  activeUsers: number
  tokensDistributed: number
}

export interface ActivityEvent {
  id: string
  user: string
  action: "enrolled" | "completed" | "created"
  workspaceName: string
  timestamp: number
}

export interface EarningsDataPoint {
  date: string
  amount: number
}

export const MOCK_PLATFORM_STATS: PlatformStats = {
  totalQuests: 156,
  activeUsers: 842,
  tokensDistributed: 125000,
}

// We can just reuse some of the existing workspaces for trending
export const MOCK_TRENDING_QUESTS = [
  MOCK_WORKSPACES[1],
  MOCK_WORKSPACES[0],
]

export const MOCK_RECENT_ACTIVITY: ActivityEvent[] = [
  {
    id: "act_1",
    user: "GBXR...K2YQ",
    action: "completed",
    workspaceName: "Stellar Development Bootcamp",
    timestamp: Date.now() - 1000 * 60 * 30,
  },
  {
    id: "act_2",
    user: "GCMN...P8TL",
    action: "enrolled",
    workspaceName: "Design Fundamentals",
    timestamp: Date.now() - 1000 * 60 * 60 * 2,
  },
  {
    id: "act_3",
    user: "GDVW...N5HS",
    action: "created",
    workspaceName: "Advanced Rust Patterns",
    timestamp: Date.now() - 1000 * 60 * 60 * 24,
  },
]

export const MOCK_EARNINGS_HISTORY: EarningsDataPoint[] = [
  { date: "Jan", amount: 0 },
  { date: "Feb", amount: 150 },
  { date: "Mar", amount: 400 },
  { date: "Apr", amount: 750 },
]
