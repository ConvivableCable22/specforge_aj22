import React from 'react';

export type StepId =
  | 'upload'
  | 'spec-details'
  | 'co-po-pso-map'
  | 'automated-checks'
  | 'workflow-approvals'
  | 'export-package';

interface SidebarProps {
  currentStep: StepId;
  onSelectStep: (step: StepId) => void;
}

export const STEPS: { id: StepId; number: number; label: string; fullTitle: string }[] = [
  { id: 'upload', number: 1, label: '1. Upload', fullTitle: 'Upload & Syllabus Intake' },
  { id: 'spec-details', number: 2, label: '2. Spec Details', fullTitle: 'Course Spec & Modular Details' },
  { id: 'co-po-pso-map', number: 3, label: '3. CO-PO-PSO Map', fullTitle: 'CO-PO-PSO Articulation Matrix' },
  { id: 'automated-checks', number: 4, label: '4. Automated Checks', fullTitle: 'Automated Curriculum Checks' },
  { id: 'workflow-approvals', number: 5, label: '5. Workflow & Approvals', fullTitle: 'Workflow & BoS Approvals' },
  { id: 'export-package', number: 6, label: '6. Export / Package', fullTitle: 'Export & Package' },
];

export const Sidebar: React.FC<SidebarProps> = ({ currentStep, onSelectStep }) => {
  return (
    <aside className="fixed left-0 top-14 bottom-0 w-64 bg-white border-r border-[#cbd6d6] z-40 flex flex-col justify-between pt-space-lg pb-space-lg select-none">
      <div className="flex flex-col">
        {/* Section Title */}
        <div className="px-gutter mb-space-md">
          <div className="font-label-sm text-label-sm uppercase text-[#9a6b18] font-bold tracking-wider">
            Curriculum Pipeline
          </div>
          <div className="font-body-sm text-body-sm text-[#52606d]">Accreditation Phase 1</div>
        </div>

        {/* Step Nav Links */}
        <nav className="flex flex-col space-y-0.5 w-full">
          {STEPS.map((step) => {
            const isActive = currentStep === step.id;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => onSelectStep(step.id)}
                data-path={step.id}
                className={`flex items-center gap-space-md px-gutter py-space-sm text-title-sm font-title-sm transition-colors border-l-2 text-left w-full ${
                  isActive
                    ? 'bg-[#e4eeee] border-[#0b3c43] text-[#0b3c43] font-semibold'
                    : 'border-transparent text-[#52606d] hover:bg-[#eef4f4] hover:text-[#0f2327]'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center font-code-tabular text-code-tabular ${
                    isActive
                      ? 'bg-[#0b3c43] text-white'
                      : 'border border-[#cbd6d6] text-[#52606d]'
                  }`}
                >
                  {step.number}
                </span>
                <span>{step.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Tag */}
      <div className="px-gutter border-t border-[#cbd6d6] pt-space-md">
        <div className="flex items-center justify-between text-label-sm font-label-sm text-[#52606d]">
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[15px] text-[#179ea1]">verified</span>
            NBA / NAAC Format
          </span>
          <span className="font-code-tabular text-code-tabular text-[#9a6b18] font-bold">v2.4.1</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
