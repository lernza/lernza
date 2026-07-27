import type { Meta, StoryObj } from "@storybook/react-vite"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const meta: Meta<typeof Card> = {
  title: "UI/Card",
  component: Card,
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof Card>

export const Default: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>This is a description for the card component example.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm">Card content goes here. This can be any React node.</p>
      </CardContent>
      <CardFooter>
        <Button size="sm">Action</Button>
      </CardFooter>
    </Card>
  ),
}

export const Simple: Story = {
  render: () => (
    <Card className="w-80 p-6">
      <p className="text-sm font-semibold">Simple card with just content</p>
      <p className="text-muted-foreground mt-2 text-xs">No header or footer elements.</p>
    </Card>
  ),
}
