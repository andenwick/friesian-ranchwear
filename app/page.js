import Header from "./components/Header/Header";
import Hero from "./components/Hero/Hero";
import ProductShowcase from "./components/ProductShowcase/ProductShowcase";
import ShopCta from "./components/ShopCta/ShopCta";
import EmailSignup from "./components/EmailSignup/EmailSignup";
import SocialLinks from "./components/SocialLinks/SocialLinks";
import Footer from "./components/Footer/Footer";
import ScrollProgress from "./components/ScrollProgress/ScrollProgress";
import ParallaxShapes from "./components/ParallaxShapes/ParallaxShapes";

export default function Home() {
  return (
    <main style={{ position: "relative", overflow: "hidden" }}>
      {/* Page-long decorative elements */}
      <ScrollProgress />
      <ParallaxShapes />

      <Header />
      <Hero />
      <ProductShowcase />
      <ShopCta />
      <EmailSignup />
      <SocialLinks />
      <Footer />
    </main>
  );
}
