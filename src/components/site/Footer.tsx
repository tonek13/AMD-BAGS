import Link from "next/link";
import { navLinks } from "@/config/site";
import type { ShopSettings } from "@/types/settings";
import { normalizeWhatsAppNumber } from "@/lib/whatsapp";
import styles from "./Footer.module.css";
import { BackToTop } from "./BackToTop";

/** "https://www.instagram.com/maisonhook/" → "instagram.com/maisonhook" */
const displayUrl = (url: string) => url.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");

export function Footer({ settings }: { settings: ShopSettings }) {
  const whatsapp = normalizeWhatsAppNumber(settings.whatsappNumber);
  const { email, location } = settings.contact;
  const { brandName, socialLinks } = settings;

  return (
    <footer className={styles.footer} data-surface="dark" aria-labelledby="footer-title">
      <div className={styles.inner}>
        <div className={styles.top}>
          <div className={styles.say}>
            <p className="eyebrow">Say hello</p>
            <h2 id="footer-title" className={`display ${styles.title}`}>
              Questions, custom colours, <em>or just a hello.</em>
            </h2>
          </div>

          <ul className={styles.contact}>
            {whatsapp && (
              <li>
                <span className={styles.label}>WhatsApp</span>
                <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer">
                  {settings.whatsappNumber}
                  <span className="sr-only"> – message us on WhatsApp (opens in a new tab)</span>
                </a>
              </li>
            )}
            {socialLinks.map((link) => (
              <li key={link.url}>
                <span className={styles.label}>{link.label}</span>
                <a href={link.url} target="_blank" rel="noopener noreferrer">
                  {displayUrl(link.url)}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            ))}
            {email && (
              <li>
                <span className={styles.label}>Email</span>
                <a href={`mailto:${email}`}>{email}</a>
              </li>
            )}
            {location && (
              <li>
                <span className={styles.label}>Based in</span>
                <span>{location}</span>
              </li>
            )}
          </ul>

          <nav className={styles.nav} aria-label="Footer">
            {navLinks.map((l) => (
              <Link key={l.href} href={`/${l.href}`}>
                {l.label}
              </Link>
            ))}
            <BackToTop />
          </nav>
        </div>

        <div className={styles.bottom}>
          <p>&copy; {brandName}. Every bag is handmade, so small differences are part of the charm.</p>
        </div>
      </div>

      <p className={styles.wordmark} aria-hidden="true" style={{ "--chars": Math.max(4, brandName.length) } as React.CSSProperties}>
        {brandName}
      </p>
    </footer>
  );
}
