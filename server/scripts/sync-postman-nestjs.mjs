/**
 * Sync missing NestJS API requests into Postman collection "CodeFarm" / folder "Nestjs".
 *
 * Usage:
 *   POSTMAN_API_KEY=PMAK-xxx node scripts/sync-postman-nestjs.mjs
 *   node scripts/sync-postman-nestjs.mjs --export-json
 *
 * Get API key: Postman → Settings → API keys → Generate.
 */

import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverRoot = join(__dirname, '..');

dotenv.config({ path: join(serverRoot, '.env.development') });
dotenv.config({ path: join(serverRoot, '.env') });

const EXPORT_JSON = process.argv.includes('--export-json');

const COLLECTION_UID = '38124304-2b371c04-53a1-473e-a7eb-94624c9dd851';
const API_BASE = 'https://api.getpostman.com';

const apiKey = process.env.POSTMAN_API_KEY?.trim();
if (!EXPORT_JSON && !apiKey) {
  console.error(
    'Missing POSTMAN_API_KEY.\n' +
      '1. Postman → avatar → Settings → API keys → Generate API Key\n' +
      '2. Thêm vào server/.env.development:\n' +
      '     POSTMAN_API_KEY=PMAK-xxxxxxxx\n' +
      '3. Chạy lại: pnpm postman:sync\n' +
      '\nHoặc import thủ công (không cần API key):\n' +
      '  pnpm postman:export',
  );
  process.exitCode = 1;
} else if (!EXPORT_JSON && (!/^PMAK-/i.test(apiKey) || apiKey.length < 24)) {
  console.error(
    'POSTMAN_API_KEY không đúng định dạng (phải bắt đầu bằng PMAk-...).\n' +
      'Kiểm tra key đầy đủ, không có khoảng trắng hoặc placeholder (XXXX).',
  );
  process.exitCode = 1;
}

function authHeaders() {
  return { 'X-Api-Key': apiKey };
}

function formatPostmanAuthError(status, bodyText) {
  if (status !== 401) {
    return `Request failed (${status}): ${bodyText}`;
  }

  return (
    'Postman API key không hợp lệ (401).\n' +
    'Kiểm tra:\n' +
    '  • Key copy đầy đủ từ Postman (Settings → API keys)\n' +
    '  • Key chưa bị revoke / hết hạn\n' +
    '  • Tài khoản Postman có quyền sửa collection CodeFarm\n' +
    '  • Không dùng placeholder XXXX — phải là key thật\n' +
    '\nTạm thời import file JSON:\n' +
    '  pnpm postman:export\n' +
    '  → docs/postman/nestjs-missing-requests.json\n' +
    `\nChi tiết: ${bodyText}`
  );
}

function apiUrl(segments) {
  const path = segments.join('/');
  return {
    raw: `{{API_BASE_URL}}/api/v1/${path}`,
    host: ['{{API_BASE_URL}}'],
    path: ['api', 'v1', ...segments],
  };
}

function urlField(key, value = '') {
  return { key, value, type: 'text', uuid: randomUUID() };
}

function makeJsonRequest(name, method, pathSegments, bodyObject) {
  return {
    name,
    id: randomUUID(),
    protocolProfileBehavior: { disableBodyPruning: true },
    request: {
      method,
      header: [{ key: 'Content-Type', value: 'application/json' }],
      body: {
        mode: 'raw',
        raw: JSON.stringify(bodyObject, null, 2),
      },
      url: apiUrl(pathSegments),
    },
    response: [],
  };
}

function makeRequest(name, method, pathSegments, { bodyFields } = {}) {
  const request = {
    method,
    header: [],
    url: apiUrl(pathSegments),
  };

  if (bodyFields?.length) {
    request.body = {
      mode: 'urlencoded',
      urlencoded: bodyFields.map(({ key, value }) => urlField(key, value)),
    };
  }

  return {
    name,
    id: randomUUID(),
    protocolProfileBehavior: { disableBodyPruning: true },
    request,
    response: [],
  };
}

