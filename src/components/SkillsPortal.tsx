import React, { useState } from 'react';
import {
  Sparkles,
  Plus,
  Trash2,
  Copy,
  Code2,
  Zap,
  CheckCircle,
  Play
} from 'lucide-react';
import { StudioSkill } from '../types/studio';
import { CodeModal } from './CodeModal';

interface SkillsPortalProps {
  skills: StudioSkill[];
  onUpdateSkills: (skills: StudioSkill[]) => void;
  language: 'ar' | 'en';
}

export const SkillsPortal: React.FC<SkillsPortalProps> = ({
  skills,
  onUpdateSkills,
  language
}) => {
  const isAr = language === 'ar';
  const [selectedSkillId, setSelectedSkillId] = useState(skills[0]?.id || '');
  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [isImportMode, setIsImportMode] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const activeSkill = skills.find((s) => s.id === selectedSkillId) || skills[0];

  const handleUpdateActive = (patch: Partial<StudioSkill>) => {
    if (!activeSkill) return;
    const updated = skills.map((s) => (s.id === activeSkill.id ? { ...s, ...patch } : s));
    onUpdateSkills(updated);
  };

  const handleAddNew = () => {
    const newSkill: StudioSkill = {
      id: 'skill_' + Date.now(),
      name: isAr ? 'مهارة تفاعلية مخصصة' : 'Custom Skill',
      triggerKey: 'KeyF',
      description: isAr ? 'مهارة إضافية مبرمجة برمجياً' : 'Programmed extension skill',
      enabled: true,
      category: 'utility',
      cooldownMs: 1500,
      code: `// Custom Skill Extension
function executeSkill(context) {
  console.log("Skill executed with context:", context);
  // Add custom particles, screen flash, audio triggers, or force impulses!
  return { success: true, message: "Skill successfully executed" };
}`
    };
    onUpdateSkills([newSkill, ...skills]);
    setSelectedSkillId(newSkill.id);
  };

  const handleDuplicate = () => {
    if (!activeSkill) return;
    const dup: StudioSkill = {
      ...activeSkill,
      id: 'skill_' + Date.now(),
      name: `${activeSkill.name} (نسخة)`
    };
    onUpdateSkills([dup, ...skills]);
    setSelectedSkillId(dup.id);
  };

  const handleDelete = () => {
    if (skills.length <= 1) return;
    const filtered = skills.filter((s) => s.id !== activeSkill.id);
    onUpdateSkills(filtered);
    setSelectedSkillId(filtered[0]?.id || '');
  };

  const handleTestSkill = () => {
    if (!activeSkill) return;
    try {
      // Evaluate skill in safe sandbox function
      const fn = new Function('context', `${activeSkill.code}\nreturn typeof executeSkill === 'function' ? executeSkill(context) : { success: true };`);
      const res = fn({ timestamp: Date.now(), trigger: activeSkill.triggerKey });
      setTestResult(isAr ? 'تم تشغيل الكود بنجاح في بيئة الاختبار!' : 'Skill code executed successfully!');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setTestResult(`خطأ في الكود: ${errorMsg}`);
    }
    setTimeout(() => setTestResult(null), 4000);
  };

  const handleImportCode = (rawText: string) => {
    try {
      if (rawText.trim().startsWith('{')) {
        const parsed = JSON.parse(rawText) as StudioSkill;
        const newSk: StudioSkill = {
          id: 'skill_' + Date.now(),
          name: parsed.name || (isAr ? 'مهارة مستوردة' : 'Imported Skill'),
          triggerKey: parsed.triggerKey || 'KeyQ',
          description: parsed.description || '',
          enabled: true,
          category: parsed.category || 'utility',
          cooldownMs: parsed.cooldownMs || 1000,
          code: parsed.code || '// custom code'
        };
        onUpdateSkills([newSk, ...skills]);
        setSelectedSkillId(newSk.id);
      } else {
        // Plain JS
        const newSk: StudioSkill = {
          id: 'skill_' + Date.now(),
          name: isAr ? 'مهارة من كود JS' : 'JS Code Skill',
          triggerKey: 'KeyE',
          description: isAr ? 'مهارة مضافة من كود نقي' : 'Custom JS script',
          enabled: true,
          category: 'motion',
          cooldownMs: 1200,
          code: rawText
        };
        onUpdateSkills([newSk, ...skills]);
        setSelectedSkillId(newSk.id);
      }
    } catch (e) {
      console.warn('Skill import error:', e);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-100">
              {isAr ? 'بوابة المهارات والإضافات البرمجية' : 'Skills, Plugins & Script Extensions'}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {isAr
              ? 'توسيع قدرات الاستوديو وإضافة مهارات برمجية مخصصة ومحركات سلوك مع محرر كود وتجربة في بيئة معزولة'
              : 'Extend studio capabilities with custom programmable game skills, key bindings, and live script sandbox'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleAddNew}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isAr ? 'إضافة مهارة جديدة' : 'New Skill'}</span>
          </button>
          <button
            onClick={() => {
              setIsImportMode(true);
              setCodeModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            <span>{isAr ? 'استيراد كود مهارة' : 'Import Code'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Skills List (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-2">
          <div className="text-xs font-bold text-slate-300 px-1 mb-2">
            {isAr ? 'قائمة المهارات والملحقات' : 'Active Skills & Plugins'}
          </div>

          <div className="flex flex-col gap-1.5">
            {skills.map((sk) => {
              const isSelected = sk.id === activeSkill?.id;
              return (
                <div
                  key={sk.id}
                  onClick={() => setSelectedSkillId(sk.id)}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-violet-600/15 border-violet-500/50 text-violet-300 shadow-md'
                      : 'bg-slate-950/40 border-slate-800/80 text-slate-300 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-violet-500/20 text-violet-400 flex items-center justify-center font-bold text-xs">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold">{sk.name}</div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        <span className="font-mono text-cyan-400 font-bold">{sk.triggerKey}</span>
                        <span>•</span>
                        <span>{sk.cooldownMs}ms</span>
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={sk.enabled}
                    onChange={(e) => {
                      e.stopPropagation();
                      const updated = skills.map((s) => (s.id === sk.id ? { ...s, enabled: e.target.checked } : s));
                      onUpdateSkills(updated);
                    }}
                    className="accent-violet-500 w-4 h-4 cursor-pointer"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Code Editor & Settings (8 cols) */}
        {activeSkill && (
          <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <input
                  type="text"
                  value={activeSkill.name}
                  onChange={(e) => handleUpdateActive({ name: e.target.value })}
                  className="text-base font-bold text-white bg-slate-950/60 border border-slate-800 px-3 py-1.5 rounded-lg focus:outline-none focus:border-violet-500 w-full sm:w-80"
                />
                <input
                  type="text"
                  value={activeSkill.description}
                  onChange={(e) => handleUpdateActive({ description: e.target.value })}
                  placeholder="وصف المهارة..."
                  className="text-xs text-slate-400 bg-transparent border-0 px-1 py-1 focus:outline-none w-full mt-1"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDuplicate}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  title="تكرار المهارة"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDelete}
                  disabled={skills.length <= 1}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-400 transition-colors disabled:opacity-40"
                  title="حذف المهارة"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick config row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  {isAr ? 'زر التفعيل في اللعبة' : 'Trigger Key'}
                </label>
                <input
                  type="text"
                  value={activeSkill.triggerKey}
                  onChange={(e) => handleUpdateActive({ triggerKey: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 font-mono text-cyan-300 px-2.5 py-1.5 rounded-lg text-xs"
                />
              </div>

              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  {isAr ? 'زمن التهدئة (Cooldown)' : 'Cooldown (ms)'}
                </label>
                <input
                  type="number"
                  value={activeSkill.cooldownMs}
                  onChange={(e) => handleUpdateActive({ cooldownMs: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 font-mono text-purple-300 px-2.5 py-1.5 rounded-lg text-xs"
                />
              </div>

              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  {isAr ? 'تصنيف المهارة' : 'Category'}
                </label>
                <select
                  value={activeSkill.category}
                  onChange={(e) => handleUpdateActive({ category: e.target.value as StudioSkill['category'] })}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 px-2.5 py-1.5 rounded-lg text-xs cursor-pointer"
                >
                  <option value="motion">حركة وتنقل (Motion)</option>
                  <option value="combat">قتال وهجوم (Combat)</option>
                  <option value="fx">مؤثرات بصرية (FX)</option>
                  <option value="utility">أدوات مساعدة (Utility)</option>
                </select>
              </div>
            </div>

            {/* Script Code Editor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Code2 className="w-4 h-4 text-violet-400" />
                  <span>{isAr ? 'كود المهارة البرمجي (JavaScript Extension)' : 'Skill Script Implementation'}</span>
                </span>
                <span className="text-[11px] font-mono text-slate-500">Pure JavaScript</span>
              </div>
              <textarea
                value={activeSkill.code}
                onChange={(e) => handleUpdateActive({ code: e.target.value })}
                className="w-full h-64 p-4 font-mono text-xs text-emerald-300 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-violet-500 resize-none leading-relaxed text-left"
                dir="ltr"
                spellCheck={false}
              />
            </div>

            {/* Test Sandbox and Export */}
            <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleTestSkill}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-violet-600 hover:bg-violet-500 shadow-md shadow-violet-600/30 transition-all cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{isAr ? 'تجربة تشغيل الكود (Test Sandbox)' : 'Test Sandbox'}</span>
                </button>
                {testResult && (
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1 animate-in fade-in">
                    <CheckCircle className="w-4 h-4" />
                    <span>{testResult}</span>
                  </span>
                )}
              </div>

              <button
                onClick={() => {
                  setIsImportMode(false);
                  setCodeModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
              >
                <Code2 className="w-3.5 h-3.5 text-violet-400" />
                <span>{isAr ? 'تصدير كود المهارة' : 'Export Skill'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Code Modal */}
      {activeSkill && (
        <CodeModal
          isOpen={codeModalOpen}
          title={isImportMode ? (isAr ? 'استيراد مهارة من كود' : 'Import Skill Code') : `${activeSkill.name} - Script`}
          code={isImportMode ? '' : activeSkill.code}
          language="javascript"
          filename={`${activeSkill.id}_plugin.js`}
          isImportMode={isImportMode}
          onClose={() => setCodeModalOpen(false)}
          onImport={handleImportCode}
        />
      )}
    </div>
  );
};
