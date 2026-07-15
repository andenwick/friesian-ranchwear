import Header from '@/app/components/Header/Header';
import Footer from '@/app/components/Footer/Footer';
import styles from '@/app/legal.module.css';

export const metadata = {
  title: 'Terms | Friesian Ranchwear',
};

export default function TermsPage() {
  return (
    <div className={styles.page}>
      <Header alwaysVisible={true} />
      <main className={styles.main}>
        <h1 className={styles.title}>TERMS</h1>
        <p className={styles.updated}>Last updated July 14, 2026</p>

        <section className={styles.section}>
          <h2>Store Use</h2>
          <p>
            By using this site, you agree to use it lawfully and not interfere with its operation,
            accounts, checkout, or security. You are responsible for keeping your account credentials private.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Orders and Payment</h2>
          <p>
            Prices are shown in US dollars. Payment is processed by Stripe. An order is accepted after
            payment succeeds, and we may cancel an order if payment fails, inventory is unavailable, or
            the order appears fraudulent.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Availability and Shipping</h2>
          <p>
            Products are subject to availability. We currently ship within the United States. Shipping,
            tax, and the final total are shown during checkout before payment.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Returns and Refunds</h2>
          <p>
            Contact us before returning an item. Eligibility, timing, and return instructions will be
            confirmed directly. A refund is complete only after it has been processed through the original
            payment method.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Site Content</h2>
          <p>
            Friesian Ranchwear branding, product photos, designs, and site content may not be copied or
            reused without permission. We may update products, pricing, availability, and these terms as
            the store changes.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Contact</h2>
          <p>
            For order or store questions, message{' '}
            <a href="https://instagram.com/friesianranchwear" target="_blank" rel="noopener noreferrer">
              @friesianranchwear
            </a>.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
