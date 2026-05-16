import { courseIds, majorIds } from './ids';

// ── Majors ─────────────────────────────────────────────────────────────────
export const MAJORS = [
  {
    code: 'SE',
    name: 'Software Engineering',
    description:
      'Design, develop, test, and maintain software systems using engineering principles',
  },
  {
    code: 'CS',
    name: 'Computer Science',
    description:
      'Study of algorithms, data structures, computational theory, and systems architecture',
  },
  {
    code: 'AI',
    name: 'Artificial Intelligence',
    description: 'Machine learning, deep learning, NLP, and intelligent systems development',
  },
  {
    code: 'DS',
    name: 'Data Science',
    description: 'Data analysis, statistical modeling, data warehousing, and business intelligence',
  },
  {
    code: 'IS',
    name: 'Information Security',
    description: 'Cybersecurity, network security, cryptography, and ethical hacking',
  },
  {
    code: 'CE',
    name: 'Computer Engineering',
    description: 'Hardware-software integration, embedded systems, IoT, and digital design',
  },
];

export function genMajors() {
  return MAJORS.map((m, i) => ({
    _id: majorIds[i],
    code: m.code,
    name: m.name,
    description: m.description,
    status: 'ACTIVE',
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
}

// ── Courses (7-8 per major) ────────────────────────────────────────────────
const COURSE_DATA: Array<{
  code: string;
  name: string;
  credits: number;
  semester: number;
  majorIdx: number;
  compulsory: boolean;
}> = [
  // SE (8 courses)
  {
    code: 'PRF192',
    name: 'Programming Fundamentals',
    credits: 3,
    semester: 1,
    majorIdx: 0,
    compulsory: true,
  },
  {
    code: 'PRO192',
    name: 'Object-Oriented Programming',
    credits: 3,
    semester: 2,
    majorIdx: 0,
    compulsory: true,
  },
  {
    code: 'SWE201c',
    name: 'Software Engineering',
    credits: 3,
    semester: 3,
    majorIdx: 0,
    compulsory: true,
  },
  {
    code: 'SWR302',
    name: 'Software Requirements',
    credits: 3,
    semester: 4,
    majorIdx: 0,
    compulsory: true,
  },
  {
    code: 'SWT301',
    name: 'Software Testing',
    credits: 3,
    semester: 5,
    majorIdx: 0,
    compulsory: true,
  },
  {
    code: 'SWP391',
    name: 'Software Development Project',
    credits: 5,
    semester: 6,
    majorIdx: 0,
    compulsory: true,
  },
  {
    code: 'SWD392',
    name: 'Software Architecture & Design',
    credits: 3,
    semester: 7,
    majorIdx: 0,
    compulsory: true,
  },
  {
    code: 'SEP490',
    name: 'SE Capstone Project',
    credits: 10,
    semester: 8,
    majorIdx: 0,
    compulsory: true,
  },
  // CS (7 courses)
  {
    code: 'CSD201',
    name: 'Data Structures & Algorithms',
    credits: 3,
    semester: 2,
    majorIdx: 1,
    compulsory: true,
  },
  {
    code: 'CEA201',
    name: 'Computer Architecture',
    credits: 3,
    semester: 3,
    majorIdx: 1,
    compulsory: true,
  },
  {
    code: 'CSI104',
    name: 'Introduction to CS',
    credits: 3,
    semester: 1,
    majorIdx: 1,
    compulsory: true,
  },
  {
    code: 'MAE101',
    name: 'Mathematics for Engineering',
    credits: 3,
    semester: 1,
    majorIdx: 1,
    compulsory: true,
  },
  {
    code: 'MAD101',
    name: 'Discrete Mathematics',
    credits: 3,
    semester: 2,
    majorIdx: 1,
    compulsory: true,
  },
  {
    code: 'CSD301',
    name: 'Advanced Algorithms',
    credits: 3,
    semester: 5,
    majorIdx: 1,
    compulsory: false,
  },
  {
    code: 'CSI301',
    name: 'Operating Systems',
    credits: 3,
    semester: 4,
    majorIdx: 1,
    compulsory: true,
  },
  // AI (8 courses)
  {
    code: 'AIL303',
    name: 'AI Fundamentals',
    credits: 3,
    semester: 3,
    majorIdx: 2,
    compulsory: true,
  },
  {
    code: 'AIP491',
    name: 'AI Capstone Project',
    credits: 10,
    semester: 8,
    majorIdx: 2,
    compulsory: true,
  },
  {
    code: 'MLP301',
    name: 'Machine Learning',
    credits: 3,
    semester: 4,
    majorIdx: 2,
    compulsory: true,
  },
  {
    code: 'NLP302',
    name: 'Natural Language Processing',
    credits: 3,
    semester: 5,
    majorIdx: 2,
    compulsory: true,
  },
  { code: 'DPL301', name: 'Deep Learning', credits: 3, semester: 5, majorIdx: 2, compulsory: true },
  { code: 'AIE301', name: 'AI Ethics', credits: 2, semester: 6, majorIdx: 2, compulsory: false },
  {
    code: 'CVS301',
    name: 'Computer Vision',
    credits: 3,
    semester: 6,
    majorIdx: 2,
    compulsory: true,
  },
  {
    code: 'RLS301',
    name: 'Reinforcement Learning',
    credits: 3,
    semester: 7,
    majorIdx: 2,
    compulsory: false,
  },
  // DS (7 courses)
  {
    code: 'DBI202',
    name: 'Database Systems',
    credits: 3,
    semester: 2,
    majorIdx: 3,
    compulsory: true,
  },
  {
    code: 'DBD301',
    name: 'Database Design',
    credits: 3,
    semester: 3,
    majorIdx: 3,
    compulsory: true,
  },
  {
    code: 'DAP391',
    name: 'Data Analytics Project',
    credits: 5,
    semester: 6,
    majorIdx: 3,
    compulsory: true,
  },
  {
    code: 'DWH301',
    name: 'Data Warehousing',
    credits: 3,
    semester: 4,
    majorIdx: 3,
    compulsory: true,
  },
  {
    code: 'DAV301',
    name: 'Data Visualization',
    credits: 3,
    semester: 5,
    majorIdx: 3,
    compulsory: true,
  },
  {
    code: 'DSR401',
    name: 'Data Science Research',
    credits: 3,
    semester: 7,
    majorIdx: 3,
    compulsory: false,
  },
  {
    code: 'DSP491',
    name: 'DS Capstone Project',
    credits: 10,
    semester: 8,
    majorIdx: 3,
    compulsory: true,
  },
  // IS (7 courses)
  {
    code: 'IAO301',
    name: 'Information Assurance',
    credits: 3,
    semester: 3,
    majorIdx: 4,
    compulsory: true,
  },
  {
    code: 'IAM302',
    name: 'Access Management',
    credits: 3,
    semester: 4,
    majorIdx: 4,
    compulsory: true,
  },
  {
    code: 'NWC301',
    name: 'Network Security',
    credits: 3,
    semester: 5,
    majorIdx: 4,
    compulsory: true,
  },
  {
    code: 'CEH301',
    name: 'Ethical Hacking',
    credits: 3,
    semester: 5,
    majorIdx: 4,
    compulsory: true,
  },
  {
    code: 'ISC401',
    name: 'Security Compliance',
    credits: 3,
    semester: 6,
    majorIdx: 4,
    compulsory: false,
  },
  { code: 'OSG301', name: 'OS Security', credits: 3, semester: 4, majorIdx: 4, compulsory: true },
  { code: 'CPT301', name: 'Cryptography', credits: 3, semester: 6, majorIdx: 4, compulsory: true },
  // CE (8 courses)
  {
    code: 'IOT102',
    name: 'IoT Fundamentals',
    credits: 3,
    semester: 2,
    majorIdx: 5,
    compulsory: true,
  },
  {
    code: 'EMB301',
    name: 'Embedded Systems',
    credits: 3,
    semester: 3,
    majorIdx: 5,
    compulsory: true,
  },
  {
    code: 'DGT301',
    name: 'Digital Design',
    credits: 3,
    semester: 3,
    majorIdx: 5,
    compulsory: true,
  },
  {
    code: 'CMP301',
    name: 'Computer Organization',
    credits: 3,
    semester: 4,
    majorIdx: 5,
    compulsory: true,
  },
  {
    code: 'NET301',
    name: 'Computer Networking',
    credits: 3,
    semester: 5,
    majorIdx: 5,
    compulsory: true,
  },
  {
    code: 'HWD301',
    name: 'Hardware Design',
    credits: 3,
    semester: 6,
    majorIdx: 5,
    compulsory: false,
  },
  {
    code: 'RTS301',
    name: 'Real-Time Systems',
    credits: 3,
    semester: 7,
    majorIdx: 5,
    compulsory: true,
  },
  {
    code: 'CEP491',
    name: 'CE Capstone Project',
    credits: 10,
    semester: 8,
    majorIdx: 5,
    compulsory: true,
  },
];

export function genCourses() {
  return COURSE_DATA.map((c, i) => ({
    _id: courseIds[i],
    code: c.code,
    name: c.name,
    credits: c.credits,
    semester: c.semester,
    isCompulsory: c.compulsory,
    majorId: majorIds[c.majorIdx],
    prerequisiteCourseIds: [],
    status: 'ACTIVE',
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
}

/** Get courseIds belonging to a specific major index */
export function coursesByMajor(majorIdx: number) {
  return COURSE_DATA.map((c, i) => ({ ...c, _id: courseIds[i] })).filter(
    (c) => c.majorIdx === majorIdx,
  );
}
