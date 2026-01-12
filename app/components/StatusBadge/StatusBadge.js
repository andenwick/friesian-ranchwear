import styles from './StatusBadge.module.css';

const STATUS_CONFIG = {
  PENDING: { label: 'Pending', color: '#f59e0b' },
  PAID: { label: 'Paid', color: '#10b981' },
  PROCESSING: { label: 'Processing', color: '#3b82f6' },
  SHIPPED: { label: 'Shipped', color: '#8b5cf6' },
  DELIVERED: { label: 'Delivered', color: '#10b981' },
  CANCELLED: { label: 'Cancelled', color: '#ef4444' },
  REFUNDED: { label: 'Refunded', color: '#6b7280' },
};

export default function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || { label: status, color: '#6b7280' };

  return (
    <span
      className={styles.badge}
      style={{ backgroundColor: `${config.color}20`, color: config.color }}
    >
      {config.label}
    </span>
  );
}
