'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import styles from './admin.module.css';

interface AdminDeclaration {
  id: string;
  name: string;
  campus?: string;
  organization?: string;
  date: string;
  summary: string;
  content?: string;
  status: string;
  region?: string;
  category?: string;
  fallbackUrl?: string;
  fallback_url?: string;
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState('');

  const [declarations, setDeclarations] = useState<AdminDeclaration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<AdminDeclaration | null>(null);

  const [form, setForm] = useState({
    id: '',
    name: '',
    campus: '',
    organization: '',
    date: '',
    summary: '',
    content: '',
    status: 'pending',
    region: '전체',
    category: '기타',
    fallback_url: '',
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    setSelectedIds([]);
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    const isAuth = sessionStorage.getItem('admin_auth') === 'true';
    if (isAuth) {
      setIsAuthenticated(true);
      fetchDeclarations();
    }
  }, []);

  const fetchDeclarations = async () => {
    setSelectedIds([]);
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('declarations')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching admin data:', error);
      } else {
        const mapped = (data || []).map((item: any) => ({
          ...item,
          fallbackUrl: item.fallback_url,
        }));
        setDeclarations(mapped);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === '63archive') {
      setIsAuthenticated(true);
      sessionStorage.setItem('admin_auth', 'true');
      setAuthError('');
      fetchDeclarations();
    } else {
      setAuthError('올바르지 않은 패스코드입니다.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('admin_auth');
    setPasscode('');
  };

  const handleEditClick = (post: AdminDeclaration) => {
    setEditingPost(post);
    setForm({
      id: post.id,
      name: post.name || '',
      campus: post.campus || '',
      organization: post.organization || '',
      date: post.date || new Date().toISOString().split('T')[0],
      summary: post.summary || '',
      content: post.content || '',
      status: post.status || 'pending',
      region: post.region || '전체',
      category: post.category || '기타',
      fallback_url: post.fallback_url || post.fallbackUrl || '',
    });
    setSelectedFile(null);
    setImagePreviewUrl(null);
    setIsEditorOpen(true);
  };

  const handleNewClick = () => {
    setEditingPost(null);
    setForm({
      id: '',
      name: '',
      campus: '',
      organization: '',
      date: new Date().toISOString().split('T')[0],
      summary: '',
      content: '',
      status: 'pending',
      region: '전체',
      category: '기타',
      fallback_url: '',
    });
    setSelectedFile(null);
    setImagePreviewUrl(null);
    setIsEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setIsEditorOpen(false);
    setEditingPost(null);
    setSelectedFile(null);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('파일 용량은 최대 5MB까지 업로드 가능합니다.');
      return;
    }

    setSelectedFile(file);
    const preview = URL.createObjectURL(file);
    setImagePreviewUrl(preview);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    let uploadedUrl = form.fallback_url;

    try {
      // 1. Upload new image if exists
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
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

        uploadedUrl = publicUrl;
      }

      const postData = {
        name: form.name,
        campus: form.campus || null,
        organization: form.organization || null,
        date: form.date,
        summary: form.summary || `${form.name} ${form.organization} 시국선언문`,
        content: form.content || null,
        status: form.status,
        region: form.region || '전체',
        category: form.category || '기타',
        fallback_url: uploadedUrl,
      };

      if (editingPost) {
        // Update
        const { error: dbError } = await supabase
          .from('declarations')
          .update(postData)
          .eq('id', form.id);

        if (dbError) throw dbError;
      } else {
        // Insert
        const newId = `id_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const { error: dbError } = await supabase
          .from('declarations')
          .insert([{ id: newId, ...postData }]);

        if (dbError) throw dbError;
      }

      alert('성공적으로 저장되었습니다.');
      handleCloseEditor();
      fetchDeclarations();
    } catch (err: any) {
      alert(err.message || '저장 중 에러가 발생했습니다.');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`[${name}] 시국선언을 데이터베이스에서 영구 삭제하시겠습니까?`)) return;

    try {
      const { error } = await supabase
        .from('declarations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert('삭제 완료되었습니다.');
      fetchDeclarations();
    } catch (err: any) {
      alert(err.message || '삭제 오류가 발생했습니다. RLS 보안 규칙(Delete Policy)을 먼저 활성화하십시오.');
      console.error(err);
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredDeclarations.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredDeclarations.map((post) => post.id));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedIds.length === 0) return;
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('declarations')
        .update({ status: newStatus })
        .in('id', selectedIds);

      if (error) throw error;
      alert(`선택한 ${selectedIds.length}개 항목이 [${newStatus}] 상태로 일괄 변경되었습니다.`);
      setSelectedIds([]);
      fetchDeclarations();
    } catch (err: any) {
      alert(err.message || '일괄 상태 변경 중 오류가 발생했습니다.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`선택한 ${selectedIds.length}개 항목을 데이터베이스에서 영구 삭제하시겠습니까?`)) return;
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('declarations')
        .delete()
        .in('id', selectedIds);

      if (error) throw error;
      alert(`선택한 ${selectedIds.length}개 항목이 영구 삭제되었습니다.`);
      setSelectedIds([]);
      fetchDeclarations();
    } catch (err: any) {
      alert(err.message || '일괄 삭제 중 오류가 발생했습니다. RLS 보안 규칙(Delete Policy)을 확인하십시오.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Filtered declarations for dashboard view
  const filteredDeclarations = useMemo(() => {
    return declarations.filter((post) => {
      const matchSearch =
        post.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (post.organization && post.organization.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (post.summary && post.summary.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchStatus = statusFilter === 'all' || post.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [declarations, searchTerm, statusFilter]);

  if (!isAuthenticated) {
    return (
      <div className={styles.loginWrapper}>
        <form className={styles.loginCard} onSubmit={handleLogin}>
          <h2>관리자 인증 <span>(탄탄대로)</span></h2>
          <p>시국선언 아카이브 수정을 위해 관리자 패스코드를 입력해 주세요.</p>
          <input
            type="password"
            placeholder="패스코드 입력"
            className={styles.formInput}
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            required
            autoFocus
          />
          {authError && <div className={styles.errorMsg}>{authError}</div>}
          <button type="submit" className={styles.submitBtn}>
            인증하기
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.logoArea}>
          <h1>시국선언 아카이브 관리자 <span>(탄탄대로)</span></h1>
        </div>
        <button onClick={handleLogout} className={styles.logoutBtn}>
          로그아웃
        </button>
      </header>

      <main className={styles.content}>
        <div className={styles.titleSection}>
          <h2>게시글 관리</h2>
          <button onClick={handleNewClick} className={styles.newPostBtn}>
            + 새 게시글 작성
          </button>
        </div>

        <div className={styles.controlsBar}>
          <div className={styles.searchGroup}>
            <input
              type="text"
              placeholder="학교, 조직, 제목 검색..."
              className={styles.searchInput}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className={styles.filterSelect}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">전체 상태</option>
            <option value="approved">승인됨 (approved)</option>
            <option value="pending">대기중 (pending)</option>
            <option value="rejected">반려됨 (rejected)</option>
          </select>
        </div>

        {/* Bulk Actions Bar */}
        {selectedIds.length > 0 && (
          <div className={styles.bulkActionsBar}>
            <div className={styles.bulkInfo}>
              선택됨: <span>{selectedIds.length}</span>개
            </div>
            <div className={styles.bulkButtons}>
              <button onClick={() => handleBulkStatusChange('approved')} className={styles.bulkBtn}>
                일괄 승인 (approved)
              </button>
              <button onClick={() => handleBulkStatusChange('pending')} className={styles.bulkBtn}>
                일괄 대기 (pending)
              </button>
              <button onClick={() => handleBulkStatusChange('rejected')} className={styles.bulkBtn}>
                일괄 반려 (rejected)
              </button>
              <button onClick={handleBulkDelete} className={styles.bulkDeleteBtn}>
                일괄 삭제
              </button>
            </div>
          </div>
        )}

        <div className={styles.tableContainer}>
          {isLoading ? (
            <div className={styles.emptyState}>데이터를 불러오는 중...</div>
          ) : filteredDeclarations.length === 0 ? (
            <div className={styles.emptyState}>등록된 게시글이 없습니다.</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '40px', padding: '18px 16px' }}>
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      checked={
                        filteredDeclarations.length > 0 &&
                        selectedIds.length === filteredDeclarations.length
                      }
                      onChange={handleToggleSelectAll}
                    />
                  </th>
                  <th>학교 / 조직</th>
                  <th>선언문 요약(제목)</th>
                  <th>선언 일자</th>
                  <th>지역 / 분류</th>
                  <th>상태</th>
                  <th>작업</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeclarations.map((post) => (
                  <tr key={post.id} className={styles.tableRow}>
                    <td style={{ padding: '22px 16px' }}>
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={selectedIds.includes(post.id)}
                        onChange={() => handleToggleSelectOne(post.id)}
                      />
                    </td>
                    <td>
                      <div className={styles.schoolInfo}>
                        <span className={styles.schoolName}>{post.name}</span>
                        <span className={styles.campusName}>
                          {post.campus ? `${post.campus}캠퍼스` : ''}
                          {post.campus && post.organization ? ' · ' : ''}
                          {post.organization || ''}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className={styles.postTitle} title={post.summary}>
                        {post.summary}
                      </div>
                    </td>
                    <td>
                      <span className={styles.date}>{post.date}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '13px', color: 'var(--body)' }}>
                        {post.region || '전체'} | {post.category || '기타'}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`${styles.badge} ${
                          post.status === 'approved'
                            ? styles.badgeApproved
                            : post.status === 'pending'
                            ? styles.badgePending
                            : styles.badgeRejected
                        }`}
                      >
                        {post.status}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          onClick={() => handleEditClick(post)}
                          className={styles.editBtn}
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleDelete(post.id, post.name)}
                          className={styles.deleteBtn}
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* Editor Modal */}
      {isEditorOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>{editingPost ? '게시글 수정' : '새 게시글 등록'}</h3>
              <button className={styles.modalCloseBtn} onClick={handleCloseEditor}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className={styles.formScrollArea}>
                
                {/* 1. 이미지 업로드 */}
                <div className={styles.formGroup}>
                  <label>성명서 이미지 {!editingPost && <span>*</span>}</label>
                  <input
                    type="file"
                    className={styles.formInput}
                    accept="image/*"
                    onChange={handleFileChange}
                    required={!editingPost && !form.fallback_url}
                  />
                  
                  {/* 이미지 프리뷰 */}
                  <div className={styles.imagePreviewArea}>
                    {imagePreviewUrl ? (
                      <div>
                        <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>새 파일 미리보기:</span>
                        <div className={styles.currentImageThumb}>
                          <img src={imagePreviewUrl} alt="새 파일 미리보기" />
                        </div>
                      </div>
                    ) : form.fallback_url ? (
                      <div>
                        <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>현재 적용 이미지:</span>
                        <div className={styles.currentImageThumb}>
                          <img src={form.fallback_url} alt="현재 이미지" />
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>학교 이름 <span>*</span></label>
                  <input
                    type="text"
                    name="name"
                    className={styles.formInput}
                    value={form.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>캠퍼스</label>
                  <input
                    type="text"
                    name="campus"
                    className={styles.formInput}
                    value={form.campus}
                    onChange={handleInputChange}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>조직명 <span>*</span></label>
                  <input
                    type="text"
                    name="organization"
                    className={styles.formInput}
                    value={form.organization}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>선언 일자 <span>*</span></label>
                  <input
                    type="date"
                    name="date"
                    className={styles.formInput}
                    value={form.date}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>지역</label>
                  <select
                    name="region"
                    className={styles.formInput}
                    value={form.region}
                    onChange={handleInputChange}
                  >
                    <option value="서울">서울</option>
                    <option value="경기">경기</option>
                    <option value="인천">인천</option>
                    <option value="대전">대전</option>
                    <option value="대구">대구</option>
                    <option value="부산">부산</option>
                    <option value="광주">광주</option>
                    <option value="울산">울산</option>
                    <option value="강원">강원</option>
                    <option value="전체">전체</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>분류</label>
                  <select
                    name="category"
                    className={styles.formInput}
                    value={form.category}
                    onChange={handleInputChange}
                  >
                    <option value="총학생회">총학생회</option>
                    <option value="단과대">단과대</option>
                    <option value="동아리">동아리</option>
                    <option value="기타">기타</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>상태</label>
                  <select
                    name="status"
                    className={styles.formInput}
                    value={form.status}
                    onChange={handleInputChange}
                  >
                    <option value="pending">pending (검수대기)</option>
                    <option value="approved">approved (승인노출)</option>
                    <option value="rejected">rejected (반려)</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>선언문 제목 <span>*</span></label>
                  <input
                    type="text"
                    name="summary"
                    className={styles.formInput}
                    value={form.summary}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>선언문 내용</label>
                  <textarea
                    name="content"
                    className={styles.formTextarea}
                    value={form.content}
                    onChange={handleInputChange}
                  />
                </div>

              </div>

              <div className={styles.formActions}>
                <button type="button" className={styles.cancelBtn} onClick={handleCloseEditor}>
                  취소
                </button>
                <button type="submit" className={styles.submitBtn} disabled={isSaving}>
                  {isSaving ? '저장중...' : '저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
