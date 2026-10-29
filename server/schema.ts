import { z } from 'zod';

export const CourseOutcomeSchema = z.object({
  id: z.string(), // e.g. "CO1"
  statement: z.string(),
  leadingVerb: z.string(), // e.g. "Explain", "Construct", "Analyze"
  bloomLevel: z.string(), // e.g. "L2: Understand", "L3: Apply"
  targetPOs: z.array(z.string()).default([]),
});

export const UnitSchema = z.object({
  unitNumber: z.number(),
  title: z.string(),
  content: z.string(),
  hours: z.number(),
});

export const TeachingHoursRowSchema = z.object({
  component: z.string(),
  weeklyHours: z.number(),
  semesterHours: z.number(),
  credits: z.number(),
});

export const AssessmentRowSchema = z.object({
  component: z.string(),
  mode: z.string(),
  marks: z.number(),
  weightPercentage: z.number(),
});

export const ResourceSchema = z.object({
  type: z.string().default('Textbook'),
  authors: z.string(),
  title: z.string(),
  publisherYear: z.string(),
});

export const ParsedCourseSpecSchema = z.object({
  courseCode: z.string(),
  title: z.string(),
  department: z.string().default('Computer Science & Engineering'),
  credits: z.object({
    lecture: z.number(),
    tutorial: z.number(),
    practical: z.number(),
    total: z.number(),
    ltpString: z.string(), // e.g. "3:0:2"
  }),
  courseType: z.string().default('Professional Core (PCC)'),
  courseOutcomes: z.array(CourseOutcomeSchema),
  units: z.array(UnitSchema),
  copoMap: z.record(z.string(), z.record(z.string(), z.union([z.number(), z.null()]))).default({}),
  teachingHoursTable: z.array(TeachingHoursRowSchema).default([]),
  assessmentTable: z.array(AssessmentRowSchema).default([]),
  resources: z.array(ResourceSchema).default([]),
  blueprint: z
    .object({
      totalMarks: z.number().optional(),
      durationHours: z.number().optional(),
      sections: z.array(z.record(z.string(), z.any())).optional(),
      bloomsDistribution: z.record(z.string(), z.number()).optional(),
      summary: z.string().optional(),
    })
    .optional(),
});

export type ParsedCourseSpec = z.infer<typeof ParsedCourseSpecSchema>;