function makeFolder(name, items) {
  return {
    name,
    id: randomUUID(),
    item: items,
  };
}

function findFolder(items, name) {
  return items?.find((entry) => entry.item && entry.name === name);
}

function requestKey(item) {
  const method = item.request?.method ?? '';
  const raw = item.request?.url?.raw ?? '';
  return `${method} ${raw}`;
}

function mergeRequests(existingItems, newRequests) {
  const existingKeys = new Set(
    (existingItems ?? [])
      .filter((item) => item.request)
      .map((item) => requestKey(item)),
  );

  const added = [];
  for (const req of newRequests) {
    const key = requestKey(req);
    if (!existingKeys.has(key)) {
      existingItems.push(req);
      existingKeys.add(key);
      added.push(req.name);
    }
  }
  return added;
}

function ensureFolder(nestjsRoot, folderName, newRequests) {
  let folder = findFolder(nestjsRoot.item, folderName);
  if (!folder) {
    folder = makeFolder(folderName, newRequests);
    nestjsRoot.item.push(folder);
    return newRequests.map((r) => r.name);
  }
  return mergeRequests(folder.item, newRequests);
}

const ATTENDANCE_SESSION_REQUESTS = [
  makeRequest('all attendance sessions', 'GET', ['attendance-sessions']),
  makeRequest('specific attendance session', 'GET', [
    'attendance-sessions',
    ':id',
  ]),
  makeRequest('new attendance session', 'POST', ['attendance-sessions'], {
    bodyFields: [
      { key: 'courseSectionId', value: '' },
      { key: 'teacherId', value: '' },
      { key: 'sessionDate', value: '2025-09-01' },
      { key: 'periodNumber', value: '1' },
      { key: 'timetableEntryId', value: '' },
      { key: 'note', value: 'Tiết 1 sáng' },
    ],
  }),
  makeRequest(
    'update attendance session',
    'PATCH',
    ['attendance-sessions', ':id'],
    {
      bodyFields: [
        { key: 'status', value: 'CLOSED' },
        { key: 'note', value: 'Đã hoàn tất điểm danh' },
      ],
    },
  ),
  {
    name: 'bulk upsert attendance records',
    id: randomUUID(),
    protocolProfileBehavior: { disableBodyPruning: true },
    request: {
      method: 'PUT',
      header: [{ key: 'Content-Type', value: 'application/json' }],
      body: {
        mode: 'raw',
        raw: JSON.stringify(
          {
            initMissingStudents: true,
            records: [
              { studentId: '', status: 'PRESENT' },
              { studentId: '', status: 'ABSENT', note: 'Không phép' },
            ],
          },
          null,
          2,
        ),
      },
      url: apiUrl(['attendance-sessions', ':id', 'records']),
    },
    response: [],
  },
];

const ATTENDANCE_RECORD_REQUESTS = [
  makeRequest(
    'update attendance record',
    'PATCH',
    ['attendance-records', ':id'],
    {
      bodyFields: [
        { key: 'status', value: 'ABSENT' },
        { key: 'note', value: 'Vắng không phép' },
      ],
    },
  ),
];

const ASSESSMENT_REQUESTS = [
  makeRequest('all assessments', 'GET', ['assessments']),
  makeRequest('specific assessment', 'GET', ['assessments', ':id']),
];

