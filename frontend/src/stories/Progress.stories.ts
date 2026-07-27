import type { Meta, StoryObj } from "@storybook/react"
import { Progress } from "@/components/ui/progress"

const meta: Meta<typeof Progress> = {
  title: "UI/Progress",
  component: Progress,
  tags: ["autodocs"],
  argTypes: {
    value: { control: { type: "range", min: 0, max: 100 } },
    max: { control: "number" },
  },
}

export default meta
type Story = StoryObj<typeof Progress>

export const Empty: Story = {
  args: { value: 0 },
}

export const Quarter: Story = {
  args: { value: 25 },
}

export const Half: Story = {
  args: { value: 50 },
}

export const ThreeQuarters: Story = {
  args: { value: 75 },
}

export const Complete: Story = {
  args: { value: 100 },
}

export const CustomMax: Story = {
  args: { value: 3, max: 10 },
}
