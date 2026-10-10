interface Student {
  id: number;
  name: string;
  email: string;
  status: 'active' | 'inactive';
}

function formatStudent(student: Student): string {
  return `${student.id} - ${student.name} (${student.status})`;
}

const sampleStudent: Student = {
  id: 1,
  name: 'John Doe',
  email: 'john@example.com',
  status: 'active',
};

console.log(formatStudent(sampleStudent));

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

const studentResponse: ApiResponse<Student> = {
  success: true,
  data: sampleStudent,
};
console.log('Student Response:', studentResponse);

const studentsResponse: ApiResponse<Student[]> = {
  success: true,
  data: [sampleStudent],
};
console.log('Students Response:', studentsResponse);

function isStudent(obj: unknown): obj is Student {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const maybeStudent = obj as Record<string, unknown>;

  if (typeof maybeStudent.id !== 'number') return false;
  if (typeof maybeStudent.name !== 'string') return false;
  if (typeof maybeStudent.email !== 'string') return false;
  if (maybeStudent.status !== 'active' && maybeStudent.status !== 'inactive')
    return false;

  return true;
}

const validStudent = {
  id: 2,
  name: 'Jane Smith',
  email: 'jane@example.com',
  status: 'inactive',
};
const invalidStudentId = {
  id: '3',
  name: 'Bob',
  email: 'bob@example.com',
  status: 'active',
};
const invalidStudentMissingName = {
  id: 4,
  email: 'missing@example.com',
  status: 'active',
};

console.log('Valid student:', isStudent(validStudent)); // true
console.log('Invalid student (bad id):', isStudent(invalidStudentId)); // false
console.log(
  'Invalid student (missing name):',
  isStudent(invalidStudentMissingName),
); // false

type StudentStatus = 'active' | 'inactive';

function getStudentStatusLabel(status: StudentStatus): string {
  if (status === 'active') {
    return 'Active Student';
  }
  return 'Inactive Student';
}

console.log(getStudentStatusLabel('active'));
console.log(getStudentStatusLabel('inactive'));
