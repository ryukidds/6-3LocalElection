'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Image from 'next/image';
import gsap from 'gsap';
import { SchoolDeclaration, getImageUrl } from '@/data/schools';
import { supabase } from '@/lib/supabaseClient';
import styles from './ArchiveDashboard.module.css';

function generateUniqueId(): string {
  return `id_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function generateFileName(originalName: string): string {
  const fileExt = originalName.split('.').pop();
  return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
}

interface Props {
  initialDeclarations: SchoolDeclaration[];
}

export default function ArchiveDashboard({ initialDeclarations }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [regionFilter, setRegionFilter] = useState('전체');
  const [categoryFilter, setCategoryFilter] = useState('전체');
  const [sortOrder, setSortOrder] = useState('최신 등록순');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [declarations, setDeclarations] = useState<SchoolDeclaration[]>(initialDeclarations);
  const [isLoading, setIsLoading] = useState(true);

  const [submitForm, setSubmitForm] = useState({
    name: '',
    campus: '',
    organization: '',
    date: '',
  });

  const mainScrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchDeclarations = async () => {
      const { data, error } = await supabase
        .from('declarations')
        .select('*')
        .eq('status', 'approved');
      
      if (error) {
        console.error('Error fetching declarations:', error);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mappedData = (data || []).map((item: any) => ({
          ...item,
          driveFileId: item.drive_file_id,
          fallbackUrl: item.fallback_url,
        }));
        setDeclarations(mappedData);
      }
      setIsLoading(false);
    };
    fetchDeclarations();
  }, []);

  // 검색 및 필터링 & 정렬 최적화 (useMemo 사용)
  const uniqueUniversitiesCount = useMemo(() => {
    return new Set(declarations.map(d => d.name)).size;
  }, [declarations]);

  const totalDeclarationsCount = declarations.length;

  const filteredDeclarations = useMemo(() => {
    const filtered = declarations.filter((dec) => {
      const matchSearch = dec.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (dec.organization && dec.organization.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchRegion = regionFilter === '전체' || dec.region === regionFilter;
      const matchCategory = categoryFilter === '전체' || dec.category === categoryFilter;
      
      return matchSearch && matchRegion && matchCategory;
    });

    if (sortOrder === '오래된 순') {
      return [...filtered].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } else {
      return [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
  }, [declarations, searchTerm, regionFilter, categoryFilter, sortOrder]);

  const selectedSchool = useMemo(() => {
    return declarations.find((dec) => dec.id === selectedId);
  }, [declarations, selectedId]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      alert('성명서 이미지를 첨부해주세요.');
      return;
    }

    setIsSubmitting(true);
    let uploadedImageUrl = '';

    try {
      // 1. Supabase Storage에 파일 업로드
      const fileName = generateFileName(selectedFile.name);
      const filePath = `raw/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('declarations')
        .upload(filePath, selectedFile);

      if (uploadError) {
        throw new Error(`이미지 업로드 실패: ${uploadError.message}`);
      }

      // 2. 업로드된 파일의 Public URL 가져오기
      const { data: { publicUrl } } = supabase.storage
        .from('declarations')
        .getPublicUrl(filePath);

      uploadedImageUrl = publicUrl;

      // 3. Database에 제보 정보 저장 (상태: pending)
      const newId = generateUniqueId();
      const { error: dbError } = await supabase
        .from('declarations')
        .insert([
          {
            id: newId,
            name: submitForm.name,
            campus: submitForm.campus,
            organization: submitForm.organization,
            date: submitForm.date || new Date().toISOString().split('T')[0],
            region: '전체',
            category: '기타',
            summary: '관리자 검수 전 제보입니다.', 
            status: 'pending',
            fallback_url: uploadedImageUrl
          }
        ]);

      if (dbError) {
        throw new Error(`데이터베이스 저장 실패: ${dbError.message}`);
      }

      alert('제보가 완료되었습니다. 관리자 검토 후 반영됩니다!');
      handleCloseModal();
      setSubmitForm({ name: '', campus: '', organization: '', date: '' });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '제보 중 오류가 발생했습니다. 다시 시도해주세요.';
      alert(errorMessage);
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSubmitForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('파일 용량은 최대 5MB까지 업로드 가능합니다.');
      return;
    }

    setSelectedFile(file);
    const previewUrl = URL.createObjectURL(file);
    setImagePreviewUrl(previewUrl);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedFile(null);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }
  };

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

  const handleHomeClick = () => {
    setSelectedId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 선택한 성명서 변경 시 자동 스크롤 이동 (Declarative Effect)
  useEffect(() => {
    if (selectedId && detailRef.current) {
      detailRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedId]);

  // 모바일에서 높이 버그 방지를 위한 동적 뷰포트 처리 및 모바일 리스트 강제 적용
  useEffect(() => {
    const setVh = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
      
      // 모바일에서는 강제로 list 뷰 적용 (불필요한 리렌더링 방지)
      if (window.innerWidth <= 992) {
        setViewMode((prev) => prev !== 'list' ? 'list' : prev);
      }
    };
    
    setVh();
    window.addEventListener('resize', setVh);
    return () => window.removeEventListener('resize', setVh);
  }, []);

  // 1. 컴포넌트 마운트, 검색 및 뷰 모드 변경 시 카드 Stagger 애니메이션
  useEffect(() => {
    if (containerRef.current) {
      const cards = containerRef.current.querySelectorAll(
        `.${styles.gridCard}, .${styles.listCard}`
      );
      if (cards.length > 0) {
        gsap.killTweensOf(cards);
        gsap.fromTo(
          cards,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.5,
            stagger: 0.04,
            ease: 'power3.out',
          }
        );
      }
    }
  }, [searchTerm, viewMode]);

  const handleApplyFilter = () => {
    // 추가적인 필터 적용 액션이 필요하다면 여기서 수행
  };

  return (
    <div ref={mainScrollRef} className={styles.container}>
      {/* 상단 타이포 및 조작 영역 헤더 */}
      <header className={styles.header}>
        <div className={styles.logoArea} onClick={handleHomeClick} style={{ cursor: 'pointer' }}>
          <h1>6·3 대학 <span>시국선언 아카이브</span></h1>
          <p>6·3 투표용지 부족 사태 전국구 대학 시국선언 아카이브</p>
        </div>

        <div className={styles.controls}>
          <button 
            className={styles.mobileFilterToggle} 
            onClick={() => setIsFilterExpanded(!isFilterExpanded)}
          >
            {isFilterExpanded ? '검색 및 필터 닫기' : '검색 및 필터 열기'}
            <svg 
              width="16" height="16" viewBox="0 0 24 24" fill="none" 
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: isFilterExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          <div className={`${styles.filterGroup} ${isFilterExpanded ? styles.expanded : ''}`}>
            <select className={styles.filterSelect} value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)}>
              <option value="전체">전체 지역</option>
              <option value="서울">서울</option>
              <option value="경기">경기</option>
              <option value="인천">인천</option>
              <option value="대전">대전</option>
              <option value="대구">대구</option>
              <option value="부산">부산</option>
              <option value="광주">광주</option>
              <option value="울산">울산</option>
              <option value="강원">강원</option>
            </select>
            <select className={styles.filterSelect} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="전체">전체 분류</option>
              <option value="총학생회">총학생회</option>
              <option value="단과대">단과대</option>
              <option value="동아리">동아리</option>
            </select>
            <select className={styles.filterSelect} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
              <option value="최신 등록순">최신 등록순</option>
              <option value="오래된 순">오래된 순</option>
            </select>
            <div className={styles.searchWrapper}>
              <input
                type="text"
                placeholder="학교, 조직, 제목 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.searchInput}
              />
            </div>
            <button className={styles.applyBtn} onClick={handleApplyFilter}>적용</button>
          </div>

          {/* 그리드/리스트 뷰 전환 토글 (아이콘화) */}
          <div className={styles.viewToggle}>
            <button
              onClick={() => setViewMode('grid')}
              className={`${styles.toggleBtn} ${
                viewMode === 'grid' ? styles.toggleBtnActive : ''
              }`}
              title="격자 보기"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`${styles.toggleBtn} ${
                viewMode === 'list' ? styles.toggleBtnActive : ''
              }`}
              title="목록 보기"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
      </header>

      {/* 대형 카운트 섹션 */}
      <div className={styles.counterSection}>
        <h2>전국 {uniqueUniversitiesCount}개 대학이 시대에 외칩니다.</h2>
        <div className={styles.dashboardStats}>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>참여 대학</span>
            <span className={styles.statValue}>{uniqueUniversitiesCount} <span className={styles.statUnit}>개</span></span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>시국선언</span>
            <span className={styles.statValue}>{totalDeclarationsCount} <span className={styles.statUnit}>건</span></span>
          </div>
        </div>
      </div>

      {/* 메인 리스트/그리드 연동 영역 */}
      <div className={styles.contentWrapper}>
        {/* 인라인 상세 뷰 영역 (선택된 학교가 있을 때 리스트 바로 위에 렌더링) */}
        {selectedSchool && (
          <div ref={detailRef} className={styles.detailViewSection}>
            <div className={styles.detailContentWrapper}>
              
              {/* 좌측: 성명서 이미지 (Sticky) */}
              <div className={styles.detailImageContainer}>
                <Image
                  src={getImageUrl(selectedSchool)}
                  alt={`${selectedSchool.name} 시국선언문`}
                  fill
                  sizes="(max-width: 992px) 100vw, 50vw"
                  priority
                  className={styles.detailImage}
                />
              </div>

              {/* 우측: 텍스트 및 메타데이터 영역 */}
              <div className={styles.detailTextContainer}>
                <div className={styles.detailHeader}>
                  <div className={styles.detailTitleInfo}>
                    <h2 className={styles.detailSchoolName}>{selectedSchool.summary}</h2>
                    <span className={styles.detailDate}>
                      {selectedSchool.name}{selectedSchool.organization ? ` · ${selectedSchool.organization}` : ''} | 선언 일자: {selectedSchool.date}
                    </span>
                  </div>
                  <button onClick={() => setSelectedId(null)} className={styles.detailCloseButton} title="닫기">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>

                <div className={styles.detailBody}>
                  {selectedSchool.content ? (
                    <div className={styles.detailText} dangerouslySetInnerHTML={{ __html: selectedSchool.content.replace(/\n/g, '<br/>') }} />
                  ) : (
                    <p className={styles.detailText}>{selectedSchool.summary}</p>
                  )}
                </div>
                
                <div className={styles.detailActions}>
                  <button className={styles.actionBtn} onClick={() => alert('공유 기능이 준비중입니다.')}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="18" cy="5" r="3"></circle>
                      <circle cx="6" cy="12" r="3"></circle>
                      <circle cx="18" cy="19" r="3"></circle>
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                    </svg>
                    공유
                  </button>
                  <button className={styles.actionBtn} onClick={() => setIsModalOpen(true)}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    제보
                  </button>
                  <button className={styles.actionBtn} onClick={() => alert('오류 신고가 접수되었습니다.')}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                      <line x1="12" y1="9" x2="12" y2="13"></line>
                      <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                    오류 수정
                  </button>
                  
                  {filteredDeclarations.findIndex(d => d.id === selectedId) < filteredDeclarations.length - 1 && (
                    <button className={styles.nextBtn} onClick={goToNextDeclaration}>
                      다음 성명
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                        <polyline points="12 5 19 12 12 19"></polyline>
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 하단 이어보기 구분선 영역 */}
            <div className={styles.detailDivider}>
              <span>다른 대학들의 시국선언문 이어보기</span>
            </div>
          </div>
        )}

        <div ref={containerRef} className={viewMode === 'grid' ? styles.gridContainer : styles.listContainer}>
          {filteredDeclarations.map((school) => (
            <div
              key={school.id}
              onClick={() => handleCardClick(school.id)}
              className={viewMode === 'grid' ? styles.gridCard : styles.listCard}
            >
              {/* 썸네일 배경 이미지 - GRID 뷰일 때만 렌더링 */}
              {viewMode === 'grid' && (
                <>
                  <div className={styles.cardBgImage}>
                    <Image
                      src={getImageUrl(school)}
                      alt={`${school.name} 시국선언문 썸네일`}
                      fill
                      sizes="(max-width: 992px) 50vw, 25vw"
                      priority
                    />
                  </div>
                  {/* 55% 검은 투명 마스크 */}
                  <div className={styles.cardMask} />
                </>
              )}
  
              {/* 카드 텍스트 콘텐츠 (z-index: 3) */}
              <div className={styles.cardContent}>
                {/* 그리드 모드 레이아웃 */}
                {viewMode === 'grid' ? (
                  <>
                    <div className={styles.cardTopInfo}>
                      <span className={styles.schoolOrgName}>
                        {school.name}{school.organization ? ` · ${school.organization}` : ''}
                      </span>
                    </div>
                    <h2 className={styles.statementTitle}>{school.summary}</h2>
                  </>
                ) : (
                  // 리스트 모드 레이아웃 (배경 썸네일 없음, 한 줄 형태)
                  <>
                    <div style={{display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '75%'}}>
                      <span className={styles.schoolOrgName}>
                        {school.name}{school.organization ? ` · ${school.organization}` : ''}
                      </span>
                      <h2 className={styles.statementTitleList}>{school.summary}</h2>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                      <span className={styles.schoolDate}>{school.date}</span>
                      <div className={styles.arrow}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                          <polyline points="12 5 19 12 12 19"></polyline>
                        </svg>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
          {isLoading ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-secondary)', padding: '80px 0', fontSize: '14px', zIndex: 3 }}>
              데이터를 불러오는 중입니다...
            </div>
          ) : filteredDeclarations.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-secondary)', padding: '80px 0', fontSize: '13px', zIndex: 3 }}>
              검색 결과가 없습니다.
            </div>
          ) : null}
        </div>
      </div>

      {/* 푸터 영역 */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          
          {/* 상단 행 (모바일 대응 로고 및 소셜 아이콘 세션) */}
          <div className={styles.footerTopRow}>
            <div className={styles.footerLeft}>
              <div className={styles.footerLogoWrapper}>
                <Image
                  src="/images/footer-logo.png"
                  alt="6·3 대학 시국선언 아카이브 로고"
                  width={150}
                  height={44}
                  style={{ objectFit: 'contain' }}
                />
              </div>
            </div>
            
            {/* 모바일용 소셜 아이콘 (데스크톱 숨김) */}
            <div className={styles.footerMobileIcons}>
              <a 
                href="https://www.instagram.com/tantanroad.official/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className={styles.socialLink}
                title="인스타그램 바로가기"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
              </a>
            </div>
          </div>

          {/* 중앙 설명 세션 (데스크톱 center, 모바일 bottom) */}
          <div className={styles.footerCenter}>
            <p className={styles.footerDesc}>
              6·3 지방선거 &apos;투표용지 부족 사태&apos;라는 초유의 주권 침해에 맞서, 공정한 민주주의를 촉구하는 전국 대학생들의 연대가 이어지는 가운데,<br />이 역사적인 분노와 연대의 목소리를 잊지 않고 기록하기 위해 전국 대학교의 시국선언문을 아카이빙합니다.
            </p>
          </div>

          {/* 데스크톱용 우측 소셜 세션 (모바일 숨김) */}
          <div className={styles.footerRight}>
            <a 
              href="https://www.instagram.com/tantanroad.official/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className={styles.socialLink}
              title="인스타그램 바로가기"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
            </a>
          </div>
        </div>
      </footer>

      {/* 플로팅 버튼 */}
      <button className={styles.fabButton} onClick={() => setIsModalOpen(true)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        제보
      </button>

      {/* 제보하기 모달 */}
      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) handleCloseModal(); }}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>제보하기</h3>
              <button className={styles.modalCloseBtn} onClick={handleCloseModal}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleFormSubmit}>
              <div className={styles.formGroup}>
                <label>성명서 이미지 <span>*</span></label>
                <div className={styles.fileInputWrapper}>
                  {imagePreviewUrl ? (
                    <div className={styles.imagePreviewContainer}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imagePreviewUrl} alt="선언서 미리보기" className={styles.imagePreview} />
                      <button type="button" className={styles.removeImageBtn} onClick={handleRemoveFile} title="이미지 삭제">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <label className={styles.fileInputBtn}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                      </svg>
                      <span>이미지 업로드 (최대 5MB)</span>
                      <input 
                        type="file" 
                        name="image" 
                        className={styles.fileInput} 
                        accept="image/*" 
                        required 
                        onChange={handleFileChange} 
                      />
                    </label>
                  )}
                </div>
              </div>
              
              <div className={styles.formGroup}>
                <label>학교 이름 <span>*</span></label>
                <input type="text" name="name" className={styles.formInput} placeholder="예: 동국대학교" required value={submitForm.name} onChange={handleInputChange} />
              </div>
              
              <div className={styles.formGroup}>
                <label>캠퍼스</label>
                <input type="text" name="campus" className={styles.formInput} placeholder="예: 서울캠퍼스" value={submitForm.campus} onChange={handleInputChange} />
              </div>
              
              <div className={styles.formGroup}>
                <label>조직명 <span>*</span></label>
                <input type="text" name="organization" className={styles.formInput} placeholder="예: 제56대 총학생회" required value={submitForm.organization} onChange={handleInputChange} />
              </div>
              
              <div className={styles.formGroup}>
                <label>선언 일자</label>
                <input type="date" name="date" className={styles.formInput} value={submitForm.date} onChange={handleInputChange} />
              </div>
              
              <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                {isSubmitting ? '업로드 및 제보 중...' : '제보하기'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
