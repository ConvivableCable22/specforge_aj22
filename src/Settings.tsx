import React, { useState, useEffect } from 'react';
import { AISettings } from './types';
import { loadSettings, saveSettings } from './api';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const SettingsModal: React.FC<SettingsProps> = ({ isOpen, onClose, onSaved }) => {
  const [settings, setSettings] = useState<AISettings>(loadSettings());
  const [showKey, setShowKey] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSettings(loadSettings());
      setSaveStatus(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    saveSettings(settings);
    setSaveStatus('Settings saved successfully');
    setTimeout(() => {
      setSaveStatus(null);
      if (onSaved) onSaved();
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-xl border border-[#cbd6d6] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#cbd6d6] flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0b3c43] flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-[18px]">smart_toy</span>
            </div>
            <div>
              <h2 className="font-title-md text-title-md font-bold text-[#0b3c43]">AI Curriculum Intelligence</h2>
              <p className="font-label-sm text-label-sm text-[#52606d]">Configure LLM provider and headers</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#52606d] hover:bg-[#eef4f4] hover:text-[#0f2327] transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Security Notice */}
          <div className="p-3 rounded-lg bg-[#fef8ec] border border-[#e6ca85] flex items-start gap-2.5">
            <span className="material-symbols-outlined text-[#9a6b18] text-[20px] shrink-0 mt-0.5">lock</span>
            <div className="text-xs text-[#6b4907] leading-relaxed">
              <span className="font-semibold">Client-Side Privacy Guarantee:</span> Your API key is stored only in your local browser storage and transmitted strictly via <code className="font-code-tabular px-1 py-0.5 bg-white/70 rounded">x-llm-*</code> request headers. It is never saved to disk on any server or exposed to source repositories.
            </div>
          </div>

          {/* Provider Selection */}
          <div className="space-y-1.5">
            <label className="font-label-md text-label-md uppercase font-semibold text-[#52606d] tracking-wide block">
              AI Provider
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'gemini', label: 'Google Gemini', icon: 'auto_awesome' },
                { id: 'openai', label: 'OpenAI', icon: 'psychology' },
                { id: 'anthropic', label: 'Anthropic', icon: 'neurology' },
                { id: 'custom', label: 'Custom / Ollama', icon: 'terminal' },
              ].map((prov) => (
                <button
                  key={prov.id}
                  type="button"
                  onClick={() =>
                    setSettings({
                      ...settings,
                      provider: prov.id as AISettings['provider'],
                      model:
                        prov.id === 'gemini'
                          ? 'gemini-1.5-pro'
                          : prov.id === 'openai'
                          ? 'gpt-4o'
                          : prov.id === 'anthropic'
                          ? 'claude-3-5-sonnet-20241022'
                          : 'llama3',
                    })
                  }
                  className={`p-2.5 rounded-lg border text-left flex flex-col gap-1 transition-all ${
                    settings.provider === prov.id
                      ? 'border-[#0b3c43] bg-[#eef4f4] text-[#0b3c43] font-semibold ring-1 ring-[#0b3c43]'
                      : 'border-[#cbd6d6] hover:bg-[#f4f7f6] text-[#52606d]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">{prov.icon}</span>
                  <span className="font-title-sm text-xs">{prov.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Model Selection */}
          <div className="space-y-1.5">
            <label className="font-label-md text-label-md uppercase font-semibold text-[#52606d] tracking-wide block">
              Target Model (<code className="font-code-tabular text-[#0b3c43]">x-llm-model</code>)
            </label>
            <div className="relative">
              <select
                value={settings.model}
                onChange={(e) => setSettings({ ...settings, model: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[#cbd6d6] bg-white text-sm text-[#0f2327] font-medium focus:outline-none focus:border-[#179ea1] focus:ring-1 focus:ring-[#179ea1]"
              >
                {settings.provider === 'gemini' && (
                  <>
                    <option value="gemini-1.5-pro">gemini-1.5-pro (Curriculum Reasoning)</option>
                    <option value="gemini-1.5-flash">gemini-1.5-flash (High Throughput)</option>
                    <option value="gemini-2.0-flash">gemini-2.0-flash (Fast & Accurate)</option>
                  </>
                )}
                {settings.provider === 'openai' && (
                  <>
                    <option value="gpt-4o">gpt-4o (Omni Reasoning)</option>
                    <option value="gpt-4o-mini">gpt-4o-mini (Lightweight)</option>
                  </>
                )}
                {settings.provider === 'anthropic' && (
                  <>
                    <option value="claude-3-5-sonnet-20241022">claude-3-5-sonnet-20241022</option>
                    <option value="claude-3-haiku-20240307">claude-3-haiku-20240307</option>
                  </>
                )}
                {settings.provider === 'custom' && (
                  <>
                    <option value="llama3">llama3:latest</option>
                    <option value="mistral">mistral:latest</option>
                    <option value="qwen2.5">qwen2.5:latest</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* API Key */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-label-md text-label-md uppercase font-semibold text-[#52606d] tracking-wide">
                API Key (<code className="font-code-tabular text-[#0b3c43]">x-llm-key</code>)
              </label>
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="text-xs text-[#0b3c43] hover:underline flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">{showKey ? 'visibility_off' : 'visibility'}</span>
                {showKey ? 'Hide' : 'Reveal'}
              </button>
            </div>
            <input
              type={showKey ? 'text' : 'password'}
              value={settings.apiKey}
              onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
              placeholder={
                settings.provider === 'gemini'
                  ? 'AIzaSy...'
                  : settings.provider === 'openai'
                  ? 'sk-...'
                  : 'Enter provider token...'
              }
              className="w-full px-3 py-2 rounded-lg border border-[#cbd6d6] bg-white font-code-tabular text-sm text-[#0f2327] focus:outline-none focus:border-[#179ea1] focus:ring-1 focus:ring-[#179ea1]"
            />
          </div>

          {/* Custom Endpoint if Custom */}
          {settings.provider === 'custom' && (
            <div className="space-y-1.5">
              <label className="font-label-md text-label-md uppercase font-semibold text-[#52606d] tracking-wide block">
                Endpoint URL
              </label>
              <input
                type="text"
                value={settings.customEndpoint || ''}
                onChange={(e) => setSettings({ ...settings, customEndpoint: e.target.value })}
                placeholder="http://localhost:11434/v1"
                className="w-full px-3 py-2 rounded-lg border border-[#cbd6d6] bg-white font-code-tabular text-sm text-[#0f2327] focus:outline-none focus:border-[#179ea1] focus:ring-1 focus:ring-[#179ea1]"
              />
            </div>
          )}

          {/* Active Headers Inspection */}
          <div className="p-3 rounded-lg bg-[#eef4f4] border border-[#cbd6d6] text-xs font-code-tabular space-y-1 text-[#0f2327]">
            <div className="font-bold text-[#0b3c43] mb-1 font-sans text-xs">Request Headers Forwarded:</div>
            <div>x-llm-provider: <span className="text-[#9a6b18]">{settings.provider}</span></div>
            <div>x-llm-model: <span className="text-[#179ea1]">{settings.model}</span></div>
            <div>x-llm-key: <span className="text-[#52606d]">{settings.apiKey ? `${settings.apiKey.substring(0, 4)}••••••••` : '(not set)'}</span></div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#cbd6d6] bg-[#f4f7f6] flex items-center justify-between">
          <span className="text-xs text-[#0b3c43] font-medium">{saveStatus}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold text-[#52606d] hover:bg-[#eef4f4] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-1.5 rounded-full text-xs font-semibold bg-[#0b3c43] text-white hover:bg-[#0a444e] shadow-xs transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[15px]">save</span>
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
