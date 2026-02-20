import Link from 'next/link';
import styles from './page.module.css';

export default function Home() {
  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Monopoly</h1>
      <p className={styles.subtitle}>The classic property trading game</p>
      <div className={styles.buttonGroup}>
        <Link href="/lobby/new" className={`${styles.button} ${styles.createButton}`}>
          Create Game
        </Link>
        <Link href="/lobby/join" className={`${styles.button} ${styles.joinButton}`}>
          Join Game
        </Link>
      </div>
    </main>
  );
}