const PORTAL_GRADEBOOK_REQUESTS = [
  makeJsonRequest(
    'create portal assessment',
    'POST',
    ['portal', 'assessments'],
    {
      courseSectionId: '',
      type: 'REGULAR',
      name: 'KT 15 phút lần 1',
      assessmentDate: '2025-09-15',
      note: 'Chương 1',
    },
  ),
  makeRequest('get portal assessment', 'GET', ['portal', 'assessments', ':id']),
  makeRequest('initialize portal assessment scores', 'POST', [
    'portal',
    'assessments',
    ':id',
    'scores',
    'initialize',
  ]),
  makeJsonRequest(
    'bulk upsert portal assessment scores',
    'PUT',
    ['portal', 'assessments', ':id', 'scores'],
    {
      scores: [
        { studentId: '', score: 8.5 },
        { studentId: '', score: 7, note: 'Làm bài chậm' },
      ],
    },
  ),
  makeJsonRequest(
    'close portal assessment',
    'PATCH',
    ['portal', 'assessments', ':id'],
    {
      status: 'CLOSED',
      note: 'Đã khóa điểm',
    },
  ),
  makeRequest('my scores grid', 'GET', ['portal', 'my-scores', 'grid']),
  makeRequest('my child scores', 'GET', [
    'portal',
    'my-children',
    ':studentId',
    'scores',
  ]),
];

const NEW_FOLDERS = {
  health: [makeRequest('health check', 'GET', ['health'])],

  files: [
    {
      name: 'upload file',
      id: randomUUID(),
      protocolProfileBehavior: { disableBodyPruning: true },
      request: {
        method: 'POST',
        header: [],
        body: {
          mode: 'formdata',
          formdata: [
            { key: 'purpose', value: 'STUDENT_AVATAR', type: 'text' },
            { key: 'file', type: 'file', src: [] },
          ],
        },
        url: apiUrl(['files', 'upload']),
      },
      response: [],
    },
    makeRequest('file metadata', 'GET', ['files', ':id']),
    makeRequest('file signed url', 'GET', ['files', ':id', 'url']),
    makeRequest('delete file', 'DELETE', ['files', ':id']),
  ],

  parents: [
    makeRequest('all parents', 'GET', ['parents']),
    makeRequest('specific parent', 'GET', ['parents', ':id']),
    makeRequest('new parent profile', 'POST', ['parents'], {
      bodyFields: [
        { key: 'fullName', value: 'Nguyễn Văn Phụ Huynh' },
        { key: 'phone', value: '0901234567' },
      ],
    }),
    makeRequest('update parent profile', 'PATCH', ['parents', ':id'], {
      bodyFields: [
        { key: 'fullName', value: 'Nguyễn Văn Phụ Huynh (cập nhật)' },
      ],
    }),
    makeRequest('update parent status', 'PATCH', ['parents', ':id', 'status'], {
      bodyFields: [{ key: 'status', value: 'ACTIVE' }],
    }),
    makeRequest(
      'link parent to user account',
      'POST',
      ['parents', ':id', 'link-user'],
      {
        bodyFields: [{ key: 'userId', value: '' }],
      },
    ),
    makeRequest(
      'create user for parent',
      'POST',
      ['parents', ':id', 'create-user'],
      {
        bodyFields: [
          { key: 'email', value: 'parent@demo.edu.vn' },
          { key: 'password', value: 'Demo@123456' },
        ],
      },
    ),
    makeRequest(
      'link student to parent',
      'POST',
      ['parents', ':id', 'link-student'],
      {
        bodyFields: [
          { key: 'studentId', value: '' },
          { key: 'relationship', value: 'FATHER' },
          { key: 'isPrimaryContact', value: 'true' },
        ],
      },
    ),
    makeRequest('unlink student from parent', 'DELETE', [
      'parents',
      ':id',
      'students',
      ':studentId',
    ]),
  ],

  portal: [
    makeRequest('portal me', 'GET', ['portal', 'me']),
    makeRequest('my homeroom classes', 'GET', [
      'portal',
      'my-homeroom-classes',
    ]),
    makeRequest('my homeroom class students', 'GET', [
      'portal',
      'my-homeroom-classes',
      ':id',
      'students',
    ]),
    makeRequest('my teaching assignments', 'GET', [
      'portal',
      'my-teaching-assignments',
    ]),
    makeRequest('my timetable', 'GET', ['portal', 'my-timetable'], {
      bodyFields: [],
    }),
    makeRequest('my student profile', 'GET', ['portal', 'my-student-profile']),
    makeRequest('my class timetable', 'GET', ['portal', 'my-class-timetable']),
    makeRequest('my children', 'GET', ['portal', 'my-children']),
    makeRequest('my attendance classes', 'GET', [
      'portal',
      'my-attendance-classes',
    ]),
    makeRequest(
      'create attendance session',
      'POST',
      ['portal', 'attendance-sessions'],
      {
        bodyFields: [
          { key: 'courseSectionId', value: '' },
          { key: 'sessionDate', value: '2025-09-01' },
          { key: 'periodNumber', value: '1' },
          { key: 'note', value: 'Tiết 1 sáng' },
        ],
      },
    ),
    {
      name: 'bulk upsert portal attendance records',
      id: randomUUID(),
      protocolProfileBehavior: { disableBodyPruning: true },
      request: {
        method: 'PUT',
        header: [{ key: 'Content-Type', value: 'application/json' }],
        body: {
          mode: 'raw',
          raw: JSON.stringify(
            {
              initMissingStudents: true,
              records: [
                { studentId: '', status: 'ABSENT', note: 'Không phép' },
              ],
            },
            null,
            2,
          ),
        },
        url: apiUrl(['portal', 'attendance-sessions', ':id', 'records']),
      },
      response: [],
    },
    makeRequest(
      'close attendance session',
      'PATCH',
      ['portal', 'attendance-sessions', ':id'],
      {
        bodyFields: [
          { key: 'status', value: 'CLOSED' },
          { key: 'note', value: 'Đã hoàn tất điểm danh' },
        ],
      },
    ),
    makeRequest('my attendance', 'GET', ['portal', 'my-attendance']),
    makeRequest('my child attendance', 'GET', [
      'portal',
      'my-children',
      ':studentId',
      'attendance',
    ]),
    ...PORTAL_GRADEBOOK_REQUESTS,
  ],
};

