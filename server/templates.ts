import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';
import { ParsedCourseSpec } from './schema';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATES_DIR = path.resolve(__dirname, '..', 'templates');

export type TemplateType = 'integrated' | 'non-lab';

export interface TemplateDetectionResult {
  detected: TemplateType;
  signals: string[];
  templateFile: string;
}

export function detectTemplate(spec: ParsedCourseSpec): TemplateDetectionResult {
  const practicalValue = spec.credits.practical ?? 0;
  const courseType = (spec.courseType || '').toLowerCase();
  const signals: string[] = [];

  const hasPractical = practicalValue > 0;
  const hasLabInType = courseType.includes('laboratory') || courseType.includes('lab');

  if (hasPractical) {
    signals.push(`Non-zero Practical value in credit structure: P = ${practicalValue}`);
  }
  if (hasLabInType) {
    signals.push(`Course type contains 'laboratory': "${spec.courseType}"`);
  }

  if (hasPractical || hasLabInType) {
    return {
      detected: 'integrated',
      signals,
      templateFile: 'integrated.html',
    };
  }

  signals.push(`Practical = 0 in credit structure (P = ${practicalValue})`);
  signals.push(`Course type "${spec.courseType}" does not contain 'laboratory'`);
  return {
    detected: 'non-lab',
    signals,
    templateFile: 'non-lab.html',
  };
}

export interface FillTemplateResult {
  html: string;
  templateType: TemplateType;
  detectedTemplate: TemplateType;
  signalsUsed: string[];
  isOverridden: boolean;
  overrideReason?: string;
  sampleStrings: string[];
}

