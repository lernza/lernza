import type { Meta, StoryObj } from "@storybook/react-vite"
import { CertificateCard } from "@/components/certificate/CertificateCard"

const meta: Meta<typeof CertificateCard> = {
  title: "Sections/Certificate",
  component: CertificateCard,
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof CertificateCard>

export const Default: Story = {
  args: {
    certificateId: 42,
    recipient: "GBZXN7PIRZGNMHGA728R4P3GTYUIO5678JKLMN456789OPQ",
    questName: "Stellar Soroban Smart Contracts Bootcamp",
    questCategory: "Core Development",
    milestoneCount: 5,
    completionDate: 1727289600,
    issuer: "GCLM4O5P7Q8R9S0T1U2V3W4X5Y6Z7A8B9C0D1E2F3G4H",
    onDownload: () => alert("Download clicked"),
    onCopyLink: () => alert("Copy link clicked"),
    isCopied: false,
  },
}

export const LinkCopied: Story = {
  args: {
    certificateId: 108,
    recipient: "GBZXN7PIRZGNMHGA728R4P3GTYUIO5678JKLMN456789OPQ",
    questName: "Decentralized Liquidity Management",
    questCategory: "DeFi",
    milestoneCount: 4,
    completionDate: 1727000000,
    issuer: "GCLM4O5P7Q8R9S0T1U2V3W4X5Y6Z7A8B9C0D1E2F3G4H",
    isCopied: true,
  },
}
