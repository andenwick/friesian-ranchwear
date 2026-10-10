import Header from "./components/Header/Header";
import Hero from "./components/Hero/Hero";
import ProductShowcase from "./components/ProductShowcase/ProductShowcase";
import ShopCta from "./components/ShopCta/ShopCta";
import EmailSignup from "./components/EmailSignup/EmailSignup";
import Footer from "./components/Footer/Footer";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.page}>
      <Header />
      <Hero />
      <ProductShowcase />
      <ShopCta />
      <EmailSignup />
      <Footer />
    </main>
  );
}
