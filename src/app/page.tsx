import { schoolDeclarations } from '@/data/schools';
import ArchiveDashboard from '@/components/ArchiveDashboard';
import CustomCursor from '@/components/CustomCursor';

// 정적 데이터 사용으로 ISR 불필요, 정적 빌드로 고속 서빙
export default function Home() {
  return (
    <>
      <CustomCursor />
      <ArchiveDashboard initialDeclarations={schoolDeclarations} />
    </>
  );
}
