import Image from "next/image";
import styles from "./Hero.module.css";

export default function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.content}>
        <Image
          src="/logo.jpg"
          alt="Friesian Ranchwear Logo"
          width={280}
          height={280}
          className={styles.logo}
          priority
        />
        <h1 className={styles.tagline}>Where the Range Meets the Streets</h1>
        <a href="#tiktok-shop" className={styles.cta}>
          Shop Now
        </a>
      </div>
    </section>
  );
}
