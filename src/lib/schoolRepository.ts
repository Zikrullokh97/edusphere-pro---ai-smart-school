import { authenticatedFetch } from './api';

export async function listSchoolData<T>(collection: string): Promise<T[]> {
  const response = await authenticatedFetch(`/api/data/${encodeURIComponent(collection)}`);
  if (!response.ok) throw new Error(`Unable to load ${collection}`);
  const data = await response.json() as { items?: T[] };
  return data.items || [];
}

export async function createSchoolData<T extends { id: string }>(collection: string, value: T): Promise<T> {
  const response = await authenticatedFetch(`/api/data/${encodeURIComponent(collection)}`, {
    method: 'POST',
    body: JSON.stringify(value),
  });
  if (!response.ok) throw new Error(`Unable to create ${collection}`);
  const data = await response.json() as { item: T };
  return data.item;
}

export async function updateSchoolData<T extends { id: string; version?: number }>(collection: string, value: T): Promise<T> {
  const response = await authenticatedFetch(`/api/data/${encodeURIComponent(collection)}/${encodeURIComponent(value.id)}`, {
    method: 'PATCH',
    body: JSON.stringify(value),
  });
  if (response.status === 409) throw new Error('CONFLICT');
  if (!response.ok) throw new Error(`Unable to update ${collection}`);
  const data = await response.json() as { item: T };
  return data.item;
}

export async function archiveSchoolData(collection: string, id: string): Promise<void> {
  const response = await authenticatedFetch(`/api/data/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(`Unable to archive ${collection}`);
}

export async function updateTeacherWorkload(teacherId: string, payload: Record<string, any>): Promise<any> {
  const response = await authenticatedFetch(`/api/admin/teachers/${encodeURIComponent(teacherId)}/workload`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Unable to update teacher workload');
  const data = await response.json() as { success: boolean; teacher: any };
  return data.teacher;
}

export async function assignTeacherToSubject(subjectId: string, teacherId: string): Promise<{ success: boolean; subject: any; teacher: any }> {
  const response = await authenticatedFetch(`/api/admin/subjects/${encodeURIComponent(subjectId)}/assign-teacher`, {
    method: 'POST',
    body: JSON.stringify({ teacherId }),
  });
  if (!response.ok) throw new Error('Unable to assign teacher to subject');
  return response.json();
}

export async function removeTeacherFromSubject(subjectId: string, teacherId: string): Promise<{ success: boolean }> {
  const response = await authenticatedFetch(`/api/admin/subjects/${encodeURIComponent(subjectId)}/remove-teacher/${encodeURIComponent(teacherId)}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Unable to remove teacher from subject');
  return response.json();
}

export async function setHomeroomTeacher(classId: string, teacherId: string): Promise<{ success: boolean; class: any; teacher?: any }> {
  const response = await authenticatedFetch(`/api/admin/classes/${encodeURIComponent(classId)}/homeroom-teacher`, {
    method: 'PUT',
    body: JSON.stringify({ teacherId }),
  });
  if (!response.ok) throw new Error('Unable to set homeroom teacher');
  return response.json();
}