'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './ArchiveDashboard.module.css';

export default function Footer() {
  const pathname = usePathname();

  // 관리자 페이지에서는 푸터 노출 배제
  if (pathname.startsWith('/admin')) return null;

  return (
    <footer className={styles.footer}>
      <div className={styles.footerContent}>
        <img 
          src="/images/footer-logo.png" 
          alt="탄탄대로 로고" 
          className={styles.footerLogo}
        />
        <p className={styles.footerDesc}>
          6·3 투표용지 부족 사태라는 초유의 주권 침해에 맞서, 공정한 민주주의를 촉구하는 전국 대학생들의 연대가 이어지는 가운데, 이 역사적인 분노와 연대의 목소리를 기록합니다.
        </p>
        <div style={{display: 'flex', gap: '24px', alignItems: 'center', justifyContent: 'center'}}>
          <a href="https://www.instagram.com/tantanroad.official/" target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
            </svg>
          </a>
          <Link href="/admin" className={styles.adminLoginLink}>
            관리자 로그인
          </Link>
        </div>
      </div>
    </footer>
  );
}
