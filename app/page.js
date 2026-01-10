import Hero from "./components/Hero/Hero";
import BrandStory from "./components/BrandStory/BrandStory";
import ProductShowcase from "./components/ProductShowcase/ProductShowcase";
import ShopCta from "./components/ShopCta/ShopCta";
import EmailSignup from "./components/EmailSignup/EmailSignup";
import SocialLinks from "./components/SocialLinks/SocialLinks";
import Footer from "./components/Footer/Footer";

export default function Home() {
  return (
    <main>
      <Hero />
      <BrandStory />
      <ProductShowcase />
      <ShopCta />
      <EmailSignup />
      <SocialLinks />
      <Footer />
    </main>
  );
}
