'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import styles from './PosterImageViewer.module.css';

interface PosterImageViewerProps {
  src: string;
  alt: string;
  title: string;
}

export default function PosterImageViewer({ src, alt }: PosterImageViewerProps) {
  const imageUrls = src ? src.split(',').filter(Boolean) : [];
  const [currentIndex, setCurrentIndex] = useState(0);

  // Keyboard navigation for carousel pages
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        return;
      }

      if (e.key === 'ArrowLeft' && imageUrls.length > 1) {
        setCurrentIndex(prev => (prev === 0 ? imageUrls.length - 1 : prev - 1));
      } else if (e.key === 'ArrowRight' && imageUrls.length > 1) {
        setCurrentIndex(prev => (prev === imageUrls.length - 1 ? 0 : prev + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [imageUrls.length]);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(prev => (prev === 0 ? imageUrls.length - 1 : prev - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(prev => (prev === imageUrls.length - 1 ? 0 : prev + 1));
  };

  if (imageUrls.length === 0) {
    return (
      <div className={styles.viewerContainer}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)', fontSize: '14px' }}>
          이미지가 없습니다.
        </div>
      </div>
    );
  }

  const currentImage = imageUrls[currentIndex];

  return (
    <div className={styles.viewerContainer}>
      <div className={styles.posterImage}>
        <Image
          src={currentImage}
          alt={`${alt} (페이지 ${currentIndex + 1})`}
          fill
          sizes="(max-width: 992px) 100vw, 50vw"
          priority
        />
      </div>

      {/* Carousel indicators & arrows */}
      {imageUrls.length > 1 && (
        <>
          <button className={`${styles.navBtn} ${styles.navBtnPrev}`} onClick={handlePrev} title="이전 장 (←)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <button className={`${styles.navBtn} ${styles.navBtnNext}`} onClick={handleNext} title="다음 장 (→)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
          <div className={styles.pageBadge}>
            {currentIndex + 1} / {imageUrls.length}
          </div>
        </>
      )}
    </div>
  );
}
