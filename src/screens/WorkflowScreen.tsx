import React, { useState, useEffect } from 'react';
import { CourseSpec, UserRole, WorkflowStatus, SectionComment, WorkflowAuditLog, RegisteredCatalogSpec } from '../types';

interface WorkflowScreenProps {
  course: CourseSpec;
  onUpdateCourse: (updater: (prev: CourseSpec) => CourseSpec) => void;
  userRole: UserRole;
  onNext: () => void;
  onPrev: () => void;
}

const SECTION_NAMES: Record<number, string> = {
  1: 'Course Descriptors & Code',
  2: 'Credit & Contact Hour Structure',
  3: 'Course Outcomes & Bloom Levels',
  4: 'Modular Syllabus & Hours',
  5: 'Continuous Assessment & SEE',
  6: 'CO-PO-PSO Articulation Matrix',
  7: 'Textbooks & References',
  8: 'Laboratory Practicum Schedule',
  9: 'Evaluation Rubrics',
  10: 'Accreditation Compliance Criteria',
  11: 'Institutional Signatories',
  12: 'Board of Studies (BoS) Resolution',
};

const WORKFLOW_STEPS: WorkflowStatus[] = [
  'Draft',
  'Submitted',
  'Under Review',
  'Pending HOD',
  'Approved',
];

