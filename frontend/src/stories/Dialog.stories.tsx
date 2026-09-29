import type { Meta, StoryObj } from "@storybook/react-vite"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

const meta: Meta<typeof Dialog> = {
  title: "UI/Dialog",
  component: Dialog,
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof Dialog>

export const OpenDialog: Story = {
  render: () => (
    <div className="relative h-96 w-full overflow-hidden rounded-lg border border-dashed p-4">
      <Dialog open={true}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Enrollment</DialogTitle>
            <DialogDescription>
              Are you sure you want to enroll in the Stellar Soroban Quest? This will record your
              account on-chain.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline">Cancel</Button>
            <Button>Enroll</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  ),
}

export const DestructiveDialog: Story = {
  render: () => (
    <div className="relative h-96 w-full overflow-hidden rounded-lg border border-dashed p-4">
      <Dialog open={true}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Milestone</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the milestone and remove
              all pending learner submissions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline">Keep Milestone</Button>
            <Button variant="destructive">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  ),
}
