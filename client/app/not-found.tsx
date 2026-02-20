import Link from 'next/link';
import styles from './not-found.module.css';

export default function NotFound() {
  return (
    <main className={styles.container}>
      <h1 className={styles.code}>404</h1>
      <p className={styles.message}>This property is not for sale!</p>
      <Link href="/" className={styles.homeLink}>
        Back to Home
      </Link>
    </main>
  );
}
