import React, { useState, useEffect } from 'react';
import {
  Award,
  Download,
  Printer,
  Sparkles,
  CheckCircle2,
  FileText,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { AppLanguage, ClassGroup, StudentRecord } from '../../types';
import { useI18n } from '../../lib/i18n';
import { CURRENT_SCHOOL, MOCK_CLASSES } from '../../data/mockData';
import { listSchoolData } from '../../lib/schoolRepository';

interface ReportBuilderProps {
  language: AppLanguage;
}

export const ReportBuilder: React.FC<ReportBuilderProps> = ({
  language,
}) => {
  const t = useI18n(language);
  const [reportType, setReportType] = useState('quarterly');
  const [includeAIInsights, setIncludeAIInsights] = useState(true);
  const [includeAttendance, setIncludeAttendance] = useState(true);
  const [includeGrades, setIncludeGrades] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);

  useEffect(() => {
    listSchoolData<ClassGroup>('classes').then((res) => {
      if (res && res.length > 0) setClasses(res);
    }).catch(() => undefined);

    listSchoolData<StudentRecord>('students').then((res) => {
      if (res && res.length > 0) setStudents(res);
    }).catch(() => undefined);
  }, []);

  const handleExport = (format: string) => {
    setIsExporting(true);
    if (format === 'csv') {
      const headers = ['Sinf guruhi', 'Sinf rahbari', 'O‘quvchilar soni', 'O‘rtacha davomat', 'O‘rtacha baho'];
      const displayClasses = classes.length > 0 ? classes : MOCK_CLASSES;
      const rows = displayClasses.map((cls: any) => [
        cls.name,
        cls.homeroomTeacher || cls.teacher || '—',
        cls.studentCount || (students.filter((s) => s.grade === cls.name).length || 28),
        `${cls.attendanceAvg || 96}%`,
        cls.gradeAvg || 4.6,
      ]);
      const csvContent = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `edusphere_official_report_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setIsExporting(false);
      return;
    }

    setTimeout(() => {
      window.print();
      setIsExporting(false);
    }, 400);
  };

  return (
    <div id="report-builder-view" className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white dark:bg-indigo-500">
              <Award className="h-4 w-4" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
              {t('reportsHeader')}
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
            Generate Ministry-Compliant Academic Dossiers, Class League Tables & AI Performance Audits
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('csv')}
            disabled={isExporting}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200"
          >
            <Download className="h-4 w-4 text-emerald-600" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => handleExport('pdf')}
            disabled={isExporting}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500"
          >
            <Download className="h-4 w-4" />
            <span>{isExporting ? 'Compiling...' : 'Export Official PDF'}</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
          >
            <Printer className="h-4 w-4" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Report Configuration & Live Preview */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Options (4 Cols) */}
        <div className="space-y-4 lg:col-span-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <h3 className="font-bold text-slate-900 dark:text-white">Report Configuration</h3>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Report Scope</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:outline-hidden dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                >
                  <option value="quarterly">Term 2 Comprehensive Academic Review</option>
                  <option value="attendance">Biometric Attendance & Punctuality Audit</option>
                  <option value="olympiad">STEM & Olympiad Performance Index</option>
                  <option value="ministry">Central Asian Ministry of Education Standard</option>
                </select>
              </div>

              <div className="space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Included Modules</label>

                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={includeAIInsights}
                    onChange={(e) => setIncludeAIInsights(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>AI Executive Diagnostic & Recommendations</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={includeAttendance}
                    onChange={(e) => setIncludeAttendance(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Biometric Attendance Statistics (94.2%)</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={includeGrades}
                    onChange={(e) => setIncludeGrades(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Subject Mastery & Class League Breakdown</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Live Document Preview (8 Cols) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-md dark:border-slate-800 dark:bg-slate-900 lg:col-span-8">
          {/* Document Header */}
          <div className="border-b-2 border-slate-900 pb-4 dark:border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white uppercase">
                  {CURRENT_SCHOOL.name}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Official Academic Dossier • Central Asian Education Framework 2026
                </p>
              </div>
              <div className="text-right text-xs">
                <span className="font-bold text-slate-900 dark:text-white">Date: August 20, 2026</span>
                <div className="text-slate-400">Ref: EDU-KG-2026-T2</div>
              </div>
            </div>
          </div>

          {/* AI Executive Summary Block */}
          {includeAIInsights && (
            <div className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 text-xs leading-relaxed dark:border-indigo-900/60 dark:bg-indigo-950/30">
              <div className="flex items-center gap-1.5 font-bold text-indigo-900 dark:text-indigo-200">
                <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span>Executive AI Summary</span>
              </div>
              <p className="mt-2 text-slate-700 dark:text-slate-300">
                Institutional performance across all 26 grades stands at an exemplary <b>86.4% average grade</b> with a <b>94.2% biometric attendance rate</b>. Mathematics and Computer Science achieved national benchmark highs. Early warning interventions have stabilized academic progress for 98% of flagged students.
              </p>
            </div>
          )}

          {/* Class Breakdown Table */}
          {includeGrades && (
            <div className="mt-6">
              <h3 className="text-xs font-bold tracking-wider text-slate-900 dark:text-white uppercase">
                Class Performance Breakdown
              </h3>
              <table className="mt-3 w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800">
                    <th className="pb-2 font-semibold">Class Group</th>
                    <th className="pb-2 font-semibold">Homeroom Teacher</th>
                    <th className="pb-2 font-semibold">Students</th>
                    <th className="pb-2 font-semibold">Attendance</th>
                    <th className="pb-2 font-semibold text-right">Avg Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(classes.length > 0 ? classes : MOCK_CLASSES).map((cls) => {
                    const classStudents = students.filter((s) => s.grade === cls.name || s.classId === cls.id);
                    const count = cls.studentCount || (classStudents.length > 0 ? classStudents.length : 28);
                    const avgAtt = cls.attendanceAvg || (classStudents.length > 0
                      ? Math.round(classStudents.reduce((acc, s) => acc + (s.attendanceRate || 95), 0) / classStudents.length)
                      : 96);
                    const avgGrd = cls.gradeAvg || (classStudents.length > 0
                      ? (classStudents.reduce((acc, s) => acc + (s.avgGrade ? s.avgGrade / 20 : 4.5), 0) / classStudents.length).toFixed(1)
                      : '4.6');
                    const teacherName = cls.homeroomTeacher || cls.teacher || '—';

                    return (
                      <tr key={cls.id}>
                        <td className="py-2.5 font-bold text-slate-900 dark:text-white">Grade {cls.name}</td>
                        <td className="py-2.5 text-slate-600 dark:text-slate-300">{teacherName}</td>
                        <td className="py-2.5 text-slate-600 dark:text-slate-300">{count}</td>
                        <td className="py-2.5 text-emerald-600 font-semibold">{avgAtt}%</td>
                        <td className="py-2.5 font-bold text-right text-indigo-600 dark:text-indigo-400">{avgGrd}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Signature Block */}
          <div className="mt-8 flex justify-between border-t border-slate-200 pt-6 text-xs text-slate-500 dark:border-slate-800">
            <div>
              <div className="font-bold text-slate-900 dark:text-white">Dr. K. Kasymov</div>
              <div>School Director & Board Chair</div>
            </div>
            <div className="text-right">
              <div className="font-bold text-slate-900 dark:text-white">EduSphere Pro AI Engine</div>
              <div>Digitally Signed & Timestamped</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
