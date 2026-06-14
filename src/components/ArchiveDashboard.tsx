'use client';

import { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import gsap from 'gsap';
import { SchoolDeclaration, getImageUrl, getAllImageUrls, staticVideos } from '@/data/schools';
import { supabase } from '@/lib/supabaseClient';
import styles from './ArchiveDashboard.module.css';
import PosterImageViewer from './PosterImageViewer';
import Navbar from './Navbar';
import Footer from './Footer';

interface Props {
  initialDeclarations: SchoolDeclaration[];
}

function extractYouTubeId(url: string | undefined): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|live\/)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

function DashboardContent({ initialDeclarations }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState('');
  const [regionFilter, setRegionFilter] = useState('전체');
  const [categoryFilter, setCategoryFilter] = useState('전체');
  const [sortOrder, setSortOrder] = useState('최신 등록순');
  const [activeTab, setActiveTab] = useState<'statement' | 'video'>('statement');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);

  const [declarations, setDeclarations] = useState<SchoolDeclaration[]>(initialDeclarations);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsAdmin(sessionStorage.getItem('admin_auth') === 'true');
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setViewMode('list');
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setVisibleCount(10);
  }, [searchTerm, regionFilter, categoryFilter, sortOrder, activeTab]);

  // Supabase 데이터 가져오기
  useEffect(() => {
    const fetchDeclarations = async () => {
      try {
        const { data, error } = await supabase
          .from('declarations')
          .select('*')
          .eq('status', 'approved')
          .order('date', { ascending: false })
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Error fetching declarations:', error);
        } else if (data) {
          // Sort chronologically (oldest first) to assign sequence numbers
          const sortedChronologically = [...data].sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            if (dateA !== dateB) return dateA - dateB;
            const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
            return timeA - timeB;
          });
          
          const mappedData = data.map((item: any) => {
            const seqIndex = sortedChronologically.findIndex(x => x.id === item.id);
            return {
              ...item,
              driveFileId: item.drive_file_id,
              fallbackUrl: item.fallback_url,
              youtube_url: item.youtube_url,
              sequenceNumber: seqIndex !== -1 ? seqIndex + 1 : 0,
            };
          });
          setDeclarations(mappedData);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDeclarations();
  }, [initialDeclarations]);

  // 검색 포커스 처리 (Navbar 검색 아이콘 클릭 대응)
  useEffect(() => {
    const focusSearch = searchParams.get('focusSearch');
    if (focusSearch === 'true' && searchInputRef.current) {
      searchInputRef.current.focus();
      // 포커스 후 파라미터 지우기
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete('focusSearch');
      router.replace(`/archive?${newParams.toString()}`);
    }
  }, [searchParams, router]);

  // 탭 변경 시 선택 항목 초기화
  const handleTabChange = (tab: 'statement' | 'video') => {
    setActiveTab(tab);
    setSelectedId(null);
  };

  const allDeclarationsIncludingStaticVideos = useMemo(() => {
    const dbIds = new Set(declarations.map(d => d.id));
    const uniqueStatic = staticVideos.filter(v => !dbIds.has(v.id));
    return [...declarations, ...uniqueStatic];
  }, [declarations]);

  // 필터 및 정렬 적용
  const filteredDeclarations = useMemo(() => {
    const filtered = allDeclarationsIncludingStaticVideos.filter((dec) => {
      // 1. 탭 구분 (성명 vs 영상)
      const matchesTab = activeTab === 'video' ? !!dec.youtube_url : !dec.youtube_url;
      
      // 2. 검색어 매칭
      const matchSearch = dec.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (dec.organization && dec.organization.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (dec.summary && dec.summary.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // 3. 지역 필터
      const matchRegion = regionFilter === '전체' || dec.region === regionFilter;
      
      // 4. 분류 필터
      const matchCategory = categoryFilter === '전체' || dec.category === categoryFilter;
      
      return matchesTab && matchSearch && matchRegion && matchCategory;
    });

    if (sortOrder === '오래된 순') {
      return [...filtered].sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateA !== dateB) return dateA - dateB;
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeA - timeB;
      });
    } else {
      return [...filtered].sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateB !== dateA) return dateB - dateA;
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeB - timeA;
      });
    }
  }, [allDeclarationsIncludingStaticVideos, activeTab, searchTerm, regionFilter, categoryFilter, sortOrder]);

  const displayedDeclarations = useMemo(() => {
    if (isMobile) {
      return filteredDeclarations.slice(0, visibleCount);
    }
    return filteredDeclarations;
  }, [filteredDeclarations, isMobile, visibleCount]);

  const selectedSchool = useMemo(() => {
    return allDeclarationsIncludingStaticVideos.find((dec) => dec.id === selectedId);
  }, [allDeclarationsIncludingStaticVideos, selectedId]);

  const handleCardClick = (id: string) => {
    setSelectedId(id);
  };

  const goToNextDeclaration = () => {
    if (!selectedId) return;
    const currentIndex = filteredDeclarations.findIndex(dec => dec.id === selectedId);
    if (currentIndex !== -1 && currentIndex < filteredDeclarations.length - 1) {
      setSelectedId(filteredDeclarations[currentIndex + 1].id);
    }
  };

  // 상세 뷰 노출 시 스크롤 포커스 이동
  useEffect(() => {
    if (selectedId && detailRef.current) {
      detailRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedId]);

  // 그리드 아이템 애니메이션 효과 (GSAP)
  useEffect(() => {
    if (containerRef.current) {
      const cards = containerRef.current.querySelectorAll(`.${styles.gridCard}`);
      if (cards.length > 0) {
        gsap.killTweensOf(cards);
        gsap.fromTo(
          cards,
          { opacity: 0, y: 15 },
          {
            opacity: 1,
            y: 0,
            duration: 0.35,
            stagger: 0.02,
            ease: 'power2.out',
          }
        );
      }
    }
  }, [searchTerm, activeTab, regionFilter, categoryFilter, sortOrder]);

  return (
    <div className={styles.container}>
      <Navbar />

      <main className={styles.archiveMain}>
        {/* 컨트롤 패널 */}
        <section className={styles.controlsWrapper}>
          <div className={styles.controls}>
            {/* 시국성명 / 시국선언 이원화 탭 스위처 */}
            <div className={styles.tabContainer}>
              <button
                className={`${styles.tabBtn} ${activeTab === 'statement' ? styles.tabBtnActive : ''}`}
                onClick={() => handleTabChange('statement')}
              >
                시국성명
              </button>
              <button
                className={`${styles.tabBtn} ${activeTab === 'video' ? styles.tabBtnActive : ''}`}
                onClick={() => handleTabChange('video')}
              >
                시국선언
              </button>
            </div>

            {/* 다중 드롭다운 필터 */}
            <div className={styles.filterGroup}>
              <div className={styles.searchWrapperRow}>
                <div className={styles.searchWrapper}>
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="학교, 조직, 제목 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={styles.searchInput}
                  />
                </div>
                {/* 모바일 상세 필터 접기/열기 버튼 */}
                <button
                  type="button"
                  className={styles.filterToggleBtn}
                  onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
                >
                  필터 {isFiltersExpanded ? '접기 ▲' : '열기 ▼'}
                </button>
              </div>

              <div className={`${styles.selectGroup} ${isFiltersExpanded ? styles.selectGroupExpanded : ''}`}>
                <select className={styles.filterSelect} value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)}>
                  <option value="전체">전체 지역</option>
                  <option value="강원도">강원도</option>
                  <option value="경기도">경기도</option>
                  <option value="경상남도">경상남도</option>
                  <option value="경상북도">경상북도</option>
                  <option value="광주광역시">광주광역시</option>
                  <option value="대구광역시">대구광역시</option>
                  <option value="대전광역시">대전광역시</option>
                  <option value="부산광역시">부산광역시</option>
                  <option value="서울특별시">서울특별시</option>
                  <option value="세종특별자치시">세종특별자치시</option>
                  <option value="울산광역시">울산광역시</option>
                  <option value="인천광역시">인천광역시</option>
                  <option value="전라남도">전라남도</option>
                  <option value="전라북도">전라북도</option>
                  <option value="제주특별자치도">제주특별자치도</option>
                  <option value="충청남도">충청남도</option>
                  <option value="충청북도">충청북도</option>
                </select>
                <select className={styles.filterSelect} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                  <option value="전체">전체 분류</option>
                  <option value="총학생회">총학생회</option>
                  <option value="단과대">단과대</option>
                  <option value="동아리">동아리</option>
                  <option value="기타">기타</option>
                </select>
                <select className={styles.filterSelect} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
                  <option value="최신 등록순">최신 등록순</option>
                  <option value="오래된 순">오래된 순</option>
                </select>
              </div>
            </div>

            {/* 뷰 모드 토글러 복원 */}
            <div className={styles.viewToggle}>
              <button
                onClick={() => setViewMode('grid')}
                className={`${styles.toggleBtn} ${viewMode === 'grid' ? styles.toggleBtnActive : ''}`}
                title="격자 보기"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="3" y="3" width="7" height="7"></rect>
                  <rect x="14" y="3" width="7" height="7"></rect>
                  <rect x="14" y="14" width="7" height="7"></rect>
                  <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`${styles.toggleBtn} ${viewMode === 'list' ? styles.toggleBtnActive : ''}`}
                title="목록 보기"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="8" y1="6" x2="21" y2="6"></line>
                  <line x1="8" y1="12" x2="21" y2="12"></line>
                  <line x1="8" y1="18" x2="21" y2="18"></line>
                  <line x1="3" y1="6" x2="3.01" y2="6"></line>
                  <line x1="3" y1="12" x2="3.01" y2="12"></line>
                  <line x1="3" y1="18" x2="3.01" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>
        </section>

        {/* 상세 인라인 뷰 (Split Layout) */}
        {selectedSchool && (
          <section ref={detailRef} className={styles.detailContentWrapper}>
            {/* 좌측 미디어 영역 */}
            <div className={styles.detailImageContainer}>
              {selectedSchool.youtube_url ? (
                // 유튜브 비디오 재생기 임베드
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
                // 성명서 다중 이미지 뷰어
                <PosterImageViewer
                  src={getAllImageUrls(selectedSchool)}
                  alt={`${selectedSchool.name} 시국성명서`}
                  title={selectedSchool.summary}
                />
              )}
            </div>

            {/* 우측 텍스트 상세 명세 */}
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
                {filteredDeclarations.findIndex(d => d.id === selectedId) < filteredDeclarations.length - 1 && (
                  <button className={styles.nextBtn} onClick={goToNextDeclaration}>
                    다음 {activeTab === 'video' ? '영상' : '성명'} →
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

        {/* 아카이브 목록 그리드 및 리스트 (Toss Feed 매거진 스타일 & 리스트 모드 지원) */}
        <section className={styles.contentWrapper}>
          <div ref={containerRef} className={viewMode === 'grid' ? styles.gridContainer : styles.listContainer}>
            {displayedDeclarations.map((school) => {
              const hasVideo = !!school.youtube_url;
              const ytId = extractYouTubeId(school.youtube_url);
              const thumbUrl = hasVideo && ytId 
                ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg` 
                : getImageUrl(school);

              return (
                <article
                  key={school.id}
                  onClick={() => handleCardClick(school.id)}
                  className={`${viewMode === 'grid' ? styles.gridCard : styles.listCard} ${selectedId === school.id ? styles.gridCardActive : ''}`}
                >
                  {viewMode === 'grid' ? (
                    <>
                      {/* Toss Feed 스타일: 카드 이미지와 텍스트의 완벽한 분리 */}
                      <div className={styles.cardBgImage}>
                        <Image
                          src={thumbUrl}
                          alt={`${school.name} 시국기록 썸네일`}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          style={{ objectFit: 'cover' }}
                          unoptimized={hasVideo} // 유튜브 썸네일 외부 호출 대응
                        />

                        {/* 비디오일 경우 재생 아이콘 레이어 오버레이 */}
                        {hasVideo && (
                          <div className={styles.videoPlayOverlay}>
                            <div className={styles.playButtonIcon}>
                              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                <polygon points="5,3 19,12 5,21" />
                              </svg>
                            </div>
                          </div>
                        )}
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
                    </>
                  ) : (
                    /* 리스트 뷰 구조 복원 */
                    <div className={styles.listCardContent}>
                      <div className={styles.listCardLeft}>
                        <span className={styles.schoolOrgName}>
                          {school.name}{school.organization ? ` · ${school.organization}` : ''}
                        </span>
                        <h2 className={styles.statementTitleList}>{school.summary}</h2>
                      </div>
                      <span className={styles.schoolDate}>{school.date}</span>
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          {isMobile && filteredDeclarations.length > visibleCount && (
            <div style={{ marginTop: '24px', textAlign: 'center' }}>
              <button 
                onClick={() => setVisibleCount(prev => prev + 10)} 
                className={styles.mobileMoreLink}
                style={{ width: '100%', cursor: 'pointer' }}
              >
                더보기 ▼
              </button>
            </div>
          )}

          {isLoading && (
            <div className={styles.loaderState}>
              데이터를 불러오는 중입니다...
            </div>
          )}
          {!isLoading && filteredDeclarations.length === 0 && (
            <div className={styles.loaderState}>
              검색 조건에 맞는 기록이 없습니다.
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}

export default function ArchiveDashboard({ initialDeclarations }: Props) {
  return (
    <Suspense fallback={<div className={styles.loaderState}>로딩 중...</div>}>
      <DashboardContent initialDeclarations={initialDeclarations} />
    </Suspense>
  );
}
