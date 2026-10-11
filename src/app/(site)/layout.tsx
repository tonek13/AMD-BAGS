import type { Metadata, Viewport } from "next";
import { Fraunces, Hanken_Grotesk } from "next/font/google";
import "lenis/dist/lenis.css";
import "./globals.css";
import { siteConfig } from "@/config/site";
import { getCatalog, getShopSettings } from "@/lib/catalog";
import { MotionRoot } from "@/components/motion/MotionRoot";
import { ShopProvider } from "@/components/shop/ShopProvider";
import { Header } from "@/components/site/Header";

// Display face: a soft, slightly wonky serif with variable axes. The story section
// animates weight and softness, so the optical-size/softness axes are loaded too.
const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["SOFT", "WONK", "opsz"],
  variable: "--font-fraunces",
  display: "swap",
});

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const { brandName } = await getShopSettings();
  const title = `${brandName} — ${siteConfig.tagline}`;
  return {
    title: { default: title, template: `%s · ${brandName}` },
    description: siteConfig.description,
    openGraph: { title, description: siteConfig.description, type: "website" },
  };
}

export const viewport: Viewport = {
  themeColor: "#f6efe3",
};

/**
 * Runs before first paint. If the visitor allows motion it adds `motion` to <html>,
 * which switches on the pre-hide rules for animated elements. If JS never reports
 * back with `motion-ready` (see MotionRoot) the class is dropped after 6s so no
 * content can stay hidden.
 */
const motionBootScript = `(function(d){try{if(!window.matchMedia("(prefers-reduced-motion: reduce)").matches){d.classList.add("motion");setTimeout(function(){if(!d.classList.contains("motion-ready"))d.classList.remove("motion")},6000)}}catch(e){}})(document.documentElement)`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [{ products, categories, colors }, settings] = await Promise.all([getCatalog(), getShopSettings()]);

  return (
    <html lang="en" className={`${fraunces.variable} ${hanken.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: motionBootScript }} />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <MotionRoot>
          <ShopProvider settings={settings} products={products} categories={categories} colors={colors}>
            <Header />
            {children}
          </ShopProvider>
        </MotionRoot>
      </body>
    </html>
  );
}
