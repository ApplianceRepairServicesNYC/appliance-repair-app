import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import type {
  User,
  Technician,
  Call,
  ServiceRecord,
  Schedule,
  AuditLog,
  QuotaStatus,
  DashboardStats,
  PaginatedResponse,
  AuthTokens,
} from '../types';

const API_URL = import.meta.env.VITE_API_URL || '/api';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          const refreshToken = localStorage.getItem('refreshToken');
          if (refreshToken) {
            try {
              const tokens = await this.refreshToken(refreshToken);
              localStorage.setItem('accessToken', tokens.accessToken);
              localStorage.setItem('refreshToken', tokens.refreshToken);
              error.config.headers.Authorization = `Bearer ${tokens.accessToken}`;
              return this.client.request(error.config);
            } catch {
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
              window.location.href = '/login';
            }
          } else {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth
  async login(email: string, password: string): Promise<AuthTokens> {
    const response = await this.client.post<AuthTokens>('/auth/login', { email, password });
    return response.data;
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const response = await this.client.post<AuthTokens>('/auth/refresh', { refreshToken });
    return response.data;
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.client.get<User>('/auth/me');
    return response.data;
  }

  // Technicians
  async getTechnicians(status?: string): Promise<Technician[]> {
    const params = status ? { status } : {};
    const response = await this.client.get<Technician[]>('/technicians', { params });
    return response.data;
  }

  async getTechnician(id: string): Promise<Technician> {
    const response = await this.client.get<Technician>(`/technicians/${id}`);
    return response.data;
  }

  async getAvailableTechnicians(): Promise<Technician[]> {
    const response = await this.client.get<Technician[]>('/technicians/available');
    return response.data;
  }

  async createTechnician(data: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    weeklyQuota?: number;
  }): Promise<Technician> {
    const response = await this.client.post<Technician>('/technicians', data);
    return response.data;
  }

  async updateTechnician(id: string, data: { phone?: string; weeklyQuota?: number }): Promise<Technician> {
    const response = await this.client.patch<Technician>(`/technicians/${id}`, data);
    return response.data;
  }

  async lockTechnician(id: string, reason: string): Promise<Technician> {
    const response = await this.client.patch<Technician>(`/technicians/${id}/lock`, { reason });
    return response.data;
  }

  async unlockTechnician(id: string): Promise<Technician> {
    const response = await this.client.patch<Technician>(`/technicians/${id}/unlock`);
    return response.data;
  }

  async deleteTechnician(id: string): Promise<void> {
    await this.client.delete(`/technicians/${id}`);
  }

  async getTechnicianQuota(id: string): Promise<QuotaStatus> {
    const response = await this.client.get<QuotaStatus>(`/technicians/${id}/quota`);
    return response.data;
  }

  // Calls
  async getCalls(params?: {
    technicianId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Call>> {
    const response = await this.client.get<PaginatedResponse<Call>>('/calls', { params });
    return response.data;
  }

  async getCall(id: string): Promise<Call> {
    const response = await this.client.get<Call>(`/calls/${id}`);
    return response.data;
  }

  async getCallStats(startDate?: string, endDate?: string) {
    const params = { startDate, endDate };
    const response = await this.client.get('/calls/stats', { params });
    return response.data;
  }

  // Schedules
  async getSchedules(technicianId?: string): Promise<Schedule[]> {
    const params = technicianId ? { technicianId } : {};
    const response = await this.client.get<Schedule[]>('/schedules', { params });
    return response.data;
  }

  async getTechnicianWeeklySchedule(technicianId: string) {
    const response = await this.client.get(`/schedules/technician/${technicianId}/weekly`);
    return response.data;
  }

  async createSchedule(data: {
    technicianId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isAvailable?: boolean;
  }): Promise<Schedule> {
    const response = await this.client.post<Schedule>('/schedules', data);
    return response.data;
  }

  async updateSchedule(id: string, data: {
    startTime?: string;
    endTime?: string;
    isAvailable?: boolean;
  }): Promise<Schedule> {
    const response = await this.client.patch<Schedule>(`/schedules/${id}`, data);
    return response.data;
  }

  async deleteSchedule(id: string): Promise<void> {
    await this.client.delete(`/schedules/${id}`);
  }

  // Service Records
  async getServiceRecords(params?: {
    technicianId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<ServiceRecord>> {
    const response = await this.client.get<PaginatedResponse<ServiceRecord>>('/service-records', { params });
    return response.data;
  }

  async getServiceRecord(id: string): Promise<ServiceRecord> {
    const response = await this.client.get<ServiceRecord>(`/service-records/${id}`);
    return response.data;
  }

  async createServiceRecord(data: {
    technicianId: string;
    callId?: string;
    customerName: string;
    customerPhone: string;
    customerAddress?: string;
    applianceType: string;
    issueDescription: string;
    scheduledDate?: string;
    notes?: string;
  }): Promise<ServiceRecord> {
    const response = await this.client.post<ServiceRecord>('/service-records', data);
    return response.data;
  }

  async updateServiceRecord(id: string, data: Partial<ServiceRecord>): Promise<ServiceRecord> {
    const response = await this.client.patch<ServiceRecord>(`/service-records/${id}`, data);
    return response.data;
  }

  async completeServiceRecord(id: string, data: {
    diagnosis?: string;
    resolution?: string;
    partsUsed?: string;
    laborHours?: number;
    notes?: string;
  }): Promise<ServiceRecord> {
    const response = await this.client.patch<ServiceRecord>(`/service-records/${id}/complete`, data);
    return response.data;
  }

  async cancelServiceRecord(id: string): Promise<ServiceRecord> {
    const response = await this.client.patch<ServiceRecord>(`/service-records/${id}/cancel`);
    return response.data;
  }

  async getServiceRecordStats(technicianId?: string, startDate?: string, endDate?: string) {
    const params = { technicianId, startDate, endDate };
    const response = await this.client.get('/service-records/stats', { params });
    return response.data;
  }

  // Admin
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await this.client.get<DashboardStats>('/admin/dashboard');
    return response.data;
  }

  async getAuditLogs(params?: {
    userId?: string;
    action?: string;
    entityType?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<AuditLog>> {
    const response = await this.client.get<PaginatedResponse<AuditLog>>('/admin/audit-logs', { params });
    return response.data;
  }

  async triggerQuotaReset(): Promise<{ success: boolean; message: string }> {
    const response = await this.client.post('/admin/quota/reset');
    return response.data;
  }

  async getSystemConfig() {
    const response = await this.client.get('/admin/config');
    return response.data;
  }

  async updateSystemConfig(key: string, value: string) {
    const response = await this.client.post('/admin/config', { key, value });
    return response.data;
  }

  async getPerformanceReport(startDate: string, endDate: string) {
    const params = { startDate, endDate };
    const response = await this.client.get('/admin/reports/performance', { params });
    return response.data;
  }
}

export const api = new ApiService();
