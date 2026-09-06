import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { StudentRecord } from '../../types';
import { updateSchoolData } from '../../lib/schoolRepository';

interface Props { student: StudentRecord; onClose: () => void; onSaved: (student: StudentRecord) => void; }
export const StudentEditModal: React.FC<Props> = ({ student, onClose, onSaved }) => {
  const [value, setValue] = useState<StudentRecord>(student);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const update = (field: keyof StudentRecord, next: string) => setValue((current) => ({ ...current, [field]: next }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!value.name.trim() || !value.studentId.trim() || !value.grade.trim() || !value.email.trim()) { setError('Name, student ID, class and email are required.'); return; }
    setSaving(true); setError(null);
    try { const saved = await updateSchoolData('students', value); onSaved(saved); onClose(); } catch { setError('Student was not saved. Check permissions or the connection.'); } finally { setSaving(false); }
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-6"><form onSubmit={submit} className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900"><div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800"><h2 className="text-lg font-bold">Edit Student Profile</h2><button type="button" onClick={onClose} className="min-h-11 min-w-11 rounded-lg p-2" aria-label="Close student editor"><X className="mx-auto h-5 w-5" /></button></div>{error && <div role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}<div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">{([['name','Full name'],['firstName','First name'],['lastName','Last name'],['middleName','Middle name'],['studentId','Student ID'],['grade','Class'],['dateOfBirth','Date of birth'],['gender','Gender'],['birthPlace','Birth place'],['citizenship','Citizenship'],['phone','Phone'],['email','Email'],['address','Address'],['region','Region'],['emergencyContact','Emergency contact'],['enrollmentDate','Enrollment date'],['previousSchool','Previous school'],['educationLanguage','Education language'],['fatherName','Father name'],['fatherPhone','Father phone'],['motherName','Mother name'],['motherPhone','Mother phone'],['guardianName','Guardian name'],['guardianPhone','Guardian phone'],['guardianRelationship','Guardian relationship']] as [keyof StudentRecord, string][]).map(([field, label]) => <label key={String(field)} className="text-xs font-semibold">{label}<input value={String(value[field] ?? '')} onChange={(event) => update(field, event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-200 px-3 dark:border-slate-700 dark:bg-slate-800" /></label>)}</div><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={onClose} className="min-h-11 rounded-lg border border-slate-200 px-4 dark:border-slate-700">Cancel</button><button disabled={saving} className="min-h-11 rounded-lg bg-indigo-600 px-4 font-semibold text-white disabled:opacity-60"><Save className="mr-2 inline h-4 w-4" />{saving ? 'Saving...' : 'Save student'}</button></div></form></div>;
};
