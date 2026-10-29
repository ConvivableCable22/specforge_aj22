import React, { useState, useEffect } from 'react';
import { CourseSpec, UserRole } from '../types';
import { requestAIAssist, getAIHeaders } from '../api';

interface MappingScreenProps {
  course: CourseSpec;
  onUpdateCourse: (updater: (prev: CourseSpec) => CourseSpec) => void;
  userRole: UserRole;
  onNext: () => void;
  onPrev: () => void;
}

interface OutcomeDefinition {
  id?: string;
  code: string;
  title: string;
  statement: string;
}

const PO_LIST = ['PO1', 'PO2', 'PO3', 'PO4', 'PO5', 'PO6', 'PO7', 'PO8', 'PO9', 'PO10', 'PO11', 'PO12'];
const PSO_LIST = ['PSO1', 'PSO2', 'PSO3'];
const ALL_COLUMNS = [...PO_LIST, ...PSO_LIST];

const BLOOM_LEVELS = [
  'L1: Remember',
  'L2: Understand',
  'L3: Apply',
  'L4: Analyze',
  'L5: Evaluate',
  'L6: Create',
];

export const MappingScreen: React.FC<MappingScreenProps> = ({
  course,
  onUpdateCourse,
  userRole,
  onNext,
  onPrev,
}) => {
  const canEdit = userRole === 'Author';
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [psoStatements, setPsoStatements] = useState<OutcomeDefinition[]>([]);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);

  useEffect(() => {
    const loadPoPsoConfig = async () => {
      setIsLoadingConfig(true);
      try {
        const res = await fetch('/api/v1/po-pso');
        const data = await res.json();
        if (res.ok && data.success && Array.isArray(data.programSpecificOutcomes)) {
          setPsoStatements(data.programSpecificOutcomes);
        }
      } catch (err) {
        console.warn('Failed to load PO/PSO configuration:', err);
      } finally {
        setIsLoadingConfig(false);
      }
    };
    loadPoPsoConfig();
  }, []);

  const getCellData = (coId: string, colKey: string): { strength: number | null; justification: string } => {
    const rich = course.copoMatrixWithJustifications?.[coId]?.[colKey];
    if (rich) return rich;
    const raw = course.matrix[coId]?.[colKey];
    if (raw && typeof raw === 'object' && 'strength' in raw) {
      return { strength: raw.strength, justification: raw.justification || '' };
    }
    const strength = typeof raw === 'number' ? raw : null;
    return {
      strength,
      justification: strength
        ? `${coId} provides correlation strength ${strength} toward ${colKey}.`
        : 'No direct correlation.',
    };
  };

  const handleCellClick = (coId: string, colKey: string) => {
    if (!canEdit) return;
    onUpdateCourse((prev) => {
      const currentData = getCellData(coId, colKey);
      const currentVal = currentData.strength;
      // Cycle: null -> 3 -> 2 -> 1 -> null
      let nextVal: number | null = null;
      if (currentVal === null) nextVal = 3;
      else if (currentVal === 3) nextVal = 2;
      else if (currentVal === 2) nextVal = 1;
      else nextVal = null;

      const nextJustification = nextVal
        ? `Author calibrated correlation strength ${nextVal} for ${coId} to ${colKey}.`
        : '';

      const updatedRichMatrix = {
        ...(prev.copoMatrixWithJustifications || {}),
        [coId]: {
          ...(prev.copoMatrixWithJustifications?.[coId] || {}),
          [colKey]: { strength: nextVal, justification: nextJustification },
        },
      };

      const newMatrix = {
        ...prev.matrix,
        [coId]: {
          ...(prev.matrix[coId] || {}),
          [colKey]: nextVal,
        },
      };

      // Recalculate targetPOs for this CO
      const updatedTargetPOs = ALL_COLUMNS.filter((col) => newMatrix[coId]?.[col] !== null);
      const updatedCOs = prev.courseOutcomes.map((co) =>
        co.id === coId ? { ...co, targetPOs: updatedTargetPOs } : co
      );

      return {
        ...prev,
        matrix: newMatrix,
        copoMatrixWithJustifications: updatedRichMatrix,
        courseOutcomes: updatedCOs,
      };
    });
  };

  const handleUpdateStatement = (coId: string, newStatement: string) => {
    if (!canEdit) return;
    onUpdateCourse((prev) => ({
      ...prev,
      courseOutcomes: prev.courseOutcomes.map((co) =>
        co.id === coId ? { ...co, statement: newStatement } : co
      ),
    }));
  };

  const handleUpdateBloom = (coId: string, newBloom: string) => {
    if (!canEdit) return;
    onUpdateCourse((prev) => ({
      ...prev,
      courseOutcomes: prev.courseOutcomes.map((co) =>
        co.id === coId ? { ...co, bloomLevel: newBloom } : co
      ),
    }));
  };

  const handleRequestAIOptimization = async (coId: string) => {
    const targetCo = course.courseOutcomes.find((c) => c.id === coId);
    if (!targetCo) return;

    setIsAiLoading(true);
    setAiSuggestion('Querying AI with x-llm headers for Bloom articulation audit...');
    try {
      const res = await requestAIAssist('improve_co', {
        coId: targetCo.id,
        statement: targetCo.statement,
        bloomLevel: targetCo.bloomLevel,
      });
      if (res.success && res.result) {
        setAiSuggestion(res.result);
      } else {
        setAiSuggestion(res.error || 'Unable to analyze Course Outcome. Verify AI settings.');
      }
    } catch (err: any) {
      setAiSuggestion(err.message || 'Error communicating with AI assistant.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAutoGenerateMapping = async () => {
    setIsAiLoading(true);
    setAiSuggestion('Querying AI with x-llm headers for CO-PO-PSO matrix, Bloom levels, justifications, and summary rewrite...');
    try {
      const headers = getAIHeaders();
      const res = await fetch('/api/v1/map-copo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-llm-provider': headers['x-llm-provider'] || '',
          'x-llm-key': headers['x-llm-key'] || '',
          'x-llm-model': headers['x-llm-model'] || '',
        },
        body: JSON.stringify({
          outcomes: course.courseOutcomes.map((c) => ({
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
          courseCode: course.code,
          title: course.title,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate mapping');
      }

      const { matrix, courseSummary, outcomes: updatedOutcomes } = data.data;

      onUpdateCourse((prev) => {
        const numericMatrix: Record<string, Record<string, number | null>> = {};
        Object.entries(matrix).forEach(([coKey, poMap]: [string, any]) => {
          numericMatrix[coKey] = {};
          Object.entries(poMap).forEach(([poKey, cell]: [string, any]) => {
            numericMatrix[coKey][poKey] = cell.strength;
          });
        });

        const nextCOs = prev.courseOutcomes.map((co) => {
          const match = updatedOutcomes?.find((o: any) => o.id === co.id);
          const targetPOs = ALL_COLUMNS.filter((col) => numericMatrix[co.id]?.[col] !== null);
          return {
            ...co,
            bloomLevel: match?.bloomLevel || co.bloomLevel,
            targetPOs,
          };
        });

        return {
          ...prev,
          matrix: numericMatrix,
          copoMatrixWithJustifications: matrix,
          courseSummary: courseSummary || prev.courseSummary,
          overviewRationale: courseSummary || prev.overviewRationale,
          courseOutcomes: nextCOs,
        };
      });

      setAiSuggestion('Successfully updated CO-PO-PSO matrix with one-line justifications and rewritten course summary covering all modules.');
    } catch (err: any) {
      console.error('Failed to auto-generate mapping:', err);
      setAiSuggestion(`Error during AI mapping: ${err.message || String(err)}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Calculate Column Averages
  const columnAverages: Record<string, string> = {};
  ALL_COLUMNS.forEach((col) => {
    let sum = 0;
    let count = 0;
    course.courseOutcomes.forEach((co) => {
      const cell = getCellData(co.id, col);
      if (typeof cell.strength === 'number') {
        sum += cell.strength;
        count += 1;
      }
    });
    columnAverages[col] = count > 0 ? (sum / count).toFixed(2) : '-';
  });

  return (
    <div className="flex flex-col w-full">
      {/* Top Dossier Step Header Bar */}
      <div className="px-margin py-space-md bg-white border-b border-[#cbd6d6]">
        <div className="max-w-[1560px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center gap-space-sm flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#0b3c43] text-white font-label-sm text-label-sm uppercase tracking-wider font-semibold">
                <span className="material-symbols-outlined text-[13px] text-[#1eb4b6]">grid_on</span>
                03 | Step 3 of 6 • CO-PO-PSO Articulation Matrix &amp; Bloom Taxonomy
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-[#fef8ec] text-[#8a5d12] font-code-tabular text-label-sm font-semibold border border-[#e6ca85]">
                NBA e-SAR CRITERION 2.2
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-[#52606d] max-w-3xl">
              Map Course Outcomes to NBA Graduate Attributes (PO1–PO11) and Program Specific Outcomes (PSO1–PSO3) with correlation weights (3: Substantial, 2: Moderate, 1: Slight).
            </p>
          </div>

          <div className="flex items-center gap-space-sm flex-wrap">
            <div className="flex items-center gap-1.5 px-space-sm py-1 rounded bg-[#eef4f4] border border-[#cbd6d6]">
              <span className="material-symbols-outlined text-[14px] text-[#0b3c43]">fact_check</span>
              <span className="font-label-sm text-label-sm text-[#52606d] uppercase font-bold">Total Outcomes:</span>
              <span className="font-code-tabular text-title-sm text-[#0b3c43] font-semibold">
                {course.courseOutcomes.length} COs Defined
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-space-sm py-1 rounded bg-[#fef8ec] border border-[#e6ca85]">
              <span className="material-symbols-outlined text-[14px] text-[#9a6b18]">admin_panel_settings</span>
              <span className="font-label-sm text-label-sm text-[#9a6b18] uppercase font-bold">Role:</span>
              <span className="font-title-sm text-title-sm text-[#0f2327] font-semibold">
                {canEdit ? 'Author (Matrix Editable)' : `${userRole} (Auditing)`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Workstation */}
      <div className="px-margin py-space-lg">
        <div className="max-w-[1560px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
          {/* LEFT COLUMN: CO Statements & Matrix Table */}
          <div className="lg:col-span-8 flex flex-col space-y-space-md">
            {/* Card 1: Statutory CO List */}
            <div className="bg-white border border-[#cbd6d6] rounded-xl p-space-lg shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[#cbd6d6] pb-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#0b3c43] text-[20px]">format_list_numbered</span>
                  <h3 className="font-headline-sm text-headline-sm font-semibold text-[#0f2327]">
                    3.0 Statutory Course Outcomes (COs)
                  </h3>
                </div>
                <span className="text-xs text-[#52606d]">Revised Bloom&apos;s Taxonomy</span>
              </div>

              <div className="space-y-3">
                {course.courseOutcomes.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#52606d] bg-[#f8fafb] rounded-lg border border-dashed border-[#cbd6d6] space-y-1">
                    <span className="material-symbols-outlined text-[28px] text-[#52606d]">fact_check</span>
                    <div className="font-semibold text-[#0f2327]">No Course Outcomes Defined</div>
                    <div>Upload a course specification or syllabus blueprint in Step 1 to populate outcomes.</div>
                  </div>
                ) : (
                  course.courseOutcomes.map((co) => (
                  <div key={co.id} className="p-3 rounded-lg border border-[#cbd6d6] bg-[#f8fafb] space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-code-tabular font-bold text-sm px-2 py-0.5 rounded bg-[#0b3c43] text-white">
                          {co.id}
                        </span>
                        <select
                          value={co.bloomLevel}
                          disabled={!canEdit}
                          onChange={(e) => handleUpdateBloom(co.id, e.target.value)}
                          className="text-xs font-semibold px-2 py-1 rounded border border-[#cbd6d6] bg-white text-slate-800 focus:outline-none focus:border-[#179ea1]"
                        >
                          {BLOOM_LEVELS.map((bl) => (
                            <option key={bl} value={bl}>
                              {bl}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-[#52606d]">Target POs:</span>
                        <div className="flex items-center gap-1 flex-wrap">
                          {co.targetPOs.slice(0, 4).map((po) => (
                            <span key={po} className="px-1.5 py-0.5 rounded bg-[#eef4f4] text-[10px] font-code-tabular font-semibold text-[#0b3c43] border border-[#cbd6d6]">
                              {po}
                            </span>
                          ))}
                          {co.targetPOs.length > 4 && (
                            <span className="text-[10px] text-[#52606d]">+{co.targetPOs.length - 4}</span>
                          )}
                        </div>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleRequestAIOptimization(co.id)}
                            disabled={isAiLoading}
                            title="Optimize with AI"
                            className="p-1 rounded text-[#179ea1] hover:bg-[#e0f7f8] transition-colors"
                          >
                            <span className="material-symbols-outlined text-[16px]">smart_toy</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <textarea
                      value={co.statement}
                      disabled={!canEdit}
                      onChange={(e) => handleUpdateStatement(co.id, e.target.value)}
                      rows={2}
                      className="w-full p-2 rounded border border-[#cbd6d6] text-xs font-body-sm leading-relaxed text-[#0f2327] bg-white focus:outline-none focus:border-[#179ea1]"
                    />
                  </div>
                ))
              )}
              </div>

              {aiSuggestion && (
                <div className="p-3 rounded-lg bg-[#e0f7f8] border border-[#179ea1]/40 text-xs text-[#084c4e] flex items-start gap-2">
                  <span className="material-symbols-outlined text-[18px] text-[#179ea1] shrink-0">auto_awesome</span>
                  <div>
                    <strong>AI Curriculum Advisor:</strong> {aiSuggestion}
                  </div>
                </div>
              )}
            </div>

            {/* Card 2: CO-PO-PSO Articulation Matrix Table */}
            <div className="bg-white border border-[#cbd6d6] rounded-xl p-space-lg shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#cbd6d6] pb-2 gap-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#0b3c43] text-[20px]">table_chart</span>
                  <h3 className="font-headline-sm text-headline-sm font-semibold text-[#0f2327]">
                    6.0 CO-PO-PSO Articulation Matrix (NBA SAR Format)
                  </h3>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="text-xs text-[#52606d] flex items-center gap-2">
                    <span className="font-medium text-[#9a6b18]">3: Substantial</span>
                    <span>|</span>
                    <span>2: Moderate</span>
                    <span>|</span>
                    <span>1: Slight</span>
                    <span>|</span>
                    <span>- : None</span>
                  </div>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={handleAutoGenerateMapping}
                      disabled={isAiLoading}
                      className="px-3.5 py-1.5 rounded-full bg-[#0b3c43] hover:bg-[#0a444e] text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[15px]">auto_fix_high</span>
                      <span>{isAiLoading ? 'Mapping with AI...' : 'AI Generate Mapping & Summary'}</span>
                    </button>
                  )}
                </div>
              </div>

              {canEdit && (
                <div className="text-[11px] text-[#52606d] italic">
                  💡 Click any cell below to toggle correlation level: <strong>3 → 2 → 1 → -</strong>
                </div>
              )}

              {course.courseOutcomes.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#52606d] bg-[#f8fafb] rounded-lg border border-dashed border-[#cbd6d6]">
                  No Course Outcomes available to construct the articulation matrix.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-slate-400 font-body-sm text-body-sm text-center">
                  <thead className="bg-slate-100 font-label-sm text-[10px] uppercase text-slate-800 border-b border-slate-400">
                    <tr>
                      <th className="p-1.5 border-r border-slate-400 w-12 text-left">CO #</th>
                      {PO_LIST.map((po, idx) => (
                        <th
                          key={po}
                          className={`p-1.5 border-r w-8 ${
                            idx === PO_LIST.length - 1 ? 'border-slate-400' : 'border-slate-300'
                          }`}
                        >
                          {po}
                        </th>
                      ))}
                      {PSO_LIST.map((pso, idx) => (
                        <th
                          key={pso}
                          className={`p-1.5 w-8 bg-[#eef4f4] text-[#0b3c43] font-bold ${
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
                      <tr key={co.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-1.5 border-r border-slate-400 font-bold text-[#0b3c43] text-left">
                          {co.id}
                        </td>
                        {PO_LIST.map((po, idx) => {
                          const cell = getCellData(co.id, po);
                          const val = cell.strength;
                          return (
                            <td
                              key={po}
                              onClick={() => handleCellClick(co.id, po)}
                              title={`${po}: ${cell.justification || 'No correlation mapped.'}`}
                              className={`p-1.5 border-r transition-colors ${
                                idx === PO_LIST.length - 1 ? 'border-slate-400' : 'border-slate-300'
                              } ${
                                canEdit ? 'cursor-pointer hover:ring-2 hover:ring-[#14b8a6] hover:z-10' : ''
                              } ${
                                val === 3
                                  ? 'font-bold text-white bg-[#0b3c43]'
                                  : val === 2
                                  ? 'font-semibold text-[#0b3c43] bg-teal-100/70'
                                  : val === 1
                                  ? 'text-amber-900 bg-amber-100/70 font-medium'
                                  : 'text-slate-400 bg-white'
                              }`}
                            >
                              {val !== null ? val : '-'}
                            </td>
                          );
                        })}
                        {PSO_LIST.map((pso, idx) => {
                          const cell = getCellData(co.id, pso);
                          const val = cell.strength;
                          return (
                            <td
                              key={pso}
                              onClick={() => handleCellClick(co.id, pso)}
                              title={`${pso}: ${cell.justification || 'No correlation mapped.'}`}
                              className={`p-1.5 transition-colors ${
                                idx < PSO_LIST.length - 1 ? 'border-r border-slate-300' : ''
                              } ${
                                canEdit ? 'cursor-pointer hover:ring-2 hover:ring-[#14b8a6] hover:z-10' : ''
                              } ${
                                val === 3
                                  ? 'font-bold text-white bg-[#0b3c43]'
                                  : val === 2
                                  ? 'font-semibold text-[#0b3c43] bg-teal-100/70'
                                  : val === 1
                                  ? 'text-amber-900 bg-amber-100/70 font-medium'
                                  : 'text-slate-400 bg-[#eef4f4]/40'
                              }`}
                            >
                              {val !== null ? val : '-'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}

                    {/* Column Averages Row */}
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-400">
                      <td className="p-1.5 border-r border-slate-400 text-left font-label-sm text-[10px] uppercase">
                        Avg
                      </td>
                      {PO_LIST.map((po, idx) => (
                        <td
                          key={po}
                          className={`p-1.5 border-r text-[#0b3c43] ${
                            idx === PO_LIST.length - 1 ? 'border-slate-400' : 'border-slate-300'
                          }`}
                        >
                          {columnAverages[po]}
                        </td>
                      ))}
                      {PSO_LIST.map((pso, idx) => (
                        <td
                          key={pso}
                          className={`p-1.5 bg-[#e0f7f8] text-[#084c4e] ${
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
          </div>

          {/* RIGHT COLUMN: Bloom Distribution & Navigation */}
          <div className="lg:col-span-4 flex flex-col space-y-space-md">
            {/* Cognitive Distribution Card */}
            <div className="bg-white border border-[#cbd6d6] rounded-xl p-space-lg shadow-sm flex flex-col space-y-space-md">
              <div className="flex items-center justify-between border-b border-[#cbd6d6] pb-space-sm">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-[20px] text-[#0b3c43]">psychology</span>
                  <h3 className="font-headline-sm text-headline-sm text-[#0f2327]">Cognitive Rigor Profile</h3>
                </div>
                <span className="px-2 py-0.5 rounded font-label-sm text-label-sm uppercase bg-[#fef8ec] text-[#8a5d12] border border-[#e6ca85] font-semibold">
                  Bloom Verbs
                </span>
              </div>

              <div className="space-y-2 text-xs">
                {['L2: Understand', 'L3: Apply', 'L4: Analyze', 'L5: Evaluate'].map((level) => {
                  const count = course.courseOutcomes.filter((co) => co.bloomLevel.startsWith(level.split(':')[0])).length;
                  const pct = course.courseOutcomes.length > 0 ? Math.round((count / course.courseOutcomes.length) * 100) : 0;
                  return (
                    <div key={level} className="space-y-1">
                      <div className="flex justify-between items-center text-[#52606d]">
                        <span>{level}</span>
                        <span className="font-code-tabular font-bold text-[#0b3c43]">{count} COs ({pct}%)</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#eef4f4] rounded-full overflow-hidden">
                        <div className="h-full bg-[#0b3c43] rounded-full" style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })}
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
                  <span>Proceed to Automated Checks (Step 4)</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            </div>

            {/* Program Specific Outcomes (PSOs) Definition Card */}
            <div className="bg-white border border-[#cbd6d6] rounded-xl p-space-lg shadow-sm space-y-2 text-xs">
              <div className="flex items-center gap-2 text-[#0b3c43] font-semibold">
                <span className="material-symbols-outlined text-[18px]">verified</span>
                <span>Program Specific Outcomes (PSOs)</span>
              </div>
              <div className="space-y-2 text-[#52606d]">
                {isLoadingConfig ? (
                  <div className="text-[11px] italic">Loading program specific outcomes...</div>
                ) : psoStatements.length > 0 ? (
                  psoStatements.map((pso) => (
                    <p key={pso.code || pso.id}>
                      <strong>{pso.code || pso.id}:</strong> {pso.title ? `${pso.title} – ` : ''}{pso.statement}
                    </p>
                  ))
                ) : (
                  <div className="text-[11px] italic">No Program Specific Outcomes configured.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MappingScreen;