const AUTH_REQUESTS = [
  makeRequest('login', 'POST', ['auth', 'login'], {
    bodyFields: [
      { key: 'email', value: 'admin@demo.edu.vn' },
      { key: 'password', value: 'Admin@123456' },
    ],
  }),
  makeRequest('refresh', 'POST', ['auth', 'refresh']),
  makeRequest('logout', 'POST', ['auth', 'logout']),
  makeRequest('me', 'GET', ['auth', 'me']),
];

const SCHOOL_REQUESTS = [
  makeRequest('current school', 'GET', ['schools', 'current']),
  makeRequest('update current school', 'PATCH', ['schools', 'current'], {
    bodyFields: [
      { key: 'name', value: 'Trường THPT Demo' },
      { key: 'shortName', value: 'THPT Demo' },
      { key: 'schoolType', value: 'THPT' },
    ],
  }),
];

const ACADEMIC_YEAR_REQUESTS = [
  makeRequest('all academic years', 'GET', ['academic-years']),
  makeRequest('current academic year', 'GET', ['academic-years', 'current']),
  makeRequest('specific academic year', 'GET', ['academic-years', ':id']),
  makeRequest('new academic year', 'POST', ['academic-years'], {
    bodyFields: [
      { key: 'name', value: 'Năm học 2025-2026' },
      { key: 'code', value: '2025-2026' },
      { key: 'startDate', value: '2025-08-01' },
      { key: 'endDate', value: '2026-05-31' },
      { key: 'isCurrent', value: 'false' },
    ],
  }),
  makeRequest('set current academic year', 'PATCH', [
    'academic-years',
    ':id',
    'set-current',
  ]),
  makeRequest(
    'update academic year status',
    'PATCH',
    ['academic-years', ':id', 'status'],
    {
      bodyFields: [{ key: 'status', value: 'ACTIVE' }],
    },
  ),
  makeRequest('update academic year', 'PATCH', ['academic-years', ':id'], {
    bodyFields: [{ key: 'name', value: 'Năm học 2025-2026 (cập nhật)' }],
  }),
];

