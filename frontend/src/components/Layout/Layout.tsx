import { Outlet } from 'react-router-dom';
import Navbar from '@/components/Navbar/Navbar';
import Sidebar from '@/components/Sidebar/Sidebar';
import LoadingBar from '@/components/LoadingBar/LoadingBar';
import styles from './Layout.module.css';

export default function Layout() {
  return (
    <div className={styles.app}>
      <LoadingBar />
      <Navbar />
      <div className={styles.main}>
        <Sidebar />
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
