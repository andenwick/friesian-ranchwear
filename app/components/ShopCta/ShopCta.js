import styles from "./ShopCta.module.css";

export default function ShopCta() {
  return (
    <section className={styles.shopCta} id="tiktok-shop">
      <div className={styles.content}>
        <h2 className={styles.heading}>Shop the Collection</h2>
        <p className={styles.text}>
          Find our full lineup on TikTok Shop. Fresh drops, exclusive deals,
          and the gear that bridges the gap between country roots and street style.
        </p>
        <a
          href="https://tiktok.com/@friesianranchwear"
          className={styles.cta}
          target="_blank"
          rel="noopener noreferrer"
        >
          Visit TikTok Shop
        </a>
      </div>
    </section>
  );
}
