'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cursor = cursorRef.current;

    if (!cursor) return;

    // 터치 디바이스에서는 커스텀 커서를 숨김
    if (window.matchMedia('(pointer: coarse)').matches) {
      cursor.style.display = 'none';
      return;
    }

    // 초기 설정: 커서 중심으로 피벗 맞춤 (-50%, -50%를 GSAP을 통해 명확히 보장)
    gsap.set(cursor, { xPercent: -50, yPercent: -50, scale: 1, rotation: 0 });

    let isHovered = false;

    const onMouseMove = (e: MouseEvent) => {
      gsap.to(cursor, {
        x: e.clientX,
        y: e.clientY,
        duration: 0.08,
        ease: 'power2.out',
      });
    };

    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isHoverable = 
        target.closest('a') || 
        target.closest('button') || 
        target.closest('.school-item') ||
        target.closest('[role="button"]') ||
        window.getComputedStyle(target).cursor === 'pointer' ||
        target.closest('[class*="Card"]'); // 카드 호버 시에도 확대 피드백 제공

      if (isHoverable) {
        if (!isHovered) {
          isHovered = true;
          gsap.to(cursor, {
            scale: 1.35,
            rotation: 15,
            duration: 0.25,
            ease: 'power2.out'
          });
        }
      } else {
        if (isHovered) {
          isHovered = false;
          gsap.to(cursor, {
            scale: 1,
            rotation: 0,
            duration: 0.25,
            ease: 'power2.out'
          });
        }
      }
    };

    const onMouseDown = () => {
      gsap.to(cursor, {
        scale: 0.8,
        rotation: isHovered ? 25 : 10, // 클릭 시 살짝 더 돌아가는 현실감 제공
        duration: 0.1,
        ease: 'power2.inOut',
      });
    };

    const onMouseUp = () => {
      gsap.to(cursor, {
        scale: isHovered ? 1.35 : 1,
        rotation: isHovered ? 15 : 0,
        duration: 0.15,
        ease: 'power2.out',
      });
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseover', onMouseOver);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseover', onMouseOver);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  return (
    <div ref={cursorRef} className="custom-cursor" />
  );
}

