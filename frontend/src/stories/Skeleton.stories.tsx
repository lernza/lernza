import type { Meta, StoryObj } from "@storybook/react-vite"
import {
  Skeleton,
  SkeletonCard,
  SkeletonMilestone,
  SkeletonMilestoneList,
  SkeletonStatsRow,
  SkeletonProfileHeader,
  SkeletonQuestList,
} from "@/components/ui/skeleton"

const meta: Meta<typeof Skeleton> = {
  title: "UI/Skeleton",
  component: Skeleton,
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof Skeleton>

export const Base: Story = {
  render: () => (
    <div className="space-y-3 w-80">
      <Skeleton className="h-5 w-3/5" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-4 w-2/5" />
    </div>
  ),
}

export const CardSkeleton: Story = {
  render: () => <SkeletonCard className="w-80" />,
}

export const MilestoneSkeleton: Story = {
  render: () => <SkeletonMilestone className="w-96" />,
}

export const MilestoneList: Story = {
  render: () => <SkeletonMilestoneList count={3} className="w-96" />,
}

export const StatsRow: Story = {
  render: () => <SkeletonStatsRow />,
}

export const ProfileHeader: Story = {
  render: () => <SkeletonProfileHeader />,
}

export const QuestList: Story = {
  render: () => <SkeletonQuestList count={3} />,
}
