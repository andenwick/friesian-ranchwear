"use client";

import styles from "./ShopCta.module.css";

export default function ShopCta() {
  return (
    <section className={styles.section} id="shop">
      <div className={styles.divider} />
      <p className={styles.text}>
        Built for this. Limited runs. No restocks.
      </p>
      <div className={styles.divider} />
    </section>
  );
}
