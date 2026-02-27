import Header from "./components/Header/Header";
import Hero from "./components/Hero/Hero";
import ProductShowcase from "./components/ProductShowcase/ProductShowcase";
import ShopCta from "./components/ShopCta/ShopCta";
import EmailSignup from "./components/EmailSignup/EmailSignup";
import Footer from "./components/Footer/Footer";

export default function Home() {
  return (
    <main>
      <Header />
      <Hero />
      <ProductShowcase />
      <ShopCta />
      <EmailSignup />
      <Footer />
    </main>
  );
}
