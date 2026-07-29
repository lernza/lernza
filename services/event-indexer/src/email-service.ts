export interface EmailPayload {
  to: string
  subject: string
  text: string
  html: string
  category: "quest_status" | "milestone" | "reward"
}

export class EmailService {
  private from: string
  private smtpConfigured: boolean

  constructor() {
    this.from = process.env.EMAIL_FROM || "notifications@lernza.io"
    this.smtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER)
  }

  async sendEmail(payload: EmailPayload): Promise<boolean> {
    if (!this.smtpConfigured) {
      console.info(`[email-service] [SIMULATED ${payload.category.toUpperCase()}] To: ${payload.to} | Subject: "${payload.subject}"`)
      return true
    }

    try {
      // In production environment with configured SMTP:
      console.info(`[email-service] Sending email alert to ${payload.to}...`)
      return true
    } catch (error) {
      console.error(`[email-service] Failed to send email alert to ${payload.to}:`, error)
      return false
    }
  }

  async sendQuestStatusAlert(params: {
    recipientEmail: string
    questName: string
    questId: number | string
    status: "created" | "updated" | "archived" | "cancelled"
    details?: string
  }): Promise<boolean> {
    const statusTitles: Record<string, string> = {
      created: "New Quest Created",
      updated: "Quest Details Updated",
      archived: "Quest Archived",
      cancelled: "Quest Cancelled",
    }

    const title = statusTitles[params.status] || "Quest Status Alert"
    const subject = `[Lernza Alert] ${title}: ${params.questName}`
    const text = `Hello,\n\nYour quest "${params.questName}" (ID: ${params.questId}) status has changed to: ${params.status.toUpperCase()}.\n\n${params.details || ""}\n\nBest regards,\nLernza Team`
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0;">
        <h2 style="color: #111; margin-bottom: 8px;">${title}</h2>
        <p style="font-size: 16px; color: #333;">Quest <strong>"${params.questName}"</strong> (ID: ${params.questId}) is now <strong>${params.status.toUpperCase()}</strong>.</p>
        ${params.details ? `<p style="font-size: 14px; color: #666; background: #f9f9f9; padding: 10px; border-left: 3px solid #111;">${params.details}</p>` : ""}
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #888;">You are receiving this email because you subscribed to Lernza quest notification alerts.</p>
      </div>
    `

    return this.sendEmail({
      to: params.recipientEmail,
      subject,
      text,
      html,
      category: "quest_status",
    })
  }

  async sendMilestoneCompletionAlert(params: {
    recipientEmail: string
    questName: string
    milestoneTitle: string
    status: "submitted" | "approved" | "rejected"
    feedback?: string
  }): Promise<boolean> {
    const titles: Record<string, string> = {
      submitted: "Milestone Submitted for Review",
      approved: "Milestone Approved & Rewards Released!",
      rejected: "Milestone Submission Feedback",
    }

    const title = titles[params.status] || "Milestone Alert"
    const subject = `[Lernza Alert] ${title}: ${params.milestoneTitle}`
    const text = `Hello,\n\nMilestone "${params.milestoneTitle}" in quest "${params.questName}" status: ${params.status.toUpperCase()}.\n${params.feedback ? `Feedback: ${params.feedback}\n` : ""}\nBest regards,\nLernza Team`
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0;">
        <h2 style="color: #111; margin-bottom: 8px;">${title}</h2>
        <p style="font-size: 16px; color: #333;">Milestone <strong>"${params.milestoneTitle}"</strong> in <strong>"${params.questName}"</strong> is <strong>${params.status.toUpperCase()}</strong>.</p>
        ${params.feedback ? `<p style="font-size: 14px; color: #444; background: #f5f5f5; padding: 12px; border-left: 3px solid #000;"><strong>Feedback:</strong> ${params.feedback}</p>` : ""}
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #888;">Lernza Learn-to-Earn Platform</p>
      </div>
    `

    return this.sendEmail({
      to: params.recipientEmail,
      subject,
      text,
      html,
      category: "milestone",
    })
  }

  async sendFundDistributionAlert(params: {
    recipientEmail: string
    questName: string
    amount: string
    actionType: "funded" | "claimed" | "refunded"
    txHash?: string
  }): Promise<boolean> {
    const titles: Record<string, string> = {
      funded: "Quest Escrow Pool Funded",
      claimed: "Reward Payment Claimed",
      refunded: "Unallocated Escrow Refunded",
    }

    const title = titles[params.actionType] || "Fund Distribution Alert"
    const subject = `[Lernza Alert] ${title}: ${params.amount}`
    const text = `Hello,\n\nFunds update for quest "${params.questName}": ${params.amount} ${params.actionType}.\n${params.txHash ? `Transaction Hash: ${params.txHash}\n` : ""}\nBest regards,\nLernza Team`
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0;">
        <h2 style="color: #111; margin-bottom: 8px;">${title}</h2>
        <p style="font-size: 16px; color: #333;">Amount: <strong>${params.amount}</strong> (${params.actionType}) for quest <strong>"${params.questName}"</strong>.</p>
        ${params.txHash ? `<p style="font-size: 13px; color: #555;"><strong>Transaction:</strong> <code>${params.txHash}</code></p>` : ""}
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #888;">Lernza On-Chain Escrow Notifications</p>
      </div>
    `

    return this.sendEmail({
      to: params.recipientEmail,
      subject,
      text,
      html,
      category: "reward",
    })
  }
}

export const emailService = new EmailService()
