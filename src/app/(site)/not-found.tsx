import { getShopSettings } from "@/lib/catalog";
import { Footer } from "@/components/site/Footer";
import { NotFoundPage } from "@/components/site/NotFoundPage";

export default async function NotFound() {
  const settings = await getShopSettings();

  return (
    <>
      <NotFoundPage />
      <Footer settings={settings} />
    </>
  );
}
