
export type DayType = 'FULL' | 'HALF';
export type HolidayScope = 'ALL' | 'DEPARTMENT';
export type WeekOffType = 'SUNDAY_OFF' | 'SUNDAY_WORKING' | 'SUNDAY_HALF';

export interface Shift {
  id: string; // Name of shift
  name: string;
  checkIn: string; // HH:mm
  checkOut: string; // HH:mm
  remark?: string;
}

export interface Department {
  id: string; // Name of department
  name: string;
  otBufferEnabled: boolean; // 15 min buffer
}

export interface Employee {
  id: string; // PTB001
  name: string;
  phone: string;
  department: string;
  shift: string;
  monthlySalary: number;
  weekOff: WeekOffType;
  status: 'active' | 'deleted';
  createdAt: any;
  // Biometric fields for Android App
  embedding?: number[];
  imageUrl?: string;
}

export interface CalculatedMetrics {
  status: 'PRESENT' | 'LATE' | 'HALF_DAY' | 'ABSENT' | 'WEEK_OFF' | 'HOLIDAY';
  workingMinutes: number;
  lateMinutes: number;
  otMinutes: number;
  penaltyMinutes: number;
}

export interface AttendanceRecord {
  empId: string;
  empName?: string;
  checkInLocal: string;
  checkOutLocal?: string;
  checkInServer: any;
  checkOutServer?: any;
  date: string; // YYYY-MM-DD
  status?: 'PRESENT' | 'LATE' | 'HALF_DAY' | 'ABSENT';
  metrics?: CalculatedMetrics;
}

export interface Holiday {
  date: string; // YYYY-MM-DD
  name: string;
  dayType: DayType;
  appliesTo: HolidayScope;
  departments: string[];
  createdBy: string;
}

export interface AdvanceEntry {
  id: string;
  amount: number;
  remark: string;
  addedBy: string;
  createdAt: any;
}

export interface SalaryAdvance {
  totalAdvance: number;
  entries: Record<string, AdvanceEntry>;
}

export interface User {
  email: string;
  role: 'ADMIN' | 'ACCOUNTANT';
}

export interface Quote {
  text: string;
  author: string;
}
