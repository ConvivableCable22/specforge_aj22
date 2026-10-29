import React, { useState } from 'react';
import { CourseSpec, SyllabusModule, Textbook, UserRole } from '../types';

interface SpecDetailsScreenProps {
  course: CourseSpec;
  onUpdateCourse: (updater: (prev: CourseSpec) => CourseSpec) => void;
  userRole: UserRole;
  onNext: () => void;
  onPrev: () => void;
}

export const SpecDetailsScreen: React.FC<SpecDetailsScreenProps> = ({
  course,
  onUpdateCourse,
  userRole,
  onNext,
  onPrev,
}) => {
  const canEdit = userRole === 'Author';
  const [activeModuleIndex, setActiveModuleIndex] = useState(0);

  const handleUpdateField = <K extends keyof CourseSpec>(field: K, value: CourseSpec[K]) => {
    if (!canEdit) return;
    onUpdateCourse((prev) => ({ ...prev, [field]: value }));
  };

  const handleUpdateModule = (index: number, updated: Partial<SyllabusModule>) => {
    if (!canEdit) return;
    onUpdateCourse((prev) => {
      const nextModules = [...prev.modules];
      nextModules[index] = { ...nextModules[index], ...updated };
      return { ...prev, modules: nextModules };
    });
  };

  const totalThHours = course.modules.reduce((sum, m) => sum + m.theoryHours, 0);
  const totalLabHours = course.modules.reduce((sum, m) => sum + m.labHours, 0);
  const totalContactHours = totalThHours + totalLabHours;

  return (
    <div className="flex flex-col w-full">
      {/* Top Dossier Step Header Bar */}
      <div className="px-margin py-space-md bg-white border-b border-[#cbd6d6]">
        <div className="max-w-[1560px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center gap-space-sm flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#0b3c43] text-white font-label-sm text-label-sm uppercase tracking-wider font-semibold">
                <span className="material-symbols-outlined text-[13px] text-[#1eb4b6]">menu_book</span>
                02 | Step 2 of 6 • Course Metadata, Syllabus Modules &amp; Scope
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-[#fef8ec] text-[#8a5d12] font-code-tabular text-label-sm font-semibold border border-[#e6ca85]">
                NBA SAR CRITERION 1.1 &amp; 2.1
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-[#52606d] max-w-3xl">
              Configure statutory course descriptors, credit and contact hour structures, 5 instructional modules, and regulatory reference bibliographies.
            </p>
          </div>

          {/* Quick Pill Strip */}
          <div className="flex items-center gap-space-sm flex-wrap">
            <div className="flex items-center gap-1.5 px-space-sm py-1 rounded bg-[#eef4f4] border border-[#cbd6d6]">
              <span className="material-symbols-outlined text-[14px] text-[#0b3c43]">schedule</span>
              <span className="font-label-sm text-label-sm text-[#52606d] uppercase font-bold">Total Contact:</span>
              <span className="font-code-tabular text-title-sm text-[#0b3c43] font-semibold">{totalContactHours} Sem Hrs</span>
            </div>
            <div className="flex items-center gap-1.5 px-space-sm py-1 rounded bg-[#fef8ec] border border-[#e6ca85]">
              <span className="material-symbols-outlined text-[14px] text-[#9a6b18]">admin_panel_settings</span>
              <span className="font-label-sm text-label-sm text-[#9a6b18] uppercase font-bold">Role:</span>
              <span className="font-title-sm text-title-sm text-[#0f2327] font-semibold">
                {canEdit ? 'Author (Editing)' : `${userRole} (View Only)`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Workstation */}
      <div className="px-margin py-space-lg">
        <div className="max-w-[1560px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
          {/* LEFT COLUMN: Course Identity & Modules Form */}
          <div className="lg:col-span-8 flex flex-col space-y-space-md">
            {/* Card 1: Statutory Master Grid */}
            <div className="bg-white border border-[#cbd6d6] rounded-xl p-space-lg shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[#cbd6d6] pb-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#0b3c43] text-[20px]">badge</span>
                  <h3 className="font-headline-sm text-headline-sm font-semibold text-[#0f2327]">
                    Institutional Course Descriptors
                  </h3>
                </div>
                <span className="text-xs font-semibold text-[#9a6b18] bg-[#fef8ec] px-2 py-0.5 rounded border border-[#e6ca85]">
                  Statutory BoS Registry
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="font-label-sm uppercase font-bold text-[#52606d] block mb-1">Course Code</label>
                  <input
                    type="text"
                    value={course.code}
                    disabled={!canEdit}
                    onChange={(e) => handleUpdateField('code', e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#cbd6d6] font-code-tabular font-bold text-[#0b3c43] bg-white focus:outline-none focus:border-[#179ea1]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="font-label-sm uppercase font-bold text-[#52606d] block mb-1">Course Title</label>
                  <input
                    type="text"
                    value={course.title}
                    disabled={!canEdit}
                    onChange={(e) => handleUpdateField('title', e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#cbd6d6] font-semibold text-[#0f2327] bg-white focus:outline-none focus:border-[#179ea1]"
                  />
                </div>
                <div>
                  <label className="font-label-sm uppercase font-bold text-[#52606d] block mb-1">Academic Year</label>
                  <input
                    type="text"
                    value={course.academicYear}
                    disabled={!canEdit}
                    onChange={(e) => handleUpdateField('academicYear', e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#cbd6d6] font-medium text-[#0f2327] bg-white focus:outline-none focus:border-[#179ea1]"
                  />
                </div>
                <div>
                  <label className="font-label-sm uppercase font-bold text-[#52606d] block mb-1">Regulation</label>
                  <input
                    type="text"
                    value={course.regulation}
                    disabled={!canEdit}
                    onChange={(e) => handleUpdateField('regulation', e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#cbd6d6] text-[#0f2327] bg-white focus:outline-none focus:border-[#179ea1]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="font-label-sm uppercase font-bold text-[#52606d] block mb-1">Category</label>
                  <input
                    type="text"
                    value={course.category}
                    disabled={!canEdit}
                    onChange={(e) => handleUpdateField('category', e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#cbd6d6] text-[#0f2327] bg-white focus:outline-none focus:border-[#179ea1]"
                  />
                </div>
                <div>
                  <label className="font-label-sm uppercase font-bold text-[#52606d] block mb-1">Total Credits</label>
                  <div className="px-2.5 py-1.5 rounded-lg border border-[#cbd6d6] bg-[#eef4f4] font-code-tabular font-bold text-[#0b3c43]">
                    {course.credits.toFixed(1)} Credits ({course.theoryCredits} Th + {course.labCredits} Lab)
                  </div>
                </div>
              </div>

              {/* L-T-P Contact Breakdown */}
              <div className="p-3 rounded-lg bg-[#eef4f4] border border-[#cbd6d6] grid grid-cols-3 gap-3 text-center text-xs">
                <div>
                  <span className="font-label-sm uppercase text-[#52606d]">Lecture (L)</span>
                  <div className="font-code-tabular font-bold text-[#0b3c43] text-sm">{course.lectureHours} Hrs/Wk</div>
                </div>
                <div>
                  <span className="font-label-sm uppercase text-[#52606d]">Tutorial (T)</span>
                  <div className="font-code-tabular font-bold text-[#0b3c43] text-sm">{course.tutorialHours} Hrs/Wk</div>
                </div>
                <div>
                  <span className="font-label-sm uppercase text-[#52606d]">Practical (P)</span>
                  <div className="font-code-tabular font-bold text-[#0b3c43] text-sm">{course.practicalHours} Hrs/Wk</div>
                </div>
              </div>
            </div>

            {/* Card 2: Overview, Rationale & Pedagogy */}
            <div className="bg-white border border-[#cbd6d6] rounded-xl p-space-lg shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-[#cbd6d6] pb-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#0b3c43] text-[20px]">subject</span>
                  <h3 className="font-headline-sm text-headline-sm font-semibold text-[#0f2327]">
                    1.0 Course Overview, Pedagogical Scope &amp; Rationale
                  </h3>
                </div>
                <span className="text-xs text-[#52606d]">AICTE Model Scope</span>
              </div>
              <textarea
                value={course.overviewRationale}
                disabled={!canEdit}
                onChange={(e) => handleUpdateField('overviewRationale', e.target.value)}
                rows={4}
                className="w-full p-3 rounded-lg border border-[#cbd6d6] text-xs font-body-sm leading-relaxed text-[#0f2327] bg-[#f8fafb] focus:outline-none focus:border-[#179ea1]"
              />
              <div className="space-y-1">
                <label className="font-label-sm uppercase font-bold text-[#52606d] block">
                  Concurrent Laboratory Pedagogy
                </label>
                <textarea
                  value={course.labPedagogy}
                  disabled={!canEdit}
                  onChange={(e) => handleUpdateField('labPedagogy', e.target.value)}
                  rows={2}
                  className="w-full p-2.5 rounded-lg border border-[#cbd6d6] text-xs font-body-sm leading-relaxed text-[#0f2327] bg-[#f8fafb] focus:outline-none focus:border-[#179ea1]"
                />
              </div>
            </div>

            {/* Card 3: Modular Syllabus (5 Modules Tabs) */}
            <div className="bg-white border border-[#cbd6d6] rounded-xl p-space-lg shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[#cbd6d6] pb-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#0b3c43] text-[20px]">view_module</span>
                  <h3 className="font-headline-sm text-headline-sm font-semibold text-[#0f2327]">
                    4.0 Modular Syllabus &amp; Laboratory Integration
                  </h3>
                </div>
                <span className="font-code-tabular text-xs font-bold text-[#0b3c43]">
                  {course.modules.length} Standard Modules
                </span>
              </div>

              {course.modules.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#52606d] bg-[#f8fafb] rounded-lg border border-dashed border-[#cbd6d6] space-y-1">
                  <span className="material-symbols-outlined text-[28px] text-[#52606d]">view_module</span>
                  <div className="font-semibold text-[#0f2327]">No Syllabus Modules Defined</div>
                  <div>Upload a course specification or blueprint document in Step 1 to extract modules.</div>
                </div>
              ) : (
                <>
                  {/* Module Tab Switcher */}
                  <div className="flex items-center gap-1.5 border-b border-[#cbd6d6] overflow-x-auto pb-1">
                    {course.modules.map((m, idx) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setActiveModuleIndex(idx)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 flex items-center gap-1.5 ${
                          activeModuleIndex === idx
                            ? 'bg-[#0b3c43] text-white font-semibold'
                            : 'bg-[#eef4f4] text-[#52606d] hover:bg-[#e4eeee]'
                        }`}
                      >
                        <span>Module {m.id}</span>
                      </button>
                    ))}
                  </div>

                  {/* Active Module Editor */}
                  {course.modules[activeModuleIndex] && (
                    <div className="space-y-3 bg-[#f8fafb] p-4 rounded-lg border border-[#cbd6d6]">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <label className="font-label-sm uppercase font-bold text-[#52606d] block mb-1">
                            Module Title
                          </label>
                          <input
                            type="text"
                            value={course.modules[activeModuleIndex].title}
                            disabled={!canEdit}
                            onChange={(e) => handleUpdateModule(activeModuleIndex, { title: e.target.value })}
                            className="w-full px-2.5 py-1.5 rounded border border-[#cbd6d6] text-xs font-semibold text-[#0f2327] bg-white focus:outline-none focus:border-[#179ea1]"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="font-label-sm uppercase font-bold text-[#52606d] block mb-1">
                              Theory Hrs
                            </label>
                            <input
                              type="number"
                              value={course.modules[activeModuleIndex].theoryHours}
                              disabled={!canEdit}
                              onChange={(e) =>
                                handleUpdateModule(activeModuleIndex, { theoryHours: Number(e.target.value) || 0 })
                              }
                              className="w-full px-2.5 py-1.5 rounded border border-[#cbd6d6] font-code-tabular text-xs font-bold text-[#0b3c43] bg-white focus:outline-none focus:border-[#179ea1]"
                            />
                          </div>
                          <div>
                            <label className="font-label-sm uppercase font-bold text-[#52606d] block mb-1">
                              Lab Hrs
                            </label>
                            <input
                              type="number"
                              value={course.modules[activeModuleIndex].labHours}
                              disabled={!canEdit}
                              onChange={(e) =>
                                handleUpdateModule(activeModuleIndex, { labHours: Number(e.target.value) || 0 })
                              }
                              className="w-full px-2.5 py-1.5 rounded border border-[#cbd6d6] font-code-tabular text-xs font-bold text-[#0b3c43] bg-white focus:outline-none focus:border-[#179ea1]"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="font-label-sm uppercase font-bold text-[#52606d] block mb-1">
                          Curriculum Topics Breakdown
                        </label>
                        <textarea
                          value={course.modules[activeModuleIndex].topics}
                          disabled={!canEdit}
                          onChange={(e) => handleUpdateModule(activeModuleIndex, { topics: e.target.value })}
                          rows={3}
                          className="w-full p-2 rounded border border-[#cbd6d6] text-xs font-body-sm leading-relaxed text-[#0f2327] bg-white focus:outline-none focus:border-[#179ea1]"
                        />
                      </div>

                      <div>
                        <label className="font-label-sm uppercase font-bold text-[#9a6b18] block mb-1">
                          Mandatory Practicum / Lab Experiment Integration
                        </label>
                        <input
                          type="text"
                          value={course.modules[activeModuleIndex].mandatoryLab}
                          disabled={!canEdit}
                          onChange={(e) => handleUpdateModule(activeModuleIndex, { mandatoryLab: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded border border-[#e6ca85] text-xs font-body-sm italic text-slate-800 bg-[#fef8ec] focus:outline-none focus:border-[#179ea1]"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Card 4: Textbooks & Prescribed Standards */}
            <div className="bg-white border border-[#cbd6d6] rounded-xl p-space-lg shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-[#cbd6d6] pb-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#0b3c43] text-[20px]">auto_stories</span>
                  <h3 className="font-headline-sm text-headline-sm font-semibold text-[#0f2327]">
                    7.0 Prescribed Textbooks &amp; Reference Standards
                  </h3>
                </div>
                <span className="text-xs text-[#52606d]">{course.textbooks.length} Citations</span>
              </div>

              <div className="space-y-2">
                {course.textbooks.length === 0 ? (
                  <div className="p-4 text-center text-xs text-[#52606d] bg-[#f8fafb] rounded-lg border border-dashed border-[#cbd6d6]">
                    No reference citations or textbooks parsed yet.
                  </div>
                ) : (
                  course.textbooks.map((tb: Textbook, i: number) => (
                    <div key={tb.id} className="p-2.5 rounded-lg border border-[#cbd6d6] bg-[#f8fafb] text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#0b3c43]">Ref #{i + 1}</span>
                        <span className="font-code-tabular text-[11px] text-[#52606d]">{tb.year}</span>
                      </div>
                      <div className="text-slate-800">
                        <strong>{tb.authors}</strong> ({tb.year}). <em>{tb.title}</em> ({tb.edition}). {tb.publisher}.
                        {tb.isbn ? ` ISBN: ${tb.isbn}` : ''}
                        {tb.notes ? ` (${tb.notes})` : ''}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Contact Hour Math & Pre-Flight Stats */}
          <div className="lg:col-span-4 flex flex-col space-y-space-md">
            {/* Hour Math Card */}
            <div className="bg-white border border-[#cbd6d6] rounded-xl p-space-lg shadow-sm flex flex-col space-y-space-md">
              <div className="flex items-center justify-between border-b border-[#cbd6d6] pb-space-sm">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-[20px] text-[#0b3c43]">calculate</span>
                  <h3 className="font-headline-sm text-headline-sm text-[#0f2327]">Statutory Contact Math</h3>
                </div>
                <span className="px-2 py-0.5 rounded font-label-sm text-label-sm uppercase bg-[#fef8ec] text-[#8a5d12] border border-[#e6ca85] font-semibold">
                  15-Week Term
                </span>
              </div>

              <div className="space-y-space-sm text-xs">
                <div className="flex justify-between items-center py-1.5 border-b border-[#eef4f4]">
                  <span className="text-[#52606d]">Theory Classroom Lectures</span>
                  <span className="font-code-tabular font-bold text-[#0b3c43]">
                    {totalThHours}.0 Hours ({course.theoryCredits.toFixed(1)} Cr)
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-[#eef4f4]">
                  <span className="text-[#52606d]">Laboratory Practicum</span>
                  <span className="font-code-tabular font-bold text-[#0b3c43]">
                    {totalLabHours}.0 Hours ({course.labCredits.toFixed(1)} Cr)
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-[#eef4f4]">
                  <span className="text-[#52606d]">Weekly Contact Rate</span>
                  <span className="font-code-tabular font-bold text-[#0f2327]">
                    {(totalContactHours / 15).toFixed(1)} Contact Hrs/Wk
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-[#52606d]">Autonomous Board Compliance</span>
                  <span className={`font-code-tabular font-bold ${
                    totalContactHours === (course.lectureHours + course.tutorialHours + course.practicalHours) * 15
                      ? 'text-emerald-700'
                      : 'text-amber-700'
                  }`}>
                    {totalContactHours === (course.lectureHours + course.tutorialHours + course.practicalHours) * 15
                      ? 'Compliant (15 Wks)'
                      : `${totalContactHours} / ${(course.lectureHours + course.tutorialHours + course.practicalHours) * 15} Sem Hrs`}
                  </span>
                </div>
              </div>

              {/* Navigation Action Buttons */}
              <div className="pt-space-xs border-t border-[#cbd6d6] flex items-center gap-2">
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
                  <span>Proceed to CO-PO-PSO Map (Step 3)</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            </div>

            {/* AICTE Statutory Ratio Card */}
            <div className="bg-[#eef4f4] border border-[#cbd6d6] rounded-xl p-space-lg text-xs space-y-2">
              <div className="flex items-center gap-2 text-[#0b3c43] font-semibold">
                <span className="material-symbols-outlined text-[18px]">verified</span>
                <span>AICTE Statutory Credit Formulation</span>
              </div>
              <p className="text-[#52606d] leading-relaxed">
                Theory credit ratio: <strong>1 Lecture Hour = 1 Credit</strong>.<br />
                Laboratory ratio: <strong>2 Practical Hours = 1 Credit</strong>.<br />
                Total: {course.theoryCredits.toFixed(1)} Theory + {course.labCredits.toFixed(1)} Lab = <strong>{course.credits.toFixed(1)} Credits</strong> under {course.regulation || 'Regulation'}.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpecDetailsScreen;