const SEMESTER_REQUESTS = [
  makeRequest('all semesters by year', 'GET', [
    'academic-years',
    ':yearId',
    'semesters',
  ]),
  makeRequest('current semester by year', 'GET', [
    'academic-years',
    ':yearId',
    'semesters',
    'current',
  ]),
  makeRequest('current semester (school)', 'GET', ['semesters', 'current']),
  makeRequest('specific semester', 'GET', [
    'academic-years',
    ':yearId',
    'semesters',
    ':id',
  ]),
  makeRequest(
    'new semester',
    'POST',
    ['academic-years', ':yearId', 'semesters'],
    {
      bodyFields: [
        { key: 'name', value: 'Học kỳ 1' },
        { key: 'code', value: 'HK1' },
        { key: 'startDate', value: '2025-08-05' },
        { key: 'endDate', value: '2025-12-31' },
        { key: 'isCurrent', value: 'true' },
      ],
    },
  ),
  makeRequest('set current semester', 'PATCH', [
    'academic-years',
    ':yearId',
    'semesters',
    ':id',
    'set-current',
  ]),
  makeRequest(
    'update semester status',
    'PATCH',
    ['academic-years', ':yearId', 'semesters', ':id', 'status'],
    {
      bodyFields: [{ key: 'status', value: 'ACTIVE' }],
    },
  ),
  makeRequest(
    'update semester',
    'PATCH',
    ['academic-years', ':yearId', 'semesters', ':id'],
    {
      bodyFields: [{ key: 'name', value: 'Học kỳ 1 (cập nhật)' }],
    },
  ),
];

const GRADE_LEVEL_REQUESTS = [
  makeRequest('all grade levels', 'GET', ['grade-levels']),
  makeRequest('specific grade level', 'GET', ['grade-levels', ':id']),
  makeRequest('new grade level', 'POST', ['grade-levels'], {
    bodyFields: [
      { key: 'name', value: 'Khối 10' },
      { key: 'code', value: '10' },
      { key: 'sortOrder', value: '10' },
    ],
  }),
  makeRequest('update grade level', 'PATCH', ['grade-levels', ':id'], {
    bodyFields: [{ key: 'name', value: 'Khối 10 (cập nhật)' }],
  }),
];

const SUBJECT_REQUESTS = [
  makeRequest('all subjects', 'GET', ['subjects']),
  makeRequest('specific subject', 'GET', ['subjects', ':id']),
  makeRequest('new subject', 'POST', ['subjects'], {
    bodyFields: [
      { key: 'name', value: 'Toán học' },
      { key: 'code', value: 'TOAN' },
    ],
  }),
  makeRequest('update subject status', 'PATCH', ['subjects', ':id', 'status'], {
    bodyFields: [{ key: 'status', value: 'ACTIVE' }],
  }),
  makeRequest('update subject', 'PATCH', ['subjects', ':id'], {
    bodyFields: [{ key: 'name', value: 'Toán học (cập nhật)' }],
  }),
];

const HOMEROOM_CLASS_REQUESTS = [
  makeRequest('all homeroom classes', 'GET', ['homeroom-classes']),
  makeRequest('specific homeroom class', 'GET', ['homeroom-classes', ':id']),
  makeRequest('new homeroom class', 'POST', ['homeroom-classes'], {
    bodyFields: [
      { key: 'academicYearId', value: '' },
      { key: 'gradeLevelId', value: '' },
      { key: 'name', value: '10A1' },
      { key: 'code', value: '10A1' },
    ],
  }),
  makeRequest(
    'update homeroom class status',
    'PATCH',
    ['homeroom-classes', ':id', 'status'],
    {
      bodyFields: [{ key: 'status', value: 'ACTIVE' }],
    },
  ),
  makeRequest('update homeroom class', 'PATCH', ['homeroom-classes', ':id'], {
    bodyFields: [{ key: 'name', value: '10A1 (cập nhật)' }],
  }),
];

