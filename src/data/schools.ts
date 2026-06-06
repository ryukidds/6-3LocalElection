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
  return school.fallbackUrl || "/images/declarations/dongguk.jpg";
}

export const schoolDeclarations: SchoolDeclaration[] = [
  {
    id: "dongguk",
    name: "동국대학교",
    campus: "서울캠퍼스",
    organization: "제56대 총학생회 '정도'",
    region: "서울",
    category: "총학생회",
    date: "2026-06-05",
    fallbackUrl: "/images/declarations/dongguk.jpg",
    summary: "국민 주권의 대한민국을 원한다. 선거 관리 부실 사태의 모든 국면을 투명하게 공개하고 재발 방지 대책을 마련하라. 민주정신의 선봉에 섰던 동국의 이름으로 고한다.",
    content: `국민 주권의 대한민국을 원한다. 

최근 벌어진 6·3 투표용지 부족 사태는 헌법이 보장하는 참정권을 심각하게 훼손한 헌정 사상 초유의 비극이다. 우리는 이 사태를 단순한 행정적 실수가 아닌, 민주주의의 근간을 뒤흔드는 중대한 사안으로 규정한다.

1. 선거관리위원회는 이번 사태의 모든 진상을 한 점 의혹 없이 투명하게 공개하라.
2. 정부는 책임자를 엄중 문책하고, 투명하고 공정한 선거 시스템을 재구축하라.
3. 훼손된 주권을 회복하고, 국민의 뜻이 온전히 반영될 수 있는 재발 방지 대책을 즉각 마련하라.

민주정신의 선봉에 섰던 우리 동국인은 이 시대의 어둠을 걷어내고, 진정한 국민 주권의 대한민국을 되찾기 위해 끝까지 연대하고 행동할 것이다.`
  },
  {
    id: "snu",
    name: "서울대학교",
    campus: "관악캠퍼스",
    organization: "총학생회 연석회의",
    region: "서울",
    category: "총학생회",
    date: "2026-06-01",
    fallbackUrl: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=1200",
    summary: "민주주의의 근간을 뒤흔드는 초법적 조치에 반대하며, 헌법 수호의 최전선에 설 것을 엄숙히 선언한다."
  },
  {
    id: "yonsei",
    name: "연세대학교",
    campus: "신촌캠퍼스",
    organization: "총학생회 '비상'",
    region: "서울",
    category: "총학생회",
    date: "2026-06-02",
    fallbackUrl: "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?q=80&w=1200",
    summary: "진리와 자유의 뜻에 따라, 어둠 속에 묻힌 진실을 밝히고 시대의 소명에 응답하고자 붓을 든다."
  },
  {
    id: "korea",
    name: "고려대학교",
    campus: "안암캠퍼스",
    organization: "중앙운영위원회",
    region: "서울",
    category: "총학생회",
    date: "2026-06-02",
    fallbackUrl: "https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?q=80&w=1200",
    summary: "정의의 횃불을 다시 치켜든다. 민주공화국의 주권은 국민에게 있으며, 모든 권력은 국민으로부터 나온다."
  },
  {
    id: "sogang",
    name: "서강대학교",
    campus: "신수동캠퍼스",
    organization: "총학생회",
    region: "서울",
    category: "총학생회",
    date: "2026-06-03",
    fallbackUrl: "https://images.unsplash.com/photo-1455390582262-044cdead277a?q=80&w=1200",
    summary: "그대 서강의 자랑이듯, 이제 시대의 자랑이 되어 어둠을 걷어내고 민주적 헌정 질서를 복원하라."
  },
  {
    id: "skku",
    name: "성균관대학교",
    campus: "인문사회과학캠퍼스",
    organization: "총학생회",
    region: "서울",
    category: "총학생회",
    date: "2026-06-03",
    fallbackUrl: "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?q=80&w=1200",
    summary: "수선관의 정신으로 불의에 맞선다. 역사의 수레바퀴를 되돌리려는 그 어떤 시도도 좌시하지 않을 것이다."
  },
  {
    id: "hanyang",
    name: "한양대학교",
    campus: "서울캠퍼스",
    organization: "총학생회",
    region: "서울",
    category: "총학생회",
    date: "2026-06-04",
    fallbackUrl: "https://images.unsplash.com/photo-1516979187457-637abb4f9353?q=80&w=1200",
    summary: "사랑의 실천, 정의의 실행. 억압받는 목소리를 대변하고 정의로운 사회를 향한 한걸음을 내딛는다."
  },
  {
    id: "ewha",
    name: "이화여자대학교",
    campus: "본캠퍼스",
    organization: "총학생회",
    region: "서울",
    category: "총학생회",
    date: "2026-06-04",
    fallbackUrl: "https://images.unsplash.com/photo-1505664194779-8bebcb95c539?q=80&w=1200",
    summary: "이화의 역사는 곧 민주의 역사다. 시대의 장벽을 부수고 공정과 상식이 통하는 내일을 열어젖힐 것이다."
  },
  {
    id: "kaist",
    name: "KAIST",
    campus: "본원",
    organization: "학부총학생회",
    region: "대전",
    category: "총학생회",
    date: "2026-06-05",
    fallbackUrl: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=1200",
    summary: "이성과 진리를 탐구하는 과학도들의 선언. 비이성적인 폭압에 맞서 헌법이 보장한 권리와 상식을 수호한다."
  }
];
