import HeroVideo from "./HeroVideo";
import styles from "./Hero.module.css";

export default function Hero() {
  return (
    <section className={styles.hero}>
      <h1 className={styles.srOnly}>Friesian Ranchwear</h1>
      {/* The tagline is part of the rendered scene; this copy is for search engines and screen readers */}
      <p className={styles.srOnly}>Nothing you wear is an accident.</p>
      <div className={styles.media}>
        <div className={styles.frame}>
          <HeroVideo />
          <a href="/products" className={styles.cta}>
            <span>SHOP COLLECTION</span>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
