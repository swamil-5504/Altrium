import { DocPage, K, Sub } from "../_shared";

const Notifications = () => (
  <DocPage
    kicker="Platform ops"
    title="Telegram Bot"
    summary="How Altrium uses an interactive Telegram Bot for instant notifications, document delivery, and secure student handshake."
  >
    <Sub id="overview" title="Overview">
      <p>
        Altrium leverages an interactive Telegram Bot for instant, reliable push notifications. The bot has evolved from a simple push-service to an <strong>interactive assistant</strong> that handles account linking, status inquiries, and PDF document delivery.
      </p>
    </Sub>

    <Sub id="magic-link" title="Magic Link Onboarding">
      <p>
        Altrium uses an industry-standard <strong>"Magic Link"</strong> handshake for student onboarding. No more manual entry of Telegram IDs.
      </p>
      <ul className="list-disc pl-5 space-y-2 mt-3 marker:text-[#2563eb]">
        <li><strong>Handshake:</strong> Students click "Link Telegram" in their dashboard, which generates a secure, one-time token.</li>
        <li><strong>Deep Linking:</strong> The button opens a deep link (<code>t.me/Altrium_Bot?start=TOKEN</code>).</li>
        <li><strong>Verification:</strong> Upon clicking "Start", the bot verifies the token and instantly pairs the Telegram identity with the Altrium account.</li>
      </ul>
    </Sub>

    <Sub id="bot-features" title="Interactive Features">
      <p>Once linked, students can interact with the bot using natural language or commands:</p>
      <ul className="list-disc pl-5 space-y-2 mt-3">
        <li><code>/start</code> - Check connection status or link a new account.</li>
        <li><code>/link [email]</code> - Alternative method to request a new link token.</li>
        <li><strong>Inquiries:</strong> Ask "What's my status?" or "Show my degrees" for real-time updates.</li>
        <li><strong>Document Delivery:</strong> Ask "Get my degree PDF" to have the bot securely stream your verified credentials directly into the chat.</li>
      </ul>
    </Sub>

    <Sub id="security" title="Security & Cleanup">
      <p>
        The integration is designed with <strong>1-to-1 isolation</strong>. If a user blocks the bot or deletes their chat, Altrium detects the "Forbidden" status and automatically unlinks the account to protect privacy.
      </p>
    </Sub>
  </DocPage>
);

export default Notifications;
