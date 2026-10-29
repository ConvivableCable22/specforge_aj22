import React from 'react';
import { CourseSpec, UserRole } from '../types';

interface HeaderProps {
  course: CourseSpec;
  activeRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  activeStepTitle: string;
  onOpenSettings: () => void;
  aiConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  course,
  activeRole,
  onRoleChange,
  activeStepTitle,
  onOpenSettings,
  aiConnected,
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 h-14 z-50 bg-white border-b border-[#cbd6d6] flex items-center justify-between px-gutter">
      {/* Brand & Breadcrumbs */}
      <div className="flex items-center gap-space-lg">
        <div className="flex items-center gap-space-sm">
          <div className="w-8 h-8 rounded-lg bg-[#0b3c43] shadow-sm flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-[20px]">account_balance</span>
          </div>
          <div className="flex flex-col">
            <span className="font-title-md text-title-md text-[#0b3c43] font-bold tracking-tight leading-none">
              SpecForge
            </span>
            <span className="font-label-sm text-label-sm text-[#9a6b18] font-bold uppercase tracking-wider">
              Curriculum Engine
            </span>
          </div>
        </div>

        <div className="h-4 w-px bg-[#cbd6d6]"></div>

        <div className="flex items-center gap-space-xs flex-wrap">
          <span className="material-symbols-outlined text-[#52606d] text-[16px]">school</span>
          <span className="font-title-sm text-title-sm text-[#0f2327] tracking-tight font-semibold">
            {course.code} - {course.title.split('&')[0].trim()}
          </span>
          <span className="font-body-sm text-body-sm text-[#52606d]">({course.academicYear.split(' ')[0]})</span>
          <span className="font-body-sm text-body-sm text-[#718182] mx-1">/</span>
          <span className="font-body-sm text-body-sm text-[#0b3c43] font-semibold">{activeStepTitle}</span>
        </div>
      </div>

      {/* Role Switcher & Controls */}
      <div className="flex items-center gap-space-lg">
        {/* Role Switcher */}
        <div className="flex items-center border border-[#cbd6d6] rounded-md p-0.5 bg-[#eef4f4]">
          {(['Author', 'Reviewer', 'HOD'] as UserRole[]).map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => onRoleChange(role)}
              className={`px-space-sm py-0.5 rounded text-label-md font-label-md transition-all ${
                activeRole === role
                  ? 'bg-[#0b3c43] text-white shadow-xs font-semibold'
                  : 'text-[#52606d] hover:text-[#0f2327]'
              }`}
            >
              {role}
            </button>
          ))}
        </div>

        {/* 6-State Status Timeline */}
        <div className="hidden lg:flex items-center gap-1 px-3 py-1 bg-[#f1f5f9] rounded-lg border border-[#cbd6d6]">
          {(['Draft', 'Submitted', 'Under Review', 'Pending HOD', 'Approved'] as const).map((step, idx) => {
            const currentStatus = course.workflowStatus || 'Draft';
            const isCurrent = currentStatus === step;
            const stepOrder = ['Draft', 'Submitted', 'Under Review', 'Pending HOD', 'Approved'];
            const currentIndex = stepOrder.indexOf(currentStatus);
            const isCompleted = currentIndex > idx && currentStatus !== 'Returned';

            return (
              <React.Fragment key={step}>
                {idx > 0 && (
                  <span className={`text-[10px] ${isCompleted ? 'text-[#059669]' : 'text-[#cbd6d6]'}`}>
                    •
                  </span>
                )}
                <span
                  className={`text-[11px] font-semibold tracking-tight px-1.5 py-0.5 rounded ${
                    isCurrent
                      ? currentStatus === 'Approved'
                        ? 'bg-[#dcfce7] text-[#166534] font-bold ring-1 ring-[#059669]'
                        : 'bg-[#0b3c43] text-white shadow-xs'
                      : isCompleted
                      ? 'text-[#059669]'
                      : 'text-[#94a3b8]'
                  }`}
                >
                  {step}
                </span>
              </React.Fragment>
            );
          })}

          {course.workflowStatus === 'Returned' && (
            <span className="ml-1 text-[11px] font-bold px-2 py-0.5 rounded bg-[#fee2e2] text-[#991b1b] ring-1 ring-[#ba1a1a]">
              Returned
            </span>
          )}
        </div>

        {/* AI Connected Pill */}
        <button
          type="button"
          onClick={onOpenSettings}
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-[#179ea1]/30 bg-[#e0f7f8] text-[#084c4e] font-label-sm text-label-sm uppercase tracking-wide font-semibold hover:border-[#179ea1] transition-colors"
          title="Click to configure AI LLM credentials"
        >
          <span className="material-symbols-outlined text-[14px] text-[#179ea1]">smart_toy</span>
          <span>{aiConnected ? 'AI Connected' : 'Configure AI'}</span>
        </button>

        <div className="h-4 w-px bg-[#cbd6d6]"></div>

        {/* Settings & User Icons */}
        <div className="flex items-center gap-space-sm">
          <button
            type="button"
            onClick={onOpenSettings}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#52606d] hover:bg-[#eef4f4] hover:text-[#0f2327] transition-colors"
            title="Settings & AI Headers"
          >
            <span className="material-symbols-outlined text-[20px]">settings</span>
          </button>
          <div
            className="w-8 h-8 rounded-full bg-[#0b3c43] flex items-center justify-center shadow-xs text-white"
            title={`Active User Role: ${activeRole}`}
          >
            <span className="material-symbols-outlined text-[18px]">person</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
