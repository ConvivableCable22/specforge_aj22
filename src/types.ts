export type UserRole = 'Author' | 'Reviewer' | 'HOD';

export interface AISettings {
  provider: 'gemini' | 'openai' | 'anthropic' | 'custom';
  apiKey: string;
  model: string;
  customEndpoint?: string;
}

export interface BloomLevel {
  level: string; // e.g. 'L2: Understand'
  code: 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6';
}

export interface CourseOutcome {
  id: string; // e.g. 'CO1'
  statement: string;
  bloomLevel: string;
  targetPOs: string[];
}

export interface SyllabusModule {
  id: number;
  title: string;
  theoryHours: number;
  labHours: number;
  topics: string;
  mandatoryLab: string;
}

export interface AssessmentItem {
  id: string;
  name: string;
  mode: string;
  marks: number;
  weight: number;
  complianceRule: string;
}

export interface Textbook {
  id: string;
  authors: string;
  year: number;
  title: string;
  edition: string;
  publisher: string;
  isbn?: string;
  notes?: string;
}

export interface Signatory {
  name: string;
  roleTitle: string;
  designation: string;
  signedDate: string | null;
  signatureDigest: string | null;
  isSigned: boolean;
}

export interface WorkflowAuditLog {
  id: string;
  timestamp: string;
  actor: string;
  role: UserRole;
  action: string;
  details: string;
  hash: string;
}

export type WorkflowStatus =
  | 'Draft'
  | 'Submitted'
  | 'Under Review'
  | 'Pending HOD'
  | 'Approved'
  | 'Returned';

export interface SectionComment {
  id: string;
  section: number; // 1-12
  user: string;
  role: UserRole;
  comment: string;
  timestamp: string;
}

export interface MappingCell {
  strength: number | null;
  justification: string;
}

export interface RegisteredCatalogSpec {
  code: string;
  title: string;
  department: string;
  credits: number;
  ltp: string;
  status: string;
  updatedAt: string;
}

export interface CourseSpec {
  code: string;
  title: string;
  department?: string;
  academicYear: string;
  regulation: string;
  category: string;
  lectureHours: number;
  tutorialHours: number;
  practicalHours: number;
  credits: number;
  theoryCredits: number;
  labCredits: number;
  overviewRationale: string;
  labPedagogy: string;
  modules: SyllabusModule[];
  courseOutcomes: CourseOutcome[];
  assessmentItems: AssessmentItem[];
  textbooks: Textbook[];
  // Mapping matrix: outcome ID -> { [poKey]: number | MappingCell }
  matrix: Record<string, Record<string, number | null | MappingCell>>;
  copoMatrixWithJustifications?: Record<string, Record<string, MappingCell>>;
  courseSummary?: string;
  signatories: {
    author: Signatory;
    reviewer: Signatory;
    hod: Signatory;
  };
  bosResolution: string;
  documentFingerprint: string;
  workflowStage: 'draft' | 'under_review' | 'approved_ready_for_export' | 'sealed_canonical';
  workflowStatus: WorkflowStatus;
  sectionComments?: SectionComment[];
  versionTag: string;
  auditTrail: WorkflowAuditLog[];
  defects?: Array<{
    code: string;
    severity: 'High' | 'Medium' | 'Low';
    location: {
      source: 'spec' | 'blueprint' | 'template';
      section: number | null;
      refs: string[];
    };
    description: string;
    fix_applied: string;
  }>;
  templateSelection?: {
    detected: 'integrated' | 'non-lab';
    selected: 'integrated' | 'non-lab';
    isOverridden: boolean;
    overrideReason?: string;
    signals: string[];
    sampleStrings: string[];
    filledHtml?: string;
  };
}

export interface ParsedUnit {
  unitNumber: number;
  title: string;
  content: string;
  hours: number;
}

export interface ParsedOutcome {
  id: string;
  statement: string;
  leadingVerb: string;
  bloomLevel: string;
  targetPOs: string[];
}

export interface ParsedTeachingHoursRow {
  component: string;
  weeklyHours: number;
  semesterHours: number;
  credits: number;
}

export interface ParsedAssessmentRow {
  component: string;
  mode: string;
  marks: number;
  weightPercentage: number;
}

export interface ParsedResource {
  type: string;
  authors: string;
  title: string;
  publisherYear: string;
}

export interface ParsedCourseSpec {
  courseCode: string;
  title: string;
  department: string;
  credits: {
    lecture: number;
    tutorial: number;
    practical: number;
    total: number;
    ltpString: string;
  };
  courseType: string;
  courseOutcomes: ParsedOutcome[];
  units: ParsedUnit[];
  copoMap: Record<string, Record<string, number | null>>;
  teachingHoursTable: ParsedTeachingHoursRow[];
  assessmentTable: ParsedAssessmentRow[];
  resources: ParsedResource[];
  blueprint?: {
    totalMarks?: number;
    durationHours?: number;
    sections?: Array<Record<string, any>>;
    bloomsDistribution?: Record<string, number>;
    summary?: string;
  };
}