const COURSE_SECTION_CRUD_REQUESTS = [
  makeRequest('all course sections', 'GET', ['course-sections']),
  makeRequest('specific course section', 'GET', ['course-sections', ':id']),
  makeRequest('new course section', 'POST', ['course-sections'], {
    bodyFields: [
      { key: 'semesterId', value: '' },
      { key: 'homeroomClassId', value: '' },
      { key: 'gradeLevelSubjectId', value: '' },
      { key: 'name', value: 'Toán học 10A1' },
      { key: 'code', value: 'TOAN-10A1' },
    ],
  }),
  makeRequest(
    'update course section status',
    'PATCH',
    ['course-sections', ':id', 'status'],
    {
      bodyFields: [{ key: 'status', value: 'ACTIVE' }],
    },
  ),
  makeRequest('update course section', 'PATCH', ['course-sections', ':id'], {
    bodyFields: [{ key: 'name', value: 'Toán học 10A1 (cập nhật)' }],
  }),
];

const STUDENT_REQUESTS = [
  makeRequest('all students', 'GET', ['students']),
  makeRequest('specific student', 'GET', ['students', ':id']),
  makeRequest('new student profile', 'POST', ['students'], {
    bodyFields: [
      { key: 'fullName', value: 'Nguyễn Văn A' },
      { key: 'dateOfBirth', value: '2010-01-15' },
      { key: 'gender', value: 'MALE' },
    ],
  }),
  makeRequest('update student status', 'PATCH', ['students', ':id', 'status'], {
    bodyFields: [{ key: 'status', value: 'ACTIVE' }],
  }),
  makeRequest(
    'link student to user account',
    'POST',
    ['students', ':id', 'link-user'],
    {
      bodyFields: [{ key: 'userId', value: '' }],
    },
  ),
  makeRequest('update student profile', 'PATCH', ['students', ':id'], {
    bodyFields: [{ key: 'fullName', value: 'Nguyễn Văn A (cập nhật)' }],
  }),
  makeRequest('student enrollments by student', 'GET', [
    'students',
    ':studentId',
    'enrollments',
  ]),
];

const STUDENT_ENROLLMENT_REQUESTS = [
  makeRequest('all student enrollments', 'GET', ['student-enrollments']),
  makeRequest('specific student enrollment', 'GET', [
    'student-enrollments',
    ':id',
  ]),
  makeRequest('new student enrollment', 'POST', ['student-enrollments'], {
    bodyFields: [
      { key: 'studentId', value: '' },
      { key: 'semesterId', value: '' },
      { key: 'homeroomClassId', value: '' },
      { key: 'enrolledAt', value: '2025-08-05' },
    ],
  }),
  makeRequest(
    'transfer enrollment',
    'POST',
    ['student-enrollments', ':id', 'transfer'],
    {
      bodyFields: [
        { key: 'targetHomeroomClassId', value: '' },
        { key: 'transferredAt', value: '2025-12-16' },
      ],
    },
  ),
  makeRequest(
    'withdraw enrollment',
    'PATCH',
    ['student-enrollments', ':id', 'withdraw'],
    {
      bodyFields: [
        { key: 'leftAt', value: '2025-12-31' },
        { key: 'note', value: 'Rút khỏi lớp' },
      ],
    },
  ),
];

