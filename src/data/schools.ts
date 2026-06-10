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
  youtube_url?: string;// 유튜브 영상 링크 (추가됨)
  sequenceNumber?: number; // 정적 누적 번호 (추가됨)
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

// 사용자 지정 정적 유튜브 영상 5선
export const staticVideos: SchoolDeclaration[] = [
  {
    id: 'static-video-2',
    name: '서울대학교',
    organization: '대학원 총학생회',
    region: '서울',
    category: '총학생회',
    date: '2026-06-04',
    youtube_url: 'https://www.youtube.com/watch?v=2m26qqhxnQc',
    summary: '주권 침해 규탄 및 공정 선거 촉구 서울대학교 시국선언',
    content: '서울대학교 학생들과 대학원생들이 공동으로 결의한 시국선언문 낭독 영상입니다. 선거 정의 실현과 민주 사회 질서 복원을 강력히 요구합니다.',
  },
  {
    id: 'static-video-3',
    name: '고려대학교',
    organization: '총학생회',
    region: '서울',
    category: '총학생회',
    date: '2026-06-05',
    youtube_url: 'https://www.youtube.com/watch?v=KhM52J660Hc',
    summary: '공정 민주주의 수호 고려인 시국선언 영상',
    content: '민주화 역사 속에서 늘 선봉에 섰던 고려대학교인들의 굳건한 선언입니다. 부정한 선거 조치에 결연히 반대하고 공정 선거를 촉구하는 목소리를 담았습니다.',
  },
  {
    id: 'static-video-4',
    name: '연세대학교',
    organization: '중앙운영위원회',
    region: '서울',
    category: '단과대',
    date: '2026-06-06',
    youtube_url: 'https://www.youtube.com/watch?v=NRTcqItKPFY',
    summary: '진리와 자유를 수호하는 연세인 시국선언 결의문',
    content: '연세대학교 총학생단 및 단과대 학생대표들이 모여 낭독한 시국 결의입니다. 청년들의 주권을 짓밟는 사태에 대한 엄중한 진상 규명을 요구합니다.',
  },
  {
    id: 'static-video-5',
    name: '전국 대학 대표자 협의',
    organization: '전국 대학생 연대체',
    region: '전체',
    category: '기타',
    date: '2026-06-07',
    youtube_url: 'https://www.youtube.com/watch?v=baN6cyLf268',
    summary: '주권 수호 및 선거정의 실현을 위한 대학가 공동 선언 연설',
    content: '전국 각 대학의 학생 대표들이 한 자리에 모여 외치는 공동 시국선언문입니다. 공정 선거 확립을 촉구하며 연대 활동을 이어갈 것을 천명합니다.',
  },
];
