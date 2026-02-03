'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import Link from 'next/link';
import { useCart } from '@/lib/cart-context';
import { getStripe } from '@/lib/stripe-client';
import styles from './page.module.css';

/**
 * Converts Google Drive share links to proxied image URLs.
 */
function convertDriveUrl(url) {
  if (!url) return url;
  if (url.startsWith('/api/image')) return url;
  if (url.startsWith('/')) return url;

  let fileId = null;
  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) fileId = fileMatch[1];

  if (!fileId) {
    const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idMatch) fileId = idMatch[1];
  }

  if (fileId) return `/api/image?id=${fileId}`;
  return url;
}

// US States for dropdown
const US_STATES = [
  { value: '', label: 'Select state' },
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'DC', label: 'District of Columbia' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
];

// Shipping constants
const FREE_SHIPPING_THRESHOLD = 50;
const FLAT_RATE_SHIPPING = 5.99;

function CheckoutForm({ clientSecret, orderId, totals }) {
  const router = useRouter();
  const stripe = useStripe();
  const elements = useElements();
  const { clearCart } = useCart();
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError(null);

    const { error: submitError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success?orderId=${orderId}`,
      },
    });

    if (submitError) {
      setError(submitError.message);
      setProcessing(false);
    }
    // If successful, Stripe will redirect to success page
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.paymentElement}>
        <PaymentElement />
      </div>

      <button
        type="submit"
        className={styles.button}
        disabled={!stripe || processing}
      >
        {processing ? 'Processing...' : `Pay $${totals.total.toFixed(2)}`}
      </button>
    </form>
  );
}

function CheckoutContent() {
  const router = useRouter();
  const { data: session } = useSession();
  const { items, subtotal, isLoaded, clearCart } = useCart();

  // Form state
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [street, setStreet] = useState('');
  const [street2, setStreet2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');

  // Checkout state
  const [clientSecret, setClientSecret] = useState(null);
  const [orderId, setOrderId] = useState(null);
  const [totals, setTotals] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Pre-fill email from session
  useEffect(() => {
    if (session?.user?.email) {
      setEmail(session.user.email);
    }
    if (session?.user?.name) {
      setName(session.user.name);
    }
  }, [session]);

  // Calculate shipping display
  const shippingCost = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_RATE_SHIPPING;
  const estimatedTotal = subtotal + shippingCost;

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(item => ({
            variantId: item.variantId,
            quantity: item.quantity,
            name: item.name,
          })),
          customer: {
            email,
            name,
            phone: phone || null,
          },
          shipping: {
            name,
            street,
            street2: street2 || null,
            city,
            state,
            zip,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create order');
      }

      setClientSecret(data.clientSecret);
      setOrderId(data.orderId);
      setTotals({
        subtotal: data.subtotal,
        shipping: data.shipping,
        tax: data.tax,
        total: data.total,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Show loading while cart loads
  if (!isLoaded) {
    return <div className={styles.loading}>Loading...</div>;
  }

  // Show empty cart message
  if (items.length === 0) {
    return (
      <div className={styles.empty}>
        <h2 className={styles.emptyTitle}>Your cart is empty</h2>
        <p className={styles.emptyText}>Add some items to your cart to checkout.</p>
        <Link href="/products" className={styles.emptyLink}>
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      <div className={styles.formSection}>
        {/* If we have clientSecret, show payment form */}
        {clientSecret ? (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Payment</h2>
            <Elements
              stripe={getStripe()}
              options={{
                clientSecret,
                appearance: {
                  theme: 'night',
                  variables: {
                    colorPrimary: '#C4A35A',
                    colorBackground: '#1A1A1A',
                    colorText: 'rgba(255, 255, 255, 0.85)',
                    colorDanger: '#ef4444',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    borderRadius: '0px',
                  },
                },
              }}
            >
              <CheckoutForm
                clientSecret={clientSecret}
                orderId={orderId}
                totals={totals}
              />
            </Elements>
          </div>
        ) : (
          /* Show shipping form first */
          <form onSubmit={handleCreateOrder}>
            {error && <div className={styles.error}>{error}</div>}

            {/* Contact Information */}
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Contact Information</h2>
              <div className={styles.form}>
                <div className={styles.field}>
                  <label htmlFor="email" className={styles.label}>Email *</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={styles.input}
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="phone" className={styles.label}>Phone (optional)</label>
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={styles.input}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Shipping Address</h2>
              <div className={styles.form}>
                <div className={styles.field}>
                  <label htmlFor="name" className={styles.label}>Full Name *</label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={styles.input}
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="street" className={styles.label}>Address *</label>
                  <input
                    id="street"
                    type="text"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    className={styles.input}
                    placeholder="123 Main St"
                    required
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="street2" className={styles.label}>Apartment, suite, etc. (optional)</label>
                  <input
                    id="street2"
                    type="text"
                    value={street2}
                    onChange={(e) => setStreet2(e.target.value)}
                    className={styles.input}
                    placeholder="Apt 4B"
                  />
                </div>
                <div className={`${styles.row} ${styles.row3}`}>
                  <div className={styles.field}>
                    <label htmlFor="city" className={styles.label}>City *</label>
                    <input
                      id="city"
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className={styles.input}
                      placeholder="Los Angeles"
                      required
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="state" className={styles.label}>State *</label>
                    <select
                      id="state"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className={styles.select}
                      required
                    >
                      {US_STATES.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="zip" className={styles.label}>ZIP *</label>
                    <input
                      id="zip"
                      type="text"
                      value={zip}
                      onChange={(e) => setZip(e.target.value)}
                      className={styles.input}
                      placeholder="90001"
                      pattern="\d{5}(-\d{4})?"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className={styles.button}
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Continue to Payment'}
            </button>
          </form>
        )}
      </div>

      {/* Order Summary Sidebar */}
      <div className={styles.summarySection}>
        <div className={styles.summary}>
          <h2 className={styles.summaryTitle}>Order Summary</h2>

          <div className={styles.cartItems}>
            {items.map((item) => (
              <div key={item.key} className={styles.cartItem}>
                {item.image ? (
                  <img
                    src={convertDriveUrl(item.image)}
                    alt={item.name}
                    className={styles.itemImage}
                  />
                ) : (
                  <div className={styles.itemImage} />
                )}
                <div className={styles.itemDetails}>
                  <span className={styles.itemName}>{item.name}</span>
                  <span className={styles.itemMeta}>
                    {[item.size, item.color].filter(Boolean).join(' / ')}
                    {' × '}{item.quantity}
                  </span>
                </div>
                <span className={styles.itemPrice}>
                  ${(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <div className={styles.totals}>
            <div className={styles.totalRow}>
              <span>Subtotal</span>
              <span>${(totals?.subtotal ?? subtotal).toFixed(2)}</span>
            </div>
            <div className={styles.totalRow}>
              <span>Shipping</span>
              <span className={shippingCost === 0 ? styles.freeShipping : ''}>
                {(totals?.shipping ?? shippingCost) === 0 ? 'FREE' : `$${(totals?.shipping ?? shippingCost).toFixed(2)}`}
              </span>
            </div>
            {subtotal < FREE_SHIPPING_THRESHOLD && (
              <div className={styles.totalRow}>
                <span style={{ fontSize: '12px', color: 'var(--color-accent)' }}>
                  Add ${(FREE_SHIPPING_THRESHOLD - subtotal).toFixed(2)} for free shipping
                </span>
              </div>
            )}
            <div className={`${styles.totalRow} ${styles.grand}`}>
              <span>Total</span>
              <span>${(totals?.total ?? estimatedTotal).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <Link href="/products" className={styles.backLink}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to shopping
        </Link>

        <h1 className={styles.title}>Checkout</h1>

        <CheckoutContent />
      </main>
    </div>
  );
}
