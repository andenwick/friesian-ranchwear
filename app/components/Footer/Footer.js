import styles from "./Footer.module.css";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.content}>
        <p className={styles.brand}>Friesian Ranchwear</p>
        <p className={styles.copyright}>
          {currentYear} Friesian Ranchwear. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
