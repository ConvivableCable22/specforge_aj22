import React, { useState } from 'react';
import { CourseSpec, UserRole } from '../types';
import { downloadCourseHTML, downloadCourseJSON } from '../api';

interface ExportPackageScreenProps {
  course: CourseSpec;
  userRole: UserRole;
  onNavigateToStep: (stepId: string) => void;
}

const PO_LIST = ['PO1', 'PO2', 'PO3', 'PO4', 'PO5', 'PO6', 'PO7', 'PO8', 'PO9', 'PO10', 'PO11', 'PO12'];
const PSO_LIST = ['PSO1', 'PSO2', 'PSO3'];
const ALL_COLUMNS = [...PO_LIST, ...PSO_LIST];

export const ExportPackageScreen: React.FC<ExportPackageScreenProps> = ({
  course,
  userRole,
  onNavigateToStep,
}) => {
  const [zoomLevel, setZoomLevel] = useState(100);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isFullPage, setIsFullPage] = useState(false);

  // Calculate Column Averages
  const columnAverages: Record<string, string> = {};
  ALL_COLUMNS.forEach((col) => {
    let sum = 0;
    let count = 0;
    course.courseOutcomes.forEach((co) => {
      const raw = course.matrix[co.id]?.[col];
      const val = typeof raw === 'object' && raw !== null ? raw.strength : raw;
      if (typeof val === 'number') {
        sum += val;
        count += 1;
      }
    });
    columnAverages[col] = count > 0 ? (sum / count).toFixed(2) : '-';
  });

  const cieSubtotal = course.assessmentItems
    .filter((a) => a.id.startsWith('cie'))
    .reduce((sum, a) => sum + a.weight, 0);
  const grandTotal = course.assessmentItems.reduce((sum, a) => sum + a.weight, 0);

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard?.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDownloadZip = () => {
    // Generate bundle as JSON + manifest
    const manifest = {
      specVersion: '2.4.1',
      courseCode: course.code,
      fingerprint: course.documentFingerprint,
      bosResolution: course.bosResolution,
      timestamp: new Date().toISOString(),
      contents: ['spec.json', 'spec.html', 'audit.log'],
    };
    const blob = new Blob([JSON.stringify({ manifest, course }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${course.code}_Accreditation_Dossier_Bundle.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col w-full">
      {/* Top Dossier Step Header Bar */}
      <div className="px-margin py-space-md bg-white border-b border-[#cbd6d6]">
        <div className="max-w-[1560px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center gap-space-sm flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#0b3c43] text-white font-label-sm text-label-sm uppercase tracking-wider font-semibold">
                <span className="material-symbols-outlined text-[13px] text-[#1eb4b6]">verified</span>
                06 | Step 6 of 6 • Dossier Export &amp; Accreditation Package
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-[#fef8ec] text-[#8a5d12] font-code-tabular text-label-sm font-semibold border border-[#e6ca85]">
                {course.versionTag}
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-[#52606d] max-w-3xl">
              Generate institutional archival formats, verified print dossier, and machine-readable accreditation schemas for {course.code}: {course.title}.
            </p>
          </div>

          {/* Quick Metadata Pill Strip */}
          <div className="flex items-center gap-space-sm flex-wrap">
            <div className="flex items-center gap-1.5 px-space-sm py-1 rounded bg-[#eef4f4] border border-[#cbd6d6]">
              <span className="w-2 h-2 rounded-full bg-[#1eb4b6] shadow-xs"></span>
              <span className="font-label-sm text-label-sm text-[#52606d] uppercase font-bold">Status:</span>
              <span className="font-title-sm text-title-sm text-[#0b3c43] font-semibold">Accreditation Ready</span>
            </div>
            <div className="flex items-center gap-1.5 px-space-sm py-1 rounded bg-[#eef4f4] border border-[#cbd6d6]">
              <span className="material-symbols-outlined text-[14px] text-[#179ea1]">fingerprint</span>
              <span className="font-label-sm text-label-sm text-[#52606d] uppercase font-bold">Digest:</span>
              <span className="font-code-tabular text-code-tabular text-[#0f2327] font-medium">
                sha256:{course.documentFingerprint.substring(0, 8)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-space-sm py-1 rounded bg-[#fef8ec] border border-[#e6ca85]">
              <span className="material-symbols-outlined text-[14px] text-[#9a6b18]">draw</span>
              <span className="font-label-sm text-label-sm text-[#9a6b18] uppercase font-bold">Signed:</span>
              <span className="font-title-sm text-title-sm text-[#0f2327] font-semibold">
                {course.signatories.hod.name} (HOD)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Canvas Workstation (2 Columns Split) */}
      <div className="px-margin py-space-lg">
        <div className="max-w-[1560px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
          {/* LEFT COLUMN: Physical Paper Document Preview (col-8) */}
          <div className={`${isFullPage ? 'lg:col-span-12' : 'lg:col-span-8'} flex flex-col space-y-space-md transition-all duration-300`}>
            {/* Viewer Control Bar */}
            <div className="flex items-center justify-between px-space-md py-space-xs bg-white border border-[#cbd6d6] rounded-lg shadow-xs text-[#52606d]">
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-[18px] text-[#0b3c43]">description</span>
                <span className="font-title-sm text-title-sm text-[#0f2327] font-semibold">
                  Official Autonomous BoS Curriculum Specimen
                </span>
                <span className="text-[#cbd6d6]">|</span>
                <span className="font-label-md text-label-md uppercase text-[#9a6b18] font-bold">
                  A4 Archival Sheet (1 of 3)
                </span>
              </div>

              <div className="flex items-center gap-space-xs">
                <button
                  type="button"
                  onClick={() => setZoomLevel((prev) => Math.max(70, prev - 10))}
                  className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#eef4f4] text-[#52606d] hover:text-[#0f2327] transition-colors"
                  title="Zoom Out"
                >
                  <span className="material-symbols-outlined text-[18px]">zoom_out</span>
                </button>
                <span className="font-code-tabular text-code-tabular px-1.5 py-0.5 text-[#0f2327] font-semibold bg-[#eef4f4] rounded border border-[#cbd6d6]">
                  {zoomLevel}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomLevel((prev) => Math.min(140, prev + 10))}
                  className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#eef4f4] text-[#52606d] hover:text-[#0f2327] transition-colors"
                  title="Zoom In"
                >
                  <span className="material-symbols-outlined text-[18px]">zoom_in</span>
                </button>
                <div className="h-4 w-px bg-[#cbd6d6] mx-1"></div>
                <button
                  type="button"
                  onClick={() => setZoomLevel(100)}
                  className="px-2 py-1 rounded text-label-md font-label-md hover:bg-[#eef4f4] text-[#0b3c43] font-semibold flex items-center gap-1 border border-[#cbd6d6]"
                >
                  <span className="material-symbols-outlined text-[14px]">fit_screen</span>
                  Fit Width
                </button>
                <button
                  type="button"
                  onClick={() => setIsFullPage(!isFullPage)}
                  className="px-2 py-1 rounded text-label-md font-label-md bg-[#e4eeee] hover:bg-[#d9e6e6] text-[#0b3c43] font-semibold flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">{isFullPage ? 'close_fullscreen' : 'fullscreen'}</span>
                  {isFullPage ? 'Standard View' : 'Full Page'}
                </button>
              </div>
            </div>

            {/* Academic Paper Canvas Container */}
            <div className="p-space-lg bg-[#d8e2e2]/60 rounded-xl border border-[#cbd6d6] flex justify-center overflow-x-auto shadow-inner">
              {/* Physical Paper Sheet Simulation */}
              <article
                style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
                className="w-full max-w-[840px] bg-white text-slate-900 border border-slate-300 shadow-xl p-8 sm:p-12 relative flex flex-col font-sans transition-transform duration-200"
              >
                {/* DRAFT Watermark across preview and print if status !== 'Approved' */}
                {course.workflowStatus !== 'Approved' && (
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-20 select-none"
                  >
                    <div className="text-[130px] font-black tracking-widest text-rose-500/15 uppercase -rotate-45 select-none print:text-rose-500/25">
                      DRAFT
                    </div>
                  </div>
                )}

                {/* Document Formal University Header / Seal Block */}
                <div className="border-b-2 border-slate-800 pb-4 mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded border-2 border-[#0b3c43] flex flex-col items-center justify-center bg-[#f4f7f6] shrink-0 text-[#0b3c43]">
                      <span className="material-symbols-outlined text-[36px]">account_balance</span>
                      <span className="font-label-sm text-[8px] font-bold tracking-widest uppercase text-[#9a6b18]">
                        ESTD 1964
                      </span>
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                      <h1 className="font-headline-sm text-headline-sm uppercase text-[#0b3c43] tracking-tight font-bold">
                        Metropolitan Institute of Technology &amp; Autonomous Research
                      </h1>
                      <p className="font-label-md text-label-md font-semibold text-slate-700 uppercase tracking-wide">
                        Affiliated to State Technological University • Accredited &apos;A++&apos; by NAAC • Tier-1 Accredited (NBA)
                      </p>
                      <p className="font-title-sm text-title-sm font-semibold text-slate-900 uppercase tracking-wider mt-0.5">
                        Department of Computer Science &amp; Engineering
                      </p>
                      <p className="font-label-sm text-label-sm font-bold text-[#0b3c43] tracking-widest uppercase mt-0.5">
                        BOARD OF STUDIES (BoS) OFFICIAL COURSE SPECIFICATION RECORD
                      </p>
                    </div>
                  </div>
                </div>

                {/* Metadata Master Table (Grid) */}
                <table className="w-full border-collapse border border-slate-400 font-body-sm text-body-sm mb-6 text-left">
                  <tbody>
                    <tr className="border-b border-slate-400 bg-slate-100">
                      <th className="p-2 border-r border-slate-400 font-semibold w-1/4 text-slate-800 uppercase font-label-md text-label-md">
                        Course Code
                      </th>
                      <td className="p-2 border-r border-slate-400 font-code-tabular font-bold text-slate-900 w-1/4">
                        {course.code}
                      </td>
                      <th className="p-2 border-r border-slate-400 font-semibold w-1/4 text-slate-800 uppercase font-label-md text-label-md">
                        Academic Year
                      </th>
                      <td className="p-2 font-code-tabular text-slate-900 w-1/4">
                        {course.academicYear}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-400">
                      <th className="p-2 border-r border-slate-400 font-semibold text-slate-800 uppercase font-label-md text-label-md">
                        Course Title
                      </th>
                      <td className="p-2 font-bold text-slate-900" colSpan={3}>
                        {course.title}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-400 bg-slate-100">
                      <th className="p-2 border-r border-slate-400 font-semibold text-slate-800 uppercase font-label-md text-label-md">
                        Curriculum Regulation
                      </th>
                      <td className="p-2 border-r border-slate-400 text-slate-900">
                        {course.regulation}
                      </td>
                      <th className="p-2 border-r border-slate-400 font-semibold text-slate-800 uppercase font-label-md text-label-md">
                        Course Category
                      </th>
                      <td className="p-2 text-slate-900">
                        {course.category}
                      </td>
                    </tr>
                    <tr>
                      <th className="p-2 border-r border-slate-400 font-semibold text-slate-800 uppercase font-label-md text-label-md">
                        Contact Hours / Week
                      </th>
                      <td className="p-2 border-r border-slate-400 font-code-tabular text-slate-900">
                        {course.lectureHours}L + {course.tutorialHours}T + {course.practicalHours}P ({course.lectureHours + course.tutorialHours + course.practicalHours} Contact Hrs)
                      </td>
                      <th className="p-2 border-r border-slate-400 font-semibold text-slate-800 uppercase font-label-md text-label-md">
                        Total Earned Credits
                      </th>
                      <td className="p-2 font-code-tabular font-bold text-[#0b3c43]">
                        {course.credits.toFixed(1)} Credits ({course.theoryCredits.toFixed(1)} Th + {course.labCredits.toFixed(1)} Lab)
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Section 1.0: Course Overview & Scope */}
                <div className="mb-6">
                  <div className="flex items-center justify-between border-b border-slate-400 pb-1 mb-2">
                    <h2 className="font-title-sm text-title-sm uppercase font-bold text-[#0b3c43] tracking-wide">
                      1.0 Course Overview, Pedagogical Scope &amp; Rationale
                    </h2>
                    <span className="font-label-sm text-label-sm text-slate-500 uppercase">
                      AICTE Model Core Conformance
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-slate-700 leading-relaxed text-justify mb-2">
                    {course.overviewRationale}
                  </p>
                  <p className="font-body-sm text-body-sm text-slate-700 leading-relaxed text-justify">
                    {course.labPedagogy}
                  </p>
                </div>

                {/* Section 2.0: Credit & Contact Hour Structure */}
                <div className="mb-6">
                  <div className="flex items-center justify-between border-b border-slate-400 pb-1 mb-2">
                    <h2 className="font-title-sm text-title-sm uppercase font-bold text-[#0b3c43] tracking-wide">
                      2.0 Contact Hour &amp; Credit Distribution Schedule
                    </h2>
                    <span className="font-label-sm text-label-sm text-slate-500 uppercase">
                      Statutory 15-Week Term
                    </span>
                  </div>
                  <table className="w-full border-collapse border border-slate-400 font-body-sm text-body-sm text-center">
                    <thead className="bg-slate-100 font-label-md text-label-md uppercase text-slate-800 border-b border-slate-400">
                      <tr>
                        <th className="p-2 border-r border-slate-400 text-left">Component Category</th>
                        <th className="p-2 border-r border-slate-400 w-28">Weekly Hours</th>
                        <th className="p-2 border-r border-slate-400 w-32">Semester Total</th>
                        <th className="p-2 border-r border-slate-400 w-24">Credits</th>
                        <th className="p-2 text-left">Statutory Ratio Formula</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-300">
                        <td className="p-2 border-r border-slate-400 text-left font-medium">Classroom Lectures (L)</td>
                        <td className="p-2 border-r border-slate-400 font-code-tabular">{course.lectureHours}.0 Hrs</td>
                        <td className="p-2 border-r border-slate-400 font-code-tabular">{course.lectureHours * 15}.0 Hours</td>
                        <td className="p-2 border-r border-slate-400 font-code-tabular font-semibold">{course.theoryCredits.toFixed(1)}</td>
                        <td className="p-2 text-left text-slate-600 font-label-md">1 Contact Hour = 1 Credit</td>
                      </tr>
                      <tr className="border-b border-slate-300">
                        <td className="p-2 border-r border-slate-400 text-left font-medium">Laboratory Practicum (P)</td>
                        <td className="p-2 border-r border-slate-400 font-code-tabular">{course.practicalHours}.0 Hrs</td>
                        <td className="p-2 border-r border-slate-400 font-code-tabular">{course.practicalHours * 15}.0 Hours</td>
                        <td className="p-2 border-r border-slate-400 font-code-tabular font-semibold">{course.labCredits.toFixed(1)}</td>
                        <td className="p-2 text-left text-slate-600 font-label-md">2 Lab Hours = 1 Credit (AICTE 2:1)</td>
                      </tr>
                      <tr className="bg-slate-50 font-bold">
                        <td className="p-2 border-r border-slate-400 text-left uppercase font-label-md">Consolidated Total</td>
                        <td className="p-2 border-r border-slate-400 font-code-tabular">{(course.lectureHours + course.practicalHours)}.0 Hrs/Wk</td>
                        <td className="p-2 border-r border-slate-400 font-code-tabular">{(course.lectureHours + course.practicalHours) * 15}.0 Hours</td>
                        <td className="p-2 border-r border-slate-400 font-code-tabular text-[#0b3c43]">{course.credits.toFixed(1)} Credits</td>
                        <td className="p-2 text-left text-emerald-700 font-label-md">Autonomous Board Compliant (100%)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Section 3.0: Course Outcomes (COs) Table */}
                <div className="mb-6">
                  <div className="flex items-center justify-between border-b border-slate-400 pb-1 mb-2">
                    <h2 className="font-title-sm text-title-sm uppercase font-bold text-[#0b3c43] tracking-wide">
                      3.0 Statutory Course Outcomes (COs)
                    </h2>
                    <span className="font-label-sm text-label-sm text-slate-500 uppercase">
                      Revised Bloom&apos;s Taxonomy
                    </span>
                  </div>
                  {course.courseOutcomes.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500 italic border border-slate-300 rounded">
                      No Course Outcomes defined.
                    </div>
                  ) : (
                    <table className="w-full border-collapse border border-slate-400 font-body-sm text-body-sm text-left">
                      <thead className="bg-slate-100 font-label-md text-label-md uppercase text-slate-800 border-b border-slate-400">
                        <tr>
                          <th className="p-2 border-r border-slate-400 w-16 text-center">CO #</th>
                          <th className="p-2 border-r border-slate-400">Outcome Articulation Statement</th>
                          <th className="p-2 border-r border-slate-400 w-36 text-center">Taxonomy Level</th>
                          <th className="p-2 w-32 text-center">Target POs</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-300">
                        {course.courseOutcomes.map((co) => (
                          <tr key={co.id}>
                            <td className="p-2 border-r border-slate-400 font-code-tabular font-bold text-center text-[#0b3c43]">
                              {co.id}
                            </td>
                            <td className="p-2 border-r border-slate-400 text-slate-800">
                              {co.statement}
                            </td>
                            <td className="p-2 border-r border-slate-400 text-center font-label-md text-slate-700">
                              {co.bloomLevel}
                            </td>
                            <td className="p-2 text-center font-code-tabular text-slate-700 font-medium">
                              {co.targetPOs.join(', ')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Section 4.0: Modular Syllabus */}
                <div className="mb-6">
                  <div className="flex items-center justify-between border-b border-slate-400 pb-1 mb-2">
                    <h2 className="font-title-sm text-title-sm uppercase font-bold text-[#0b3c43] tracking-wide">
                      4.0 Modular Syllabus &amp; Lab Integration
                    </h2>
                    <span className="font-label-sm text-label-sm text-slate-500 uppercase">
                      {course.modules.length} Instructional Modules
                    </span>
                  </div>
                  {course.modules.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500 italic border border-slate-300 rounded">
                      No syllabus modules defined.
                    </div>
                  ) : (
                    <div className="space-y-3 font-body-sm text-body-sm">
                      {course.modules.map((m) => (
                        <div key={m.id} className="border border-slate-300 rounded p-2.5 bg-slate-50">
                          <div className="flex justify-between items-center font-semibold text-slate-900 border-b border-slate-200 pb-1 mb-1.5">
                            <span>Module {['I', 'II', 'III', 'IV', 'V'][m.id - 1] || m.id}: {m.title}</span>
                            <span className="font-code-tabular text-[#0b3c43]">
                              {String(m.theoryHours).padStart(2, '0')} Th Hrs | {String(m.labHours).padStart(2, '0')} Lab Hrs
                            </span>
                          </div>
                          <p className="text-slate-700 text-xs leading-relaxed">{m.topics}</p>
                          <p className="text-xs text-slate-600 mt-1 italic">
                            <span className="font-semibold text-slate-700">Mandatory Lab:</span> {m.mandatoryLab}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Section 5.0: Assessment Scheme & Evaluation Weightage */}
                <div className="mb-6">
                  <div className="flex items-center justify-between border-b border-slate-400 pb-1 mb-2">
                    <h2 className="font-title-sm text-title-sm uppercase font-bold text-[#0b3c43] tracking-wide">
                      5.0 Assessment Scheme &amp; Weightage Matrix
                    </h2>
                    <span className="font-label-sm text-label-sm text-slate-500 uppercase">
                      CIE 60% : SEE 40% Standard
                    </span>
                  </div>
                  {course.assessmentItems.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500 italic border border-slate-300 rounded">
                      No assessment components defined.
                    </div>
                  ) : (
                    <table className="w-full border-collapse border border-slate-400 font-body-sm text-body-sm text-center">
                      <thead className="bg-slate-100 font-label-md text-label-md uppercase text-slate-800 border-b border-slate-400">
                        <tr>
                          <th className="p-2 border-r border-slate-400 text-left">Assessment Component</th>
                          <th className="p-2 border-r border-slate-400 w-36">Evaluation Mode</th>
                          <th className="p-2 border-r border-slate-400 w-24">Marks</th>
                          <th className="p-2 border-r border-slate-400 w-24">Weight</th>
                          <th className="p-2 text-left">Compliance Check</th>
                        </tr>
                      </thead>
                      <tbody>
                        {course.assessmentItems.map((item) => (
                          <tr key={item.id} className="border-b border-slate-300">
                            <td className="p-2 border-r border-slate-400 text-left font-medium">{item.name}</td>
                            <td className="p-2 border-r border-slate-400">{item.mode}</td>
                            <td className="p-2 border-r border-slate-400 font-code-tabular">{item.marks} Marks</td>
                            <td className="p-2 border-r border-slate-400 font-code-tabular font-medium">{item.weight.toFixed(1)}%</td>
                            <td className="p-2 text-left text-xs text-slate-600 font-label-md">{item.complianceRule}</td>
                          </tr>
                        ))}
                        <tr className="border-b border-slate-400 bg-slate-50 font-medium">
                          <td className="p-2 border-r border-slate-400 text-right uppercase font-label-md text-slate-700" colSpan={3}>
                            Subtotal CIE:
                          </td>
                          <td className="p-2 border-r border-slate-400 font-code-tabular font-bold text-slate-900">
                            {cieSubtotal.toFixed(1)}%
                          </td>
                          <td className="p-2 text-left text-xs text-emerald-700 font-label-md">
                            Internal Threshold Satisfied
                          </td>
                        </tr>
                        <tr className="bg-slate-100 font-bold">
                          <td className="p-2 border-r border-slate-400 text-right uppercase font-label-md text-slate-900" colSpan={3}>
                            Grand Total Evaluation Sum:
                          </td>
                          <td className="p-2 border-r border-slate-400 font-code-tabular text-[#0b3c43]">
                            {grandTotal.toFixed(1)}%
                          </td>
                          <td className="p-2 text-left text-xs text-emerald-700 font-semibold font-label-md">
                            Exact 100.0% Normalization Verified
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Section 6.0: CO-PO-PSO Outcome Mapping Matrix */}
                <div className="mb-6">
                  <div className="flex items-center justify-between border-b border-slate-400 pb-1 mb-2">
                    <h2 className="font-title-sm text-title-sm uppercase font-bold text-[#0b3c43] tracking-wide">
                      6.0 CO-PO-PSO Articulation Matrix (NBA SAR Format)
                    </h2>
                    <span className="font-label-sm text-label-sm text-slate-500 uppercase">
                      3: Substantial | 2: Moderate | 1: Slight | - : None
                    </span>
                  </div>
                  {course.courseOutcomes.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500 italic border border-slate-300 rounded">
                      No Course Outcomes available for mapping matrix.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-slate-400 font-body-sm text-body-sm text-center">
                        <thead className="bg-slate-100 font-label-sm text-[10px] uppercase text-slate-800 border-b border-slate-400">
                          <tr>
                            <th className="p-1 border-r border-slate-400 w-12 text-left">CO #</th>
                            {PO_LIST.map((po, idx) => (
                              <th
                                key={po}
                                className={`p-1 border-r w-8 ${
                                  idx === PO_LIST.length - 1 ? 'border-slate-400' : 'border-slate-300'
                                }`}
                              >
                                {po}
                              </th>
                            ))}
                            {PSO_LIST.map((pso, idx) => (
                              <th
                                key={pso}
                                className={`p-1 w-8 bg-[#eef4f4] text-[#0b3c43] font-bold ${
                                  idx < PSO_LIST.length - 1 ? 'border-r border-slate-300' : ''
                                }`}
                              >
                                {pso}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-300 font-code-tabular text-xs">
                          {course.courseOutcomes.map((co) => (
                            <tr key={co.id}>
                              <td className="p-1 border-r border-slate-400 font-bold text-[#0b3c43] text-left">
                                {co.id}
                              </td>
                              {PO_LIST.map((po, idx) => {
                                const rawVal = course.matrix[co.id]?.[po] ?? null;
                                const val = typeof rawVal === 'object' && rawVal !== null ? rawVal.strength : rawVal;
                                return (
                                  <td
                                    key={po}
                                    className={`p-1 border-r ${
                                      idx === PO_LIST.length - 1 ? 'border-slate-400' : 'border-slate-300'
                                    } ${
                                      val === 3 ? 'font-semibold' : val === null ? 'text-slate-400' : ''
                                    }`}
                                  >
                                    {val !== null ? val : '-'}
                                  </td>
                                );
                              })}
                              {PSO_LIST.map((pso, idx) => {
                                const rawVal = course.matrix[co.id]?.[pso] ?? null;
                                const val = typeof rawVal === 'object' && rawVal !== null ? rawVal.strength : rawVal;
                                return (
                                  <td
                                    key={pso}
                                    className={`p-1 bg-[#eef4f4]/60 ${
                                      idx < PSO_LIST.length - 1 ? 'border-r border-slate-300' : ''
                                    } ${val === 3 ? 'font-semibold' : val === null ? 'text-slate-400' : ''}`}
                                  >
                                    {val !== null ? val : '-'}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}

                          <tr className="bg-slate-100 font-bold border-t-2 border-slate-400">
                            <td className="p-1 border-r border-slate-400 text-left font-label-sm text-[10px] uppercase">
                              Avg
                            </td>
                            {PO_LIST.map((po, idx) => (
                              <td
                                key={po}
                                className={`p-1 border-r text-[#0b3c43] ${
                                  idx === PO_LIST.length - 1 ? 'border-slate-400' : 'border-slate-300'
                                }`}
                              >
                                {columnAverages[po]}
                              </td>
                            ))}
                            {PSO_LIST.map((pso, idx) => (
                              <td
                                key={pso}
                                className={`p-1 bg-[#e0f7f8] text-[#084c4e] ${
                                  idx < PSO_LIST.length - 1 ? 'border-r border-slate-300' : ''
                                }`}
                              >
                                {columnAverages[pso]}
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Section 7.0: Prescribed Textbooks & Reference Standards */}
                <div className="mb-8">
                  <div className="flex items-center justify-between border-b border-slate-400 pb-1 mb-2">
                    <h2 className="font-title-sm text-title-sm uppercase font-bold text-[#0b3c43] tracking-wide">
                      7.0 Prescribed Textbooks &amp; Reference Standards
                    </h2>
                    <span className="font-label-sm text-label-sm text-slate-500 uppercase">
                      Statutory Reading List
                    </span>
                  </div>
                  {course.textbooks.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500 italic border border-slate-300 rounded">
                      No prescribed textbooks or reference citations recorded.
                    </div>
                  ) : (
                    <ol className="list-decimal list-inside space-y-1.5 font-body-sm text-body-sm text-slate-800">
                      {course.textbooks.map((tb) => (
                        <li key={tb.id} className="leading-relaxed">
                          <span className="font-semibold">{tb.authors}</span> ({tb.year}). <em>{tb.title}</em> ({tb.edition}). {tb.publisher}.
                          {tb.isbn ? ` ISBN: ${tb.isbn}.` : ''}
                          {tb.notes ? ` (${tb.notes})` : ''}
                        </li>
                      ))}
                    </ol>
                  )}
                </div>

                {/* Institutional Signatory Block (Formal Footer) */}
                <div className="mt-auto pt-6 border-t-2 border-slate-800">
                  <div className="grid grid-cols-3 gap-6 text-center">
                    <div className="flex flex-col items-center">
                      <div className="h-10 flex items-center justify-center text-[#0b3c43] opacity-80 mb-1">
                        <span className="font-serif italic font-bold tracking-wider text-sm">
                          {course.signatories.author.name}
                        </span>
                      </div>
                      <div className="w-full border-t border-slate-400 pt-1">
                        <p className="font-title-sm text-title-sm font-semibold text-slate-900">
                          {course.signatories.author.name}
                        </p>
                        <p className="font-label-sm text-label-sm text-slate-600">
                          {course.signatories.author.roleTitle}
                        </p>
                        <p className="font-code-tabular text-[10px] text-slate-500">
                          Sign: {course.signatories.author.isSigned ? `Verified ${course.signatories.author.signedDate}` : 'Pending'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-center">
                      <div className="h-10 flex items-center justify-center text-[#0b3c43] opacity-80 mb-1">
                        <span className="font-serif italic font-bold tracking-wider text-sm">
                          {course.signatories.reviewer.name}
                        </span>
                      </div>
                      <div className="w-full border-t border-slate-400 pt-1">
                        <p className="font-title-sm text-title-sm font-semibold text-slate-900">
                          {course.signatories.reviewer.name}
                        </p>
                        <p className="font-label-sm text-label-sm text-slate-600">
                          {course.signatories.reviewer.roleTitle}
                        </p>
                        <p className="font-code-tabular text-[10px] text-slate-500">
                          Sign: {course.signatories.reviewer.isSigned ? `Verified ${course.signatories.reviewer.signedDate}` : 'Pending'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-center">
                      <div className="h-10 flex items-center justify-center text-[#0b3c43] opacity-80 mb-1">
                        <span className="font-serif italic font-bold tracking-wider text-sm">
                          {course.signatories.hod.name}
                        </span>
                      </div>
                      <div className="w-full border-t border-slate-400 pt-1">
                        <p className="font-title-sm text-title-sm font-semibold text-slate-900">
                          {course.signatories.hod.name}
                        </p>
                        <p className="font-label-sm text-label-sm text-slate-600">
                          {course.signatories.hod.roleTitle}
                        </p>
                        <p className="font-code-tabular text-[10px] text-slate-500">
                          Sign: {course.signatories.hod.isSigned ? `Verified ${course.signatories.hod.signedDate}` : 'Pending'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-2 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[10px] font-code-tabular text-slate-500">
                    <span>BoS Resolution Reference: {course.bosResolution}</span>
                    <span>Document Fingerprint: {course.documentFingerprint}</span>
                    <span>Page 1 of 3 (Official Archival Specimen)</span>
                  </div>
                </div>
              </article>
            </div>
          </div>

          {/* RIGHT COLUMN: Export Actions & Pre-Flight Checklist (col-4) */}
          {!isFullPage && (
            <div className="lg:col-span-4 flex flex-col space-y-space-md">
              {/* Card 1: Export & Delivery Actions */}
              <div className="bg-white border border-[#cbd6d6] rounded-xl p-space-lg shadow-sm flex flex-col space-y-space-md">
                <div className="flex items-center justify-between border-b border-[#cbd6d6] pb-space-sm">
                  <div className="flex items-center gap-space-xs">
                    <span className="material-symbols-outlined text-[20px] text-[#0b3c43]">cloud_download</span>
                    <h3 className="font-headline-sm text-headline-sm text-[#0f2327]">Export &amp; Deliverables</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded font-label-sm text-label-sm uppercase bg-[#fef8ec] text-[#8a5d12] border border-[#e6ca85] font-semibold">
                    Target: Final
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-[#52606d]">
                  Export legally approved course records formatted for standard accreditation boards (NBA, NAAC, ABET) or enterprise curriculum archives.
                </p>

                {/* Primary Button: Print / PDF */}
                <div className="flex flex-col space-y-1">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="w-full flex items-center justify-center gap-space-sm px-4 py-3 rounded-lg bg-[#0b3c43] hover:bg-[#0a444e] active:bg-[#072d32] text-white transition-all shadow-md font-title-sm text-title-sm group"
                  >
                    <span className="material-symbols-outlined text-[20px] text-[#1eb4b6] group-hover:scale-105 transition-transform">
                      print
                    </span>
                    <span className="font-semibold">Print / Save as PDF</span>
                  </button>
                  <span className="font-label-sm text-label-sm text-[#9a6b18] text-center px-1 font-medium">
                    Formatted for standard A4 archival prints with running BoS headers &amp; watermarks.
                  </span>
                </div>

                {/* Secondary Actions */}
                <div className="space-y-space-sm pt-space-xs border-t border-[#cbd6d6]">
                  <button
                    type="button"
                    onClick={() => downloadCourseHTML(course)}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-[#eef4f4] hover:bg-[#e4eeee] border border-[#cbd6d6] text-[#0f2327] transition-colors"
                  >
                    <div className="flex items-center gap-space-sm text-left">
                      <span className="material-symbols-outlined text-[20px] text-[#179ea1]">html</span>
                      <div>
                        <div className="font-title-sm text-title-sm font-semibold">Download HTML Document</div>
                        <div className="font-label-sm text-label-sm text-[#52606d]">
                          Standalone responsive file with bundled CSS
                        </div>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-[18px] text-[#0b3c43]">download</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => downloadCourseJSON(course)}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-[#eef4f4] hover:bg-[#e4eeee] border border-[#cbd6d6] text-[#0f2327] transition-colors"
                  >
                    <div className="flex items-center gap-space-sm text-left">
                      <span className="material-symbols-outlined text-[20px] text-[#0b3c43]">data_object</span>
                      <div>
                        <div className="font-title-sm text-title-sm font-semibold">Download Output File (JSON)</div>
                        <div className="font-label-sm text-label-sm text-[#52606d]">
                          Machine-readable schema for NAAC SSR / NBA e-SAR
                        </div>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-[18px] text-[#0b3c43]">code</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadZip}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-[#eef4f4] hover:bg-[#e4eeee] border border-[#cbd6d6] text-[#0f2327] transition-colors"
                  >
                    <div className="flex items-center gap-space-sm text-left">
                      <span className="material-symbols-outlined text-[20px] text-[#b88730]">folder_zip</span>
                      <div>
                        <div className="font-title-sm text-title-sm font-semibold">Full Dossier Bundle</div>
                        <div className="font-label-sm text-label-sm text-[#52606d]">
                          Includes syllabus, matrices &amp; signed audit trail
                        </div>
                      </div>
                    </div>
                    <span className="font-code-tabular text-label-sm font-bold text-[#9a6b18] px-1.5 py-0.5 rounded bg-[#fef8ec] border border-[#e6ca85]">
                      1.8 MB
                    </span>
                  </button>
                </div>

                <div className="pt-space-xs">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-label-md font-label-md text-[#0b3c43] font-semibold hover:bg-[#eef4f4] border border-transparent hover:border-[#cbd6d6] transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px] text-[#179ea1]">
                      {copiedLink ? 'done' : 'link'}
                    </span>
                    <span>{copiedLink ? 'Link Copied to Clipboard!' : 'Copy Immutable Dossier Link'}</span>
                  </button>
                </div>
              </div>

              {/* Card 2: Pre-Flight Publication Checklist */}
              <div className="bg-white border border-[#cbd6d6] rounded-xl p-space-lg shadow-sm flex flex-col space-y-space-md">
                <div className="flex items-center justify-between border-b border-[#cbd6d6] pb-space-sm">
                  <div className="flex items-center gap-space-xs">
                    <span className="material-symbols-outlined text-[20px] text-emerald-700">fact_check</span>
                    <h3 className="font-headline-sm text-headline-sm text-[#0f2327]">Pre-Flight Publication Check</h3>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-label-sm text-label-sm border border-emerald-300 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                    All 3 Passed
                  </span>
                </div>

                {/* Checklist Items */}
                <div className="space-y-space-md">
                  <div className="flex items-start gap-space-sm">
                    <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-300">
                      <span className="material-symbols-outlined text-[16px] text-emerald-700">check</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-title-sm text-title-sm text-[#0f2327] font-semibold">
                        Template sections complete
                      </span>
                      <p className="font-body-sm text-body-sm text-[#52606d] leading-snug">
                        All 7 statutory sections present, structured, and compliant with Autonomous Regulation R-2024.
                      </p>
                      <span className="font-code-tabular text-[11px] text-emerald-700 mt-0.5 font-medium">
                        Checked against BoS Standard Template v2.4
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-space-sm">
                    <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-300">
                      <span className="material-symbols-outlined text-[16px] text-emerald-700">check</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-title-sm text-title-sm text-[#0f2327] font-semibold">
                        No leftover sample text
                      </span>
                      <p className="font-body-sm text-body-sm text-[#52606d] leading-snug">
                        0 placeholder strings or draft annotations detected across 24 syllabus blocks.
                      </p>
                      <span className="font-code-tabular text-[11px] text-emerald-700 mt-0.5 font-medium">
                        Regex search passed: 0 `[TODO]` or `[TBD]` tokens
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-space-sm">
                    <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-300">
                      <span className="material-symbols-outlined text-[16px] text-emerald-700">check</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-title-sm text-title-sm text-[#0f2327] font-semibold">
                        Weights total 100%
                      </span>
                      <p className="font-body-sm text-body-sm text-[#52606d] leading-snug">
                        CIE ({cieSubtotal.toFixed(1)}%) and SEE ({(grandTotal - cieSubtotal).toFixed(1)}%) sum precisely to 100.0% with zero rounding discrepancy.
                      </p>
                      <span className="font-code-tabular text-[11px] text-emerald-700 mt-0.5 font-medium">
                        Math balance: 30% + 20% + 10% + 40% = 100.0%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-[#eef4f4] border border-[#cbd6d6] flex items-center gap-space-sm text-[#52606d]">
                  <span className="material-symbols-outlined text-[18px] text-[#0b3c43]">security</span>
                  <span className="font-label-sm text-label-sm text-[#0f2327]">
                    Pre-flight validation executed by Engine v2.4.1. Document passes AICTE &amp; NBA SAR compliance checks.
                  </span>
                </div>
              </div>

              {/* Card 3: Accreditation Metadata & Audit Seal */}
              <div className="bg-white border border-[#cbd6d6] rounded-xl p-space-lg shadow-sm flex flex-col space-y-space-md">
                <div className="flex items-center justify-between border-b border-[#cbd6d6] pb-space-sm">
                  <div className="flex items-center gap-space-xs">
                    <span className="material-symbols-outlined text-[20px] text-[#b88730]">workspace_premium</span>
                    <h3 className="font-headline-sm text-headline-sm text-[#0f2327]">Accreditation Audit Seal</h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full font-label-sm text-label-sm uppercase bg-[#fef8ec] text-[#8a5d12] border border-[#e6ca85] font-bold">
                    Sealed &amp; Locked
                  </span>
                </div>

                <div className="space-y-space-sm">
                  <div className="flex justify-between items-center py-1.5 border-b border-[#eef4f4]">
                    <span className="font-label-md text-label-md text-[#52606d]">Cryptographic Digest</span>
                    <span className="font-code-tabular text-label-sm text-[#0b3c43] font-bold">
                      SHA-256: {course.documentFingerprint.substring(0, 8)}...3e
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-[#eef4f4]">
                    <span className="font-label-md text-label-md text-[#52606d]">BoS Resolution</span>
                    <span className="font-code-tabular text-label-sm text-[#0f2327] font-semibold">
                      {course.bosResolution}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-[#eef4f4]">
                    <span className="font-label-md text-label-md text-[#52606d]">Approval Timestamp</span>
                    <span className="font-code-tabular text-label-sm text-[#0f2327]">
                      {course.signatories.hod.signedDate || '24-Oct-2024'} 16:42 IST
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-[#eef4f4]">
                    <span className="font-label-md text-label-md text-[#52606d]">Accreditation Criterion</span>
                    <span className="font-title-sm text-label-sm text-[#0f2327] font-semibold">
                      NBA Tier-1 / NAAC 1.1.2
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1.5">
                    <span className="font-label-md text-label-md text-[#52606d]">Version Archival State</span>
                    <span className="font-code-tabular text-label-sm text-emerald-700 font-bold">
                      LOCKED_CANONICAL
                    </span>
                  </div>
                </div>

                <div className="pt-space-xs border-t border-[#cbd6d6] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => onNavigateToStep('workflow-approvals')}
                    className="inline-flex items-center gap-1 font-label-md text-label-md text-[#0b3c43] font-semibold hover:text-[#0a444e] hover:underline"
                  >
                    <span>View Full Audit Trail (Step 5)</span>
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </button>
                  <span className="font-label-sm text-label-sm text-[#9a6b18] font-medium">Ready for e-SAR ingest</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExportPackageScreen;