const TEACHER_REQUESTS = [
  makeRequest('all teachers', 'GET', ['teachers']),
  makeRequest('specific teacher', 'GET', ['teachers', ':id']),
  makeRequest('new teacher profile', 'POST', ['teachers'], {
    bodyFields: [
      { key: 'fullName', value: 'Nguyễn Văn Giáo Viên' },
      { key: 'phone', value: '0901234567' },
    ],
  }),
  makeRequest('update teacher status', 'PATCH', ['teachers', ':id', 'status'], {
    bodyFields: [{ key: 'status', value: 'ACTIVE' }],
  }),
  makeRequest(
    'link teacher to user account',
    'POST',
    ['teachers', ':id', 'link-user'],
    {
      bodyFields: [{ key: 'userId', value: '' }],
    },
  ),
  makeRequest(
    'create user for teacher',
    'POST',
    ['teachers', ':id', 'create-user'],
    {
      bodyFields: [
        { key: 'email', value: 'teacher@demo.edu.vn' },
        { key: 'password', value: 'Demo@123456' },
      ],
    },
  ),
  makeRequest('update teacher profile', 'PATCH', ['teachers', ':id'], {
    bodyFields: [{ key: 'fullName', value: 'Nguyễn Văn Giáo Viên (cập nhật)' }],
  }),
  makeRequest('teaching assignments by teacher', 'GET', [
    'teachers',
    ':teacherId',
    'teaching-assignments',
  ]),
];

const TEACHING_ASSIGNMENT_REQUESTS = [
  makeRequest('all teaching assignments', 'GET', ['teaching-assignments']),
  makeRequest('specific teaching assignment', 'GET', [
    'teaching-assignments',
    ':id',
  ]),
  makeRequest('new teaching assignment', 'POST', ['teaching-assignments'], {
    bodyFields: [
      { key: 'teacherId', value: '' },
      { key: 'courseSectionId', value: '' },
      { key: 'assignAt', value: '2025-08-01' },
    ],
  }),
  makeRequest(
    'update teaching assignment status',
    'PATCH',
    ['teaching-assignments', ':id', 'status'],
    {
      bodyFields: [{ key: 'status', value: 'ACTIVE' }],
    },
  ),
];

const USER_REQUESTS = [
  makeRequest('all users', 'GET', ['users']),
  makeRequest('specific user', 'GET', ['users', ':id']),
  makeRequest('new user', 'POST', ['users'], {
    bodyFields: [
      { key: 'email', value: 'user@demo.edu.vn' },
      { key: 'password', value: 'Demo@123456' },
      { key: 'fullName', value: 'Nguyễn Văn User' },
      { key: 'role', value: 'SCHOOL_ADMIN' },
    ],
  }),
  makeRequest('update user status', 'PATCH', ['users', ':id', 'status'], {
    bodyFields: [{ key: 'status', value: 'ACTIVE' }],
  }),
  makeRequest('update user', 'PATCH', ['users', ':id'], {
    bodyFields: [{ key: 'fullName', value: 'Nguyễn Văn User (cập nhật)' }],
  }),
];

const TIMETABLE_REQUESTS = [
  makeRequest('all timetable entries', 'GET', ['timetable-entries']),
  makeRequest('specific timetable entry', 'GET', ['timetable-entries', ':id']),
  makeRequest('new timetable entry', 'POST', ['timetable-entries'], {
    bodyFields: [
      { key: 'courseSectionId', value: '' },
      { key: 'teacherId', value: '' },
      { key: 'dayOfWeek', value: '1' },
      { key: 'periodNumber', value: '1' },
      { key: 'room', value: 'A101' },
    ],
  }),
  makeRequest('update timetable entry', 'PATCH', ['timetable-entries', ':id'], {
    bodyFields: [
      { key: 'dayOfWeek', value: '2' },
      { key: 'periodNumber', value: '3' },
      { key: 'room', value: 'B202' },
    ],
  }),
  makeRequest('delete timetable entry', 'DELETE', ['timetable-entries', ':id']),
];

const COURSE_SECTION_REQUESTS = [
  makeRequest('timetable entries by course section', 'GET', [
    'course-sections',
    ':courseSectionId',
    'timetable-entries',
  ]),
];

