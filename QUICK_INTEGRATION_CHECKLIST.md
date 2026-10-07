# Quick Integration Checklist

## ✅ Phase 1: Completed (Repository Layer)
- [x] TeacherGradesRepository, ParentGradesRepository, AdminGradesRepository
- [x] AttendanceRepository, ParentAttendanceRepository, AdminAttendanceRepository
- [x] AdminTeachersRepository, AdminStudentsRepository, AdminClassesRepository
- [x] All with Firestore CRUD, transactions, audit logs
- [x] Security validation (schoolId, relationships, role-based)
- [x] Type-check PASS, Build PASS

## ⏳ Phase 2: API Integration (server.ts)
- [ ] Import production repos (1 line)
- [ ] Update POST /api/data/:collection handler
  - [ ] TEACHERS → AdminTeachersRepository.createTeacher()
  - [ ] STUDENTS → AdminStudentsRepository.createStudent()
  - [ ] CLASSES → AdminClassesRepository.createClass()
  - [ ] GRADES → TeacherGradesRepository.createGrade()
  - [ ] ATTENDANCE → AttendanceRepository.markAttendance()
- [ ] Update GET /api/data/:collection handler
  - [ ] Add role-based filtering for each collection
  - [ ] Preserve existing mock fallback for other collections
- [ ] Update PATCH /api/data/:collection/:id handler
  - [ ] Route to appropriate repository.update*()
- [ ] Update DELETE /api/data/:collection/:id handler
  - [ ] Route to appropriate repository.archive*()
- [ ] Test locally: `npm run dev`

**Estimated Time:** 4-6 hours
**Copy-Paste Ready:** Yes (see SERVER_INTEGRATION_GUIDE.md)

## ⏳ Phase 3: Client Integration (api.ts)
- [ ] Create teachersApi.{create, list, get, update, delete}
- [ ] Create studentsApi.{create, list, get, update, delete, bulkImport}
- [ ] Create classesApi.{create, list, get, update, delete}
- [ ] Create gradesApi.{create, list, update, delete}
- [ ] Create attendanceApi.{mark, list, correct, archive}
- [ ] Replace all mock API calls in UI components
- [ ] Test locally: `npm run dev` + browser manual testing

**Estimated Time:** 2-3 hours
**Copy-Paste Ready:** Yes (see API_CLIENT_INTEGRATION.md)

## ⏳ Phase 4: Firestore Setup
- [ ] Apply security rules to Firestore Console
- [ ] Create composite indexes:
  - (schoolId, status, createdAt)
  - (schoolId, studentId, date)
  - (schoolId, teacherId, className)
  - (className, date, status)
- [ ] Enable audit logging
- [ ] Test Firestore access: verify rules block cross-school access

**Estimated Time:** 1 hour

## ⏳ Phase 5: Testing & Verification
- [ ] Run existing tests: `npm test` → all PASS
- [ ] Run regression tests: `npm run test:integration`
- [ ] Build verification: `npm run build` → no errors
- [ ] Browser manual testing:
  - [ ] Admin: create/update/delete teacher
  - [ ] Admin: create/update/delete student
  - [ ] Admin: create/update/delete class
  - [ ] Teacher: create grade, mark attendance
  - [ ] Parent: view own child's grades and attendance
  - [ ] Reload page: verify data persists in Firestore
  - [ ] Cross-school access: verify 403 error
  - [ ] Duplicate prevention: verify 409 error

**Estimated Time:** 2-3 hours

## 🎯 Success Criteria
- ✅ All 25 regression tests PASS
- ✅ No TypeScript errors: `npx tsc --noEmit` PASS
- ✅ Build succeeds: `npm run build` PASS
- ✅ All API endpoints return real Firestore data
- ✅ RBAC enforced: cross-role/cross-school access denied
- ✅ Audit logs created for all mutations
- ✅ Soft deletes work: archived records remain in DB
- ✅ No data loss: reload page shows same data

## 🚀 Rollout Strategy

**Day 1:** Deploy Phase 2-4 to staging
- Run full test suite
- Manual E2E testing
- Monitor error logs

**Day 2:** Deploy to production (blue-green)
- Keep mock API alive as fallback
- Monitor Firestore performance
- Check error rates

**Day 3:** Monitor production
- Verify audit logs
- Check database consistency
- Collect user feedback

**Day 7:** Disable mock API (optional)
- All traffic on real API
- Archive mock functions

---

**Total Integration Time:** 10–15 hours
**Risk Level:** Low (tests cover all scenarios)
**Rollback Plan:** Keep mock API active for 7 days

