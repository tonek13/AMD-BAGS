import type { ShopSettings } from "@/types/settings";
import { buildWhatsAppUrl, normalizeWhatsAppNumber } from "@/lib/whatsapp";
import styles from "./Customize.module.css";

const WHATSAPP_MESSAGE = "Hi! I’d love to customize a bag. Can we talk about colours and details?";
const EMAIL_SUBJECT = "I’d like to customize a bag";

interface CustomizeProps {
  settings: ShopSettings;
  /** "band" is the full homepage section; "compact" is the short version used inside the menu. */
  variant?: "band" | "compact";
}

/**
 * "Make it yours": invites customers to ask for a custom bag, with the shop's WhatsApp number and
 * email (both from Shop Settings). Shows nothing until at least one of them has been entered.
 */
export function Customize({ settings, variant = "band" }: CustomizeProps) {
  const whatsapp = normalizeWhatsAppNumber(settings.whatsappNumber);
  const email = settings.contact.email;
  if (!whatsapp && !email) return null;

  const compact = variant === "compact";
  const Heading = compact ? "h3" : "h2";

  return (
    <section className={`${styles.customize} ${compact ? styles.compact : ""}`} aria-labelledby={compact ? "customize-title-menu" : "customize-title"}>
      <div className={styles.inner}>
        <div className={styles.say}>
          <p className={`eyebrow ${styles.kicker}`}>Made for you</p>
          <Heading id={compact ? "customize-title-menu" : "customize-title"} className={`display ${styles.title}`}>
            Your bag, <em>your way.</em>
          </Heading>
          <p className={styles.text}>
            {compact
              ? "A different colour, a longer strap, your initials stitched in? Tell us and we’ll hook it just for you."
              : "Want another colour, a longer strap or your initials stitched in? Tell us what you’re dreaming of and we’ll hook it just for you."}
          </p>
        </div>

        <ul className={styles.channels}>
          {whatsapp && (
            <li>
              <a className={styles.channel} href={buildWhatsAppUrl(whatsapp, WHATSAPP_MESSAGE)} target="_blank" rel="noopener noreferrer">
                <span className={styles.label}>WhatsApp</span>
                <span className={styles.value}>{settings.whatsappNumber}</span>
                <span className="sr-only"> – message us about a custom bag (opens in a new tab)</span>
                <Arrow />
              </a>
            </li>
          )}
          {email && (
            <li>
              <a className={styles.channel} href={`mailto:${email}?subject=${encodeURIComponent(EMAIL_SUBJECT)}`}>
                <span className={styles.label}>Email</span>
                <span className={styles.value}>{email}</span>
                <span className="sr-only"> – email us about a custom bag</span>
                <Arrow />
              </a>
            </li>
          )}
        </ul>
      </div>
    </section>
  );
}

function Arrow() {
  return (
    <svg className={styles.arrow} viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
      <path d="M3 10h13M11 4l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
