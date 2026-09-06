# Firebase Security Rules Specification

## 1. Data Invariants
- `users`: Each user document `/users/{userId}` is strictly owned by `userId == request.auth.uid`. Admins can read user profiles.
- `attendance`: Attendance documents `/attendance/{recordId}` can be read by authenticated users. Teachers and Admins can create and update attendance records.
- `grades`: Grades `/grades/{gradeId}` can be read by authenticated users. Teachers and Admins can create and update student grade entries.
- `workspace_exports`: User-specific export logs `/workspace_exports/{exportId}` can only be read and created by the authenticated owner `resource.data.userId == request.auth.uid`.

## 2. The Dirty Dozen Payloads
1. Anonymous user attempting to read `/users/{userId}` -> PERMISSION_DENIED
2. Authenticated user attempting to overwrite another user's profile -> PERMISSION_DENIED
3. Unauthenticated user writing fake attendance entries -> PERMISSION_DENIED
4. Non-admin attempting to inject unverified admin privileges -> PERMISSION_DENIED
5. Attacker sending oversized string (>128 chars for ID, >2000 chars for notes) -> PERMISSION_DENIED
6. Attacker creating export log for another user's UID -> PERMISSION_DENIED
7. Unverified email user performing privileged mutation -> PERMISSION_DENIED
8. Client altering immutable `createdAt` timestamp -> PERMISSION_DENIED
9. Client injecting arbitrary unexpected schema keys -> PERMISSION_DENIED
10. Attacker listing workspace exports without ownership filter -> PERMISSION_DENIED
11. Attacker deleting master attendance logs without admin/teacher permissions -> PERMISSION_DENIED
12. Malicious document ID containing invalid characters -> PERMISSION_DENIED
