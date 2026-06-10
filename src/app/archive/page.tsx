import { schoolDeclarations } from '@/data/schools';
import ArchiveDashboard from '@/components/ArchiveDashboard';

export default function ArchivePage() {
  return <ArchiveDashboard initialDeclarations={schoolDeclarations} />;
}
