import type { Meta, StoryObj } from "@storybook/react-vite"
import { FormField } from "@/components/ui/form-field"

const meta: Meta<typeof FormField> = {
  title: "UI/FormField",
  component: FormField,
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof FormField>

export const Default: Story = {
  render: () => (
    <div className="w-80">
      <FormField id="quest-name" label="Quest Name" required>
        {props => (
          <input
            {...props}
            type="text"
            placeholder="e.g. Introduction to Stellar"
            className="border-input bg-card placeholder:text-muted-foreground w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        )}
      </FormField>
    </div>
  ),
}

export const WithError: Story = {
  render: () => (
    <div className="w-80">
      <FormField
        id="reward-amount"
        label="Reward Amount (USDC)"
        required
        error="Reward amount must be greater than zero."
      >
        {props => (
          <input
            {...props}
            type="number"
            defaultValue="-5"
            className="border-destructive bg-card placeholder:text-muted-foreground w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-destructive"
          />
        )}
      </FormField>
    </div>
  ),
}

export const OptionalField: Story = {
  render: () => (
    <div className="w-80">
      <FormField id="metadata-uri" label="Metadata URI (IPFS / HTTP)">
        {props => (
          <input
            {...props}
            type="text"
            placeholder="ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"
            className="border-input bg-card placeholder:text-muted-foreground w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        )}
      </FormField>
    </div>
  ),
}
