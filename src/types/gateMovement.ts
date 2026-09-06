export interface GateMovementRecord {
  id: string;
  date: string;
  entryTime?: string;
  exitTime?: string;
  status: 'present' | 'late' | 'absent' | 'excused';
  entryPhotoUrl?: string;
  exitPhotoUrl?: string;
  entryGateName?: string;
  exitGateName?: string;
  confidence?: number;
  durationMinutes?: number; // Maktabda bo'lgan umumiy vaqti (daqiqa)
}

export interface GateMovementTimelineProps {
  studentId: string;
  studentName: string;
  records?: GateMovementRecord[];
}

