'use client';

import { useEffect, useState } from 'react';
import styles from '../admin.module.css';

export default function EmailsPage() {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchEmails();
  }, []);

  async function fetchEmails() {
    try {
      const res = await fetch('/api/admin/emails');
      if (res.ok) {
        const data = await res.json();
        setEmails(data.emails || []);
      } else {
        setError('Failed to load emails');
      }
    } catch (err) {
      setError('Failed to load emails');
    } finally {
      setLoading(false);
    }
  }

  const copyAllEmails = () => {
    const emailList = emails.map(e => e.email).join(', ');
    navigator.clipboard.writeText(emailList);
    alert(`Copied ${emails.length} emails to clipboard!`);
  };

  const downloadCSV = () => {
    const header = 'Email,Date Subscribed\n';
    const rows = emails.map(e => `${e.email},${e.timestamp}`).join('\n');
    const csv = header + rows;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `friesian-emails-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer} style={{ minHeight: '50vh', background: 'transparent' }}>
        <div className={styles.loadingSpinner} />
      </div>
    );
  }

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>EMAIL SUBSCRIBERS</h1>
          <p className={styles.pageSubtitle}>
            {emails.length} {emails.length === 1 ? 'subscriber' : 'subscribers'} in your mailing list
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
          <button onClick={copyAllEmails} className={styles.secondaryButton}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            Copy All
          </button>
          <button onClick={downloadCSV} className={styles.primaryButton}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '8px',
          padding: 'var(--space-md)',
          color: '#f87171',
          marginBottom: 'var(--space-lg)'
        }}>
          {error}
        </div>
      )}

      {emails.length === 0 ? (
        <div className={styles.tableContainer}>
          <div className={styles.emptyState}>
            <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            <h3 className={styles.emptyTitle}>No subscribers yet</h3>
            <p className={styles.emptyText}>
              Email signups from your website will appear here.
            </p>
          </div>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: '50px' }}>#</th>
                <th>Email</th>
                <th style={{ width: '200px' }}>Date Subscribed</th>
              </tr>
            </thead>
            <tbody>
              {emails.map((item, index) => (
                <tr key={item.id}>
                  <td style={{ color: 'var(--foreground-muted)' }}>{index + 1}</td>
                  <td>{item.email}</td>
                  <td style={{ color: 'var(--foreground-muted)' }}>
                    {item.timestamp ? new Date(item.timestamp).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
