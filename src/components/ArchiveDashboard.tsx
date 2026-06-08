'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Image from 'next/image';
import gsap from 'gsap';
import { SchoolDeclaration, getImageUrl } from '@/data/schools';
import { supabase } from '@/lib/supabaseClient';
import styles from './ArchiveDashboard.module.css';
import PosterImageViewer from './PosterImageViewer';

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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
    summary: '',
    content: '',
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
      const fileName = generateFileName(selectedFile.name);
      const filePath = `raw/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('declarations')
        .upload(filePath, selectedFile);

      if (uploadError) {
        throw new Error(`이미지 업로드 실패: ${uploadError.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('declarations')
        .getPublicUrl(filePath);

      uploadedImageUrl = publicUrl;

      const newId = generateUniqueId();
      const { error: dbError } = await supabase
        .from('declarations')
        .insert([
          {
            id: newId,
            name: submitForm.name,
            campus: submitForm.campus || null,
            organization: submitForm.organization,
            date: submitForm.date || new Date().toISOString().split('T')[0],
            region: '전체',
            category: '기타',
            summary: submitForm.summary || `${submitForm.name} ${submitForm.organization} 시국선언문`,
            content: submitForm.content || null,
            status: 'pending',
            fallback_url: uploadedImageUrl
          }
        ]);

      if (dbError) {
        throw new Error(`데이터베이스 저장 실패: ${dbError.message}`);
      }

      alert('제보가 완료되었습니다. 관리자 검토 후 반영됩니다!');
      handleCloseModal();
      setSubmitForm({ name: '', campus: '', organization: '', date: '', summary: '', content: '' });
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : '제보 중 오류가 발생했습니다. 다시 시도해주세요.';
      alert(errorMessage);
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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

  useEffect(() => {
    if (selectedId && detailRef.current) {
      detailRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedId]);

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
            duration: 0.4,
            stagger: 0.03,
            ease: 'power2.out',
          }
        );
      }
    }
  }, [searchTerm, viewMode, regionFilter, categoryFilter, sortOrder]);

  return (
    <div ref={mainScrollRef} className={styles.container}>
      
      {/* Hero Band Dark */}
      <div className={styles.heroBand}>
        <header className={styles.header}>
          <div className={styles.logoArea} onClick={handleHomeClick}>
            <h1>6·3 <span>대학 시국선언 아카이브</span></h1>
            <p>6·3 투표용지 부족 사태 전국구 대학 시국선언 아카이브</p>
          </div>
        </header>

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
      </div>

      {/* Controls Wrapper */}
      <div className={styles.controlsWrapper}>
        <div className={styles.controls}>
          <div className={styles.filterGroup}>
            <div className={styles.searchWrapper}>
              <input
                type="text"
                placeholder="학교, 조직, 제목 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.searchInput}
              />
            </div>
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
          </div>

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
      </div>

      {/* Main Content Area */}
      <div className={styles.contentWrapper}>
        
        {/* Detail View */}
        {selectedSchool && (
          <div ref={detailRef} className={styles.detailViewSection}>
            <div className={styles.detailContentWrapper}>
              <div className={styles.detailImageContainer}>
                <PosterImageViewer
                  src={getImageUrl(selectedSchool)}
                  alt={`${selectedSchool.name} 시국선언문`}
                  title={selectedSchool.summary}
                />
              </div>

              <div className={styles.detailTextContainer}>
                <div className={styles.detailHeader}>
                  <div>
                    <h2 className={styles.detailSchoolName}>{selectedSchool.summary}</h2>
                    <span className={styles.detailDate}>
                      {selectedSchool.name}{selectedSchool.organization ? ` · ${selectedSchool.organization}` : ''} | 선언 일자: {selectedSchool.date}
                    </span>
                  </div>
                  <button onClick={() => setSelectedId(null)} className={styles.detailCloseButton} title="닫기">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>

                <div className={styles.detailBody}>
                  {selectedSchool.content ? (
                    <div dangerouslySetInnerHTML={{ __html: selectedSchool.content.replace(/\n/g, '<br/>') }} />
                  ) : (
                    <p>{selectedSchool.summary}</p>
                  )}
                </div>
                
                <div className={styles.detailActions}>
                  <button className={styles.actionBtn} onClick={() => alert('공유 기능 준비중입니다.')}>
                    공유
                  </button>
                  <button className={styles.actionBtn} onClick={() => setIsModalOpen(true)}>
                    제보
                  </button>
                  {filteredDeclarations.findIndex(d => d.id === selectedId) < filteredDeclarations.length - 1 && (
                    <button className={styles.nextBtn} onClick={goToNextDeclaration}>
                      다음 성명 →
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className={styles.detailDivider}>
              다른 대학들의 시국선언문 이어보기
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
              {viewMode === 'grid' && (
                <div className={styles.cardBgImage}>
                  <Image
                    src={getImageUrl(school)}
                    alt={`${school.name} 시국선언문 썸네일`}
                    fill
                    sizes="(max-width: 992px) 50vw, 25vw"
                  />
                </div>
              )}
  
              <div className={styles.cardContent}>
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
                  <>
                    <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                      <span className={styles.schoolOrgName}>
                        {school.name}{school.organization ? ` · ${school.organization}` : ''}
                      </span>
                      <h2 className={styles.statementTitleList}>{school.summary}</h2>
                    </div>
                    <span className={styles.schoolDate}>{school.date}</span>
                  </>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--muted)', width: '100%' }}>
              데이터를 불러오는 중입니다...
            </div>
          )}
          {!isLoading && filteredDeclarations.length === 0 && (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--muted)', width: '100%' }}>
              검색 결과가 없습니다.
            </div>
          )}
        </div>
      </div>

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
          <div style={{display: 'flex', gap: '16px', justifyContent: 'center'}}>
            <a href="https://www.instagram.com/tantanroad.official/" target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
            </a>
          </div>
        </div>
      </footer>

      <button className={styles.fabButton} onClick={() => setIsModalOpen(true)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        제보
      </button>

      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) handleCloseModal(); }}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>제보하기</h3>
              <button className={styles.modalCloseBtn} onClick={handleCloseModal}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleFormSubmit}>
              <div className={styles.formScrollArea}>
                <div className={styles.formGroup}>
                  <label>성명서 이미지 <span>*</span></label>
                  <div className={styles.fileInputWrapper}>
                    {imagePreviewUrl ? (
                      <div className={styles.imagePreviewContainer}>
                        <img src={imagePreviewUrl} alt="선언서 미리보기" className={styles.imagePreview} />
                        <button type="button" className={styles.removeImageBtn} onClick={handleRemoveFile}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <label className={styles.fileInputBtn}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                          <circle cx="8.5" cy="8.5" r="1.5"></circle>
                          <polyline points="21 15 16 10 5 21"></polyline>
                        </svg>
                        <span>이미지 첨부 (최대 5MB)</span>
                        <input type="file" className={styles.fileInput} accept="image/*" required onChange={handleFileChange} />
                      </label>
                    )}
                  </div>
                </div>
                
                <div className={styles.formGroup}>
                  <label>학교 이름 <span>*</span></label>
                  <input type="text" name="name" className={styles.formInput} required value={submitForm.name} onChange={handleInputChange} />
                </div>
                
                <div className={styles.formGroup}>
                  <label>캠퍼스</label>
                  <input type="text" name="campus" className={styles.formInput} value={submitForm.campus} onChange={handleInputChange} />
                </div>
                
                <div className={styles.formGroup}>
                  <label>조직명 <span>*</span></label>
                  <input type="text" name="organization" className={styles.formInput} required value={submitForm.organization} onChange={handleInputChange} />
                </div>

                <div className={styles.formGroup}>
                  <label>선언 일자</label>
                  <input type="date" name="date" className={styles.formInput} value={submitForm.date} onChange={handleInputChange} />
                </div>

                <div className={styles.formGroup}>
                  <label>선언문 제목</label>
                  <input type="text" name="summary" className={styles.formInput} placeholder="예: 투표용지 부족 사태 규탄 성명서" value={submitForm.summary} onChange={handleInputChange} />
                </div>

                <div className={styles.formGroup}>
                  <label>선언문 내용</label>
                  <textarea name="content" className={styles.formTextarea} placeholder="시국선언문 전문을 입력해주세요." value={submitForm.content} onChange={handleInputChange} />
                </div>
              </div>
              
              <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                {isSubmitting ? '업로드 중...' : '제보하기'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
