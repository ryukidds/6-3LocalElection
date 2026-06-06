export interface SchoolDeclaration {
  id: string;          // 고유 ID
  name: string;        // 학교 이름 (예: '서울대학교')
  campus?: string;     // 캠퍼스 (예: '서울캠퍼스')
  organization?: string; // 조직명 (예: '총학생회', '중앙운영위원회')
  region?: string;     // 지역 (예: '서울', '경기', '부산')
  category?: string;   // 분류 (예: '총학생회', '단과대', '동아리')
  date: string;        // 선언 날짜 (예: '2026-06-01')
  driveFileId?: string;// 구글 드라이브 파일 ID (없을 시 fallbackUrl 사용)
  fallbackUrl?: string;// 모의 이미지 주소 등
  summary: string;     // 선언문 요약 또는 슬로건
  content?: string;    // 성명서 전체 본문 텍스트 (추가됨)
}

// 구글 드라이브 이미지 다이렉트 주소를 생성하는 헬퍼 함수
export function getImageUrl(school: SchoolDeclaration): string {
  if (school.driveFileId) {
    return `https://lh3.googleusercontent.com/d/${school.driveFileId}`;
  }
  return school.fallbackUrl || "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=1200";
}

// 초기 빈 데이터
export const schoolDeclarations: SchoolDeclaration[] = [];
