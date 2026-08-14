import Image from "next/image";
import styles from "./Hero.module.css";

export default function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.content}>
        <h1 className={styles.title}>
          <span className={styles.heroMark} aria-hidden="true">
            <Image
              src="/friesian-logo-chrome.png"
              alt=""
              width={512}
              height={512}
              priority
              className={styles.heroMarkFallback}
            />
            <video
              className={styles.heroMarkVideo}
              autoPlay
              muted
              playsInline
              preload="auto"
              poster="/friesian-logo-chrome.png"
            >
              <source
                src="/friesian-logo-minimax-alpha.webm"
                type="video/webm"
              />
            </video>
          </span>
          <span className={styles.srOnly}>Friesian Ranchwear</span>
        </h1>
        <p className={styles.subtitle}>
          Nothing you wear is an accident.
        </p>
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
    </section>
  );
}