const ALL_SYNC_FOLDERS = {
  auth: AUTH_REQUESTS,
  schools: SCHOOL_REQUESTS,
  'academic-years': ACADEMIC_YEAR_REQUESTS,
  semesters: SEMESTER_REQUESTS,
  'grade-levels': GRADE_LEVEL_REQUESTS,
  subjects: SUBJECT_REQUESTS,
  'homeroom-classes': HOMEROOM_CLASS_REQUESTS,
  'course-sections': COURSE_SECTION_CRUD_REQUESTS,
  students: STUDENT_REQUESTS,
  'student-enrollments': STUDENT_ENROLLMENT_REQUESTS,
  teachers: TEACHER_REQUESTS,
  'teaching-assignments': TEACHING_ASSIGNMENT_REQUESTS,
  users: USER_REQUESTS,
  ...NEW_FOLDERS,
  timetable: TIMETABLE_REQUESTS,
  'courses-section': COURSE_SECTION_REQUESTS,
  'attendance-sessions': ATTENDANCE_SESSION_REQUESTS,
  'attendance-records': ATTENDANCE_RECORD_REQUESTS,
  assessments: ASSESSMENT_REQUESTS,
};

function exportMissingJson() {
  const outputPath = join(
    __dirname,
    '../../docs/postman/nestjs-missing-requests.json',
  );
  const collection = {
    info: {
      name: 'CodeFarm Nestjs — Missing Requests',
      description:
        'Import vào collection CodeFarm, folder Nestjs. Hoặc chạy: POSTMAN_API_KEY=PMAK-xxx node server/scripts/sync-postman-nestjs.mjs',
      schema:
        'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    variable: [{ key: 'API_BASE_URL', value: 'http://localhost:3000' }],
    item: Object.entries(ALL_SYNC_FOLDERS).map(([name, requests]) =>
      makeFolder(name, requests),
    ),
  };

  writeFileSync(outputPath, `${JSON.stringify(collection, null, 2)}\n`);
  console.log(`Wrote ${outputPath}`);
}

async function main() {
  const getRes = await fetch(`${API_BASE}/collections/${COLLECTION_UID}`, {
    headers: authHeaders(),
  });

  if (!getRes.ok) {
    const text = await getRes.text();
    throw new Error(formatPostmanAuthError(getRes.status, text));
  }

  const payload = await getRes.json();
  const collection = payload.collection;
  const nestjsRoot = collection.item?.find((entry) => entry.name === 'Nestjs');

  if (!nestjsRoot?.item) {
    throw new Error('Folder "Nestjs" not found in collection');
  }

  const summary = [];

  summary.push(
    ...ensureFolder(nestjsRoot, 'auth', AUTH_REQUESTS).map((n) => `auth/${n}`),
  );

  for (const [folderName, requests] of Object.entries(ALL_SYNC_FOLDERS)) {
    if (folderName === 'auth') {
      continue;
    }
    summary.push(
      ...ensureFolder(nestjsRoot, folderName, requests).map(
        (n) => `${folderName}/${n}`,
      ),
    );
  }

  const putRes = await fetch(`${API_BASE}/collections/${COLLECTION_UID}`, {
    method: 'PUT',
    headers: {
      ...authHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ collection }),
  });

  if (!putRes.ok) {
    const text = await putRes.text();
    throw new Error(formatPostmanAuthError(putRes.status, text));
  }

  if (summary.length === 0) {
    console.log('Collection already up to date — nothing added.');
    return;
  }

  console.log(`Updated Postman collection "${collection.info.name}":`);
  for (const line of summary) {
    console.log(`  + ${line}`);
  }
  console.log(`\nOpen: https://go.postman.co/collection/${COLLECTION_UID}`);
}

if (EXPORT_JSON) {
  exportMissingJson();
} else if (process.exitCode) {
  // validation failed above
} else {
  main()
    .catch((error) => {
      console.error(error.message ?? error);
      process.exitCode = 1;
    })
    .finally(() => {
      // Avoid libuv assertion crash on Windows when exiting immediately after fetch
      setTimeout(() => {}, 0);
    });
}
