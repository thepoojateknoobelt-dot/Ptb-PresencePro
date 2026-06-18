import axios from 'axios';
import { Employee, Department, Shift, Holiday, SalaryAdvance, AdvanceEntry, AttendanceRecord } from '../types.ts';

export const hrmsService = {
  async getNextEmployeeId() {
    const res = await axios.get('/api/employees/next-id');
    return res.data.nextId;
  },

  async createEmployee(employee: Omit<Employee, 'createdAt'>) {
    const res = await axios.post('/api/employees', employee);
    return res.data;
  },

  async updateEmployee(id: string, updates: Partial<Employee>) {
    const res = await axios.put(`/api/employees/${id}`, updates);
    return res.data;
  },

  async deleteEmployee(id: string) {
    const res = await axios.delete(`/api/employees/${id}`);
    return res.data;
  },

  async getEmployees() {
    const res = await axios.get('/api/employees');
    return res.data as Employee[];
  },

  async getDashboardStats() {
    const res = await axios.get('/api/dashboard/stats');
    return res.data;
  },

  async getAttendanceForDate(dateStr: string) {
    const res = await axios.get(`/api/attendance/date/${dateStr}`);
    return res.data as AttendanceRecord[];
  },

  async getMonthlyAttendanceForEmployee(yymm: string, empId: string) {
    const res = await axios.get(`/api/attendance/monthly/${empId}?yymm=${yymm}`);
    return res.data as AttendanceRecord[];
  },

  async saveManualAttendance(record: any) {
    const res = await axios.post('/api/attendance/manual', record);
    return res.data;
  },

  async fetchOldServerDataForDay(yymm: string, dd: string) {
    const res = await axios.get(`/api/legacy/attendance/${yymm}/${dd}`);
    return res.data;
  },

  async saveOldServerImport(yymm: string, dd: string, records: any[]) {
    const res = await axios.post(`/api/legacy/import`, { yymm, dd, records });
    return res.data;
  },

  async createDepartment(dept: Department) {
    const res = await axios.post('/api/departments', dept);
    return res.data;
  },

  async updateDepartment(id: string, dept: Partial<Department>) {
    const res = await axios.put(`/api/departments/${id}`, dept);
    return res.data;
  },

  async deleteDepartment(id: string) {
    const res = await axios.delete(`/api/departments/${id}`);
    return res.data;
  },

  async getDepartments() {
    const res = await axios.get('/api/departments');
    return res.data as Department[];
  },

  async createShift(shift: Shift) {
    const res = await axios.post('/api/shifts', shift);
    return res.data;
  },

  async updateShift(id: string, shift: Partial<Shift>) {
    const res = await axios.put(`/api/shifts/${id}`, shift);
    return res.data;
  },

  async deleteShift(id: string) {
    const res = await axios.delete(`/api/shifts/${id}`);
    return res.data;
  },

  async getShifts() {
    const res = await axios.get('/api/shifts');
    return res.data as Shift[];
  },

  async createHoliday(holiday: Holiday) {
    const res = await axios.post('/api/holidays', holiday);
    return res.data;
  },

  async updateHoliday(originalDate: string, originalName: string, holiday: Partial<Holiday> & { newDate?: string; newName?: string }) {
    const res = await axios.put(`/api/holidays/${originalDate}/${originalName}`, holiday);
    return res.data;
  },

  async deleteHoliday(date: string, name: string) {
    const res = await axios.delete(`/api/holidays/${date}/${name}`);
    return res.data;
  },

  async getHolidays() {
    const res = await axios.get('/api/holidays');
    return res.data as Holiday[];
  },

  async addAdvance(empId: string, amount: number, remark: string, adminEmail: string, yymm: string) {
    const res = await axios.post('/api/salary-advances', { empId, amount, remark, adminEmail, yymm });
    return res.data;
  },

  async getAdvance(empId: string, yymm: string) {
    const res = await axios.get(`/api/salary-advances/${empId}?yymm=${yymm}`);
    return res.data;
  },

  async saveBulkPayrollResults(yymm: string, report: any) {
    const res = await axios.post(`/api/payroll/bulk/${yymm}`, report);
    return res.data;
  },

  async saveIndividualPayrollRecord(yymm: string, empId: string, data: any) {
    const res = await axios.post(`/api/payroll/individual/${yymm}/${empId}`, data);
    return res.data;
  },

  async getPayrollReport(yymm: string) {
    const res = await axios.get(`/api/payroll/report/${yymm}`);
    return res.data;
  }
};