# Backend LMS API additions

The server runs additive, idempotent schema migrations before create-only
`sequelize.sync()`. To apply the migration separately during deployment, run
`npm run migrate` from this directory. It adds optional legacy-table columns
and records the applied migration in `SchemaMigrations`; it does not drop or
alter existing data. Do not use `sync({ alter: true })`.

Database connections use a configurable per-process pool (`DB_POOL_MAX`,
`DB_POOL_MIN`, `DB_POOL_ACQUIRE`, and `DB_POOL_IDLE`). Set `DB_POOL_MAX` based
on the database's available connection limit and the number of backend
instances; the total possible connections are approximately the pool maximum
multiplied by the number of instances. Assessment starts lock the enrolling
student's course enrollment while checking and creating attempts, preventing
simultaneous starts from exceeding the configured attempt limit without
serializing starts by every other student.

All routes below require a bearer token unless otherwise stated. The platform
has two roles: `student` and `lecturer`. Lecturers manage only courses they
own; students must be enrolled to read or submit course work. The
`20261004_03_lecturer_student_roles` migration converts legacy admin accounts
to lecturers, revokes their prior tokens, and restricts the database role enum
to those two roles.

| Area | Endpoints |
|---|---|
| Modules/progress | `GET/POST /api/courses/:courseId/modules`, `PATCH/DELETE /api/modules/:id`, `PATCH /api/lessons/:id/order`, `POST /api/lessons/:lessonId/progress`, `GET /api/courses/:courseId/progress` |
| Announcements | `GET/POST /api/courses/:courseId/announcements`, `PATCH/DELETE /api/announcements/:id` |
| Messages | `GET /api/courses/:courseId/conversations`, `GET /api/courses/:courseId/conversations/:userId`, `POST /api/courses/:courseId/messages` with `{ "recipientId": 7, "body": "..." }` |
| Notifications | `GET /api/notifications`, `PATCH /api/notifications/:id/read`, `PATCH /api/notifications/read-all` |
| Timed assessments | `POST /api/quizzes/assessments` with course/title/time limit/questions and optional `maxAttempts` (1-10, default 1), `GET /api/quizzes/assessments/course/:courseId`, `GET /api/quizzes/assessments/:id`, `POST /api/quizzes/assessments/:id/attempts`, `PUT /api/quizzes/attempts/:attemptId/answers` with `{ "answers": { "questionId": "A" } }`, `POST /api/quizzes/attempts/:attemptId/submit`; students can retrieve their current/latest attempt at `GET /api/quizzes/assessments/:id/attempt`, and course managers can review attempts at `GET /api/quizzes/assessments/:id/attempts`. Legacy quiz endpoints remain unchanged. Correct answers are withheld until an attempt is submitted.
| Calendar/departments | Authenticated `GET /api/calendar?from=<ISO>&to=<ISO>` aggregates course events and assignment due dates for the current user's courses. Lecturers can manage typed `event`, `class`, `exam`, `deadline`, or `other` events through `GET/POST /api/courses/:courseId/calendar` and `PATCH/DELETE /api/calendar/:id`. Authenticated `GET /api/departments`; course lecturers can associate a department using `PATCH /api/courses/:id/department`. |
| Gradebook/certificates | Manager-only `GET /api/courses/:courseId/gradebook` and `/analytics`; student `GET /api/assignments/my/submissions`, `GET /api/certificates`, `POST /api/courses/:courseId/certificate` |

Certificates are issued once per student/course when at least one lesson exists
and all course lessons are marked complete. Assignment grading accepts optional
`feedback`. Assignment, announcement, message, grading, assessment, and
calendar creation writes recipient-scoped notifications in the same database
transaction. Changing a password revokes prior JWTs; old tokens without a
token-version claim remain valid only while the account version is zero.
