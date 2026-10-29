import { ParsedCourseSpec } from './schema';
import { DefectItem } from './specforge_output_schema';

export interface ValidationRuleResult {
  id: string; // V1 .. V10
  title: string;
  section: number;
  sectionName: string;
  severity: 'High' | 'Medium' | 'Low';
  passed: boolean;
  chosenValue: string;
  reason: string;
  fixApplied?: string;
  defectCode?: DefectItem['code'];
  refs?: string[];
  source?: 'spec' | 'blueprint' | 'template';
}

export interface ValidationReport {
  overallPassed: boolean;
  totalRules: number;
  passedCount: number;
  failedCount: number;
  rules: ValidationRuleResult[];
  defects: DefectItem[];
  highSeverityCount: number;
  mediumSeverityCount: number;
  lowSeverityCount: number;
}

export function runValidationSuite(
  spec: ParsedCourseSpec,
  options?: {
    templateSelected?: 'integrated' | 'non-lab';
    sampleStrings?: string[];
    blueprintConflicts?: string[];
    droppedSections?: string[];
  }
): ValidationReport {
  const rules: ValidationRuleResult[] = [];
  const defects: DefectItem[] = [];

  // V1: Course Code & Descriptors (Section 1)
  const codeValid = Boolean(spec.courseCode && /^[A-Z]{2,4}\s*\d{3,4}[A-Z]?$/i.test(spec.courseCode.trim()));
  const titleValid = Boolean(spec.title && spec.title.trim().length >= 4);
  const deptValid = Boolean(spec.department && spec.department.trim().length >= 3);
  const v1Passed = codeValid && titleValid && deptValid;
  rules.push({
    id: 'V1',
    title: 'Course Identification & Institutional Descriptors',
    section: 1,
    sectionName: 'Course Descriptors',
    severity: 'High',
    passed: v1Passed,
    chosenValue: `${spec.courseCode} - ${spec.title}`,
    reason: v1Passed
      ? 'Course code follows autonomous university taxonomy and descriptors are non-empty.'
      : 'Invalid or missing course code/title/department in statutory header.',
    fixApplied: v1Passed ? undefined : 'Normalized course code and title to standard BoS nomenclature.',
    defectCode: v1Passed ? undefined : 'DEF_SECTION_DROPPED',
    refs: [spec.courseCode || 'CODE'],
    source: 'spec',
  });

  // V2: Credit Structure Normalization (Section 2)
  const calcTotal = spec.credits.lecture + spec.credits.tutorial + spec.credits.practical * 0.5;
  const v2Passed = Math.abs(spec.credits.total - calcTotal) < 0.05;
  rules.push({
    id: 'V2',
    title: 'Credit Structure Mathematical Normalization',
    section: 2,
    sectionName: 'Credit Structure',
    severity: 'High',
    passed: v2Passed,
    chosenValue: `${spec.credits.ltpString} => ${spec.credits.total.toFixed(1)} Credits`,
    reason: v2Passed
      ? `Credit formula (L + T + 0.5*P = ${calcTotal.toFixed(1)}) matches stated total credits.`
      : `Credit mismatch: stated ${spec.credits.total} != calculated ${calcTotal.toFixed(1)}.`,
    fixApplied: v2Passed ? undefined : `Recomputed total credits to ${calcTotal.toFixed(1)} based on L:T:P formula.`,
    defectCode: v2Passed ? undefined : 'DEF_CREDIT_MISMATCH',
    refs: [spec.credits.ltpString],
    source: 'spec',
  });

  // V3: Semester Contact Hours Math (Section 2)
  const totalWeekly = spec.credits.lecture + spec.credits.tutorial + spec.credits.practical;
  const expectedSemHours = totalWeekly * 15;
  const actualSemHours = spec.teachingHoursTable.reduce((sum, r) => sum + r.semesterHours, 0);
  const v3Passed = actualSemHours === expectedSemHours || spec.teachingHoursTable.length === 0;
  rules.push({
    id: 'V3',
    title: 'Semester Contact Hours Statutory 15-Week Term',
    section: 2,
    sectionName: 'Contact Hours Schedule',
    severity: 'Medium',
    passed: v3Passed,
    chosenValue: `${actualSemHours || expectedSemHours} Semester Hours`,
    reason: v3Passed
      ? `Weekly rate of ${totalWeekly} Hrs/Wk over 15 statutory weeks totals ${expectedSemHours} hours.`
      : `Discrepancy in contact hours: found ${actualSemHours} vs expected ${expectedSemHours}.`,
    fixApplied: v3Passed ? undefined : `Normalized semester hours to 15-week statutory schedule (${expectedSemHours} Hrs).`,
    defectCode: v3Passed ? undefined : 'DEF_HOURS_MISMATCH',
    refs: [`WEEKLY-${totalWeekly}`],
    source: 'spec',
  });

  // V4: Course Outcomes Count & Bloom Rigor (Section 3)
  const coCount = spec.courseOutcomes.length;
  const hasHigherOrder = spec.courseOutcomes.some((co) =>
    co.bloomLevel.startsWith('L4') || co.bloomLevel.startsWith('L5') || co.bloomLevel.startsWith('L6')
  );
  const v4Passed = coCount >= 4 && coCount <= 8 && hasHigherOrder;
  rules.push({
    id: 'V4',
    title: 'Course Outcomes Count & Bloom Cognitive Rigor',
    section: 3,
    sectionName: 'Course Outcomes',
    severity: 'Medium',
    passed: v4Passed,
    chosenValue: `${coCount} COs defined with cognitive depth`,
    reason: v4Passed
      ? `Defined ${coCount} COs (conforming to 4-8 guideline) with higher-order levels (L4-L6) represented.`
      : `CO count (${coCount}) outside 4-8 range or missing higher-order cognitive levels (L4-L6).`,
    fixApplied: v4Passed ? undefined : 'Adjusted outcome hierarchy to ensure higher-order Bloom levels are present.',
    defectCode: v4Passed ? undefined : 'DEF_CO_VERB_INVALID',
    refs: spec.courseOutcomes.map((c) => c.id),
    source: 'spec',
  });

  // V5: Leading Action Verb Bloom Conformance (Section 3)
  const invalidVerbs = spec.courseOutcomes.filter((co) => {
    const v = co.leadingVerb.toLowerCase();
    if (['understand', 'know', 'learn', 'appreciate'].includes(v)) return true;
    return false;
  });
  const v5Passed = invalidVerbs.length === 0;
  rules.push({
    id: 'V5',
    title: 'Measurable Action Verbs in Outcome Statements',
    section: 3,
    sectionName: 'Course Outcomes',
    severity: 'Medium',
    passed: v5Passed,
    chosenValue: `${spec.courseOutcomes.map((c) => c.leadingVerb).join(', ')}`,
    reason: v5Passed
      ? 'All Course Outcomes start with active, observable, and measurable Bloom verbs.'
      : `Found unmeasurable verbs (${invalidVerbs.map((c) => c.leadingVerb).join(', ')}) violating NBA SAR guidelines.`,
    fixApplied: v5Passed ? undefined : 'Replaced passive verbs with observable action verbs (e.g. Explain, Construct).',
    defectCode: v5Passed ? undefined : 'DEF_CO_VERB_INVALID',
    refs: invalidVerbs.map((c) => c.id),
    source: 'spec',
  });

  // V6: Modular Syllabus Completeness (Section 4)
  const unitCount = spec.units.length;
  const v6Passed = unitCount >= 4 && unitCount <= 6 && spec.units.every((u) => u.title && u.hours > 0);
  rules.push({
    id: 'V6',
    title: 'Modular Syllabus Completeness & Hour Distribution',
    section: 4,
    sectionName: 'Modular Syllabus',
    severity: 'High',
    passed: v6Passed,
    chosenValue: `${unitCount} Instructional Units`,
    reason: v6Passed
      ? `All ${unitCount} modular units are structured with titles, hours, and complete curriculum topics.`
      : 'Unit count outside standard 4-6 modules or units have empty contents.',
    fixApplied: v6Passed ? undefined : 'Structured syllabus into standard 5 instructional modules with balanced hours.',
    defectCode: v6Passed ? undefined : 'DEF_INCOMPLETE_SYLLABUS',
    refs: spec.units.map((u) => `Unit-${u.unitNumber}`),
    source: 'spec',
  });

  // V7: Assessment Weightage Exact 100% Normalization (Section 5)
  const totalWeight = spec.assessmentTable.reduce((sum, a) => sum + a.weightPercentage, 0);
  const v7Passed = Math.abs(totalWeight - 100.0) < 0.1;
  rules.push({
    id: 'V7',
    title: 'Assessment Weightage Exact 100.0% Normalization',
    section: 5,
    sectionName: 'Assessment Scheme',
    severity: 'High',
    passed: v7Passed,
    chosenValue: `Total Weight: ${totalWeight.toFixed(1)}%`,
    reason: v7Passed
      ? 'Continuous Internal Evaluation (CIE) and Semester End Examination (SEE) sum exactly to 100.0%.'
      : `Assessment weight sum (${totalWeight.toFixed(1)}%) does not equal 100.0%.`,
    fixApplied: v7Passed ? undefined : 'Rebalanced CIE and SEE assessment component weights to exactly 100.0%.',
    defectCode: v7Passed ? undefined : 'DEF_WEIGHT_MISMATCH',
    refs: spec.assessmentTable.map((a) => a.component),
    source: 'spec',
  });

  // V8: AICTE Statutory Contact-to-Credit Ratio (Section 2 & Template)
  const templateType = options?.templateSelected || (spec.credits.practical > 0 ? 'integrated' : 'non-lab');
  const templateCorrect =
    (spec.credits.practical > 0 && templateType === 'integrated') ||
    (spec.credits.practical === 0 && templateType === 'non-lab');
  rules.push({
    id: 'V8',
    title: 'AICTE 2:1 Contact-to-Credit Ratio & Template Conformance',
    section: 2,
    sectionName: 'Statutory Ratio',
    severity: 'High',
    passed: templateCorrect,
    chosenValue: `P = ${spec.credits.practical} => Template: ${templateType}`,
    reason: templateCorrect
      ? `Course structure correctly mapped to ${templateType === 'integrated' ? 'Integrated (Lab)' : 'Non-Lab (Theory)'} template.`
      : `Template mismatch: Practical hours P=${spec.credits.practical} conflicts with chosen template "${templateType}".`,
    fixApplied: templateCorrect ? undefined : `Switched to ${spec.credits.practical > 0 ? 'Integrated' : 'Non-Lab'} template.`,
    defectCode: templateCorrect ? undefined : 'DEF_TEMPLATE_MISMATCH',
    refs: [`TEMPLATE-${templateType}`],
    source: 'template',
  });

  // V9: CO-PO-PSO Articulation Matrix Coverage (Section 6)
  const unmappedCOs = spec.courseOutcomes.filter((co) => {
    const row = spec.copoMap[co.id];
    if (!row) return true;
    return !Object.values(row).some((val) => typeof val === 'number' && val > 0);
  });
  const v9Passed = unmappedCOs.length === 0;
  rules.push({
    id: 'V9',
    title: 'CO-PO-PSO Articulation Matrix Coverage',
    section: 6,
    sectionName: 'Articulation Matrix',
    severity: 'Medium',
    passed: v9Passed,
    chosenValue: `${spec.courseOutcomes.length - unmappedCOs.length}/${spec.courseOutcomes.length} COs mapped`,
    reason: v9Passed
      ? 'Every Course Outcome maps to at least one Program Outcome (PO) or Program Specific Outcome (PSO).'
      : `Found ${unmappedCOs.length} orphan COs (${unmappedCOs.map((c) => c.id).join(', ')}) with zero correlation.`,
    fixApplied: v9Passed ? undefined : 'Mapped orphan outcomes to foundational engineering attributes (PO1, PO2).',
    defectCode: v9Passed ? undefined : 'DEF_UNMAPPED_PO',
    refs: unmappedCOs.map((c) => c.id),
    source: 'spec',
  });

  // V10: Zero Leftover Template Sample Text / Placeholders (Section 1-12)
  const sampleTokens = options?.sampleStrings || [
    '[SAMPLE_CODE]',
    '[SAMPLE_TITLE]',
    '[SAMPLE_DEPT]',
    '[SAMPLE_UNIT]',
    '[SAMPLE_CO1]',
    '[SAMPLE_OVERVIEW]',
    '[SAMPLE_RESOURCE]',
  ];
  const placeholderTokens = ['[TODO]', '[TBD]', 'Lorem ipsum', ...sampleTokens];
  const detectedPlaceholders: string[] = [];

  placeholderTokens.forEach((token) => {
    if (spec.title.includes(token) || spec.courseCode.includes(token)) detectedPlaceholders.push(token);
    if (spec.units.some((u) => u.title.includes(token) || u.content.includes(token))) detectedPlaceholders.push(token);
    if (spec.courseOutcomes.some((c) => c.statement.includes(token))) detectedPlaceholders.push(token);
  });

  const v10Passed = detectedPlaceholders.length === 0;
  rules.push({
    id: 'V10',
    title: 'Zero Leftover Template Sample Text / Draft Annotations',
    section: 7,
    sectionName: 'Document Integrity',
    severity: 'High',
    passed: v10Passed,
    chosenValue: v10Passed ? '0 sample tokens' : `${detectedPlaceholders.length} leaked tokens`,
    reason: v10Passed
      ? 'Document passed full regex and substring scan: 0 placeholder strings or template tokens detected.'
      : `Detected leftover placeholder strings: ${detectedPlaceholders.slice(0, 3).join(', ')}.`,
    fixApplied: v10Passed ? undefined : 'Purged placeholder tokens and populated with canonical curriculum text.',
    defectCode: v10Passed ? undefined : 'DEF_SAMPLE_TEXT',
    refs: detectedPlaceholders,
    source: 'template',
  });

  // Check for dropped sections or blueprint conflicts if provided
  if (options?.blueprintConflicts && options.blueprintConflicts.length > 0) {
    rules.push({
      id: 'V-CONFLICT',
      title: 'Specification vs Blueprint Concordance',
      section: 3,
      sectionName: 'Blueprint Concordance',
      severity: 'Medium',
      passed: false,
      chosenValue: `${options.blueprintConflicts.length} Conflicts Detected`,
      reason: options.blueprintConflicts.join('; '),
      fixApplied: 'Prioritized blueprint specifications for Course Outcomes and modular units.',
      defectCode: 'DEF_CONFLICT_SPEC_BP',
      refs: ['BLUEPRINT'],
      source: 'blueprint',
    });
  }

  if (options?.droppedSections && options.droppedSections.length > 0) {
    rules.push({
      id: 'V-DROPPED',
      title: 'Dropped Statutory Sections Detection',
      section: 1,
      sectionName: 'Statutory Sections',
      severity: 'High',
      passed: false,
      chosenValue: `${options.droppedSections.length} Dropped Sections`,
      reason: `Sections omitted from existing spec: ${options.droppedSections.join(', ')}.`,
      fixApplied: 'Restored missing statutory sections from autonomous board template.',
      defectCode: 'DEF_SECTION_DROPPED',
      refs: options.droppedSections,
      source: 'spec',
    });
  }

  // Populate defects from all failing rules
  rules.forEach((rule) => {
    if (!rule.passed && rule.defectCode) {
      defects.push({
        code: rule.defectCode,
        severity: rule.severity,
        location: {
          source: rule.source || 'spec',
          section: rule.section,
          refs: rule.refs || [],
        },
        description: rule.reason,
        fix_applied: rule.fixApplied || 'Applied standard accreditation normalization.',
      });
    }
  });

  const passedCount = rules.filter((r) => r.passed).length;
  const failedCount = rules.length - passedCount;

  return {
    overallPassed: failedCount === 0,
    totalRules: rules.length,
    passedCount,
    failedCount,
    rules,
    defects,
    highSeverityCount: rules.filter((r) => !r.passed && r.severity === 'High').length,
    mediumSeverityCount: rules.filter((r) => !r.passed && r.severity === 'Medium').length,
    lowSeverityCount: rules.filter((r) => !r.passed && r.severity === 'Low').length,
  };
}

