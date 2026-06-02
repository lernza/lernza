import { LegalPageLayout, LegalSection } from "@/components/legal-page-layout"

export function PrivacyPolicy() {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      lastUpdated="May 29, 2026"
      description="How Lernza collects, uses, and protects data including wallet addresses, on-chain history, and analytics."
      canonicalPath="/privacy"
    >
      <LegalSection title="1. Overview">
        <p>
          Lernza respects your privacy. This policy describes what data we collect, why we collect
          it, and your choices. Because Lernza is a blockchain application, some data is inherently
          public on the Stellar ledger.
        </p>
      </LegalSection>

      <LegalSection title="2. Data We Collect">
        <p>
          <strong className="text-foreground">Wallet addresses.</strong> When you connect a wallet,
          we read your public Stellar address to display balances, quest progress, and transaction
          history via Horizon and Soroban RPC.
        </p>
        <p>
          <strong className="text-foreground">On-chain history.</strong> Quest enrollments, milestone
          completions, and reward distributions are stored on-chain and are publicly visible to
          anyone with network access.
        </p>
        <p>
          <strong className="text-foreground">Usage analytics.</strong> We use Vercel Analytics and
          Speed Insights to collect anonymized page views, performance metrics, and device type. No
          personally identifiable information is sent to analytics providers.
        </p>
        <p>
          <strong className="text-foreground">Local storage.</strong> Theme preference and pending
          transaction queue data are stored in your browser&apos;s localStorage and never transmitted
          to our servers.
        </p>
        <p>
          <strong className="text-foreground">KYC data (if applicable).</strong> If you exceed reward
          thresholds requiring identity verification, KYC documents are collected by our third-party
          KYC provider and stored off-chain under their privacy policy.
        </p>
      </LegalSection>

      <LegalSection title="3. How We Use Data">
        <ul className="list-inside list-disc space-y-1">
          <li>Display your quest progress and earnings</li>
          <li>Submit signed transactions to the Stellar network on your behalf</li>
          <li>Monitor platform performance and fix bugs</li>
          <li>Detect fraud and enforce KYC thresholds</li>
          <li>Comply with legal obligations and sanctions screening</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Data Sharing">
        <p>
          We do not sell your data. We share data only with: (a) Stellar network validators and RPC
          providers necessary for transaction execution; (b) analytics providers (Vercel) under
          anonymized form; (c) KYC vendors when you voluntarily complete verification; (d) law
          enforcement when required by valid legal process.
        </p>
      </LegalSection>

      <LegalSection title="5. Cookies & Tracking">
        <p>
          Lernza uses first-party cookies only through Vercel Analytics for aggregate traffic
          measurement. We do not use third-party advertising cookies. You may disable cookies in
          your browser, though some analytics features may not function.
        </p>
      </LegalSection>

      <LegalSection title="6. Data Retention">
        <p>
          On-chain data is permanent and cannot be deleted. Analytics data is retained per
          Vercel&apos;s default retention (26 months). KYC data retention follows our{" "}
          <a
            href="https://github.com/lernza/lernza/blob/main/docs/legal/reward-distribution-policy.md"
            className="text-foreground font-bold underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            reward distribution policy
          </a>{" "}
          (5 years after last activity).
        </p>
      </LegalSection>

      <LegalSection title="7. Your Rights">
        <p>
          Depending on your jurisdiction (GDPR, CCPA), you may have rights to access, correct, or
          delete off-chain personal data. On-chain data cannot be modified or erased. Contact us to
          exercise off-chain data rights.
        </p>
      </LegalSection>

      <LegalSection title="8. Security">
        <p>
          We use HTTPS, Content Security Policy headers, and least-privilege access for
          infrastructure. Wallet private keys never leave your browser extension.
        </p>
      </LegalSection>

      <LegalSection title="9. Children">
        <p>Lernza is not intended for users under 18. We do not knowingly collect data from minors.</p>
      </LegalSection>

      <LegalSection title="10. Changes">
        <p>
          We will update this policy when our data practices change. Check the date at the top of
          this page for the latest version.
        </p>
      </LegalSection>

      <LegalSection title="11. Contact">
        <p>
          Privacy inquiries:{" "}
          <a href="mailto:privacy@lernza.com" className="text-foreground font-bold underline">
            privacy@lernza.com
          </a>
        </p>
      </LegalSection>
    </LegalPageLayout>
  )
}
