/**
 * API Client Integration (api.ts)
 * 
 * Replace mock-based API calls with real REST endpoints
 * All endpoints use existing /api/data/:collection pattern
 */

// In api.ts, replace these functions:

// ============ TEACHERS API ============
export const teachersApi = {
  async create(data: any) {
    const res = await fetch(`/api/data/teachers`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAuthToken()}` },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async list(filters?: any) {
    const query = new URLSearchParams(filters || {});
    const res = await fetch(`/api/data/teachers?${query}`, {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async get(id: string) {
    const res = await fetch(`/api/data/teachers?id=${id}`, {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async update(id: string, data: any) {
    const res = await fetch(`/api/data/teachers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAuthToken()}` },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async delete(id: string) {
    const res = await fetch(`/api/data/teachers/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
};

// ============ STUDENTS API ============
export const studentsApi = {
  async create(data: any) {
    const res = await fetch(`/api/data/students`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAuthToken()}` },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async list(filters?: any) {
    const query = new URLSearchParams(filters || {});
    const res = await fetch(`/api/data/students?${query}`, {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async update(id: string, data: any) {
    const res = await fetch(`/api/data/students/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAuthToken()}` },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async delete(id: string) {
    const res = await fetch(`/api/data/students/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async bulkImport(records: any[]) {
    const res = await fetch(`/api/data/students/bulk-import`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAuthToken()}` },
      body: JSON.stringify({ students: records }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
};

// ============ CLASSES API ============
export const classesApi = {
  async create(data: any) {
    const res = await fetch(`/api/data/classes`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAuthToken()}` },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async list(filters?: any) {
    const query = new URLSearchParams(filters || {});
    const res = await fetch(`/api/data/classes?${query}`, {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async update(id: string, data: any) {
    const res = await fetch(`/api/data/classes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAuthToken()}` },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async delete(id: string) {
    const res = await fetch(`/api/data/classes/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
};

// ============ GRADES API ============
export const gradesApi = {
  async create(data: any) {
    const res = await fetch(`/api/data/grades`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAuthToken()}` },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async list(filters?: any) {
    const query = new URLSearchParams(filters || {});
    const res = await fetch(`/api/data/grades?${query}`, {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async update(id: string, data: any) {
    const res = await fetch(`/api/data/grades/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAuthToken()}` },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async delete(id: string) {
    const res = await fetch(`/api/data/grades/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
};

// ============ ATTENDANCE API ============
export const attendanceApi = {
  async mark(data: any) {
    const res = await fetch(`/api/data/attendance`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAuthToken()}` },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async list(filters?: any) {
    const query = new URLSearchParams(filters || {});
    const res = await fetch(`/api/data/attendance?${query}`, {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async correct(id: string, status: string, notes?: string) {
    const res = await fetch(`/api/data/attendance/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAuthToken()}` },
      body: JSON.stringify({ status, notes }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async archive(id: string) {
    const res = await fetch(`/api/data/attendance/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
};

// Helper function
function getAuthToken() {
  // Get from localStorage/session storage
  return localStorage.getItem("authToken") || "";
}