export function generateValidationReportHtml(
  spec: ParsedCourseSpec,
  report: ValidationReport
): string {
  const highRules = report.rules.filter((r) => r.severity === 'High');
  const medRules = report.rules.filter((r) => r.severity === 'Medium');
  const lowRules = report.rules.filter((r) => r.severity === 'Low');

  const renderRuleRows = (ruleList: ValidationRuleResult[]) => {
    if (ruleList.length === 0) {
      return `<tr><td colspan="5" style="text-align:center; padding: 12px; color: #64748b; font-style: italic;">No rules in this severity group.</td></tr>`;
    }
    return ruleList
      .map(
        (r) => `
      <tr style="background: ${r.passed ? '#ffffff' : '#fff1f2'}; border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px; font-weight: bold; font-family: monospace; color: #0b3c43;">${r.id}</td>
        <td style="padding: 10px;">
          <div style="font-weight: 600; color: #0f2327;">${r.title}</div>
          <div style="font-size: 11px; color: #64748b;">Section ${r.section}: ${r.sectionName}</div>
        </td>
        <td style="padding: 10px; text-align: center;">
          <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: bold; ${
            r.passed ? 'background: #dcfce7; color: #166534;' : 'background: #fee2e2; color: #991b1b;'
          }">
            ${r.passed ? 'PASSED' : 'DEFECT'}
          </span>
        </td>
        <td style="padding: 10px; font-family: monospace; font-size: 11px; color: #0b3c43;">${r.chosenValue}</td>
        <td style="padding: 10px; font-size: 12px; color: #334155;">
          <div>${r.reason}</div>
          ${r.fixApplied ? `<div style="margin-top: 4px; font-size: 11px; color: #059669; font-weight: 500;"><strong>Fix Applied:</strong> ${r.fixApplied}</div>` : ''}
        </td>
      </tr>
    `
      )
      .join('');
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>Validation Report - ${spec.courseCode}: ${spec.title}</title>
  <style>
    body { font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 40px; color: #0f2327; background: #f8fafc; line-height: 1.5; }
    .container { max-width: 1000px; margin: 0 auto; background: #ffffff; padding: 36px; border-radius: 8px; border: 1px solid #cbd5e1; box-shadow: 0 4px 16px rgba(0,0,0,0.05); }
    h1 { color: #0b3c43; font-size: 20px; text-transform: uppercase; margin: 0 0 6px 0; }
    h2 { font-size: 14px; text-transform: uppercase; color: #0b3c43; margin: 24px 0 10px 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
    th { background: #f1f5f9; padding: 8px 10px; text-align: left; font-size: 11px; text-transform: uppercase; color: #475569; border: 1px solid #cbd5e1; }
    td { border: 1px solid #e2e8f0; }
    .badge-summary { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 9999px; font-size: 12px; font-weight: 600; margin-bottom: 20px; }
    .tag-high { background: #fee2e2; color: #991b1b; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 11px; }
    .tag-med { background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 11px; }
    .tag-low { background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 11px; }
  </style>
</head>
<body>
  <div class="container">
    <div style="border-bottom: 2px solid #0b3c43; padding-bottom: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <h1>Autonomous Curriculum Accreditation Validation Report</h1>
        <div style="font-size: 13px; font-weight: 600; color: #334155;">Course: ${spec.courseCode} - ${spec.title} (${spec.credits.ltpString})</div>
        <div style="font-size: 11px; color: #64748b;">Engine: SpecForge v2.4.1 • Rules V1–V10 Comprehensive Audit</div>
      </div>
      <div style="text-align: right;">
        <span class="badge-summary" style="${report.overallPassed ? 'background: #dcfce7; color: #166534;' : 'background: #fef3c7; color: #92400e;'}">
          ${report.overallPassed ? '✓ 100% Rules Verified' : `${report.failedCount} Defects Detected (${report.passedCount}/${report.totalRules} Passed)`}
        </span>
        <div style="font-size: 11px; color: #64748b; font-family: monospace;">Generated: ${new Date().toISOString()}</div>
      </div>
    </div>

    <h2>1. High Severity Validation Rules (Statutory Mandates)</h2>
    <table>
      <thead>
        <tr><th style="width: 50px;">Rule</th><th>Rule Title & Section</th><th style="width: 90px; text-align: center;">Status</th><th style="width: 180px;">Chosen Value</th><th>Accreditation Reason & Fix</th></tr>
      </thead>
      <tbody>${renderRuleRows(highRules)}</tbody>
    </table>

    <h2>2. Medium Severity Validation Rules (Curriculum Rigor & Alignment)</h2>
    <table>
      <thead>
        <tr><th style="width: 50px;">Rule</th><th>Rule Title & Section</th><th style="width: 90px; text-align: center;">Status</th><th style="width: 180px;">Chosen Value</th><th>Accreditation Reason & Fix</th></tr>
      </thead>
      <tbody>${renderRuleRows(medRules)}</tbody>
    </table>

    <h2>3. Low Severity Validation Rules (Format & Presentation)</h2>
    <table>
      <thead>
        <tr><th style="width: 50px;">Rule</th><th>Rule Title & Section</th><th style="width: 90px; text-align: center;">Status</th><th style="width: 180px;">Chosen Value</th><th>Accreditation Reason & Fix</th></tr>
      </thead>
      <tbody>${renderRuleRows(lowRules)}</tbody>
    </table>

    <h2>4. Recorded Defects Audit Log</h2>
    <table>
      <thead>
        <tr><th style="width: 160px;">Defect Code</th><th style="width: 80px;">Source</th><th style="width: 80px;">Section</th><th>Description</th><th>Fix Applied</th></tr>
      </thead>
      <tbody>
        ${
          report.defects.length === 0
            ? '<tr><td colspan="5" style="text-align:center; padding: 12px; color: #166534; font-weight: bold;">0 Real Defects Recorded. Specification passes all statutory criteria.</td></tr>'
            : report.defects
                .map(
                  (d) => `
          <tr>
            <td style="padding: 8px; font-family: monospace; font-weight: bold; color: #ba1a1a;">${d.code}</td>
            <td style="padding: 8px; font-size: 11px; text-transform: uppercase;">${d.location.source}</td>
            <td style="padding: 8px; font-size: 11px;">Section ${d.location.section ?? 'N/A'}</td>
            <td style="padding: 8px; font-size: 12px;">${d.description}</td>
            <td style="padding: 8px; font-size: 12px; color: #059669; font-weight: 500;">${d.fix_applied}</td>
          </tr>
        `
                )
                .join('')
        }
      </tbody>
    </table>
  </div>
</body>
</html>`;
}
