import { navLinks, siteConfig } from "@/config/site";
import { normalizeWhatsAppNumber } from "@/lib/whatsapp";
import styles from "./Footer.module.css";
import { BackToTop } from "./BackToTop";

export function Footer() {
  const whatsapp = normalizeWhatsAppNumber(siteConfig.whatsappNumber);
  const { instagram, email, location } = siteConfig.contact;

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
            <li>
              <span className={styles.label}>WhatsApp</span>
              {whatsapp ? (
                <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer">
                  {siteConfig.whatsappNumber}
                  <span className="sr-only"> – message us on WhatsApp (opens in a new tab)</span>
                </a>
              ) : (
                <span className={styles.muted}>Ordering opens as soon as the shop number is added.</span>
              )}
            </li>
            {instagram && (
              <li>
                <span className={styles.label}>Instagram</span>
                <a href={`https://instagram.com/${instagram.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer">
                  @{instagram.replace(/^@/, "")}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            )}
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
              <a key={l.href} href={l.href}>
                {l.label}
              </a>
            ))}
            <BackToTop />
          </nav>
        </div>

        <div className={styles.bottom}>
          <p>
            &copy; {siteConfig.brandName}. Every bag is handmade, so small differences are part of the charm.
          </p>
        </div>
      </div>

      <p className={styles.wordmark} aria-hidden="true" style={{ "--chars": Math.max(4, siteConfig.brandName.length) } as React.CSSProperties}>
        {siteConfig.brandName}
      </p>
    </footer>
  );
}
