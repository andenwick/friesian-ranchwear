import Header from '@/app/components/Header/Header';
import Footer from '@/app/components/Footer/Footer';
import styles from '@/app/legal.module.css';

export const metadata = {
  title: 'Privacy Policy | Friesian Ranchwear',
};

export default function PrivacyPage() {
  return (
    <div className={styles.page}>
      <Header alwaysVisible={true} />
      <main className={styles.main}>
        <h1 className={styles.title}>PRIVACY POLICY</h1>
        <p className={styles.updated}>Last updated July 14, 2026</p>

        <section className={styles.section}>
          <h2>Information We Collect</h2>
          <p>
            We collect the information you provide when you create an account, join the mailing list,
            place an order, or contact us. This may include your name, email, phone number, shipping
            address, account details, and order history.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Payments</h2>
          <p>
            Payments are processed by Stripe. Friesian Ranchwear does not store your full card number
            or card security code. Stripe handles payment information under its own privacy policy.
          </p>
        </section>

        <section className={styles.section}>
          <h2>How We Use Information</h2>
          <ul>
            <li>Process and fulfill orders.</li>
            <li>Provide account and order-tracking features.</li>
            <li>Respond to questions and prevent fraud or misuse.</li>
            <li>Send mailing-list updates when you choose to subscribe.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Services We Use</h2>
          <p>
            We use service providers to host the site, store order data, process payments, store product
            images, and maintain the mailing list. These currently include Railway, PostgreSQL, Stripe,
            Cloudinary, and Google Sheets. Analytics only loads when it is enabled and you accept the
            cookie prompt.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Your Choices</h2>
          <p>
            You can decline optional analytics cookies in the cookie prompt. To ask about your account,
            mailing-list subscription, or personal information, message{' '}
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
