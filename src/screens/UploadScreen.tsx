import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CourseSpec, ParsedCourseSpec, UserRole } from '../types';
import { getAIHeaders } from '../api';

interface UploadScreenProps {
  course: CourseSpec;
  onUpdateCourse: (updater: (prev: CourseSpec) => CourseSpec) => void;
  userRole: UserRole;
  onNext: () => void;
}

const ACCEPTED_EXTENSIONS = '.docx,.pdf,.html,.htm,.doc';

export const UploadScreen: React.FC<UploadScreenProps> = ({
  course,
  onUpdateCourse,
  userRole,
  onNext,
}) => {
  const canEdit = userRole === 'Author';

  const [specFile, setSpecFile] = useState<File | null>(null);
  const [blueprintFile, setBlueprintFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSampleLoaded, setIsSampleLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedCourseSpec | null>(null);
  const [isJsonExpanded, setIsJsonExpanded] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);

  // Template Selection & Cheerio Filling States
  const [templateType, setTemplateType] = useState<'integrated' | 'non-lab'>('integrated');
  const [detectedTemplate, setDetectedTemplate] = useState<'integrated' | 'non-lab'>('integrated');
  const [signalsUsed, setSignalsUsed] = useState<string[]>([]);
  const [isManualOverride, setIsManualOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [sampleStrings, setSampleStrings] = useState<string[]>([]);
  const [filledHtml, setFilledHtml] = useState<string>('');
  const [isFillingTemplate, setIsFillingTemplate] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [showSampleStringsList, setShowSampleStringsList] = useState(false);

  // Drag states
  const [specDrag, setSpecDrag] = useState(false);
  const [blueprintDrag, setBlueprintDrag] = useState(false);

  const specInputRef = useRef<HTMLInputElement>(null);
  const blueprintInputRef = useRef<HTMLInputElement>(null);

  // Function to request filled template from server
  const fetchFilledTemplate = useCallback(
    async (
      data: ParsedCourseSpec,
      forced?: 'integrated' | 'non-lab',
      reason?: string
    ) => {
      setIsFillingTemplate(true);
      try {
        const res = await fetch('/api/v1/fill-template', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            spec: data,
            forcedTemplate: forced,
            overrideReason: reason,
          }),
        });
        const result = await res.json();
        if (result.success) {
          setFilledHtml(result.html);
          setDetectedTemplate(result.detectedTemplate);
          setTemplateType(result.templateType);
          setSignalsUsed(result.signalsUsed || []);
          setIsManualOverride(result.isOverridden);
          if (result.overrideReason) setOverrideReason(result.overrideReason);
          setSampleStrings(result.sampleStrings || []);

          // Sync into course state for step 4 audit
          onUpdateCourse((prev) => ({
            ...prev,
            templateSelection: {
              detected: result.detectedTemplate,
              selected: result.templateType,
              isOverridden: result.isOverridden,
              overrideReason: result.overrideReason,
              signals: result.signalsUsed || [],
              sampleStrings: result.sampleStrings || [],
              filledHtml: result.html,
            },
          }));
        }
      } catch (err) {
        console.warn('Failed to fill template on server:', err);
      } finally {
        setIsFillingTemplate(false);
      }
    },
    [onUpdateCourse]
  );

  const handleSpecSelect = (file: File) => {
    setErrorMessage(null);
    setSpecFile(file);
  };

  const handleBlueprintSelect = (file: File) => {
    setErrorMessage(null);
    setBlueprintFile(file);
  };

  const handleParseSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!specFile) {
      setErrorMessage('Please select a course specification document (.docx, .pdf, .html, or .doc).');
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    setApplySuccess(false);

    try {
      const formData = new FormData();
      formData.append('spec', specFile);
      if (blueprintFile) {
        formData.append('blueprint', blueprintFile);
      }

      const headers = getAIHeaders();

      const response = await fetch('/api/v1/parse', {
        method: 'POST',
        headers: {
          'x-llm-provider': headers['x-llm-provider'] || '',
          'x-llm-key': headers['x-llm-key'] || '',
          'x-llm-model': headers['x-llm-model'] || '',
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || `HTTP error ${response.status}`);
      }

      setParsedData(result.data);
      // Automatically detect and fill template with Cheerio
      await fetchFilledTemplate(result.data);
    } catch (err: any) {
      console.error('Error parsing files:', err);
      setErrorMessage(err.message || 'An unexpected error occurred during extraction.');
    } finally {
      setIsUploading(false);
    }
  };

  // Helper to load realistic sample spec for testing
  const handleLoadSample = async () => {
    const sampleHtml = `
      <h1>Metropolitan Institute of Technology & Autonomous Research</h1>
      <h2>Department of Computer Science & Engineering</h2>
      <p>Course Code: CS302 | Academic Year: 2024-2025</p>
      <p>Course Title: Operating Systems & Systems Programming</p>
      <p>Credits L:T:P: 3:0:2 (Total 4.0 Credits)</p>
      <p>Category: Professional Core (PCC) / Integrated (T+P)</p>
      <h3>Course Outcomes</h3>
      <ul>
        <li>CO1: Explain operating system kernel architectures and process abstractions. (L2: Understand)</li>
        <li>CO2: Construct multi-threaded concurrent pipelines using POSIX mutex synchronizers. (L3: Apply)</li>
        <li>CO3: Analyze CPU scheduling algorithms and deadlocks prevention conditions. (L4: Analyze)</li>
        <li>CO4: Evaluate virtual memory demand paging algorithms and TLB translation delays. (L5: Evaluate)</li>
        <li>CO5: Appraise disk arm scheduling and journaling file system architectures. (L5: Evaluate)</li>
        <li>CO6: Formulate security protection policies using capability lists and containers. (L6: Create)</li>
      </ul>
      <h3>Modular Syllabus</h3>
      <p>Module 1: OS Structure & Process Abstraction - Monolithic vs microkernels; Trap handling; Fork-exec UNIX API. (9 Hours)</p>
      <p>Module 2: Concurrency, Synchronization & Deadlocks - Race conditions; Peterson algorithm; Semaphores. (9 Hours)</p>
      <p>Module 3: Memory Architecture - Page tables; TLB; Page replacement (LRU, Clock); Thrashing. (9 Hours)</p>
      <p>Module 4: Mass Storage & Virtual File Systems - Disk arm scheduling; Inodes; Ext4 vs ZFS; VFS. (9 Hours)</p>
      <p>Module 5: Protection & Virtualization - Access control matrices; Hypervisors; Cgroups & namespaces. (9 Hours)</p>
    `;

    const sampleFile = new File([sampleHtml], 'CS302_Syllabus_Specification.html', { type: 'text/html' });
    setSpecFile(sampleFile);
    setErrorMessage(null);

    // Initial synthetic parsed data
    const initialParsed: ParsedCourseSpec = {
      courseCode: 'CS302',
      title: 'Operating Systems & Systems Programming',
      department: 'Department of Computer Science & Engineering',
      credits: { lecture: 3, tutorial: 0, practical: 2, total: 4.0, ltpString: '3:0:2' },
      courseType: 'Professional Core (PCC) / Integrated (T+P)',
      courseOutcomes: [
        { id: 'CO1', statement: 'Explain operating system kernel architectures and process abstractions.', leadingVerb: 'Explain', bloomLevel: 'L2: Understand', targetPOs: ['PO1', 'PO2'] },
        { id: 'CO2', statement: 'Construct multi-threaded concurrent pipelines using POSIX mutex synchronizers.', leadingVerb: 'Construct', bloomLevel: 'L3: Apply', targetPOs: ['PO1', 'PO3', 'PSO1'] },
        { id: 'CO3', statement: 'Analyze CPU scheduling algorithms and deadlocks prevention conditions.', leadingVerb: 'Analyze', bloomLevel: 'L4: Analyze', targetPOs: ['PO2', 'PO4'] },
        { id: 'CO4', statement: 'Evaluate virtual memory demand paging algorithms and TLB translation delays.', leadingVerb: 'Evaluate', bloomLevel: 'L5: Evaluate', targetPOs: ['PO3', 'PO5', 'PSO2'] },
        { id: 'CO5', statement: 'Appraise disk arm scheduling and journaling file system architectures.', leadingVerb: 'Appraise', bloomLevel: 'L5: Evaluate', targetPOs: ['PO4', 'PO5'] },
        { id: 'CO6', statement: 'Formulate security protection policies using capability lists and containers.', leadingVerb: 'Formulate', bloomLevel: 'L6: Create', targetPOs: ['PO6', 'PO8', 'PSO3'] },
      ],
      units: [
        { unitNumber: 1, title: 'OS Structure & Process Abstraction', content: 'Monolithic vs microkernels; Trap handling; Fork-exec UNIX API.', hours: 9 },
        { unitNumber: 2, title: 'Concurrency, Synchronization & Deadlocks', content: 'Race conditions; Peterson algorithm; Semaphores.', hours: 9 },
        { unitNumber: 3, title: 'Memory Architecture', content: 'Page tables; TLB; Page replacement (LRU, Clock); Thrashing.', hours: 9 },
        { unitNumber: 4, title: 'Mass Storage & Virtual File Systems', content: 'Disk arm scheduling; Inodes; Ext4 vs ZFS; VFS.', hours: 9 },
        { unitNumber: 5, title: 'Protection & Virtualization', content: 'Access control matrices; Hypervisors; Cgroups & namespaces.', hours: 9 },
      ],
      copoMap: {
        CO1: { PO1: 3, PO2: 2, PSO1: 3 },
        CO2: { PO1: 3, PO3: 3, PSO1: 3, PSO2: 3 },
        CO3: { PO2: 3, PO4: 3, PSO1: 3 },
        CO4: { PO3: 3, PO5: 3, PSO2: 3 },
        CO5: { PO4: 3, PO5: 3, PSO2: 3 },
        CO6: { PO6: 3, PO8: 3, PSO3: 3 },
      },
      teachingHoursTable: [
        { component: 'Classroom Lectures (L)', weeklyHours: 3, semesterHours: 45, credits: 3 },
        { component: 'Laboratory Practicum (P)', weeklyHours: 2, semesterHours: 30, credits: 1 },
      ],
      assessmentTable: [
        { component: 'CIE Mid-Terms (Theory)', mode: 'Written Proctored Exam', marks: 50, weightPercentage: 30 },
        { component: 'CIE Lab Practicum', mode: 'Weekly Viva + Code Execution', marks: 30, weightPercentage: 20 },
        { component: 'CIE Term Project', mode: 'Peer Review & Git Repository', marks: 20, weightPercentage: 10 },
        { component: 'Semester End Examination (SEE)', mode: 'University Board Exam', marks: 100, weightPercentage: 40 },
      ],
      resources: [
        { type: 'Textbook', authors: 'Silberschatz, A., Galvin, P. B., & Gagne, G.', title: 'Operating System Concepts', publisherYear: 'John Wiley & Sons, 2018 (10th Ed.)' },
        { type: 'Reference', authors: 'Arpaci-Dusseau, R. H., & Arpaci-Dusseau, A. C.', title: 'Operating Systems: Three Easy Pieces', publisherYear: 'Arpaci-Dusseau Books, 2018' },
      ],
    };

    setParsedData(initialParsed);
    setIsSampleLoaded(true);
    await fetchFilledTemplate(initialParsed);
  };

  // Handle Manual Override
  const handleToggleOverride = (target: 'integrated' | 'non-lab') => {
    if (!parsedData) return;
    const isOverride = target !== detectedTemplate;
    setIsManualOverride(isOverride);
    setTemplateType(target);
    fetchFilledTemplate(parsedData, target, isOverride ? overrideReason : undefined);
  };

  const handleReasonChange = (newReason: string) => {
    setOverrideReason(newReason);
    if (parsedData && isManualOverride) {
      fetchFilledTemplate(parsedData, templateType, newReason);
    }
  };

  // Export spec as self-contained spec.html
  const handleExportSpecHtml = () => {
    if (!filledHtml) {
      setErrorMessage('No filled template available to export. Please parse a specification first.');
      return;
    }
    const blob = new Blob([filledHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'spec.html';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  // Export complete validated specforge_output.json
  const handleExportOutputJson = async () => {
    try {
      const inputId = isSampleLoaded ? 'SAMPLE' : (specFile ? specFile.name : 'SPECFORGE-GEN');
      const targetSpec = parsedData || {
        courseCode: course.code,
        title: course.title,
        department: course.department || 'Department of Computer Science & Engineering',
        credits: {
          lecture: course.lectureHours,
          tutorial: course.tutorialHours,
          practical: course.practicalHours,
          total: course.credits,
          ltpString: `${course.lectureHours}:${course.tutorialHours}:${course.practicalHours}`,
        },
        courseType: course.category,
        courseOutcomes: course.courseOutcomes.map((c) => ({
          id: c.id,
          statement: c.statement,
          leadingVerb: c.statement.split(' ')[0] || 'Explain',
          bloomLevel: c.bloomLevel,
          targetPOs: c.targetPOs,
        })),
        units: course.modules.map((m) => ({
          unitNumber: m.id,
          title: m.title,
          content: m.topics,
          hours: m.theoryHours + m.labHours,
        })),
        copoMap: course.matrix,
        teachingHoursTable: [
          { component: 'Classroom Lectures (L)', weeklyHours: course.lectureHours, semesterHours: course.lectureHours * 15, credits: course.theoryCredits },
          { component: 'Laboratory Practicum (P)', weeklyHours: course.practicalHours, semesterHours: course.practicalHours * 15, credits: course.labCredits },
        ],
        assessmentTable: course.assessmentItems.map((a) => ({
          component: a.name,
          mode: a.mode,
          marks: a.marks,
          weightPercentage: a.weight,
        })),
        resources: course.textbooks.map((t) => ({
          type: 'Textbook',
          authors: t.authors,
          title: t.title,
          publisherYear: `${t.publisher}, ${t.year}`,
        })),
      };

      const res = await fetch('/api/v1/export-output', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spec: targetSpec,
          courseSummary: course.overviewRationale,
          copoMatrix: course.copoMatrixWithJustifications || course.matrix,
          templateSelected: templateType,
          workflowStatus: course.workflowStatus || 'Draft',
          inputId,
          auditTrail: course.auditTrail,
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Failed to export output JSON.');
      }

      const blob = new Blob([JSON.stringify(result.output, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'specforge_output.json';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setErrorMessage(`Failed to export specforge_output.json: ${err.message || String(err)}`);
    }
  };

  // Update editable fields in parsedData and refresh template
  const handleUpdateParsedField = <K extends keyof ParsedCourseSpec>(field: K, value: ParsedCourseSpec[K]) => {
    if (!parsedData) return;
    const updated = { ...parsedData, [field]: value };
    setParsedData(updated);
    fetchFilledTemplate(updated, isManualOverride ? templateType : undefined, overrideReason);
  };

  const handleUpdateCO = (index: number, changes: Partial<ParsedCourseSpec['courseOutcomes'][0]>) => {
    if (!parsedData) return;
    const nextCOs = [...parsedData.courseOutcomes];
    nextCOs[index] = { ...nextCOs[index], ...changes };
    const nextData = { ...parsedData, courseOutcomes: nextCOs };
    setParsedData(nextData);
    fetchFilledTemplate(nextData, isManualOverride ? templateType : undefined, overrideReason);
  };

  const handleUpdateUnit = (index: number, changes: Partial<ParsedCourseSpec['units'][0]>) => {
    if (!parsedData) return;
    const nextUnits = [...parsedData.units];
    nextUnits[index] = { ...nextUnits[index], ...changes };
    const nextData = { ...parsedData, units: nextUnits };
    setParsedData(nextData);
    fetchFilledTemplate(nextData, isManualOverride ? templateType : undefined, overrideReason);
  };

  // Sync to application course state
  const handleApplyToPipeline = () => {
    if (!parsedData) return;
    onUpdateCourse((prev) => ({
      ...prev,
      code: parsedData.courseCode || prev.code,
      title: parsedData.title || prev.title,
      department: parsedData.department || prev.department,
      lectureHours: parsedData.credits.lecture,
      tutorialHours: parsedData.credits.tutorial,
      practicalHours: parsedData.credits.practical,
      credits: parsedData.credits.total,
      theoryCredits: parsedData.credits.lecture,
      labCredits: parsedData.credits.practical * 0.5,
      category: parsedData.courseType || prev.category,
      courseOutcomes: parsedData.courseOutcomes.map((co) => ({
        id: co.id,
        statement: co.statement,
        bloomLevel: co.bloomLevel,
        targetPOs: co.targetPOs || ['PO1', 'PO2'],
      })),
      modules: parsedData.units.map((u, i) => ({
        id: u.unitNumber || i + 1,
        title: u.title,
        theoryHours: u.hours || 9,
        labHours: templateType === 'integrated' ? 6 : 0,
        topics: u.content,
        mandatoryLab: templateType === 'integrated' ? `Lab Exp ${i + 1}: Practical laboratory assignment for ${u.title}` : 'None (Theory-only course)',
      })),
      matrix: Object.keys(parsedData.copoMap).length > 0 ? parsedData.copoMap : prev.matrix,
      templateSelection: {
        detected: detectedTemplate,
        selected: templateType,
        isOverridden: isManualOverride,
        overrideReason,
        signals: signalsUsed,
        sampleStrings,
        filledHtml,
      },
    }));

    setApplySuccess(true);
    setTimeout(() => {
      onNext();
    }, 800);
  };

  const handleCopyJson = () => {
    if (!parsedData) return;
    navigator.clipboard?.writeText(JSON.stringify(parsedData, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  return (
    <div className="flex flex-col w-full pb-16">
      {/* Top Dossier Step Header Bar */}
      <div className="px-margin py-space-md bg-white border-b border-[#cbd6d6]">
        <div className="max-w-[1560px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center gap-space-sm flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#0b3c43] text-white font-label-sm text-label-sm uppercase tracking-wider font-semibold">
                <span className="material-symbols-outlined text-[13px] text-[#1eb4b6]">upload_file</span>
                01 | Step 1 of 6 • Course Specification &amp; Question-Paper Intake
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-[#fef8ec] text-[#8a5d12] font-code-tabular text-label-sm font-semibold border border-[#e6ca85]">
                .DOCX • .PDF • .HTML • .DOC
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-[#52606d] max-w-3xl">
              Upload an existing course specification document and optional question-paper blueprint. Server extracts text &amp; tables via Mammoth, pdf-parse, Cheerio &amp; Word-Extractor, automatically selects and populates the official Integrated or Non-Lab HTML template.
            </p>
          </div>

          {/* Quick Pill Strip */}
          <div className="flex items-center gap-space-sm flex-wrap">
            <div className="flex items-center gap-1.5 px-space-sm py-1 rounded bg-[#eef4f4] border border-[#cbd6d6]">
              <span className="w-2 h-2 rounded-full bg-[#1eb4b6]"></span>
              <span className="font-label-sm text-label-sm text-[#52606d] uppercase font-bold">API Route:</span>
              <span className="font-code-tabular text-title-sm text-[#0b3c43] font-semibold">POST /api/v1/parse</span>
            </div>
            <div className="flex items-center gap-1.5 px-space-sm py-1 rounded bg-[#fef8ec] border border-[#e6ca85]">
              <span className="material-symbols-outlined text-[14px] text-[#9a6b18]">admin_panel_settings</span>
              <span className="font-label-sm text-label-sm text-[#9a6b18] uppercase font-bold">Role:</span>
              <span className="font-title-sm text-title-sm text-[#0f2327] font-semibold">{userRole}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Workstation */}
      <div className="px-margin py-space-lg">
        <div className="max-w-[1560px] mx-auto space-y-space-md">
          {/* Permission Notice */}
          {!canEdit && (
            <div className="p-3.5 rounded-xl bg-[#fef8ec] border border-[#e6ca85] flex items-center gap-3">
              <span className="material-symbols-outlined text-[#9a6b18] text-[22px]">info</span>
              <span className="text-xs text-[#6b4907]">
                You are currently in <strong>{userRole}</strong> mode. Document upload, template selection, and editing are reserved for the <strong>Author</strong>. Switch role via header to make modifications.
              </span>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-3">
              <span className="material-symbols-outlined text-red-600 text-[20px] shrink-0">error</span>
              <div>
                <strong className="block font-semibold">Server Extraction Error:</strong>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Ingestion Dropzone Grid: 2 Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
            {/* Card 1: Course Specification (Required) */}
            <div
              onDragOver={(e) => { e.preventDefault(); setSpecDrag(true); }}
              onDragLeave={() => setSpecDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setSpecDrag(false);
                const file = e.dataTransfer.files[0];
                if (file) handleSpecSelect(file);
              }}
              className={`p-6 rounded-xl border-2 border-dashed transition-all bg-white flex flex-col justify-between ${
                specDrag ? 'border-[#179ea1] bg-[#e0f7f8]' : specFile ? 'border-[#0b3c43] bg-teal-50/20' : 'border-[#cbd6d6] hover:border-[#0b3c43]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#0b3c43] text-[22px]">description</span>
                    <h3 className="font-title-md text-title-md font-bold text-[#0f2327]">Course Specification</h3>
                  </div>
                  <span className="font-label-sm text-label-sm uppercase font-bold px-2 py-0.5 rounded bg-red-100 text-red-800">
                    Required
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-[#52606d] mb-4">
                  Upload the full course syllabus document containing course code, L:T:P credits, outcomes, modules, and assessment structure.
                </p>

                {specFile ? (
                  <div className="p-3 rounded-lg border border-[#cbd6d6] bg-white flex items-center justify-between">
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="material-symbols-outlined text-[#179ea1] text-[20px]">check_circle</span>
                      <div className="truncate">
                        <div className="font-semibold text-xs text-[#0f2327] truncate">{specFile.name}</div>
                        <div className="font-code-tabular text-[11px] text-[#52606d]">
                          {(specFile.size / 1024).toFixed(1)} KB • {specFile.name.split('.').pop()?.toUpperCase()}
                        </div>
                      </div>
                    </div>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => setSpecFile(null)}
                        className="p-1 rounded text-slate-400 hover:text-red-600 transition-colors"
                        title="Remove file"
                      >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4 text-xs text-[#52606d]">
                    Drag &amp; drop file here, or click to browse
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-[#cbd6d6] flex items-center justify-between">
                <input
                  ref={specInputRef}
                  type="file"
                  accept={ACCEPTED_EXTENSIONS}
                  className="hidden"
                  disabled={!canEdit}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleSpecSelect(file);
                  }}
                />
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={() => specInputRef.current?.click()}
                  className="px-4 py-1.5 rounded-full bg-[#0b3c43] text-white text-xs font-semibold hover:bg-[#0a444e] transition-colors"
                >
                  Select Spec File
                </button>
                <span className="font-code-tabular text-[11px] text-[#52606d]">.docx, .pdf, .html, .doc</span>
              </div>
            </div>

            {/* Card 2: Question-Paper Blueprint (Optional) */}
            <div
              onDragOver={(e) => { e.preventDefault(); setBlueprintDrag(true); }}
              onDragLeave={() => setBlueprintDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setBlueprintDrag(false);
                const file = e.dataTransfer.files[0];
                if (file) handleBlueprintSelect(file);
              }}
              className={`p-6 rounded-xl border-2 border-dashed transition-all bg-white flex flex-col justify-between ${
                blueprintDrag ? 'border-[#179ea1] bg-[#e0f7f8]' : blueprintFile ? 'border-[#9a6b18] bg-amber-50/20' : 'border-[#cbd6d6] hover:border-[#9a6b18]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#9a6b18] text-[22px]">quiz</span>
                    <h3 className="font-title-md text-title-md font-bold text-[#0f2327]">Question-Paper Blueprint</h3>
                  </div>
                  <span className="font-label-sm text-label-sm uppercase font-bold px-2 py-0.5 rounded bg-[#fef8ec] text-[#8a5d12] border border-[#e6ca85]">
                    Optional
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-[#52606d] mb-4">
                  Optionally upload the question-paper blueprint. When present, Course Outcomes and units are populated directly from this blueprint with highest priority.
                </p>

                {blueprintFile ? (
                  <div className="p-3 rounded-lg border border-[#cbd6d6] bg-white flex items-center justify-between">
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="material-symbols-outlined text-[#9a6b18] text-[20px]">check_circle</span>
                      <div className="truncate">
                        <div className="font-semibold text-xs text-[#0f2327] truncate">{blueprintFile.name}</div>
                        <div className="font-code-tabular text-[11px] text-[#52606d]">
                          {(blueprintFile.size / 1024).toFixed(1)} KB • {blueprintFile.name.split('.').pop()?.toUpperCase()}
                        </div>
                      </div>
                    </div>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => setBlueprintFile(null)}
                        className="p-1 rounded text-slate-400 hover:text-red-600 transition-colors"
                        title="Remove file"
                      >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4 text-xs text-[#52606d]">
                    Drag &amp; drop file here, or click to browse
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-[#cbd6d6] flex items-center justify-between">
                <input
                  ref={blueprintInputRef}
                  type="file"
                  accept={ACCEPTED_EXTENSIONS}
                  className="hidden"
                  disabled={!canEdit}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleBlueprintSelect(file);
                  }}
                />
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={() => blueprintInputRef.current?.click()}
                  className="px-4 py-1.5 rounded-full bg-[#eef4f4] border border-[#cbd6d6] text-[#0b3c43] text-xs font-semibold hover:bg-[#e4eeee] transition-colors"
                >
                  Select Blueprint File
                </button>
                <span className="font-code-tabular text-[11px] text-[#52606d]">.docx, .pdf, .html, .doc</span>
              </div>
            </div>
          </div>

          {/* Action Trigger Bar */}
          <div className="p-4 rounded-xl bg-white border border-[#cbd6d6] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleParseSubmit}
                disabled={isUploading || !specFile || !canEdit}
                className={`px-6 py-2.5 rounded-full text-xs font-semibold flex items-center gap-2 shadow-sm transition-all ${
                  isUploading || !specFile || !canEdit
                    ? 'bg-[#eef4f4] text-[#718182] cursor-not-allowed'
                    : 'bg-[#0b3c43] text-white hover:bg-[#0a444e] cursor-pointer'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isUploading ? 'progress_activity' : 'cloud_sync'}
                </span>
                <span>{isUploading ? 'Extracting & Parsing on Server...' : 'Parse Document (POST /api/v1/parse)'}</span>
              </button>

              <button
                type="button"
                onClick={handleLoadSample}
                disabled={isUploading || !canEdit}
                className="px-4 py-2 rounded-full border border-[#cbd6d6] bg-[#f8fafb] text-[#52606d] text-xs font-semibold hover:bg-[#eef4f4] transition-colors"
              >
                Load Sample Spec (CS302)
              </button>
            </div>

            <div className="text-[11px] text-[#52606d]">
              Extracts text via <strong>mammoth</strong>, <strong>pdf-parse</strong>, <strong>cheerio</strong>, and <strong>word-extractor</strong>
            </div>
          </div>

          {/* TEMPLATE SELECTION CARD (Automatic Detection, Signals & Override) */}
          {parsedData && (
            <div className="bg-white border border-[#cbd6d6] rounded-xl p-space-lg shadow-sm space-y-4 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#cbd6d6] pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[#0b3c43] text-[24px]">view_quilt</span>
                  <div>
                    <h3 className="font-headline-sm text-headline-sm font-semibold text-[#0f2327]">
                      Curriculum Template Selection &amp; Cheerio Population
                    </h3>
                    <p className="font-body-sm text-body-sm text-[#52606d]">
                      Loaded from <code>/templates</code> folder and populated with Cheerio preserving headings, table layouts, and CSS.
                    </p>
                  </div>
                </div>

                {/* Export Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setPreviewModalOpen(true)}
                    className="px-3.5 py-2 rounded-full border border-[#cbd6d6] bg-[#f8fafb] text-[#0f2327] text-xs font-semibold hover:bg-[#eef4f4] flex items-center gap-1.5 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">visibility</span>
                    <span>Preview spec.html</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportSpecHtml}
                    className="px-4 py-2 rounded-full bg-[#0b3c43] hover:bg-[#0a444e] text-white text-xs font-semibold shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px] text-[#1eb4b6]">file_download</span>
                    <span>Export spec (spec.html)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportOutputJson}
                    className="px-4 py-2 rounded-full bg-[#9a6b18] hover:bg-[#835912] text-white text-xs font-semibold shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">data_object</span>
                    <span>Export output (specforge_output.json)</span>
                  </button>
                </div>
              </div>

              {/* Detection Badge & Signal Explanations */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                <div className="md:col-span-6 space-y-3 p-4 rounded-xl bg-[#f8fafb] border border-[#cbd6d6]">
                  <div className="flex items-center justify-between">
                    <span className="font-label-sm uppercase font-bold text-[#52606d]">
                      Detection Engine Result
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full font-label-sm font-bold uppercase border ${
                        detectedTemplate === 'integrated'
                          ? 'bg-[#eef4f4] text-[#0b3c43] border-[#cbd6d6]'
                          : 'bg-[#fef8ec] text-[#8a5d12] border-[#e6ca85]'
                      }`}
                    >
                      {detectedTemplate === 'integrated' ? 'Detected: Integrated' : 'Detected: Non-Lab'}
                    </span>
                  </div>

                  <div className="text-xs space-y-1.5">
                    <span className="font-semibold text-[#0f2327] block">Signals Evaluated:</span>
                    <ul className="space-y-1 text-[#52606d]">
                      {signalsUsed.map((sig, i) => (
                        <li key={i} className="flex items-start gap-1.5 font-code-tabular text-[12px]">
                          <span className="text-emerald-700 font-bold">✓</span>
                          <span>{sig}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="text-[11px] text-[#52606d] pt-2 border-t border-[#cbd6d6]">
                    <strong>Rule:</strong> Non-zero Practical value in credit structure (P &gt; 0) OR course type containing &apos;laboratory&apos; selects <code>integrated.html</code>; otherwise <code>non-lab.html</code>.
                  </div>
                </div>

                {/* Manual Override Controls */}
                <div className="md:col-span-6 space-y-3 p-4 rounded-xl bg-white border border-[#cbd6d6]">
                  <div className="flex items-center justify-between">
                    <span className="font-label-sm uppercase font-bold text-[#52606d]">
                      Manual Template Override
                    </span>
                    {isManualOverride && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-300">
                        Override Active
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={!canEdit}
                      onClick={() => handleToggleOverride('integrated')}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                        templateType === 'integrated'
                          ? 'bg-[#0b3c43] text-white border-[#0b3c43] shadow-xs'
                          : 'bg-white text-[#52606d] border-[#cbd6d6] hover:bg-[#eef4f4]'
                      }`}
                    >
                      Integrated Template
                    </button>
                    <button
                      type="button"
                      disabled={!canEdit}
                      onClick={() => handleToggleOverride('non-lab')}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                        templateType === 'non-lab'
                          ? 'bg-[#9a6b18] text-white border-[#9a6b18] shadow-xs'
                          : 'bg-white text-[#52606d] border-[#cbd6d6] hover:bg-[#eef4f4]'
                      }`}
                    >
                      Non-Lab Template
                    </button>
                  </div>

                  {/* Override Reason Required Field */}
                  {isManualOverride && (
                    <div className="space-y-1 animate-in fade-in duration-200">
                      <label className="font-label-sm uppercase font-bold text-[#8a5d12] block">
                        Reason for Manual Override (Required for Governance Audit)
                      </label>
                      <input
                        type="text"
                        value={overrideReason}
                        onChange={(e) => handleReasonChange(e.target.value)}
                        placeholder="e.g. Department approved theoretical delivery model for distance education..."
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#e6ca85] text-xs font-body-sm text-[#0f2327] bg-[#fef8ec] focus:outline-none focus:border-[#9a6b18]"
                      />
                    </div>
                  )}

                  {/* Precedence Notice */}
                  <div className="text-[11px] text-[#52606d] pt-2 border-t border-[#cbd6d6]">
                    <strong>Precedence Notice:</strong> Course Outcomes and units are populated from the <em>blueprint</em> when present; all other statutory fields from the spec.
                  </div>
                </div>
              </div>

              {/* Sample Strings Collected for Validation Step */}
              <div className="p-3 rounded-lg bg-[#eef4f4] border border-[#cbd6d6] text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#0b3c43] font-semibold">
                    <span className="material-symbols-outlined text-[18px] text-[#179ea1]">rule</span>
                    <span>Collected Template Sample Strings for Audit Step ({sampleStrings.length} tokens tracked)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSampleStringsList(!showSampleStringsList)}
                    className="text-[11px] font-semibold text-[#0b3c43] hover:underline"
                  >
                    {showSampleStringsList ? 'Hide Tokens' : 'Inspect Tokens'}
                  </button>
                </div>

                <p className="text-[#52606d] text-[11px]">
                  When loading the template, all sample placeholders (course title, code, department, sample units) were cataloged into a verification index. Step 4 (Automated Checks) will scan the output document to guarantee 0 leftover sample tokens.
                </p>

                {showSampleStringsList && (
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-[#cbd6d6]/60">
                    {sampleStrings.map((str, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded bg-white text-[#0b3c43] font-code-tabular text-[10px] border border-[#cbd6d6]"
                      >
                        {str}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PARSED STRUCTURED OUTPUT & EDITABLE FORM */}
          {parsedData && (
            <div className="space-y-space-md animate-in fade-in duration-300">
              {/* Success Badge Banner */}
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                    <span className="material-symbols-outlined text-[20px]">verified</span>
                  </div>
                  <div>
                    <span className="font-bold text-emerald-900 block text-sm">
                      Document Parsed &amp; Validated with Zod
                    </span>
                    <span className="text-emerald-700">
                      Successfully structured course {parsedData.courseCode}: {parsedData.title} ({parsedData.credits.ltpString})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsJsonExpanded(!isJsonExpanded)}
                    className="px-3.5 py-1.5 rounded-full border border-emerald-400 bg-white text-emerald-900 font-semibold hover:bg-emerald-50 flex items-center gap-1.5 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">data_object</span>
                    <span>{isJsonExpanded ? 'Hide Raw JSON' : 'Show Structured JSON'}</span>
                    <span className="material-symbols-outlined text-[14px]">
                      {isJsonExpanded ? 'expand_less' : 'expand_more'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleApplyToPipeline}
                    className="px-4 py-1.5 rounded-full bg-[#0b3c43] text-white font-semibold hover:bg-[#0a444e] flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">check</span>
                    <span>Apply to Pipeline &amp; Proceed</span>
                  </button>
                </div>
              </div>

              {applySuccess && (
                <div className="p-3 rounded-lg bg-[#e0f7f8] border border-[#179ea1] text-xs text-[#084c4e] font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-[#179ea1]">task_alt</span>
                  <span>Course specification applied to pipeline state! Transitioning to Step 2...</span>
                </div>
              )}

              {/* Collapsible JSON Panel */}
              {isJsonExpanded && (
                <div className="bg-[#0f2327] rounded-xl p-4 text-emerald-300 font-code-tabular text-xs border border-slate-700 shadow-lg space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                    <div className="flex items-center gap-2 text-white font-sans text-xs font-semibold">
                      <span className="material-symbols-outlined text-[16px] text-[#179ea1]">code</span>
                      <span>Zod-Validated Schema Output (generateJson)</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyJson}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-sans flex items-center gap-1 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[13px]">
                        {copiedJson ? 'done' : 'content_copy'}
                      </span>
                      <span>{copiedJson ? 'Copied' : 'Copy JSON'}</span>
                    </button>
                  </div>
                  <pre className="max-h-96 overflow-y-auto leading-relaxed p-2 select-text">
                    {JSON.stringify(parsedData, null, 2)}
                  </pre>
                </div>
              )}

              {/* Editable Form for Main Fields */}
              <div className="bg-white border border-[#cbd6d6] rounded-xl p-space-lg shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-[#cbd6d6] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#0b3c43] text-[22px]">edit_note</span>
                    <h3 className="font-headline-sm text-headline-sm font-semibold text-[#0f2327]">
                      Editable Course Specification Form
                    </h3>
                  </div>
                  <span className="font-label-sm text-label-sm uppercase bg-[#fef8ec] text-[#8a5d12] px-2.5 py-1 rounded border border-[#e6ca85] font-semibold">
                    Review &amp; Edit Main Fields
                  </span>
                </div>

                {/* Section 1: Course Identity */}
                <div className="space-y-3">
                  <h4 className="font-title-sm text-title-sm font-semibold text-[#0b3c43]">
                    1. Course Identification &amp; Credits (L:T:P)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="font-label-sm uppercase font-bold text-[#52606d] block mb-1">Course Code</label>
                      <input
                        type="text"
                        value={parsedData.courseCode}
                        onChange={(e) => handleUpdateParsedField('courseCode', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#cbd6d6] font-code-tabular font-bold text-[#0b3c43] bg-white focus:outline-none focus:border-[#179ea1]"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="font-label-sm uppercase font-bold text-[#52606d] block mb-1">Course Title</label>
                      <input
                        type="text"
                        value={parsedData.title}
                        onChange={(e) => handleUpdateParsedField('title', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#cbd6d6] font-semibold text-[#0f2327] bg-white focus:outline-none focus:border-[#179ea1]"
                      />
                    </div>
                    <div>
                      <label className="font-label-sm uppercase font-bold text-[#52606d] block mb-1">Department</label>
                      <input
                        type="text"
                        value={parsedData.department}
                        onChange={(e) => handleUpdateParsedField('department', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#cbd6d6] text-[#0f2327] bg-white focus:outline-none focus:border-[#179ea1]"
                      />
                    </div>
                    <div>
                      <label className="font-label-sm uppercase font-bold text-[#52606d] block mb-1">Course Type</label>
                      <input
                        type="text"
                        value={parsedData.courseType}
                        onChange={(e) => handleUpdateParsedField('courseType', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#cbd6d6] text-[#0f2327] bg-white focus:outline-none focus:border-[#179ea1]"
                      />
                    </div>
                    <div>
                      <label className="font-label-sm uppercase font-bold text-[#52606d] block mb-1">Lecture (L)</label>
                      <input
                        type="number"
                        value={parsedData.credits.lecture}
                        onChange={(e) =>
                          handleUpdateParsedField('credits', {
                            ...parsedData.credits,
                            lecture: Number(e.target.value) || 0,
                            total: (Number(e.target.value) || 0) + parsedData.credits.tutorial + parsedData.credits.practical * 0.5,
                            ltpString: `${e.target.value}:${parsedData.credits.tutorial}:${parsedData.credits.practical}`,
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#cbd6d6] font-code-tabular text-[#0f2327] bg-white focus:outline-none focus:border-[#179ea1]"
                      />
                    </div>
                    <div>
                      <label className="font-label-sm uppercase font-bold text-[#52606d] block mb-1">Tutorial (T)</label>
                      <input
                        type="number"
                        value={parsedData.credits.tutorial}
                        onChange={(e) =>
                          handleUpdateParsedField('credits', {
                            ...parsedData.credits,
                            tutorial: Number(e.target.value) || 0,
                            total: parsedData.credits.lecture + (Number(e.target.value) || 0) + parsedData.credits.practical * 0.5,
                            ltpString: `${parsedData.credits.lecture}:${e.target.value}:${parsedData.credits.practical}`,
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#cbd6d6] font-code-tabular text-[#0f2327] bg-white focus:outline-none focus:border-[#179ea1]"
                      />
                    </div>
                    <div>
                      <label className="font-label-sm uppercase font-bold text-[#52606d] block mb-1">Practical (P)</label>
                      <input
                        type="number"
                        value={parsedData.credits.practical}
                        onChange={(e) =>
                          handleUpdateParsedField('credits', {
                            ...parsedData.credits,
                            practical: Number(e.target.value) || 0,
                            total: parsedData.credits.lecture + parsedData.credits.tutorial + (Number(e.target.value) || 0) * 0.5,
                            ltpString: `${parsedData.credits.lecture}:${parsedData.credits.tutorial}:${e.target.value}`,
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#cbd6d6] font-code-tabular text-[#0f2327] bg-white focus:outline-none focus:border-[#179ea1]"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Course Outcomes */}
                <div className="space-y-3 pt-3 border-t border-[#cbd6d6]">
                  <div className="flex items-center justify-between">
                    <h4 className="font-title-sm text-title-sm font-semibold text-[#0b3c43]">
                      2. Course Outcomes with Leading Verb &amp; Bloom&apos;s Level
                    </h4>
                    <span className="font-code-tabular text-xs text-[#52606d]">
                      {parsedData.courseOutcomes.length} Outcomes Detected
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {parsedData.courseOutcomes.map((co, idx) => (
                      <div key={co.id} className="p-3 rounded-lg border border-[#cbd6d6] bg-[#f8fafb] space-y-2 text-xs">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="font-code-tabular font-bold px-2 py-0.5 rounded bg-[#0b3c43] text-white">
                              {co.id}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-[#e0f7f8] text-[#084c4e] font-semibold font-code-tabular border border-[#179ea1]/30">
                              Verb: {co.leadingVerb}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[#52606d]">Bloom&apos;s Level:</span>
                            <input
                              type="text"
                              value={co.bloomLevel}
                              onChange={(e) => handleUpdateCO(idx, { bloomLevel: e.target.value })}
                              className="px-2 py-1 rounded border border-[#cbd6d6] font-medium text-[#0f2327] bg-white text-xs w-36"
                            />
                          </div>
                        </div>

                        <textarea
                          value={co.statement}
                          onChange={(e) => handleUpdateCO(idx, { statement: e.target.value })}
                          rows={2}
                          className="w-full p-2 rounded border border-[#cbd6d6] text-xs font-body-sm text-[#0f2327] bg-white focus:outline-none focus:border-[#179ea1]"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section 3: Units / Modular Syllabus */}
                <div className="space-y-3 pt-3 border-t border-[#cbd6d6]">
                  <div className="flex items-center justify-between">
                    <h4 className="font-title-sm text-title-sm font-semibold text-[#0b3c43]">
                      3. Modular Units with Title, Hours &amp; Content
                    </h4>
                    <span className="font-code-tabular text-xs text-[#52606d]">
                      {parsedData.units.length} Modules
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {parsedData.units.map((unit, idx) => (
                      <div key={unit.unitNumber} className="p-3 rounded-lg border border-[#cbd6d6] bg-[#f8fafb] space-y-2 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1">
                            <span className="font-bold text-[#0b3c43]">Unit {unit.unitNumber}:</span>
                            <input
                              type="text"
                              value={unit.title}
                              onChange={(e) => handleUpdateUnit(idx, { title: e.target.value })}
                              className="flex-1 px-2 py-1 rounded border border-[#cbd6d6] font-semibold text-[#0f2327] bg-white text-xs"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[#52606d]">Hours:</span>
                            <input
                              type="number"
                              value={unit.hours}
                              onChange={(e) => handleUpdateUnit(idx, { hours: Number(e.target.value) || 0 })}
                              className="w-16 px-2 py-1 rounded border border-[#cbd6d6] font-code-tabular text-center text-xs bg-white"
                            />
                          </div>
                        </div>

                        <textarea
                          value={unit.content}
                          onChange={(e) => handleUpdateUnit(idx, { content: e.target.value })}
                          rows={2}
                          className="w-full p-2 rounded border border-[#cbd6d6] text-xs font-body-sm text-[#0f2327] bg-white focus:outline-none focus:border-[#179ea1]"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section 4: Teaching-Hours Table */}
                <div className="space-y-2 pt-3 border-t border-[#cbd6d6]">
                  <h4 className="font-title-sm text-title-sm font-semibold text-[#0b3c43]">
                    4. Teaching-Hours Table
                  </h4>
                  <table className="w-full border-collapse border border-slate-400 font-body-sm text-body-sm text-center text-xs">
                    <thead className="bg-slate-100 font-label-md text-slate-800 border-b border-slate-400">
                      <tr>
                        <th className="p-2 border-r border-slate-400 text-left">Component</th>
                        <th className="p-2 border-r border-slate-400 w-28">Weekly Hours</th>
                        <th className="p-2 border-r border-slate-400 w-32">Semester Total</th>
                        <th className="p-2 w-24">Credits</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.teachingHoursTable.map((row, i) => (
                        <tr key={i} className="border-b border-slate-300">
                          <td className="p-2 border-r border-slate-400 text-left font-medium">{row.component}</td>
                          <td className="p-2 border-r border-slate-400 font-code-tabular">{row.weeklyHours} Hrs</td>
                          <td className="p-2 border-r border-slate-400 font-code-tabular">{row.semesterHours} Hours</td>
                          <td className="p-2 font-code-tabular font-semibold text-[#0b3c43]">{row.credits}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Section 5: Assessment Table */}
                <div className="space-y-2 pt-3 border-t border-[#cbd6d6]">
                  <h4 className="font-title-sm text-title-sm font-semibold text-[#0b3c43]">
                    5. Assessment Table
                  </h4>
                  <table className="w-full border-collapse border border-slate-400 font-body-sm text-body-sm text-center text-xs">
                    <thead className="bg-slate-100 font-label-md text-slate-800 border-b border-slate-400">
                      <tr>
                        <th className="p-2 border-r border-slate-400 text-left">Component</th>
                        <th className="p-2 border-r border-slate-400 w-36">Mode</th>
                        <th className="p-2 border-r border-slate-400 w-24">Marks</th>
                        <th className="p-2 w-24">Weight %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.assessmentTable.map((row, i) => (
                        <tr key={i} className="border-b border-slate-300">
                          <td className="p-2 border-r border-slate-400 text-left font-medium">{row.component}</td>
                          <td className="p-2 border-r border-slate-400">{row.mode}</td>
                          <td className="p-2 border-r border-slate-400 font-code-tabular">{row.marks} Marks</td>
                          <td className="p-2 font-code-tabular font-bold text-[#0b3c43]">{row.weightPercentage}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Section 6: Resources / Textbooks */}
                <div className="space-y-2 pt-3 border-t border-[#cbd6d6]">
                  <h4 className="font-title-sm text-title-sm font-semibold text-[#0b3c43]">
                    6. Prescribed Resources &amp; Textbooks
                  </h4>
                  <div className="space-y-2">
                    {parsedData.resources.map((res, i) => (
                      <div key={i} className="p-2.5 rounded-lg border border-[#cbd6d6] bg-[#f8fafb] text-xs">
                        <span className="font-bold text-[#0b3c43]">[{res.type}]</span> {res.authors} - <em>{res.title}</em> ({res.publisherYear})
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-4 border-t border-[#cbd6d6] flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleExportSpecHtml}
                      className="px-5 py-2 rounded-full border border-[#cbd6d6] bg-[#f8fafb] hover:bg-[#eef4f4] text-[#0b3c43] text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">file_download</span>
                      <span>Export spec (spec.html)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewModalOpen(true)}
                      className="px-4 py-2 rounded-full border border-[#cbd6d6] bg-[#f8fafb] hover:bg-[#eef4f4] text-[#52606d] text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">preview</span>
                      <span>Live Preview</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleApplyToPipeline}
                    className="px-6 py-2.5 rounded-full bg-[#0b3c43] hover:bg-[#0a444e] text-white font-title-sm text-xs font-semibold shadow-md flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <span>Save Changes &amp; Apply to Pipeline</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Live Preview Modal for spec.html */}
      {previewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-5xl h-[88vh] bg-white rounded-xl border border-[#cbd6d6] shadow-2xl flex flex-col overflow-hidden">
            <div className="px-5 py-3 border-b border-[#cbd6d6] flex items-center justify-between bg-white">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#0b3c43] text-[20px]">description</span>
                <span className="font-title-sm text-title-sm font-bold text-[#0f2327]">
                  Preview: Self-Contained spec.html ({templateType === 'integrated' ? 'Integrated' : 'Non-Lab'})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportSpecHtml}
                  className="px-3 py-1 rounded-full bg-[#0b3c43] text-white text-xs font-semibold hover:bg-[#0a444e] flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">file_download</span>
                  <span>Export spec</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewModalOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[#52606d] hover:bg-[#eef4f4] transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-100 p-2 overflow-hidden">
              <iframe
                title="spec-html-preview"
                srcDoc={filledHtml}
                className="w-full h-full border border-slate-300 rounded bg-white"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadScreen;
