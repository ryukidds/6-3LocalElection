'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import PosterImageViewer from '@/components/PosterImageViewer';
import { getImageUrl, SchoolDeclaration, staticVideos } from '@/data/schools';
import styles from '@/components/ArchiveDashboard.module.css';

function extractYouTubeId(url: string | undefined): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|live\/)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}


export default function Home() {
  const [stats, setStats] = useState({ universities: 0, declarations: 0 });
  const [declarations, setDeclarations] = useState<SchoolDeclaration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const detailRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsAdmin(sessionStorage.getItem('admin_auth') === 'true');
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchStatsAndDeclarations = async () => {
      try {
        // Fetch all approved declarations
        const { data, error } = await supabase
          .from('declarations')
          .select('*')
          .eq('status', 'approved');

        if (error) {
          console.error('Error fetching statistics:', error);
        } else if (data) {
          const uniqueUni = new Set(data.map((d: any) => d.name)).size;
          setStats({
            universities: uniqueUni,
            declarations: data.length,
          });

          // Sort chronologically (oldest first) to assign sequence numbers
          const sortedChronologically = [...data].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
          );

          const mappedData = data.map((item: any) => {
            const seqIndex = sortedChronologically.findIndex(x => x.id === item.id);
            return {
              ...item,
              driveFileId: item.drive_file_id,
              fallbackUrl: item.fallback_url,
              youtube_url: item.youtube_url,
              sequenceNumber: seqIndex !== -1 ? seqIndex + 1 : 0,
            } as SchoolDeclaration & { sequenceNumber: number };
          });

          setDeclarations(mappedData);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStatsAndDeclarations();
  }, []);

  // Get latest statements (where youtube_url is null/empty)
  const latestStatements = useMemo(() => {
    return declarations
      .filter((d) => !d.youtube_url)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6);
  }, [declarations]);

  // Combine real DB videos with static video data
  const latestVideos = useMemo(() => {
    const dbVideos = declarations.filter((d) => !!d.youtube_url);
    const dbIds = new Set(dbVideos.map(d => d.id));
    const uniqueStatic = staticVideos.filter(v => !dbIds.has(v.id));
    return [...dbVideos, ...uniqueStatic]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6);
  }, [declarations]);

  const allDeclarationsIncludingStaticVideos = useMemo(() => {
    const dbIds = new Set(declarations.map(d => d.id));
    const uniqueStatic = staticVideos.filter(v => !dbIds.has(v.id));
    return [...declarations, ...uniqueStatic];
  }, [declarations]);

  const selectedSchool = useMemo(() => {
    return allDeclarationsIncludingStaticVideos.find((dec) => dec.id === selectedId);
  }, [allDeclarationsIncludingStaticVideos, selectedId]);

  // Scroll to detail when selected
  useEffect(() => {
    if (selectedId && detailRef.current) {
      detailRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedId]);

  return (
    <div className={styles.container}>
      <Navbar />

      {/* 1구역: 히어로 섹션 */}
      <section className={styles.heroSection}>
        <div className={styles.heroInner}>
          <h1 className={styles.heroTitle}>
            부정한 주권 침해에 맞서는<br />
            젊음의 분노를 기록하다.
          </h1>
          <p className={styles.heroSubtitle}>
            "6·3 투표용지 부족 사태라는 초유의 주권 침해에 맞서, 공정한 민주주의를 촉구하는 전국 대학생들의 연대가 이어지는 가운데, 이 역사적인 분노와 연대의 목소리를 기록합니다."
          </p>
          <div className={styles.heroActions}>
            <Link href="/archive" className={styles.heroPrimaryBtn}>
              아카이브 목록 보기
            </Link>
            <Link href="/submit" className={styles.heroSecondaryBtn}>
              시국기록 제보하기
            </Link>
          </div>
        </div>
      </section>

      {/* 2구역: 통계 카운터 섹션 (독립 밴드) */}
      <section className={styles.statsSection}>
        <div className={styles.statsInner}>
          <h2 className={styles.statsTitle}>
            전국 <span className={styles.statsNumber}>{stats.universities}</span>개 대학에서 <br className={styles.mobileBr} /> <span className={styles.statsNumber}>{stats.declarations}</span>건의 성명을 외쳤습니다.
          </h2>
        </div>
      </section>

      {/* 3구역: 상세 인라인 뷰 (홈페이지에서도 보기 지원) */}
      {selectedSchool && (
        <section ref={detailRef} className={styles.archiveMain} style={{ paddingTop: 0, paddingBottom: 0 }}>
          <div className={styles.detailContentWrapper} style={{ marginBottom: '40px' }}>
            {/* 좌측 미디어 영역 */}
            <div className={styles.detailImageContainer}>
              {selectedSchool.youtube_url ? (
                <div className={styles.youtubePlayerWrapper}>
                  {extractYouTubeId(selectedSchool.youtube_url) ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${extractYouTubeId(selectedSchool.youtube_url)}?autoplay=1`}
                      title={`${selectedSchool.name} 시국선언 유튜브 영상`}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      className={styles.youtubeIframe}
                    ></iframe>
                  ) : (
                    <div className={styles.youtubeError}>유튜브 영상을 불러올 수 없습니다.</div>
                  )}
                </div>
              ) : (
                <PosterImageViewer
                  src={getImageUrl(selectedSchool)}
                  alt={`${selectedSchool.name} 시국성명서`}
                  title={selectedSchool.summary}
                />
              )}
            </div>

            {/* 우측 상세정보 영역 */}
            <div className={styles.detailTextContainer}>
              <button onClick={() => setSelectedId(null)} className={styles.detailCloseButton} title="닫기" aria-label="상세보기 닫기">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>

              <div className={styles.detailSchoolHeader}>
                <h3 className={styles.detailSchoolName}>{selectedSchool.name}</h3>
                {selectedSchool.organization && (
                  <div className={styles.detailOrgName}>{selectedSchool.organization}</div>
                )}
                <div className={styles.detailMetadata}>{selectedSchool.date}</div>
              </div>

              <h2 className={styles.detailBigTitle}>{selectedSchool.summary}</h2>

              <hr className={styles.detailHr} />

              <div className={styles.detailBody}>
                {selectedSchool.content ? (
                  <div dangerouslySetInnerHTML={{ __html: selectedSchool.content.replace(/\n/g, '<br/>') }} />
                ) : (
                  <p>{selectedSchool.summary}</p>
                )}
              </div>

              <div className={styles.detailActions}>
                <button className={styles.actionBtn} onClick={() => {
                  navigator.clipboard.writeText(window.location.origin + `/archive?selectedId=${selectedSchool.id}`);
                  alert('공유 링크가 클립보드에 복사되었습니다.');
                }}>
                  공유 링크 복사
                </button>
                {isAdmin && (
                  <button
                    className={styles.actionBtn}
                    onClick={() => window.open(`/admin?editId=${selectedSchool.id}`, '_blank')}
                    style={{ backgroundColor: 'var(--primary)', color: 'white' }}
                  >
                    이 게시글 수정하기
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 4구역: 최신 시국성명 그리드 */}
      <section className={styles.archiveMain} style={{ paddingTop: 0, paddingBottom: '40px' }}>
        {/* 4.1: 최신 시국성명 (글/이미지) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.7px', color: 'var(--text)', margin: 0 }}>
              부정한 선거에 대한 <br className={styles.mobileBr} />청년들의 목소리를 기록하다.
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--muted)', margin: '4px 0 0 0' }}>
              전국 대학생들의 최신 시국성명서와 대자보를 확인하세요.
            </p>
          </div>
          {!isMobile && (
            <Link href="/archive" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }}>
              전체 보기 →
            </Link>
          )}
        </div>

        <div className={isMobile ? styles.listContainer : styles.gridContainer}>
          {latestStatements.map((school: any) => {
            const thumbUrl = getImageUrl(school);

            if (isMobile) {
              return (
                <article
                  key={school.id}
                  onClick={() => setSelectedId(school.id)}
                  className={`${styles.listCard} ${selectedId === school.id ? styles.gridCardActive : ''}`}
                >
                  <div className={styles.listCardContent}>
                    <div className={styles.listCardLeft}>
                      <span className={styles.schoolOrgName}>
                        {school.name}{school.organization ? ` · ${school.organization}` : ''}
                      </span>
                      <h2 className={styles.statementTitleList}>{school.summary}</h2>
                    </div>
                    <span className={styles.schoolDate}>{school.date}</span>
                  </div>
                </article>
              );
            }

            return (
              <article
                key={school.id}
                onClick={() => setSelectedId(school.id)}
                className={`${styles.gridCard} ${selectedId === school.id ? styles.gridCardActive : ''}`}
              >
                <div className={styles.cardBgImage}>
                  <Image
                    src={thumbUrl}
                    alt={`${school.name} 시국성명 썸네일`}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    style={{ objectFit: 'cover' }}
                  />
                </div>

                <div className={styles.cardContent}>
                  <div className={styles.cardTopInfo}>
                    <span className={styles.schoolOrgName}>
                      {school.name}{school.organization ? ` · ${school.organization}` : ''}
                    </span>
                    <span className={styles.schoolDate}>{school.date}</span>
                  </div>
                  <h2 className={styles.statementTitle}>{school.summary}</h2>
                </div>
              </article>
            );
          })}

          {!isLoading && latestStatements.length === 0 && (
            <div className={styles.loaderState} style={{ padding: '40px 0' }}>
              기록된 시국성명이 없습니다.
            </div>
          )}
        </div>

        {isMobile && (
          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <Link href="/archive" className={styles.mobileMoreLink}>
              전체 보기 →
            </Link>
          </div>
        )}

        {isLoading && (
          <div className={styles.loaderState}>
            데이터를 불러오는 중입니다...
          </div>
        )}
      </section>

      {/* 5구역: 최신 시국선언 영상 그리드 (독립 밴드) */}
      <section className={styles.videoSection}>
        <div className={styles.videoInner}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
            <div>
              <h2 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.7px', color: 'var(--text)', margin: '0px' }}>
                전국대학생들의<br className={styles.mobileBr} />시국선언
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--muted)', margin: '4px 0 0 0' }}>
                공정한 선거정의를 외치는 대학별 현장 결의 및 선언 영상입니다.
              </p>
            </div>
            {!isMobile && (
              <Link href="/archive" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }}>
                전체 영상 보기 →
              </Link>
            )}
          </div>

          <div className={styles.gridContainer}>
            {latestVideos.map((school: any) => {
              const ytId = extractYouTubeId(school.youtube_url);
              const thumbUrl = ytId
                ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`
                : "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=1200";

              return (
                <article
                  key={school.id}
                  onClick={() => setSelectedId(school.id)}
                  className={`${styles.gridCard} ${selectedId === school.id ? styles.gridCardActive : ''}`}
                >
                  <div className={styles.cardBgImage}>
                    <Image
                      src={thumbUrl}
                      alt={`${school.name} 시국선언 영상 썸네일`}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      style={{ objectFit: 'cover' }}
                      unoptimized
                    />

                    <div className={styles.videoPlayOverlay}>
                      <div className={styles.playButtonIcon}>
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                          <polygon points="5,3 19,12 5,21" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className={styles.cardContent}>
                    <div className={styles.cardTopInfo}>
                      <span className={styles.schoolOrgName}>
                        {school.name}{school.organization ? ` · ${school.organization}` : ''}
                      </span>
                      <span className={styles.schoolDate}>{school.date}</span>
                    </div>
                    <h2 className={styles.statementTitle}>{school.summary}</h2>
                  </div>
                </article>
              );
            })}

            {!isLoading && latestVideos.length === 0 && (
              <div className={styles.loaderState} style={{ padding: '40px 0' }}>
                기록된 시국선언 영상이 없습니다.
              </div>
            )}
          </div>

          {isMobile && (
            <div style={{ marginTop: '24px', textAlign: 'center' }}>
              <Link href="/archive" className={styles.mobileMoreLink}>
                전체 영상 보기 →
              </Link>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
