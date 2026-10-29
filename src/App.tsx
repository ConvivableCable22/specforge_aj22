import { useState, useEffect } from 'react';
import { CourseSpec, UserRole } from './types';
import { initialCourseData } from './data/defaultCourse';
import { loadSettings } from './api';
import Header from './components/Header';
import Sidebar, { StepId } from './components/Sidebar';
import SettingsModal from './Settings';
import UploadScreen from './screens/UploadScreen';
import SpecDetailsScreen from './screens/SpecDetailsScreen';
import MappingScreen from './screens/MappingScreen';
import AutomatedChecksScreen from './screens/AutomatedChecksScreen';
import WorkflowScreen from './screens/WorkflowScreen';
import ExportPackageScreen from './screens/ExportPackageScreen';

export default function App() {
  const [course, setCourse] = useState<CourseSpec>(initialCourseData);
  const [activeRole, setActiveRole] = useState<UserRole>('Author');
  const [currentStep, setCurrentStep] = useState<StepId>('upload');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [aiConnected, setAiConnected] = useState(false);

  useEffect(() => {
    const settings = loadSettings();
    setAiConnected(Boolean(settings.apiKey));
  }, []);

  const getStepTitle = (step: StepId): string => {
    switch (step) {
      case 'upload':
        return 'Upload & Ingestion';
      case 'spec-details':
        return 'Spec Details';
      case 'co-po-pso-map':
        return 'CO-PO-PSO Map';
      case 'automated-checks':
        return 'Automated Checks';
      case 'workflow-approvals':
        return 'Workflow & Approvals';
      case 'export-package':
        return 'Export & Package';
      default:
        return 'Overview';
    }
  };

  return (
    <div className="bg-[#f4f7f6] font-body-md text-[#0f2327] min-h-screen">
      <Header
        course={course}
        activeRole={activeRole}
        onRoleChange={setActiveRole}
        activeStepTitle={getStepTitle(currentStep)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        aiConnected={aiConnected}
      />

      <Sidebar currentStep={currentStep} onSelectStep={setCurrentStep} />

      <div className="pl-64">
        <main className="w-full pt-14 bg-[#f4f7f6] min-h-screen">
          {currentStep === 'upload' && (
            <UploadScreen
              course={course}
              onUpdateCourse={setCourse}
              userRole={activeRole}
              onNext={() => setCurrentStep('spec-details')}
            />
          )}

          {currentStep === 'spec-details' && (
            <SpecDetailsScreen
              course={course}
              onUpdateCourse={setCourse}
              userRole={activeRole}
              onNext={() => setCurrentStep('co-po-pso-map')}
              onPrev={() => setCurrentStep('upload')}
            />
          )}

          {currentStep === 'co-po-pso-map' && (
            <MappingScreen
              course={course}
              onUpdateCourse={setCourse}
              userRole={activeRole}
              onNext={() => setCurrentStep('automated-checks')}
              onPrev={() => setCurrentStep('spec-details')}
            />
          )}

          {currentStep === 'automated-checks' && (
            <AutomatedChecksScreen
              course={course}
              onUpdateCourse={setCourse}
              userRole={activeRole}
              onNext={() => setCurrentStep('workflow-approvals')}
              onPrev={() => setCurrentStep('co-po-pso-map')}
            />
          )}

          {currentStep === 'workflow-approvals' && (
            <WorkflowScreen
              course={course}
              onUpdateCourse={setCourse}
              userRole={activeRole}
              onNext={() => setCurrentStep('export-package')}
              onPrev={() => setCurrentStep('automated-checks')}
            />
          )}

          {currentStep === 'export-package' && (
            <ExportPackageScreen
              course={course}
              userRole={activeRole}
              onNavigateToStep={(step) => setCurrentStep(step as StepId)}
            />
          )}
        </main>
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSaved={() => {
          const settings = loadSettings();
          setAiConnected(Boolean(settings.apiKey));
        }}
      />
    </div>
  );
}
