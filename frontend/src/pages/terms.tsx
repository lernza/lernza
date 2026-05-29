import { LegalPageLayout, LegalSection } from "@/components/legal-page-layout"

export function TermsOfService() {
  return (
    <LegalPageLayout
      title="Terms of Service"
      lastUpdated="May 29, 2026"
      description="Terms governing use of the Lernza learn-to-earn platform, including on-chain rewards and wallet interactions."
      canonicalPath="/terms"
    >
      <LegalSection title="1. Acceptance of Terms">
        <p>
          By accessing or using Lernza (&quot;the Platform&quot;), you agree to these Terms of
          Service. If you do not agree, do not connect a wallet or use reward-eligible features.
        </p>
      </LegalSection>

      <LegalSection title="2. Platform Description">
        <p>
          Lernza is a learn-to-earn platform built on the Stellar blockchain. Quest creators publish
          educational quests with milestones; learners complete milestones and may receive token
          rewards funded on-chain via Soroban smart contracts.
        </p>
        <p>
          Lernza does not custody your funds. All transactions are signed by your wallet (e.g.
          Freighter) and executed on the Stellar network.
        </p>
      </LegalSection>

      <LegalSection title="3. Eligibility">
        <p>
          You must be at least 18 years old and not located in a restricted jurisdiction (see our
          jurisdiction policy). By using the Platform you represent that you meet these requirements.
        </p>
        <p>
          Users receiving cumulative rewards above published thresholds may be required to complete
          identity verification before additional payouts.
        </p>
      </LegalSection>

      <LegalSection title="4. Wallet & On-Chain Activity">
        <p>
          You are solely responsible for securing your wallet and private keys. Lernza cannot reverse
          on-chain transactions. Blockchain transactions are public and permanent.
        </p>
        <p>
          You acknowledge that token rewards may fluctuate in value and that Lernza makes no guarantee
          of reward amounts, token prices, or quest completion outcomes.
        </p>
      </LegalSection>

      <LegalSection title="5. Quest Creators">
        <p>
          Creators who fund reward pools acknowledge they are responsible for compliance with tax,
          securities, and consumer protection laws in their jurisdiction. Lernza provides tooling but
          does not act as a payment processor or escrow agent.
        </p>
      </LegalSection>

      <LegalSection title="6. Prohibited Conduct">
        <ul className="list-inside list-disc space-y-1">
          <li>Using bots or scripts to farm rewards</li>
          <li>Creating multiple wallets to circumvent KYC thresholds</li>
          <li>Exploiting smart contract vulnerabilities</li>
          <li>Violating applicable sanctions or export control laws</li>
        </ul>
      </LegalSection>

      <LegalSection title="7. Disclaimer of Warranties">
        <p>
          The Platform is provided &quot;as is&quot; without warranties of any kind. Smart contracts
          may contain bugs. Use at your own risk.
        </p>
      </LegalSection>

      <LegalSection title="8. Limitation of Liability">
        <p>
          To the maximum extent permitted by law, Lernza and its contributors shall not be liable for
          any indirect, incidental, or consequential damages arising from your use of the Platform.
        </p>
      </LegalSection>

      <LegalSection title="9. Changes">
        <p>
          We may update these Terms. Material changes will be posted on this page with an updated
          date. Continued use after changes constitutes acceptance.
        </p>
      </LegalSection>

      <LegalSection title="10. Contact">
        <p>
          Questions about these Terms:{" "}
          <a href="mailto:legal@lernza.com" className="text-foreground font-bold underline">
            legal@lernza.com
          </a>
        </p>
      </LegalSection>
    </LegalPageLayout>
  )
}
