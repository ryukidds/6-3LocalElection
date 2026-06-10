'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import styles from '@/components/ArchiveDashboard.module.css';

function generateUniqueId(): string {
  return `id_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function generateFileName(originalName: string): string {
  const fileExt = originalName.split('.').pop();
  return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
}

export default function SubmitPage() {
  const submissionType = 'statement';
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [submitForm, setSubmitForm] = useState({
    name: '',
    campus: '',
    organization: '',
    date: new Date().toISOString().split('T')[0],
    summary: '',
    content: '',
    youtube_url: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSubmitForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;

    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        alert(`파일 용량은 최대 5MB까지 업로드 가능합니다. (${file.name})`);
        return;
      }
    }

    setSelectedFiles((prev) => [...prev, ...files]);
    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setImagePreviewUrls((prev) => [...prev, ...newPreviews]);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviewUrls((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  // (extractYouTubeId removed as videos are not accepted for submission)

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedFiles.length === 0) {
      alert('성명서 이미지를 첨부해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      let finalFallbackUrl = '';

      const uploadPromises = selectedFiles.map(async (file) => {
        const fileName = generateFileName(file.name);
        const filePath = `raw/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('declarations')
          .upload(filePath, file);

        if (uploadError) {
          throw new Error(`이미지 업로드 실패 (${file.name}): ${uploadError.message}`);
        }

        const { data: { publicUrl } } = supabase.storage
          .from('declarations')
          .getPublicUrl(filePath);

        return publicUrl;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      finalFallbackUrl = uploadedUrls.join(',');

      const newId = generateUniqueId();
      const insertData: any = {
        id: newId,
        name: submitForm.name,
        campus: submitForm.campus || null,
        organization: submitForm.organization,
        date: submitForm.date || new Date().toISOString().split('T')[0],
        region: '전체',
        category: '기타',
        summary: submitForm.summary || `${submitForm.name} ${submitForm.organization} 시국선언`,
        content: submitForm.content || null,
        status: 'pending',
        fallback_url: finalFallbackUrl,
      };

      const { error: dbError } = await supabase
        .from('declarations')
        .insert([insertData]);

      if (dbError) {
        throw new Error(`데이터베이스 저장 실패: ${dbError.message}`);
      }

      alert('제보가 완료되었습니다. 관리자 검토 후 반영됩니다!');
      setSubmitForm({
        name: '',
        campus: '',
        organization: '',
        date: new Date().toISOString().split('T')[0],
        summary: '',
        content: '',
        youtube_url: '',
      });
      setSelectedFiles([]);
      imagePreviewUrls.forEach((url) => URL.revokeObjectURL(url));
      setImagePreviewUrls([]);
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : '제보 중 오류가 발생했습니다. 다시 시도해주세요.';
      alert(errorMessage);
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <Navbar />

      <main className={styles.submitPageWrapper}>
        <div className={styles.submitPageContainer}>
          <div className={styles.submitHeader}>
            <h2>시국 성명 제보하기</h2>
            <p>전국 대학생들의 목소리를 아카이브에 기록해 주세요. 관리자 확인 후 승인 게시됩니다.</p>
          </div>

          {/* (영상 제보 비활성화됨. 제보는 시국성명만 가능합니다.) */}

          <form onSubmit={handleFormSubmit} className={styles.submitFormCard}>
            <div className={styles.formRowGrid}>
              <div className={styles.formGroup}>
                <label>학교 이름 <span>*</span></label>
                <input
                  type="text"
                  name="name"
                  className={styles.formInput}
                  placeholder="예: 서울대학교"
                  required
                  value={submitForm.name}
                  onChange={handleInputChange}
                />
              </div>

              <div className={styles.formGroup}>
                <label>캠퍼스</label>
                <input
                  type="text"
                  name="campus"
                  className={styles.formInput}
                  placeholder="예: 관악캠퍼스 (선택사항)"
                  value={submitForm.campus}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className={styles.formRowGrid}>
              <div className={styles.formGroup}>
                <label>선언 단체/조직 <span>*</span></label>
                <input
                  type="text"
                  name="organization"
                  className={styles.formInput}
                  placeholder="예: 총학생회, 중앙운영위원회"
                  required
                  value={submitForm.organization}
                  onChange={handleInputChange}
                />
              </div>

              <div className={styles.formGroup}>
                <label>선언/작성 일자 <span>*</span></label>
                <input
                  type="date"
                  name="date"
                  className={styles.formInput}
                  required
                  value={submitForm.date}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>성명서 제목 <span>*</span></label>
              <input
                type="text"
                name="summary"
                className={styles.formInput}
                placeholder="예: 공정한 민주선거 보장을 위한 규탄 성명서"
                required
                value={submitForm.summary}
                onChange={handleInputChange}
              />
            </div>

            {/* 이미지 업로드 */}
            <div className={styles.formGroup}>
              <label>성명서 이미지 첨부 <span>*</span></label>
              <div className={styles.fileInputWrapper}>
                {imagePreviewUrls.length > 0 && (
                  <div className={styles.multiImagePreviewContainer} style={{ marginBottom: '12px' }}>
                    {imagePreviewUrls.map((url, idx) => (
                      <div key={idx} className={styles.imageThumbBox}>
                        <img src={url} alt={`선언서 미리보기 ${idx + 1}`} className={styles.imagePreviewThumb} />
                        <button type="button" className={styles.removeImageBtn} onClick={() => handleRemoveFile(idx)}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                <label className={styles.fileInputBtn}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}>
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                  <span>성명서 이미지 선택 (다중 이미지 선택 가능, 각 최대 5MB)</span>
                  <input
                    type="file"
                    className={styles.fileInput}
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    required={selectedFiles.length === 0}
                  />
                </label>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>상세 내용 / 성명문 전문</label>
              <textarea
                name="content"
                className={styles.formTextarea}
                placeholder="성명서 전문을 입력해주세요. (선택사항)"
                value={submitForm.content}
                onChange={handleInputChange}
                rows={10}
              />
            </div>

            <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
              {isSubmitting ? '전송 중...' : '기록 제출하기'}
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
