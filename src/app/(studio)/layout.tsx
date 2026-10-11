/**
 * Root layout for the Studio (the owner's dashboard at /studio).
 *
 * It is deliberately separate from the storefront's root layout, so none of the storefront runs
 * here: no header, cart, shop provider, fonts, or Lenis smooth scrolling. Sanity Studio brings its
 * own interface and styling.
 */
export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
