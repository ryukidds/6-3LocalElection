'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import styles from './PosterImageViewer.module.css';

interface PosterImageViewerProps {
  src: string;
  alt: string;
  title: string;
}

export default function PosterImageViewer({ src, alt, title }: PosterImageViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  // Close lightbox on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden'; // Prevent body scroll
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleOpen = () => {
    setIsOpen(true);
    setIsZoomed(false);
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsZoomed(false);
  };

  const toggleZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsZoomed(prev => !prev);
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      
      // Clean filename
      const cleanTitle = title.replace(/[\\/:*?"<>|]/g, '').substring(0, 30);
      link.download = `${cleanTitle || '시국선언문'}.jpg`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Download failed, opening image in new window:', err);
      window.open(src, '_blank');
    }
  };

  return (
    <>
      {/* Standard Inline Poster Viewer */}
      <div className={styles.viewerContainer} onClick={handleOpen} title="성명서 크게 보기">
        <div className={styles.posterImage}>
          <Image
            src={src}
            alt={alt}
            fill
            sizes="(max-width: 992px) 100vw, 50vw"
            priority
          />
        </div>
        
        {/* Hover overlay with zoom icon */}
        <div className={styles.hoverOverlay}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            <line x1="11" y1="8" x2="11" y2="14"></line>
            <line x1="8" y1="11" x2="14" y2="11"></line>
          </svg>
          <span className={styles.overlayText}>성명서 원본 크게 보기</span>
        </div>
      </div>

      {/* Full screen Lightbox Overlay */}
      {isOpen && (
        <div className={styles.lightboxOverlay} onClick={handleClose}>
          
          <header className={styles.lightboxHeader} onClick={(e) => e.stopPropagation()}>
            <span className={styles.posterTitle}>{title}</span>
            <div className={styles.lightboxToolbar}>
              {/* Zoom toggle button */}
              <button className={styles.toolbarBtn} onClick={toggleZoom}>
                {isZoomed ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                      <line x1="8" y1="11" x2="14" y2="11"></line>
                    </svg>
                    화면에 맞춤
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                      <line x1="11" y1="8" x2="11" y2="14"></line>
                      <line x1="8" y1="11" x2="14" y2="11"></line>
                    </svg>
                    원본 크기 (100%)
                  </>
                )}
              </button>

              {/* Download button */}
              <button className={styles.toolbarBtn} onClick={handleDownload}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                다운로드
              </button>

              {/* Close button */}
              <button className={`${styles.toolbarBtn} ${styles.closeBtn}`} onClick={handleClose}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                닫기
              </button>
            </div>
          </header>

          {/* Viewport for image */}
          <div className={styles.imageViewport}>
            {isZoomed ? (
              <div className={styles.zoomedContainer}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={alt}
                  className={styles.zoomedImage}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            ) : (
              <div className={styles.fittedContainer}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={alt}
                  className={styles.fittedImage}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
          </div>

        </div>
      )}
    </>
  );
}
