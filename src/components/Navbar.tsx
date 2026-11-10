import React, { useRef, useState } from 'react';
import {
  Gamepad2,
  Volume2,
  Activity,
  User,
  Shield,
  Layers,
  Sparkles,
  Download,
  Upload,
  RotateCcw,
  Languages,
  CheckCircle2,
  Loader2,
  Cloud
} from 'lucide-react';
import { PortalType, StudioProject } from '../types/studio';
import { exportStudioProjectZip } from '../utils/projectZip';
import { User as FirebaseUser } from 'firebase/auth';

interface NavbarProps {
  activePortal: PortalType;
  setActivePortal: (portal: PortalType) => void;
  project: StudioProject;
  setProject: React.Dispatch<React.SetStateAction<StudioProject>>;
  onReset: () => void;
  user?: FirebaseUser | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  activePortal,
  setActivePortal,
  project,
  setProject,
  onReset,
  user
}) => {
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // Full ZIP Export
  const handleExportZip = async () => {
    try {
      setIsExportingZip(true);
      const zipBlob = await exportStudioProjectZip(project);
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name.replace(/\s+/g, '_')}_Bundle.zip`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('تم تصدير ملف الاستوديو المضغوط بنجاح (ZIP)');
    } catch (e) {
      console.error('ZIP error:', e);
      showToast('حدث خطأ أثناء ضغط وتصدير المشروع');
    } finally {
      setIsExportingZip(false);
    }
  };

  // Export JSON
  const handleExportJson = () => {
    const jsonStr = JSON.stringify(project, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('تم تصدير ملف إعدادات المشروع (JSON)');
  };

  // Import JSON
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content) as StudioProject;
        if (parsed.sounds && parsed.characters) {
          setProject(parsed);
          showToast('تم استيراد المشروع بنجاح!');
        } else {
          showToast('الملف المستورد غير متوافق');
        }
      } catch (err) {
        showToast('فشل قراءة ملف المشروع المستورد');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const portals: { id: PortalType; labelAr: string; labelEn: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'stage', labelAr: 'المشهد المتكامل', labelEn: 'Stage Sandbox', icon: <Gamepad2 className="w-4 h-4" /> },
    { id: 'audio', labelAr: 'المؤثرات الصوتية', labelEn: 'Audio SFX', icon: <Volume2 className="w-4 h-4" />, count: project.sounds.length },
    { id: 'physics', labelAr: 'الحركة الفيزيائية', labelEn: 'Physics Engine', icon: <Activity className="w-4 h-4" />, count: project.physicsPresets.length },
    { id: 'characters', labelAr: 'صانع الشخصيات', labelEn: 'Characters', icon: <User className="w-4 h-4" />, count: project.characters.length },
    { id: 'wardrobe', labelAr: 'خزانة الملابس والأزياء', labelEn: 'Wardrobe', icon: <Shield className="w-4 h-4" />, count: project.wardrobe.length },
    { id: 'backgrounds', labelAr: 'العوالم والخلفيات', labelEn: 'Backgrounds', icon: <Layers className="w-4 h-4" />, count: project.backgrounds.length },
    { id: 'skills', labelAr: 'المهارات والملحقات', labelEn: 'Skills & Plugins', icon: <Sparkles className="w-4 h-4" />, count: project.skills.length },
    { id: 'drive', labelAr: 'سحابة Google Drive', labelEn: 'Google Drive', icon: <Cloud className="w-4 h-4" /> }
  ];

  const isAr = project.settings.language === 'ar';

  const toggleLanguage = () => {
    setProject((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        language: prev.settings.language === 'ar' ? 'en' : 'ar'
      }
    }));
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 shadow-xl">
      {/* Top Banner Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-2 ring-indigo-400/30">
            <Gamepad2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
                OmniStudio Engine
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                v2.0 Pro
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              {isAr ? 'استوديو الألعاب والمحاكاة التفاعلية المتكامل' : 'Extensible Modular Creative Game Studio'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Google Drive Cloud Quick Button */}
          <button
            onClick={() => setActivePortal('drive')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
              activePortal === 'drive'
                ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-500/25'
                : user
                ? 'bg-blue-500/15 text-blue-300 border-blue-500/30 hover:bg-blue-500/25'
                : 'bg-slate-900 text-slate-300 border-slate-700/80 hover:bg-slate-800'
            }`}
            title="سحابة Google Drive لحفظ ومزامنة الأصول والمشاريع"
          >
            <Cloud className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Drive</span>
            {user && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
          </button>

          {/* Export Full ZIP Button */}
          <button
            onClick={handleExportZip}
            disabled={isExportingZip}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-md shadow-indigo-600/30 border border-indigo-400/30 transition-all cursor-pointer disabled:opacity-50"
            title="تحميل الاستوديو كامل مع التعديلات كملف مضغوط ZIP مع لعبة مستقلة كود"
          >
            {isExportingZip ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span className="hidden sm:inline">{isAr ? 'تصدير الاستوديو (ZIP)' : 'Export (ZIP)'}</span>
            <span className="sm:hidden">ZIP</span>
          </button>

          {/* Export JSON */}
          <button
            onClick={handleExportJson}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 transition-colors"
            title="حفظ بيانات المشروع كملف JSON"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>JSON</span>
          </button>

          {/* Import JSON */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportJson}
            accept=".json"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 transition-colors"
            title="استيراد مشروع كامل من ملف JSON"
          >
            <Upload className="w-3.5 h-3.5 text-slate-400" />
            <span>{isAr ? 'استيراد' : 'Import'}</span>
          </button>

          {/* Language Toggle */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-900/80 border border-slate-800 transition-colors"
            title="تبديل اللغة (العربية / English)"
          >
            <Languages className="w-3.5 h-3.5" />
            <span>{isAr ? 'EN' : 'عربي'}</span>
          </button>

          {/* Reset button */}
          <button
            onClick={onReset}
            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-colors"
            title="إعادة ضبط الاستوديو للإعدادات الافتراضية"
            aria-label="إعادة ضبط"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Portal Tabs Bar */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-800/80 flex items-center gap-1 overflow-x-auto py-2 no-scrollbar">
        {portals.map((p) => {
          const isActive = activePortal === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setActivePortal(p.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 shadow-inner'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80 border border-transparent'
              }`}
            >
              <span className={isActive ? 'text-indigo-400' : 'text-slate-500'}>{p.icon}</span>
              <span>{isAr ? p.labelAr : p.labelEn}</span>
              {typeof p.count === 'number' && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {p.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-900 border border-emerald-500/30 text-emerald-300 shadow-2xl text-xs font-semibold animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{successToast}</span>
        </div>
      )}
    </header>
  );
};
