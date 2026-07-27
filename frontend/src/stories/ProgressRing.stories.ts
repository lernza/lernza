import type { Meta, StoryObj } from "@storybook/react"
import { ProgressRing } from "@/components/progress-ring"

const meta: Meta<typeof ProgressRing> = {
  title: "Components/ProgressRing",
  component: ProgressRing,
  tags: ["autodocs"],
  argTypes: {
    progress: { control: { type: "range", min: 0, max: 100 } },
    size: { control: "select", options: ["sm", "md", "lg"] },
    showLabel: { control: "boolean" },
    animated: { control: "boolean" },
    isLoading: { control: "boolean" },
  },
}

export default meta
type Story = StoryObj<typeof ProgressRing>

export const Empty: Story = {
  args: { progress: 0 },
}

export const InProgress: Story = {
  args: { progress: 45 },
}

export const Complete: Story = {
  args: { progress: 100 },
}

export const Small: Story = {
  args: { progress: 67, size: "sm" },
}

export const Large: Story = {
  args: { progress: 33, size: "lg" },
}

export const NoLabel: Story = {
  args: { progress: 72, showLabel: false },
}

export const Loading: Story = {
  args: { isLoading: true },
}

export const NonAnimated: Story = {
  args: { progress: 80, animated: false },
}
