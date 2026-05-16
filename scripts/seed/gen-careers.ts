import { careerIds, skillIds } from './ids';

const CAREER_NAMES = [
  {
    name: 'Backend Developer',
    desc: 'Server-side logic, APIs, databases, and system architecture',
  },
  {
    name: 'Frontend Developer',
    desc: 'User interfaces, responsive design, and client-side applications',
  },
  { name: 'Data Engineer', desc: 'Data pipelines, ETL processes, and data infrastructure' },
  {
    name: 'DevOps Engineer',
    desc: 'CI/CD, cloud infrastructure, containerization, and monitoring',
  },
  { name: 'AI/ML Engineer', desc: 'Machine learning models, training pipelines, and AI products' },
  {
    name: 'Cybersecurity Analyst',
    desc: 'Threat detection, vulnerability assessment, and incident response',
  },
  { name: 'Mobile Developer', desc: 'iOS and Android applications, cross-platform frameworks' },
  { name: 'Full-Stack Developer', desc: 'End-to-end web development from UI to database' },
];

export function genCareers() {
  return CAREER_NAMES.map((c, i) => ({
    _id: careerIds[i],
    name: c.name,
    description: c.desc,
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
}

// Skills mapped to careers (3-5 per career)
const SKILL_MAP: Array<{ name: string; careerIdx: number }> = [
  // Backend (4)
  { name: 'Node.js', careerIdx: 0 },
  { name: 'PostgreSQL', careerIdx: 0 },
  { name: 'REST API Design', careerIdx: 0 },
  { name: 'Microservices', careerIdx: 0 },
  // Frontend (4)
  { name: 'React', careerIdx: 1 },
  { name: 'TypeScript', careerIdx: 1 },
  { name: 'CSS/Tailwind', careerIdx: 1 },
  { name: 'Next.js', careerIdx: 1 },
  // Data Engineer (4)
  { name: 'Apache Spark', careerIdx: 2 },
  { name: 'SQL', careerIdx: 2 },
  { name: 'Airflow', careerIdx: 2 },
  { name: 'Data Modeling', careerIdx: 2 },
  // DevOps (4)
  { name: 'Docker', careerIdx: 3 },
  { name: 'Kubernetes', careerIdx: 3 },
  { name: 'Terraform', careerIdx: 3 },
  { name: 'GitHub Actions', careerIdx: 3 },
  // AI/ML (4)
  { name: 'TensorFlow', careerIdx: 4 },
  { name: 'PyTorch', careerIdx: 4 },
  { name: 'Scikit-learn', careerIdx: 4 },
  { name: 'NLP', careerIdx: 4 },
  // Security (3)
  { name: 'Penetration Testing', careerIdx: 5 },
  { name: 'SIEM', careerIdx: 5 },
  { name: 'Network Analysis', careerIdx: 5 },
  // Mobile (3)
  { name: 'React Native', careerIdx: 6 },
  { name: 'Flutter', careerIdx: 6 },
  { name: 'Swift/Kotlin', careerIdx: 6 },
  // Full-Stack (4)
  { name: 'GraphQL', careerIdx: 7 },
  { name: 'MongoDB', careerIdx: 7 },
  { name: 'Redis', careerIdx: 7 },
  { name: 'System Design', careerIdx: 7 },
];

export function genSkills() {
  return SKILL_MAP.map((s, i) => ({
    _id: skillIds[i],
    name: s.name,
    careerId: careerIds[s.careerIdx],
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
}

/** Get skillIds belonging to a specific career */
export function skillsByCareer(careerIdx: number) {
  return SKILL_MAP.map((s, i) => ({ ...s, _id: skillIds[i] }))
    .filter((s) => s.careerIdx === careerIdx)
    .map((s) => s._id);
}
