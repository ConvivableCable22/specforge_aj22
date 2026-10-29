import { z } from 'zod';

export const DefectLocationSchema = z.object({
  source: z.enum(['spec', 'blueprint', 'template']),
  section: z.number().nullable(),
  refs: z.array(z.string()).default([]),
});

export const DefectCodeEnum = z.enum([
  'DEF_CREDIT_MISMATCH',
  'DEF_WEIGHT_MISMATCH',
  'DEF_HOURS_MISMATCH',
  'DEF_SAMPLE_TEXT',
  'DEF_TEMPLATE_MISMATCH',
  'DEF_CO_VERB_INVALID',
  'DEF_UNMAPPED_PO',
  'DEF_SECTION_DROPPED',
  'DEF_CONFLICT_SPEC_BP',
  'DEF_INCOMPLETE_SYLLABUS',
]);

export const DefectItemSchema = z.object({
  code: DefectCodeEnum,
  severity: z.enum(['High', 'Medium', 'Low']),
  location: DefectLocationSchema,
  description: z.string(),
  fix_applied: z.string(),
});

export const MappingCellSchema = z.object({
  strength: z.union([z.number(), z.null()]),
  justification: z.string().default(''),
});

export const SpecForgeOutputSchema = z.object({
  metadata: z.object({
    course_code: z.string(),
    course_title: z.string(),
    department: z.string(),
    academic_year: z.string(),
    regulation: z.string(),
    credits: z.object({
      lecture: z.number(),
      tutorial: z.number(),
      practical: z.number(),
      total: z.number(),
      ltp_string: z.string(),
    }),
    course_type: z.string(),
    template_selected: z.enum(['integrated', 'non-lab']),
    workflow_status: z.enum([
      'Draft',
      'Submitted',
      'Under Review',
      'Pending HOD',
      'Approved',
      'Returned',
    ]),
    input_id: z.string().default('SPECFORGE-GEN'),
    generated_at: z.string(),
  }),
  course_summary: z.string(),
  course_outcomes: z.array(
    z.object({
      id: z.string(),
      statement: z.string(),
      leading_verb: z.string(),
      blooms_level: z.string(),
      target_pos: z.array(z.string()).default([]),
    })
  ),
  units: z.array(
    z.object({
      unit_number: z.number(),
      title: z.string(),
      hours: z.number(),
      content: z.string(),
    })
  ),
  copo_matrix: z.record(z.string(), z.record(z.string(), MappingCellSchema)),
  teaching_hours: z.array(
    z.object({
      component: z.string(),
      weekly_hours: z.number(),
      semester_hours: z.number(),
      credits: z.number(),
    })
  ),
  assessment_scheme: z.array(
    z.object({
      component: z.string(),
      mode: z.string(),
      marks: z.number(),
      weight_percentage: z.number(),
    })
  ),
  resources: z.array(
    z.object({
      type: z.string(),
      authors: z.string(),
      title: z.string(),
      publisher_year: z.string(),
    })
  ),
  defects: z.array(DefectItemSchema),
  audit_trail: z.array(
    z.object({
      timestamp: z.string(),
      user: z.string(),
      role: z.string(),
      action: z.string(),
      comment: z.string(),
    })
  ),
  validation_summary: z.object({
    total_rules: z.number(),
    passed: z.number(),
    failed: z.number(),
    defects_count: z.number(),
  }),
});

export type SpecForgeOutput = z.infer<typeof SpecForgeOutputSchema>;
export type DefectItem = z.infer<typeof DefectItemSchema>;
export type MappingCell = z.infer<typeof MappingCellSchema>;
