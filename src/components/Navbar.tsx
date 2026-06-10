'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import styles from './ArchiveDashboard.module.css';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  // 관리자 페이지에서는 상단 공통 네비바 노출 배제
  if (pathname.startsWith('/admin')) return null;

  return (
    <nav className={styles.stickyNavbar}>
      <div className={styles.navbarContent}>
        <Link href="/" className={styles.navbarLogo}>
          <h1>6·3 <span>아카이브</span></h1>
        </Link>
        <div className={styles.navbarMenu}>
          <Link href="/" className={pathname === '/' ? styles.navbarLinkActive : styles.navbarLink}>
            홈
          </Link>
          <Link href="/archive" className={pathname === '/archive' ? styles.navbarLinkActive : styles.navbarLink}>
            목록
          </Link>
          <Link href="/submit" className={pathname === '/submit' ? styles.navbarLinkActive : styles.navbarLink}>
            제보
          </Link>
          
          <button 
            className={styles.navbarSearchBtn} 
            onClick={() => router.push('/archive?focusSearch=true')}
            aria-label="검색"
            title="목록에서 검색하기"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
}
