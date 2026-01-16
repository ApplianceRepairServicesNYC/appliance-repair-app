export type Role = 'ADMIN' | 'TECHNICIAN';

export type TechnicianStatus = 'ACTIVE' | 'LOCKED' | 'INACTIVE';

export type CallStatus = 'PENDING' | 'ROUTED' | 'ANSWERED' | 'MISSED' | 'COMPLETED' | 'CANCELLED';

export type ServiceStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type AuditAction = 
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'LOCK'
  | 'UNLOCK'
  | 'QUOTA_RESET'
  | 'CALL_ROUTED'
  | 'SERVICE_COMPLETED';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
  technician?: Technician;
}

export interface Technician {
  id: string;
  userId: string;
  phone?: string;
  status: TechnicianStatus;
  weeklyQuota: number;
  currentWeekCompleted: number;
  lastQuotaReset: string;
  lockedAt?: string;
  lockedReason?: string;
  createdAt: string;
  updatedAt: string;
  user: Pick<User, 'id' | 'email' | 'name' | 'role' | 'isActive'>;
  schedules?: Schedule[];
  _count?: {
    calls: number;
    serviceRecords: number;
  };
}

export interface Schedule {
  id: string;
  technicianId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Call {
  id: string;
  ringcentralCallId: string;
  technicianId?: string;
  callerNumber: string;
  callerName?: string;
  status: CallStatus;
  duration?: number;
  recordingUrl?: string;
  routedAt?: string;
  answeredAt?: string;
  endedAt?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  technician?: Technician;
  serviceRecord?: ServiceRecord;
}

export interface ServiceRecord {
  id: string;
  technicianId: string;
  callId?: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  applianceType: string;
  issueDescription: string;
  diagnosis?: string;
  resolution?: string;
  partsUsed?: string;
  laborHours?: number;
  status: ServiceStatus;
  scheduledDate?: string;
  completedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  technician?: Technician;
  call?: Call;
}

export interface AuditLog {
  id: string;
  userId?: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  user?: Pick<User, 'id' | 'email' | 'name' | 'role'>;
}

export interface QuotaStatus {
  current: number;
  required: number;
  remaining: number;
  percentage: number;
  lastReset: string;
  onTrack: boolean;
}

export interface DashboardStats {
  technicians: {
    total: number;
    active: number;
    locked: number;
    availableNow: number;
  };
  calls: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    byStatus: Record<string, number>;
  };
  services: {
    thisWeek: number;
    thisMonth: number;
    completedThisWeek: number;
    byStatus: Record<string, number>;
  };
  topTechnicians: Array<{
    id: string;
    name: string;
    email: string;
    completedThisWeek: number;
    quota: number;
    progress: number;
  }>;
  recentActivity: AuditLog[];
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