export const WorkflowScreen: React.FC<WorkflowScreenProps> = ({
  course,
  onUpdateCourse,
  userRole,
  onNext,
  onPrev,
}) => {
  const currentStatus: WorkflowStatus = course.workflowStatus || 'Draft';

  // Live department catalog specifications
  const [catalogSpecs, setCatalogSpecs] = useState<RegisteredCatalogSpec[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const fetchCatalog = async () => {
    setIsLoadingCatalog(true);
    setCatalogError(null);
    try {
      const res = await fetch('/api/v1/specs');
      const data = await res.json();
      if (res.ok && data.success) {
        setCatalogSpecs(data.specs || []);
      } else {
        setCatalogError(data.error || 'Failed to load catalog');
      }
    } catch (err: any) {
      setCatalogError(err.message || 'Error fetching department specifications catalog');
    } finally {
      setIsLoadingCatalog(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, [course.code, currentStatus]);

  // Section comment states
  const [selectedSection, setSelectedSection] = useState<number>(3);
  const [sectionCommentText, setSectionCommentText] = useState('');
  const [transitionComment, setTransitionComment] = useState('');
  const [isSubmittingTransition, setIsSubmittingTransition] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Transition helper enforcing server-side permissions
  const handleTransition = async (targetStatus: WorkflowStatus, forcedComment?: string) => {
    setIsSubmittingTransition(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const commentToUse = forcedComment || transitionComment;

    try {
      const res = await fetch('/api/v1/workflow/transition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentStatus,
          targetStatus,
          role: userRole,
          user:
            userRole === 'Author'
              ? course.signatories.author.name
              : userRole === 'Reviewer'
              ? course.signatories.reviewer.name
              : course.signatories.hod.name,
          comment: commentToUse,
          courseId: course.code,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || `HTTP ${res.status}: Workflow transition forbidden.`);
      }

      onUpdateCourse((prev) => {
        const newLogEntry: WorkflowAuditLog = {
          id: data.logEntry.id || `log-${Date.now()}`,
          timestamp: data.logEntry.timestamp || new Date().toISOString(),
          actor: data.logEntry.user || userRole,
          role: userRole,
          action: data.logEntry.action || `Status changed to ${targetStatus}`,
          details: data.logEntry.comment || 'Workflow transition executed.',
          hash: Math.random().toString(16).substring(2, 10),
        };

        const updatedSignatories = { ...prev.signatories };
        if (targetStatus === 'Submitted') {
          updatedSignatories.author = { ...updatedSignatories.author, isSigned: true, signedDate: new Date().toLocaleDateString('en-GB') };
        } else if (targetStatus === 'Pending HOD') {
          updatedSignatories.reviewer = { ...updatedSignatories.reviewer, isSigned: true, signedDate: new Date().toLocaleDateString('en-GB') };
        } else if (targetStatus === 'Approved') {
          updatedSignatories.hod = { ...updatedSignatories.hod, isSigned: true, signedDate: new Date().toLocaleDateString('en-GB') };
        }

        return {
          ...prev,
          workflowStatus: targetStatus,
          workflowStage:
            targetStatus === 'Approved'
              ? 'approved_ready_for_export'
              : targetStatus === 'Draft' || targetStatus === 'Returned'
              ? 'draft'
              : 'under_review',
          signatories: updatedSignatories,
          auditTrail: [newLogEntry, ...prev.auditTrail],
        };
      });

      setSuccessMessage(`Specification transitioned to "${targetStatus}".`);
      setTransitionComment('');
    } catch (err: any) {
      console.error('Transition error:', err);
      setErrorMessage(err.message || String(err));
    } finally {
      setIsSubmittingTransition(false);
    }
  };

  // Section comment handler enforcing server-side Reviewer/HOD restriction
  const handleAddSectionComment = async () => {
    if (!sectionCommentText.trim()) return;

    setIsSubmittingComment(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/v1/workflow/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: userRole,
          user:
            userRole === 'Reviewer'
              ? course.signatories.reviewer.name
              : userRole === 'HOD'
              ? course.signatories.hod.name
              : course.signatories.author.name,
          section: selectedSection,
          comment: sectionCommentText.trim(),
          courseId: course.code,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || `HTTP ${res.status}: Failed to submit section comment.`);
      }

      const commentEntry: SectionComment = {
        id: data.commentEntry.id || `comm-${Date.now()}`,
        section: selectedSection,
        user: data.commentEntry.user,
        role: userRole,
        comment: data.commentEntry.comment,
        timestamp: data.commentEntry.timestamp,
      };

      onUpdateCourse((prev) => ({
        ...prev,
        sectionComments: [commentEntry, ...(prev.sectionComments || [])],
      }));

      setSectionCommentText('');
      setSuccessMessage(`Comment added to Section ${selectedSection}: ${SECTION_NAMES[selectedSection]}.`);
    } catch (err: any) {
      console.error('Comment error:', err);
      setErrorMessage(err.message || String(err));
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Signatory digital sign helper
  const handleSign = (signatoryKey: 'author' | 'reviewer' | 'hod') => {
    const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const randomHex = Math.random().toString(16).substring(2, 10);
    const prefix = signatoryKey === 'author' ? 'AUTH' : signatoryKey === 'reviewer' ? 'REV' : 'HOD';
    const newDigest = `${prefix}-SHA256:${randomHex}`;

    onUpdateCourse((prev) => {
      const updatedSignatories = {
        ...prev.signatories,
        [signatoryKey]: {
          ...prev.signatories[signatoryKey],
          isSigned: true,
          signedDate: today,
          signatureDigest: newDigest,
        },
      };

      const newAuditItem: WorkflowAuditLog = {
        id: `log-${Date.now()}`,
        timestamp: `${today} ${new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })} IST`,
        actor: prev.signatories[signatoryKey].name,
        role: userRole,
        action:
          signatoryKey === 'author'
            ? 'Author Submission & Verification'
            : signatoryKey === 'reviewer'
            ? 'Curriculum Peer Endorsement'
            : `Board of Studies Final Seal & Resolution ${prev.bosResolution}`,
        details:
          signatoryKey === 'author'
            ? 'Curriculum specification signed off and submitted for committee review.'
            : signatoryKey === 'reviewer'
            ? 'Syllabus modules and Bloom taxonomy balance verified and endorsed.'
            : 'Formal seal issued by Head of Department under autonomous curriculum regulations.',
        hash: randomHex,
      };

      return {
        ...prev,
        signatories: updatedSignatories,
        auditTrail: [newAuditItem, ...prev.auditTrail],
      };
    });
  };

  return (
    <div className="flex flex-col w-full">
      {/* Top Dossier Step Header Bar */}
      <div className="px-margin py-space-md bg-white border-b border-[#cbd6d6]">
        <div className="max-w-[1560px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center gap-space-sm flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#0b3c43] text-white font-label-sm text-label-sm uppercase tracking-wider font-semibold">
                <span className="material-symbols-outlined text-[13px] text-[#1eb4b6]">verified_user</span>
                05 | Step 5 of 6 • Governance Lifecycle, BoS Approvals &amp; Sign-Offs
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-[#fef8ec] text-[#8a5d12] font-code-tabular text-label-sm font-semibold border border-[#e6ca85]">
                AUTONOMOUS BOARD RESOLUTION {course.bosResolution}
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-[#52606d] max-w-3xl">
              Strict 6-state accreditation workflow enforcing statutory permissions for Author, Curriculum Reviewer, and Head of Department.
            </p>
          </div>

          <div className="flex items-center gap-space-sm flex-wrap">
            <div className="flex items-center gap-1.5 px-space-sm py-1 rounded bg-[#eef4f4] border border-[#cbd6d6]">
              <span className="w-2 h-2 rounded-full bg-[#1eb4b6]"></span>
              <span className="font-label-sm text-label-sm text-[#52606d] uppercase font-bold">Status:</span>
              <span className="font-title-sm text-title-sm text-[#0b3c43] font-bold uppercase">
                {currentStatus}
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-space-sm py-1 rounded bg-[#fef8ec] border border-[#e6ca85]">
              <span className="material-symbols-outlined text-[14px] text-[#9a6b18]">admin_panel_settings</span>
              <span className="font-label-sm text-label-sm text-[#9a6b18] uppercase font-bold">Active Role:</span>
              <span className="font-title-sm text-title-sm text-[#0f2327] font-semibold">{userRole}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Workstation */}
      <div className="px-margin py-space-lg">
        <div className="max-w-[1560px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
          {/* LEFT COLUMN: State Machine Controls, Section Comments & Signatories */}
          <div className="lg:col-span-8 flex flex-col space-y-space-md">
            {/* Feedback Alerts */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-rose-600 text-[18px]">error</span>
                  <span>{errorMessage}</span>
                </div>
                <button type="button" onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-700">
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
            )}
            {successMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
                  <span>{successMessage}</span>
                </div>
                <button type="button" onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-700">
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
            )}

            {/* CARD 1: Workflow Lifecycle Actions (Role-Enforced Transition Actions) */}
            <div className="bg-white border border-[#cbd6d6] rounded-xl p-space-lg shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#cbd6d6] pb-3 gap-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#0b3c43] text-[22px]">alt_route</span>
                  <div>
                    <h3 className="font-headline-sm text-headline-sm font-semibold text-[#0f2327]">
                      Workflow State Machine &amp; Transition Actions
                    </h3>
                    <p className="font-body-sm text-body-sm text-[#52606d]">
                      Enforcing statutory role authorization: Author edits in Draft/Returned; Reviewer endorses; HOD grants final approval.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1 bg-[#f8fafb] rounded-full border border-[#cbd6d6] font-code-tabular text-xs">
                  <span className="text-[#52606d]">Current State:</span>
                  <span className={`font-bold px-2 py-0.5 rounded-full ${
                    currentStatus === 'Approved'
                      ? 'bg-emerald-100 text-emerald-800'
                      : currentStatus === 'Returned'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-[#0b3c43] text-white'
                  }`}>
                    {currentStatus}
                  </span>
                </div>
              </div>

              {/* Status Visual Timeline Tracker */}
              <div className="p-4 bg-[#f8fafb] rounded-xl border border-[#cbd6d6]">
                <div className="text-[11px] font-bold text-[#52606d] uppercase tracking-wider mb-2">
                  Accreditation State Timeline
                </div>
                <div className="grid grid-cols-5 gap-2 text-center text-xs">
                  {WORKFLOW_STEPS.map((step, idx) => {
                    const currentIndex = WORKFLOW_STEPS.indexOf(currentStatus);
                    const isPassed = currentIndex > idx && currentStatus !== 'Returned';
                    const isCurrent = currentStatus === step;

                    return (
                      <div
                        key={step}
                        className={`p-2 rounded-lg border flex flex-col items-center justify-center transition-all ${
                          isCurrent
                            ? 'bg-[#0b3c43] text-white border-[#0b3c43] shadow-xs'
                            : isPassed
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold'
                            : 'bg-white text-slate-400 border-slate-200'
                        }`}
                      >
                        <div className="text-[10px] uppercase font-bold opacity-75">Tier {idx + 1}</div>
                        <div className="font-semibold text-xs truncate max-w-full">{step}</div>
                        {isPassed && <span className="text-[10px] text-emerald-600">✓ Done</span>}
                        {isCurrent && <span className="text-[10px] text-[#1eb4b6] font-bold">● Active</span>}
                      </div>
                    );
                  })}
                </div>

                {currentStatus === 'Returned' && (
                  <div className="mt-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-rose-600">undo</span>
                    <span>
                      <strong>Returned to Author:</strong> Specification was returned for required syllabus/rubric adjustments. Author can now edit content and resubmit.
                    </span>
                  </div>
                )}
              </div>

              {/* Dynamic Role-Gated Transition Action Controls */}
              <div className="p-4 bg-[#eef4f4]/60 rounded-xl border border-[#cbd6d6] space-y-3">
                <div className="text-xs font-bold text-[#0b3c43] uppercase tracking-wide">
                  Available Actions for Role: {userRole}
                </div>

                {/* Optional comment for transition */}
                {(userRole === 'Reviewer' || userRole === 'HOD') && (
                  <div>
                    <label className="block text-[11px] font-semibold text-[#52606d] mb-1">
                      Transition Remark / Feedback (Required when returning specification):
                    </label>
                    <input
                      type="text"
                      value={transitionComment}
                      onChange={(e) => setTransitionComment(e.target.value)}
                      placeholder="e.g., 'Syllabus revised and aligned with AICTE ratio. Forwarding to HOD.'"
                      className="w-full px-3 py-1.5 rounded-lg border border-[#cbd6d6] bg-white text-xs focus:outline-none focus:border-[#179ea1]"
                    />
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  {/* AUTHOR ACTIONS */}
                  {userRole === 'Author' && currentStatus === 'Draft' && (
                    <button
                      type="button"
                      disabled={isSubmittingTransition}
                      onClick={() => handleTransition('Submitted')}
                      className="px-5 py-2 rounded-full bg-[#0b3c43] hover:bg-[#0a444e] text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[16px]">send</span>
                      <span>Submit Specification (to Reviewer)</span>
                    </button>
                  )}

                  {userRole === 'Author' && currentStatus === 'Returned' && (
                    <button
                      type="button"
                      disabled={isSubmittingTransition}
                      onClick={() => handleTransition('Submitted')}
                      className="px-5 py-2 rounded-full bg-[#0b3c43] hover:bg-[#0a444e] text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                      <span>Resubmit Specification (to Reviewer)</span>
                    </button>
                  )}

                  {userRole === 'Author' && currentStatus !== 'Draft' && currentStatus !== 'Returned' && (
                    <div className="text-xs text-[#52606d] italic flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-amber-600">lock</span>
                      <span>Specification is currently locked in governance workflow ({currentStatus}). Only Author can edit when in Draft or Returned state.</span>
                    </div>
                  )}

                  {/* REVIEWER ACTIONS */}
                  {userRole === 'Reviewer' && currentStatus === 'Submitted' && (
                    <button
                      type="button"
                      disabled={isSubmittingTransition}
                      onClick={() => handleTransition('Under Review')}
                      className="px-5 py-2 rounded-full bg-[#0b3c43] hover:bg-[#0a444e] text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[16px]">visibility</span>
                      <span>Open Specification for Review (Move to Under Review)</span>
                    </button>
                  )}

                  {userRole === 'Reviewer' && currentStatus === 'Under Review' && (
                    <>
                      <button
                        type="button"
                        disabled={isSubmittingTransition}
                        onClick={() => handleTransition('Pending HOD')}
                        className="px-5 py-2 rounded-full bg-[#0b3c43] hover:bg-[#0a444e] text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[16px]">forward</span>
                        <span>Forward to HOD (Move to Pending HOD)</span>
                      </button>

                      <button
                        type="button"
                        disabled={isSubmittingTransition || !transitionComment.trim()}
                        onClick={() => handleTransition('Returned')}
                        className="px-4 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                        title={!transitionComment.trim() ? 'Enter a feedback comment above to return specification' : ''}
                      >
                        <span className="material-symbols-outlined text-[16px]">undo</span>
                        <span>Return to Author with Feedback</span>
                      </button>
                    </>
                  )}

                  {userRole === 'Reviewer' && currentStatus !== 'Submitted' && currentStatus !== 'Under Review' && (
                    <div className="text-xs text-[#52606d] italic">
                      Reviewer actions are available when specification is in <strong>Submitted</strong> or <strong>Under Review</strong> state.
                    </div>
                  )}

                  {/* HOD ACTIONS */}
                  {userRole === 'HOD' && currentStatus === 'Pending HOD' && (
                    <>
                      <button
                        type="button"
                        disabled={isSubmittingTransition}
                        onClick={() => handleTransition('Approved')}
                        className="px-5 py-2 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[16px]">verified</span>
                        <span>Grant BoS Final Approval &amp; Seal</span>
                      </button>

                      <button
                        type="button"
                        disabled={isSubmittingTransition || !transitionComment.trim()}
                        onClick={() => handleTransition('Returned')}
                        className="px-4 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                        title={!transitionComment.trim() ? 'Enter an HOD directive comment above to return specification' : ''}
                      >
                        <span className="material-symbols-outlined text-[16px]">undo</span>
                        <span>Return with Directives</span>
                      </button>
                    </>
                  )}

                  {userRole === 'HOD' && currentStatus !== 'Pending HOD' && (
                    <div className="text-xs text-[#52606d] italic">
                      {currentStatus === 'Approved'
                        ? 'Specification has received final Board of Studies approval and is formally sealed for NBA/NAAC filing.'
                        : 'HOD approval actions become active once the Curriculum Reviewer forwards the specification.'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* CARD 2: Section-Level Commenting (Sections 1–12) for Reviewers & HODs */}
            <div className="bg-white border border-[#cbd6d6] rounded-xl p-space-lg shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[#cbd6d6] pb-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#0b3c43] text-[20px]">comment</span>
                  <h3 className="font-headline-sm text-headline-sm font-semibold text-[#0f2327]">
                    Section-by-Section Audit Comments (Sections 1–12)
                  </h3>
                </div>
                <span className="font-label-sm text-label-sm text-[#52606d] uppercase font-semibold">
                  Reviewer &amp; HOD Governance Feedback
                </span>
              </div>

              {/* Notice for Author */}
              {userRole === 'Author' ? (
                <div className="p-3 rounded-lg bg-[#eef4f4] border border-[#cbd6d6] text-xs text-[#52606d]">
                  Formal section-level audit comments are submitted by the <strong>Reviewer</strong> and <strong>HOD</strong>. As Author, you can view all feedback below and make required updates in your draft.
                </div>
              ) : (
                <div className="space-y-3 p-3.5 rounded-xl bg-[#f8fafb] border border-[#cbd6d6]">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="w-full sm:w-1/2">
                      <label className="block text-[11px] font-bold text-[#0b3c43] uppercase mb-1">
                        Select Statutory Section (1–12):
                      </label>
                      <select
                        value={selectedSection}
                        onChange={(e) => setSelectedSection(Number(e.target.value))}
                        className="w-full px-3 py-1.5 rounded-lg border border-[#cbd6d6] bg-white text-xs font-semibold text-[#0f2327] focus:outline-none focus:border-[#179ea1]"
                      >
                        {Object.entries(SECTION_NAMES).map(([num, name]) => (
                          <option key={num} value={num}>
                            Section {num}: {name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="w-full sm:w-1/2 text-[11px] text-[#52606d]">
                      Your comment will be anchored to <strong>Section {selectedSection}: {SECTION_NAMES[selectedSection]}</strong> and recorded in the audit trail.
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#0b3c43] uppercase mb-1">
                      Audit Remark / Required Revision:
                    </label>
                    <textarea
                      rows={2}
                      value={sectionCommentText}
                      onChange={(e) => setSectionCommentText(e.target.value)}
                      placeholder={`Enter formal ${userRole} feedback for Section ${selectedSection}...`}
                      className="w-full px-3 py-2 rounded-lg border border-[#cbd6d6] bg-white text-xs text-[#0f2327] focus:outline-none focus:border-[#179ea1]"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={isSubmittingComment || !sectionCommentText.trim()}
                      onClick={handleAddSectionComment}
                      className="px-4 py-1.5 rounded-full bg-[#0b3c43] hover:bg-[#0a444e] text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[15px]">add_comment</span>
                      <span>{isSubmittingComment ? 'Submitting...' : 'Post Section Comment (POST /api/v1/workflow/comment)'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Recorded Section Comments List */}
              <div className="space-y-2.5">
                <div className="text-[11px] font-bold text-[#52606d] uppercase tracking-wider">
                  Recorded Section Comments ({(course.sectionComments || []).length})
                </div>

                {(course.sectionComments || []).length === 0 ? (
                  <div className="p-4 rounded-lg border border-dashed border-[#cbd6d6] text-center text-xs text-[#52606d]">
                    No section-level comments recorded yet.
                  </div>
                ) : (
                  (course.sectionComments || []).map((comm) => (
                    <div
                      key={comm.id}
                      className="p-3 rounded-lg border border-[#cbd6d6] bg-white flex flex-col space-y-1 shadow-xs"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-code-tabular font-bold px-2 py-0.5 rounded bg-[#0b3c43] text-white text-[10px]">
                            Section {comm.section}: {SECTION_NAMES[comm.section] || `Section ${comm.section}`}
                          </span>
                          <span className="font-semibold text-[#0f2327]">{comm.user}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#eef4f4] text-[#0b3c43] font-bold uppercase">
                            {comm.role}
                          </span>
                        </div>
                        <span className="font-code-tabular text-[10px] text-[#52606d]">
                          {new Date(comm.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-[#334155] pl-1 pt-1 leading-relaxed">{comm.comment}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* CARD 3: Institutional Signatories & Sign-Offs */}
            <div className="bg-white border border-[#cbd6d6] rounded-xl p-space-lg shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[#cbd6d6] pb-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#0b3c43] text-[20px]">draw</span>
                  <h3 className="font-headline-sm text-headline-sm font-semibold text-[#0f2327]">
                    Institutional Signatories &amp; Cryptographic Sign-Offs
                  </h3>
                </div>
                <span className="text-xs text-[#52606d]">Role-Enforced Digital Authentication</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Author Card */}
                <div className={`p-4 rounded-xl border flex flex-col justify-between ${
                  course.signatories.author.isSigned ? 'border-emerald-300 bg-emerald-50/20' : 'border-[#cbd6d6] bg-white'
                }`}>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-label-sm text-label-sm uppercase font-bold text-[#52606d]">Tier 1: Author</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        course.signatories.author.isSigned ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {course.signatories.author.isSigned ? 'SIGNED' : 'PENDING'}
                      </span>
                    </div>
                    <div className="font-title-sm text-title-sm font-semibold text-[#0f2327]">{course.signatories.author.name}</div>
                    <div className="text-xs text-[#52606d]">{course.signatories.author.roleTitle}</div>
                    {course.signatories.author.signedDate && (
                      <div className="font-code-tabular text-[10px] text-emerald-700 pt-1">
                        Signed: {course.signatories.author.signedDate}
                      </div>
                    )}
                    {course.signatories.author.signatureDigest && (
                      <div className="font-code-tabular text-[10px] text-slate-500 truncate">
                        {course.signatories.author.signatureDigest}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 mt-3 border-t border-[#cbd6d6]">
                    <button
                      type="button"
                      disabled={userRole !== 'Author' || course.signatories.author.isSigned}
                      onClick={() => handleSign('author')}
                      className={`w-full py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                        userRole === 'Author' && !course.signatories.author.isSigned
                          ? 'bg-[#0b3c43] text-white hover:bg-[#0a444e] shadow-xs cursor-pointer'
                          : 'bg-[#eef4f4] text-[#718182] cursor-not-allowed'
                      }`}
                    >
                      {course.signatories.author.isSigned ? 'Author Verified' : userRole === 'Author' ? 'Sign as Author' : 'Requires Author Role'}
                    </button>
                  </div>
                </div>

                {/* Reviewer Card */}
                <div className={`p-4 rounded-xl border flex flex-col justify-between ${
                  course.signatories.reviewer.isSigned ? 'border-emerald-300 bg-emerald-50/20' : 'border-[#cbd6d6] bg-white'
                }`}>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-label-sm text-label-sm uppercase font-bold text-[#52606d]">Tier 2: Reviewer</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        course.signatories.reviewer.isSigned ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {course.signatories.reviewer.isSigned ? 'ENDORSED' : 'PENDING'}
                      </span>
                    </div>
                    <div className="font-title-sm text-title-sm font-semibold text-[#0f2327]">{course.signatories.reviewer.name}</div>
                    <div className="text-xs text-[#52606d]">{course.signatories.reviewer.roleTitle}</div>
                    {course.signatories.reviewer.signedDate && (
                      <div className="font-code-tabular text-[10px] text-emerald-700 pt-1">
                        Endorsed: {course.signatories.reviewer.signedDate}
                      </div>
                    )}
                    {course.signatories.reviewer.signatureDigest && (
                      <div className="font-code-tabular text-[10px] text-slate-500 truncate">
                        {course.signatories.reviewer.signatureDigest}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 mt-3 border-t border-[#cbd6d6]">
                    <button
                      type="button"
                      disabled={userRole !== 'Reviewer' || course.signatories.reviewer.isSigned}
                      onClick={() => handleSign('reviewer')}
                      className={`w-full py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                        userRole === 'Reviewer' && !course.signatories.reviewer.isSigned
                          ? 'bg-[#0b3c43] text-white hover:bg-[#0a444e] shadow-xs cursor-pointer'
                          : 'bg-[#eef4f4] text-[#718182] cursor-not-allowed'
                      }`}
                    >
                      {course.signatories.reviewer.isSigned ? 'Reviewer Endorsed' : userRole === 'Reviewer' ? 'Endorse as Reviewer' : 'Requires Reviewer Role'}
                    </button>
                  </div>
                </div>

                {/* HOD Card */}
                <div className={`p-4 rounded-xl border flex flex-col justify-between ${
                  course.signatories.hod.isSigned ? 'border-emerald-300 bg-emerald-50/20' : 'border-[#cbd6d6] bg-white'
                }`}>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-label-sm text-label-sm uppercase font-bold text-[#52606d]">Tier 3: HOD (BoS)</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        course.signatories.hod.isSigned ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {course.signatories.hod.isSigned ? 'SEALED' : 'PENDING'}
                      </span>
                    </div>
                    <div className="font-title-sm text-title-sm font-semibold text-[#0f2327]">{course.signatories.hod.name}</div>
                    <div className="text-xs text-[#52606d]">{course.signatories.hod.roleTitle}</div>
                    {course.signatories.hod.signedDate && (
                      <div className="font-code-tabular text-[10px] text-emerald-700 pt-1">
                        Sealed: {course.signatories.hod.signedDate}
                      </div>
                    )}
                    {course.signatories.hod.signatureDigest && (
                      <div className="font-code-tabular text-[10px] text-slate-500 truncate">
                        {course.signatories.hod.signatureDigest}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 mt-3 border-t border-[#cbd6d6]">
                    <button
                      type="button"
                      disabled={userRole !== 'HOD' || course.signatories.hod.isSigned}
                      onClick={() => handleSign('hod')}
                      className={`w-full py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                        userRole === 'HOD' && !course.signatories.hod.isSigned
                          ? 'bg-[#0b3c43] text-white hover:bg-[#0a444e] shadow-xs cursor-pointer'
                          : 'bg-[#eef4f4] text-[#718182] cursor-not-allowed'
                      }`}
                    >
                      {course.signatories.hod.isSigned ? 'BoS Seal Affixed' : userRole === 'HOD' ? 'Affix BoS Seal' : 'Requires HOD Role'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 4: Immutable Audit Trail Log */}
            <div className="bg-white border border-[#cbd6d6] rounded-xl p-space-lg shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-[#cbd6d6] pb-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#0b3c43] text-[20px]">history</span>
                  <h3 className="font-headline-sm text-headline-sm font-semibold text-[#0f2327]">
                    Accreditation Governance Audit Trail
                  </h3>
                </div>
                <span className="font-code-tabular text-[11px] text-[#52606d]">
                  {course.auditTrail.length} Logged Events
                </span>
              </div>

              <div className="space-y-2">
                {course.auditTrail.length === 0 ? (
                  <div className="p-4 rounded-lg border border-dashed border-[#cbd6d6] text-center text-xs text-[#52606d]">
                    No governance audit events recorded yet. State transitions and digital signatures will be appended here.
                  </div>
                ) : (
                  course.auditTrail.map((log) => (
                    <div key={log.id} className="p-3 rounded-lg border border-[#cbd6d6] bg-[#f8fafb] flex items-start justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#0f2327]">{log.action}</span>
                          <span className="px-1.5 py-0.5 rounded bg-[#eef4f4] text-[10px] font-semibold text-[#0b3c43]">
                            {log.role}
                          </span>
                        </div>
                        <p className="text-[#52606d]">{log.details}</p>
                        <div className="font-code-tabular text-[10px] text-[#718182]">
                          {log.actor} • {log.timestamp} • SHA256: {log.hash}
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-emerald-600 text-[18px]">verified</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Curriculum Specs Dashboard & Navigation */}
          <div className="lg:col-span-4 flex flex-col space-y-space-md">
            {/* SPECS DASHBOARD */}
            <div className="bg-white border border-[#cbd6d6] rounded-xl p-space-lg shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-[#cbd6d6] pb-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#0b3c43] text-[20px]">dashboard</span>
                  <h3 className="font-headline-sm text-headline-sm font-semibold text-[#0f2327]">
                    Curriculum Specifications Dashboard
                  </h3>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#eef4f4] text-[#0b3c43]">
                  CSE Department
                </span>
              </div>

              <p className="text-xs text-[#52606d]">
                Live catalog of departmental curriculum specifications and statutory accreditation statuses:
              </p>

              <div className="space-y-2">
                {/* Active Spec: course.code */}
                <div className="p-3 rounded-lg border-2 border-[#0b3c43] bg-teal-50/20 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-code-tabular font-bold text-xs text-[#0b3c43]">{course.code}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      currentStatus === 'Approved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : currentStatus === 'Returned'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-[#0b3c43] text-white'
                    }`}>
                      {currentStatus} (Active)
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-[#0f2327] truncate">{course.title}</div>
                  <div className="text-[11px] text-[#52606d] flex items-center justify-between pt-1">
                    <span>Credits: {course.credits.toFixed(1)} ({course.lectureHours}:{course.tutorialHours}:{course.practicalHours})</span>
                    <span className="font-code-tabular text-[10px]">Active In Pipeline</span>
                  </div>
                </div>

                {/* Other specs dynamically loaded from /api/v1/specs */}
                {isLoadingCatalog ? (
                  <div className="p-4 text-center text-xs text-[#52606d] italic">
                    Loading department catalog...
                  </div>
                ) : catalogError ? (
                  <div className="p-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs">
                    {catalogError}
                  </div>
                ) : catalogSpecs.filter((s) => s.code !== course.code).length === 0 ? (
                  <div className="p-4 rounded-lg border border-dashed border-[#cbd6d6] text-center text-xs text-[#52606d] space-y-1">
                    <p className="font-medium text-[#0f2327]">No other catalog specifications</p>
                    <p className="text-[11px]">Upload or save additional courses in Step 1 to populate this catalog.</p>
                  </div>
                ) : (
                  catalogSpecs
                    .filter((s) => s.code !== course.code)
                    .map((spec) => (
                      <div key={spec.code} className="p-3 rounded-lg border border-[#cbd6d6] bg-white space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-code-tabular font-bold text-xs text-slate-800">{spec.code}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              spec.status === 'Approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : spec.status === 'Returned'
                                ? 'bg-rose-100 text-rose-800'
                                : spec.status === 'Under Review'
                                ? 'bg-blue-100 text-blue-800'
                                : spec.status === 'Pending HOD'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {spec.status}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-[#0f2327] truncate">{spec.title}</div>
                        <div className="text-[11px] text-[#52606d] flex items-center justify-between pt-1">
                          <span>Credits: {spec.credits.toFixed(1)} ({spec.ltp})</span>
                          <span className="font-code-tabular text-[10px]">
                            {new Date(spec.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>

            {/* NAVIGATION CARD */}
            <div className="bg-white border border-[#cbd6d6] rounded-xl p-space-lg shadow-sm space-y-3">
              <div className="text-xs font-bold text-[#0b3c43] uppercase tracking-wide">
                Lifecycle Navigation
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onPrev}
                  className="px-4 py-2.5 rounded-full border border-[#cbd6d6] text-xs font-semibold text-[#52606d] hover:bg-[#eef4f4] transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={onNext}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-[#0b3c43] hover:bg-[#0a444e] text-white font-title-sm text-xs font-semibold shadow-md transition-all"
                >
                  <span>Proceed to Dossier Export (Step 6)</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowScreen;
