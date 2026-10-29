import { AISettings, CourseSpec } from './types';

const SETTINGS_KEY = 'specforge_ai_settings';

export const DEFAULT_AI_SETTINGS: AISettings = {
  provider: 'gemini',
  apiKey: '',
  model: 'gemini-1.5-pro',
};

export function loadSettings(): AISettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_AI_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      provider: parsed.provider || 'gemini',
      apiKey: parsed.apiKey || '',
      model: parsed.model || 'gemini-1.5-pro',
      customEndpoint: parsed.customEndpoint || '',
    };
  } catch {
    return { ...DEFAULT_AI_SETTINGS };
  }
}

export function saveSettings(settings: AISettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save settings to localStorage', err);
  }
}

export function getAIHeaders(settings?: AISettings): Record<string, string> {
  const current = settings || loadSettings();
  return {
    'x-llm-provider': current.provider,
    'x-llm-key': current.apiKey,
    'x-llm-model': current.model,
  };
}

export async function requestAIAssist(
  action: 'analyze_rubric' | 'improve_co' | 'extract_syllabus',
  payload: Record<string, unknown>
): Promise<{ success: boolean; result: string; tokensUsed?: number; error?: string }> {
  const settings = loadSettings();
  const headers = {
    'Content-Type': 'application/json',
    ...getAIHeaders(settings),
  };

  try {
    const res = await fetch('/api/v1/ai/assist', {
      method: 'POST',
      headers,
      body: JSON.stringify({ action, payload }),
    });

    if (res.ok) {
      const data = await res.json();
      return { success: true, result: data.result, tokensUsed: data.tokensUsed };
    } else {
      const errData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      return { success: false, error: errData.error || `Request failed with HTTP ${res.status}`, result: '' };
    }
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Network error reaching AI assistant endpoint',
      result: '',
    };
  }
}

export function downloadCourseJSON(course: CourseSpec): void {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(course, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `${course.code}_Course_Specification_Accreditation.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

export function generateHTMLDocument(course: CourseSpec): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>${course.code} - Official Course Specification Record</title>
  <style>
    body { font-family: Inter, system-ui, -apple-system, sans-serif; margin: 40px; color: #0f2327; background: #ffffff; }
    h1 { color: #0b3c43; font-size: 20px; text-transform: uppercase; margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }
    th, td { border: 1px solid #94a3b8; padding: 8px 12px; text-align: left; }
    th { background: #f1f5f9; font-weight: 600; text-transform: uppercase; font-size: 11px; }
    .header-box { border-bottom: 2px solid #0f2327; padding-bottom: 16px; margin-bottom: 24px; text-align: center; }
    .tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; background: #e0f7f8; color: #084c4e; }
  </style>
</head>
<body>
  <div class="header-box">
    <h1>Metropolitan Institute of Technology & Autonomous Research</h1>
    <p>BOARD OF STUDIES (BoS) OFFICIAL COURSE SPECIFICATION RECORD</p>
    <div class="tag">${course.versionTag}</div>
  </div>
  <table>
    <tr><th>Course Code</th><td>${course.code}</td><th>Academic Year</th><td>${course.academicYear}</td></tr>
    <tr><th>Course Title</th><td colspan="3">${course.title}</td></tr>
    <tr><th>Regulation</th><td>${course.regulation}</td><th>Credits</th><td>${course.credits} Credits (${course.theoryCredits} Th + ${course.labCredits} Lab)</td></tr>
  </table>
  <h3>1.0 Course Overview</h3>
  <p>${course.overviewRationale}</p>
  <h3>2.0 Course Outcomes</h3>
  <table>
    <thead><tr><th>CO #</th><th>Outcome Statement</th><th>Bloom Level</th><th>Target POs</th></tr></thead>
    <tbody>
      ${course.courseOutcomes.map(co => `<tr><td><strong>${co.id}</strong></td><td>${co.statement}</td><td>${co.bloomLevel}</td><td>${co.targetPOs.join(', ')}</td></tr>`).join('')}
    </tbody>
  </table>
  <div style="margin-top: 40px; border-top: 1px solid #cbd6d6; padding-top: 16px; font-size: 11px; color: #64748b;">
    Fingerprint: ${course.documentFingerprint} | Resolution: ${course.bosResolution}
  </div>
</body>
</html>`;
}

export function downloadCourseHTML(course: CourseSpec): void {
  const html = generateHTMLDocument(course);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', url);
  downloadAnchor.setAttribute('download', `${course.code}_BoS_Archival_Record.html`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  URL.revokeObjectURL(url);
}
