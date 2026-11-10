import React, { useState, useEffect } from 'react';
import {
  Shield,
  Plus,
  Trash2,
  Copy,
  Download,
  Code2,
  Sparkles,
  Sword,
  Crown
} from 'lucide-react';
import { WardrobeItem, CharacterDesign } from '../types/studio';
import { CharacterRenderer } from '../utils/characterRenderer';
import { CodeModal } from './CodeModal';

interface WardrobePortalProps {
  wardrobe: WardrobeItem[];
  characters: CharacterDesign[];
  activeOutfitId: string;
  onSelectOutfit: (id: string) => void;
  onUpdateWardrobe: (wardrobe: WardrobeItem[]) => void;
  language: 'ar' | 'en';
}

export const WardrobePortal: React.FC<WardrobePortalProps> = ({
  wardrobe,
  characters,
  activeOutfitId,
  onSelectOutfit,
  onUpdateWardrobe,
  language
}) => {
  const isAr = language === 'ar';
  const activeOutfit = wardrobe.find((w) => w.id === activeOutfitId) || wardrobe[0];
  const dummyChar = characters[0] || {
    id: 'dummy',
    name: 'عارض الأزياء',
    skinTone: '#ffd1a4',
    hairStyle: 'short',
    hairColor: '#334155',
    eyeColor: '#06b6d4',
    expression: 'neutral',
    outfitId: activeOutfit?.id || '',
    scale: 1,
    animation: 'idle',
    role: 'عارض'
  };

  const [animTime, setAnimTime] = useState(0);
  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [isImportMode, setIsImportMode] = useState(false);

  useEffect(() => {
    let animId: number;
    const loop = () => {
      setAnimTime((t) => t + 0.03);
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  const handleUpdateActive = (patch: Partial<WardrobeItem>) => {
    if (!activeOutfit) return;
    const updated = wardrobe.map((w) => (w.id === activeOutfit.id ? { ...w, ...patch } : w));
    onUpdateWardrobe(updated);
  };

  const handleAddNew = () => {
    const newOutfit: WardrobeItem = {
      id: 'outfit_' + Date.now(),
      name: isAr ? 'طقم ملابس جديد' : 'New Costume',
      category: 'armor',
      topColor: '#2563eb',
      bottomColor: '#1e293b',
      accentColor: '#fbbf24',
      headwear: 'knight_helmet',
      cape: true,
      capeColor: '#dc2626',
      weapon: 'sword',
      shoesColor: '#0f172a'
    };
    onUpdateWardrobe([newOutfit, ...wardrobe]);
    onSelectOutfit(newOutfit.id);
  };

  const handleDuplicate = () => {
    if (!activeOutfit) return;
    const dup: WardrobeItem = {
      ...activeOutfit,
      id: 'outfit_' + Date.now(),
      name: `${activeOutfit.name} (نسخة)`
    };
    onUpdateWardrobe([dup, ...wardrobe]);
    onSelectOutfit(dup.id);
  };

  const handleDelete = () => {
    if (wardrobe.length <= 1) return;
    const filtered = wardrobe.filter((w) => w.id !== activeOutfit.id);
    onUpdateWardrobe(filtered);
    onSelectOutfit(filtered[0]?.id || '');
  };

  const handleDownloadSvg = () => {
    if (!activeOutfit) return;
    const svgStr = CharacterRenderer.generateSvg(dummyChar, activeOutfit, animTime, 400, 500);
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeOutfit.id}_outfit.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCode = (rawText: string): string | void => {
    try {
      const parsed = JSON.parse(rawText) as Partial<WardrobeItem>;
      if (!parsed || typeof parsed !== 'object' || typeof parsed.name !== 'string') return isAr ? 'ملف الزي غير صالح أو لا يحتوي على اسم.' : 'Invalid outfit JSON or missing name.';
      const id = typeof parsed.id === 'string' && /^[\w.-]{1,128}$/.test(parsed.id) ? parsed.id : `outfit_${Date.now()}`;
      if (wardrobe.some(item => item.id === id)) return isAr ? `معرّف الزي ${id} موجود بالفعل.` : `Outfit id ${id} already exists.`;
      const newOutfit: WardrobeItem = {
        ...parsed,
        id,
        name: parsed.name || (isAr ? 'زي مستورد' : 'Imported Outfit'),
        category: parsed.category || 'armor',
        topColor: parsed.topColor || '#3b82f6',
        bottomColor: parsed.bottomColor || '#1e293b',
        accentColor: parsed.accentColor || '#f59e0b',
        headwear: parsed.headwear || 'none',
        cape: !!parsed.cape,
        capeColor: parsed.capeColor || '#dc2626',
        weapon: parsed.weapon || 'sword',
        shoesColor: parsed.shoesColor || '#0f172a'
      } as WardrobeItem;
      onUpdateWardrobe([newOutfit, ...wardrobe]);
      onSelectOutfit(newOutfit.id);
    } catch (error) {
      return error instanceof Error ? error.message : (isAr ? 'تعذر استيراد الزي' : 'Outfit import failed');
    }
  };

  const palette = ['#0f172a', '#1e293b', '#dc2626', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#ffffff'];

  const headwears: WardrobeItem['headwear'][] = ['none', 'knight_helmet', 'cyber_visor', 'wizard_hat', 'crown', 'hood'];
  const weapons: WardrobeItem['weapon'][] = ['none', 'sword', 'energy_blade', 'magic_staff', 'shield'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Shield className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-100">
              {isAr ? 'بوابة خزانة الملابس والأزياء والمعدات' : 'Wardrobe, Outfits & Equipment Portal'}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {isAr
              ? 'تصميم الدروع والأزياء والخوذ والأسلحة مع تجربة الإلباس الحية وتصدير الصور والأكواد'
              : 'Design armors, robes, cloaks, and weapons with live mannequin preview and real code export'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleAddNew}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isAr ? 'إضافة طقم جديد' : 'New Outfit'}</span>
          </button>
          <button
            onClick={() => {
              setIsImportMode(true);
              setCodeModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{isAr ? 'استيراد كود زي' : 'Import Code'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Outfits List (3 cols) */}
        <div className="lg:col-span-3 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-2">
          <div className="text-xs font-bold text-slate-300 px-1 mb-2">
            {isAr ? 'خزانة الملابس' : 'Wardrobe Collection'}
          </div>

          <div className="flex flex-col gap-1.5">
            {wardrobe.map((item) => {
              const isSelected = item.id === activeOutfit?.id;
              return (
                <div
                  key={item.id}
                  onClick={() => onSelectOutfit(item.id)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 shadow-md'
                      : 'bg-slate-950/40 border-slate-800/80 text-slate-300 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-5 h-5 rounded-md border border-slate-700"
                      style={{ backgroundColor: item.topColor }}
                    />
                    <div>
                      <div className="text-xs font-bold">{item.name}</div>
                      <div className="text-[10px] text-slate-400 capitalize">{item.category}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center Column: Live Mannequin Fitting (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col items-center justify-between gap-4">
          <div className="w-full flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-100 text-sm">{activeOutfit.name}</h3>
              <p className="text-[11px] text-slate-400 capitalize">{activeOutfit.category}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleDuplicate}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="تكرار الزي"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleDelete}
                disabled={wardrobe.length <= 1}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-400 transition-colors disabled:opacity-40"
                title="حذف الزي"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* SVG Dummy Viewport */}
          <div
            className="w-full flex items-center justify-center p-4 bg-gradient-to-b from-slate-950 to-slate-900 rounded-xl border border-slate-800 min-h-[320px]"
            dangerouslySetInnerHTML={{
              __html: CharacterRenderer.generateSvg(dummyChar, activeOutfit, animTime, 260, 340)
            }}
          />

          {/* Export Actions */}
          <div className="w-full flex items-center gap-2 pt-2 border-t border-slate-800">
            <button
              onClick={handleDownloadSvg}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isAr ? 'تحميل الزي (SVG)' : 'Download SVG'}</span>
            </button>
            <button
              onClick={() => {
                setIsImportMode(false);
                setCodeModalOpen(true);
              }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            >
              <Code2 className="w-3.5 h-3.5 text-amber-400" />
              <span>{isAr ? 'تصدير كود الزي' : 'Export Code'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Wardrobe Controls (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">
              {isAr ? 'اسم الزي / الدرع' : 'Outfit Name'}
            </label>
            <input
              type="text"
              value={activeOutfit.name}
              onChange={(e) => handleUpdateActive({ name: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Headwear & Helmet */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>{isAr ? 'غطاء الرأس / الخوذة' : 'Headwear / Helmet'}</span>
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {headwears.map((hw) => (
                <button
                  key={hw}
                  onClick={() => handleUpdateActive({ headwear: hw })}
                  className={`py-1.5 text-xs font-semibold rounded-xl border capitalize transition-all cursor-pointer ${
                    activeOutfit.headwear === hw
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  {hw.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Weapon / Equipment */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Sword className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isAr ? 'السلاح / المعدات' : 'Weapon & Props'}</span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {weapons.map((wp) => (
                <button
                  key={wp}
                  onClick={() => handleUpdateActive({ weapon: wp })}
                  className={`py-1.5 text-xs font-semibold rounded-xl border capitalize transition-all cursor-pointer ${
                    activeOutfit.weapon === wp
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  {wp.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Cape Toggle & Color */}
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">{isAr ? 'وشاح خلفي (Cape)' : 'Cape / Cloak'}</span>
              <button
                onClick={() => handleUpdateActive({ cape: !activeOutfit.cape })}
                className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                  activeOutfit.cape ? 'bg-rose-600 text-white border-rose-500' : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {activeOutfit.cape ? (isAr ? 'مفعل' : 'Enabled') : isAr ? 'معطل' : 'Disabled'}
              </button>
            </div>
            {activeOutfit.cape && (
              <div className="flex items-center gap-1.5 pt-1">
                {palette.map((c) => (
                  <button
                    key={c}
                    onClick={() => handleUpdateActive({ capeColor: c })}
                    className={`w-6 h-6 rounded-md border-2 transition-transform cursor-pointer ${
                      activeOutfit.capeColor === c ? 'border-white scale-110' : 'border-slate-800'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Top Armor Color */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 block">
              {isAr ? 'لون الرداء العلوي / الدرع' : 'Top Armor / Robe Color'}
            </label>
            <div className="flex items-center gap-1.5">
              {palette.map((c) => (
                <button
                  key={c}
                  onClick={() => handleUpdateActive({ topColor: c })}
                  className={`w-6 h-6 rounded-md border-2 transition-transform cursor-pointer ${
                    activeOutfit.topColor === c ? 'border-white scale-110' : 'border-slate-800'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Accent Color */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 block">
              {isAr ? 'لون الزخارف والتطعيمات' : 'Trim & Accent Color'}
            </label>
            <div className="flex items-center gap-1.5">
              {palette.map((c) => (
                <button
                  key={c}
                  onClick={() => handleUpdateActive({ accentColor: c })}
                  className={`w-6 h-6 rounded-md border-2 transition-transform cursor-pointer ${
                    activeOutfit.accentColor === c ? 'border-white scale-110' : 'border-slate-800'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Code Modal */}
      <CodeModal
        isOpen={codeModalOpen}
        title={isImportMode ? (isAr ? 'استيراد زي من كود' : 'Import Costume Code') : `${activeOutfit.name} - Costume JSON & Spec`}
        code={isImportMode ? '' : JSON.stringify(activeOutfit, null, 2)}
        language="json"
        filename={`${activeOutfit.id}_outfit.json`}
        isImportMode={isImportMode}
        importKind="generic"
        onClose={() => setCodeModalOpen(false)}
        onImport={handleImportCode}
      />
    </div>
  );
};