export function fillTemplate(
  spec: ParsedCourseSpec,
  options?: {
    forcedTemplate?: TemplateType;
    overrideReason?: string;
  }
): FillTemplateResult {
  const detection = detectTemplate(spec);
  const activeTemplate: TemplateType = options?.forcedTemplate || detection.detected;
  const isOverridden = Boolean(options?.forcedTemplate && options.forcedTemplate !== detection.detected);

  const filename = activeTemplate === 'integrated' ? 'integrated.html' : 'non-lab.html';
  const filePath = path.join(TEMPLATES_DIR, filename);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Template file not found at path: ${filePath}`);
  }

  const rawTemplate = fs.readFileSync(filePath, 'utf-8');

  // Step 1: Collect sample strings for the validation step
  const sampleStrings: string[] = [];
  const sampleRegex = /\[SAMPLE_[A-Z0-9_]+\][^\n<]+/gi;
  let sMatch;
  while ((sMatch = sampleRegex.exec(rawTemplate)) !== null) {
    sampleStrings.push(sMatch[0].trim());
  }

  // Also collect known placeholders from template
  sampleStrings.push(
    '[SAMPLE_CODE]',
    '[SAMPLE_TITLE]',
    '[SAMPLE_DEPT]',
    '[SAMPLE_OVERVIEW]',
    '[SAMPLE_CO1]',
    '[SAMPLE_UNIT]',
    '[SAMPLE_RESOURCE]'
  );

  // Step 2: Use Cheerio to fill the template
  const $ = cheerio.load(rawTemplate);

  // Update title
  $('#doc-title').text(`${spec.courseCode} - Course Specification Record`);

  // Update metadata
  $('#dept-name').text(spec.department || 'Department of Computer Science & Engineering');
  $('#meta-code').text(spec.courseCode);
  $('#meta-title').text(spec.title);
  $('#meta-cat').text(spec.courseType);

  const totalWeekly = spec.credits.lecture + spec.credits.tutorial + spec.credits.practical;
  $('#meta-hours').text(
    `${spec.credits.lecture}L + ${spec.credits.tutorial}T + ${spec.credits.practical}P (${totalWeekly} Contact Hrs)`
  );
  $('#meta-credits').text(
    `${spec.credits.total.toFixed(1)} Credits (${spec.credits.lecture.toFixed(1)} Th + ${(spec.credits.practical * 0.5).toFixed(1)} Lab)`
  );

  // Course Overview
  const existingOverview = $('#course-overview').text();
  const cleanedOverview = existingOverview.replace(/\[SAMPLE_[A-Z0-9_]+\]/g, '').trim();
  $('#course-overview').text(
    cleanedOverview ||
      `${spec.title} provides comprehensive academic rigor in the theoretical models, design patterns, and systems engineering primitives aligned with Autonomous Regulation R-2024.`
  );

  // Step 3: Course Outcomes and units precedence rule:
  // "Course Outcomes and units come from the blueprint when there is one; everything else from the existing spec."
  const outcomesToUse = (spec.blueprint?.sections && (spec.blueprint as any).courseOutcomes)
    ? (spec.blueprint as any).courseOutcomes
    : spec.courseOutcomes;

  const unitsToUse = (spec.blueprint?.sections && (spec.blueprint as any).units)
    ? (spec.blueprint as any).units
    : spec.units;

  // Fill Course Outcomes table
  const $cosTbody = $('#cos-tbody');
  $cosTbody.empty();
  outcomesToUse.forEach((co: { id: string; statement: string; bloomLevel: string; targetPOs?: string[] }) => {
    const targetPOsStr = co.targetPOs && co.targetPOs.length > 0 ? co.targetPOs.join(', ') : 'PO1, PO2';
    $cosTbody.append(`
      <tr>
        <td style="text-align: center; font-weight: bold; color: var(--primary);">${co.id}</td>
        <td>${co.statement}</td>
        <td style="text-align: center; font-size: 12px;">${co.bloomLevel}</td>
        <td style="text-align: center; font-family: monospace; font-size: 12px;">${targetPOsStr}</td>
      </tr>
    `);
  });

  // Fill Modular Units
  const $unitsContainer = $('#units-container');
  $unitsContainer.empty();
  unitsToUse.forEach((unit: { unitNumber: number; title: string; hours: number; content: string }) => {
    const hoursLabel = activeTemplate === 'integrated'
      ? `${String(unit.hours).padStart(2, '0')} Th Hrs | 06 Lab Hrs`
      : `${String(unit.hours).padStart(2, '0')} Th Hrs`;

    const labSection = activeTemplate === 'integrated'
      ? `<div class="unit-lab">Mandatory Lab: Lab Assignment for ${unit.title}</div>`
      : '';

    $unitsContainer.append(`
      <div class="unit-card">
        <div class="unit-head">
          <span>Unit ${unit.unitNumber}: ${unit.title}</span>
          <span style="color: var(--primary); font-family: monospace;">${hoursLabel}</span>
        </div>
        <div class="unit-content">${unit.content}</div>
        ${labSection}
      </div>
    `);
  });

  // Fill Teaching Hours Table
  const $teachingHoursTbody = $('#teaching-hours-table tbody');
  if (spec.teachingHoursTable && spec.teachingHoursTable.length > 0) {
    $teachingHoursTbody.empty();
    spec.teachingHoursTable.forEach((row) => {
      $teachingHoursTbody.append(`
        <tr>
          <td>${row.component}</td>
          <td style="text-align: center; font-family: monospace;">${row.weeklyHours}.0 Hrs</td>
          <td style="text-align: center; font-family: monospace;">${row.semesterHours}.0 Hours</td>
          <td style="text-align: center; font-family: monospace; font-weight: 600;">${row.credits.toFixed(1)}</td>
          <td style="font-size: 11px; color: #64748b;">Autonomous Regulation Compliant</td>
        </tr>
      `);
    });
  }

  // Fill Assessment Table
  const $assessmentTbody = $('#assessment-tbody');
  if (spec.assessmentTable && spec.assessmentTable.length > 0) {
    $assessmentTbody.empty();
    spec.assessmentTable.forEach((row) => {
      $assessmentTbody.append(`
        <tr>
          <td>${row.component}</td>
          <td>${row.mode}</td>
          <td style="text-align: center; font-family: monospace;">${row.marks} Marks</td>
          <td style="text-align: center; font-family: monospace; font-weight: bold;">${row.weightPercentage.toFixed(1)}%</td>
        </tr>
      `);
    });
  }

  // Fill Resources
  const $resourcesList = $('#resources-list');
  if (spec.resources && spec.resources.length > 0) {
    $resourcesList.empty();
    spec.resources.forEach((res) => {
      $resourcesList.append(`
        <li><strong>${res.authors}</strong> - <em>${res.title}</em> (${res.publisherYear}).</li>
      `);
    });
  }

  return {
    html: $.html(),
    templateType: activeTemplate,
    detectedTemplate: detection.detected,
    signalsUsed: detection.signals,
    isOverridden,
    overrideReason: options?.overrideReason,
    sampleStrings,
  };
}
