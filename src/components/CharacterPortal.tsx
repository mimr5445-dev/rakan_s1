import React, { useState, useEffect } from 'react';
import {
  User,
  Plus,
  Trash2,
  Copy,
  Download,
  Code2,
  Sparkles,
  Play,
  Smile,
  Scissors,
  Search,
  History,
  Save
} from 'lucide-react';
import { CharacterDesign, WardrobeItem } from '../types/studio';
import { CharacterRenderer } from '../utils/characterRenderer';
import { CodeModal } from './CodeModal';
import { parseCharacterText } from '../utils/characterImport';
import { createCharacterSchema } from '../utils/characterSchema';
import { getCharacterRevisions, saveCharacterRevision, restoreCharacterRevision } from '../utils/characterLibrary';

interface CharacterPortalProps {
  characters: CharacterDesign[];
  wardrobe: WardrobeItem[];
  activeCharacterId: string;
  onSelectCharacter: (id: string) => void;
  onUpdateCharacters: (characters: CharacterDesign[]) => void;
  onUpdateWardrobe?: (wardrobe: WardrobeItem[]) => void;
  language: 'ar' | 'en';
}

export const CharacterPortal: React.FC<CharacterPortalProps> = ({
  characters,
  wardrobe,
  activeCharacterId,
  onSelectCharacter,
  onUpdateCharacters,
  onUpdateWardrobe,
  language
}) => {
  const isAr = language === 'ar';
  const activeChar = characters.find((c) => c.id === activeCharacterId) || characters[0];
  const matchingOutfit = wardrobe.find((w) => w.id === activeChar?.outfitId);

  const [animTime, setAnimTime] = useState(0);
  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [isImportMode, setIsImportMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Live animation loop
  useEffect(() => {
    let animId: number;
    const loop = () => {
      setAnimTime((t) => t + 0.03);
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  const handleUpdateActive = (patch: Partial<CharacterDesign>) => {
    if (!activeChar) return;
    const updated = characters.map((c) => (c.id === activeChar.id ? { ...c, ...patch } : c));
    onUpdateCharacters(updated);
  };

  const handleAddNew = () => {
    const newChar: CharacterDesign = {
      id: 'char_' + Date.now(),
      name: isAr ? 'بطل جديد' : 'New Hero',
      skinTone: '#f6d8ae',
      hairStyle: 'short',
      hairColor: '#475569',
      eyeColor: '#3b82f6',
      expression: 'happy',
      outfitId: wardrobe[0]?.id || '',
      scale: 1,
      animation: 'idle',
      role: isAr ? 'مغامر' : 'Adventurer',
      schema: createCharacterSchema()
    };
    onUpdateCharacters([newChar, ...characters]);
    onSelectCharacter(newChar.id);
  };

  const handleDuplicate = () => {
    if (!activeChar) return;
    const dup: CharacterDesign = {
      ...activeChar,
      id: 'char_' + Date.now(),
      name: `${activeChar.name} (نسخة)`
    };
    onUpdateCharacters([dup, ...characters]);
    onSelectCharacter(dup.id);
  };

  const handleDelete = () => {
    if (characters.length <= 1 || !window.confirm(isAr ? `حذف ${activeChar.name} من المكتبة؟ ستبقى نسخ المشاريع المخزنة مستقلة.` : `Remove ${activeChar.name} from the library? Existing saved project copies remain unchanged.`)) return;
    const filtered = characters.filter((c) => c.id !== activeChar.id);
    onUpdateCharacters(filtered);
    onSelectCharacter(filtered[0]?.id || '');
  };

  const handleSaveVersion = () => {
    if (!activeChar) return;
    const versioned = saveCharacterRevision(activeChar, new Date().toLocaleString());
    onUpdateCharacters(characters.map(character => character.id === activeChar.id ? versioned : character));
  };
  const handleRestoreVersion = (revisionId: string) => {
    if (!activeChar || !window.confirm(isAr ? 'استعادة هذه النسخة؟ ستظل النسخة الحالية محفوظة.' : 'Restore this version? The current version remains saved.')) return;
    try {
      const restored = restoreCharacterRevision(activeChar, revisionId);
      onUpdateCharacters(characters.map(character => character.id === activeChar.id ? restored : character));
    } catch (error) { window.alert(error instanceof Error ? error.message : 'Restore failed'); }
  };

  const handleDownloadSvg = () => {
    if (!activeChar) return;
    const svgStr = CharacterRenderer.generateSvg(activeChar, matchingOutfit, animTime, 400, 500);
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeChar.id}_character.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCode = (rawText: string): string | void => {
    try {
      const result = parseCharacterText(rawText);
      const imported = result.character;
      if (characters.some((existing) => existing.id === imported.id)) {
        return isAr ? `المعرّف ${imported.id} موجود بالفعل. غيّر المعرّف في الملف قبل الاستيراد حتى لا تُستبدل شخصية.` : `Character id ${imported.id} already exists. Change the id before importing; no data was changed.`;
      }
      const exportedOutfit = imported.schema?.extensions.officialExportOutfit as WardrobeItem | undefined;
      if (exportedOutfit && typeof exportedOutfit.id === 'string' && /^[\\w.-]{1,128}$/.test(exportedOutfit.id) && typeof exportedOutfit.name === 'string') {
        const existingOutfit = wardrobe.find(item => item.id === exportedOutfit.id);
        if (existingOutfit && JSON.stringify(existingOutfit) !== JSON.stringify(exportedOutfit)) return isAr ? `معرّف الزي ${exportedOutfit.id} موجود ببيانات مختلفة. لم يتم تعديل المكتبة.` : `Outfit id ${exportedOutfit.id} conflicts with different data. Nothing was changed.`;
        if (!existingOutfit && onUpdateWardrobe) onUpdateWardrobe([exportedOutfit, ...wardrobe]);
      }
      onUpdateCharacters([imported, ...characters]);
      onSelectCharacter(imported.id);
    } catch (error) {
      return error instanceof Error ? error.message : (isAr ? 'تعذر استيراد الشخصية' : 'Character import failed');
    }
  };

  const skinTones = ['#ffd1a4', '#f6d8ae', '#e0bb95', '#c68642', '#8d5524', '#3b2f2f'];
  const hairColors = ['#0f172a', '#475569', '#78350f', '#f59e0b', '#06b6d4', '#ec4899', '#c084fc'];
  const eyeColors = ['#06b6d4', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#dc2626'];

  const hairStyles: CharacterDesign['hairStyle'][] = ['short', 'spiky', 'long', 'curly', 'cyberpunk', 'none'];
  const expressions: CharacterDesign['expression'][] = ['neutral', 'happy', 'fierce', 'surprised', 'focused'];
  const animations = [...new Set(['idle', 'walk', 'jump', 'attack', 'dance', ...(activeChar?.schema?.animations ?? []).map(clip => clip.name)])];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400">
              <User className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-100">
              {isAr ? 'بوابة تصميم الشخصيات والتحريك' : 'Character Studio & Animation Portal'}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {isAr
              ? 'بناء وتخصيص شخصيات الألعاب، تعديل الملامح والشعر، تجربة حركات القفز والمشي وتصدير الكود والصور'
              : 'Design modular game characters, customize skin, hair, facial expressions, test live animations, and export SVG & code'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleAddNew}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isAr ? 'شخصية جديدة' : 'New Character'}</span>
          </button>
          <button
            onClick={() => {
              setIsImportMode(true);
              setCodeModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            <span>{isAr ? 'استيراد كود شخصية' : 'Import Code'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Character List (3 cols) */}
        <div className="lg:col-span-3 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-2">
          <div className="text-xs font-bold text-slate-300 px-1 mb-2">
            {isAr ? 'مكتبة الشخصيات' : 'Character Library'} ({characters.length})
          </div>
          <label className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 mb-2"><Search className="w-3.5 h-3.5 text-slate-500" /><input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-transparent text-xs outline-none text-white" placeholder={isAr ? 'بحث بالاسم أو الدور' : 'Search name or role'} /></label>

          <div className="flex flex-col gap-1.5">
            {characters.filter(char => `${char.name} ${char.role} ${char.id}`.toLowerCase().includes(searchQuery.toLowerCase())).map((char) => {
              const isSelected = char.id === activeChar.id;
              return (
                <div
                  key={char.id}
                  onClick={() => onSelectCharacter(char.id)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-pink-600/15 border-pink-500/50 text-pink-300 shadow-md'
                      : 'bg-slate-950/40 border-slate-800/80 text-slate-300 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-full border border-slate-700 flex items-center justify-center font-bold text-xs"
                      style={{ backgroundColor: char.hairColor }}
                    >
                      👤
                    </div>
                    <div>
                      <div className="text-xs font-bold">{char.name}</div>
                      <div className="text-[10px] text-slate-400">{char.role}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center Column: Live Animated Character Preview (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col items-center justify-between gap-4">
          <div className="w-full flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-100 text-sm">{activeChar.name}</h3>
              <p className="text-[11px] text-slate-400">{activeChar.role}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleDuplicate}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="تكرار الشخصية"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleDelete}
                disabled={characters.length <= 1}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-400 transition-colors disabled:opacity-40"
                title="حذف الشخصية"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleSaveVersion} className="p-1.5 rounded-lg bg-slate-800 hover:bg-indigo-900/40 text-slate-300" title={isAr ? 'حفظ إصدار' : 'Save version'}><Save className="w-3.5 h-3.5" /></button>
            </div>
          </div>

          {/* SVG Character Display */}
          <div
            className="w-full flex items-center justify-center p-4 bg-gradient-to-b from-slate-950 to-slate-900 rounded-xl border border-slate-800 min-h-[320px]"
            dangerouslySetInnerHTML={{
              __html: CharacterRenderer.generateSvg(activeChar, matchingOutfit, animTime, 260, 340)
            }}
          />

          {/* Animation State Buttons */}
          <div className="w-full space-y-1.5">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-center">
              {isAr ? 'حالة الحركة الحالية' : 'Active Animation Rig'}
            </div>
            <div className="grid grid-cols-5 gap-1">
              {animations.map((an) => (
                <button
                  key={an}
                  onClick={() => handleUpdateActive({ animation: an })}
                  className={`py-1.5 text-[10px] font-bold rounded-lg border uppercase transition-all cursor-pointer ${
                    activeChar.animation === an
                      ? 'bg-pink-600 text-white border-pink-400 shadow-md'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {an}
                </button>
              ))}
            </div>
          </div>

          {/* Action Download / Export Buttons */}
          <div className="w-full flex items-center gap-2 pt-2 border-t border-slate-800">
            <button
              onClick={handleDownloadSvg}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isAr ? 'تحميل صورة (SVG)' : 'Download SVG'}</span>
            </button>
            <button
              onClick={() => {
                setIsImportMode(false);
                setCodeModalOpen(true);
              }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            >
              <Code2 className="w-3.5 h-3.5 text-pink-400" />
              <span>{isAr ? 'تصدير الكود' : 'Export Code'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Customization Controls (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">
                {isAr ? 'اسم الشخصية' : 'Character Name'}
              </label>
              <input
                type="text"
                value={activeChar.name}
                onChange={(e) => handleUpdateActive({ name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">
                {isAr ? 'دور / وظيفة الشخصية' : 'Character Class / Role'}
              </label>
              <input
                type="text"
                value={activeChar.role}
                onChange={(e) => handleUpdateActive({ role: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500"
              />
            </div>
          </div>

          {/* Skin Tone Palette */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-2">
              {isAr ? 'لون البشرة' : 'Skin Tone'}
            </label>
            <div className="flex items-center gap-2">
              {skinTones.map((st) => (
                <button
                  key={st}
                  onClick={() => handleUpdateActive({ skinTone: st })}
                  className={`w-8 h-8 rounded-full border-2 transition-transform cursor-pointer ${
                    activeChar.skinTone === st ? 'border-pink-500 scale-110 shadow-lg' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: st }}
                  title={st}
                />
              ))}
            </div>
          </div>

          {/* Hair Style & Color */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Scissors className="w-3.5 h-3.5 text-pink-400" />
              <span>{isAr ? 'تسريحة ولون الشعر' : 'Hair Style & Color'}</span>
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {hairStyles.map((hs) => (
                <button
                  key={hs}
                  onClick={() => handleUpdateActive({ hairStyle: hs })}
                  className={`py-1.5 text-xs font-semibold rounded-xl border capitalize transition-all cursor-pointer ${
                    activeChar.hairStyle === hs
                      ? 'bg-pink-600/20 text-pink-300 border-pink-500/50 shadow-sm'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  {hs}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 pt-1">
              {hairColors.map((hc) => (
                <button
                  key={hc}
                  onClick={() => handleUpdateActive({ hairColor: hc })}
                  className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${
                    activeChar.hairColor === hc ? 'border-pink-500 scale-110 shadow-lg' : 'border-slate-800'
                  }`}
                  style={{ backgroundColor: hc }}
                  title={hc}
                />
              ))}
            </div>
          </div>

          {/* Facial Expression & Eye Color */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Smile className="w-3.5 h-3.5 text-amber-400" />
              <span>{isAr ? 'تعبير الوجه ولون العيون' : 'Facial Expression & Eye Color'}</span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {expressions.map((exp) => (
                <button
                  key={exp}
                  onClick={() => handleUpdateActive({ expression: exp })}
                  className={`py-1.5 text-xs font-semibold rounded-xl border capitalize transition-all cursor-pointer ${
                    activeChar.expression === exp
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  {exp}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 pt-1">
              {eyeColors.map((ec) => (
                <button
                  key={ec}
                  onClick={() => handleUpdateActive({ eyeColor: ec })}
                  className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                    activeChar.eyeColor === ec ? 'border-cyan-400 scale-110 shadow-lg' : 'border-slate-800'
                  }`}
                  style={{ backgroundColor: ec }}
                  title={ec}
                />
              ))}
            </div>
          </div>

          {/* Assigned Outfit selector */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">
              {isAr ? 'الزي المرتدى (من خزانة الملابس)' : 'Equipped Outfit (From Wardrobe)'}
            </label>
            <select
              value={activeChar.outfitId}
              onChange={(e) => handleUpdateActive({ outfitId: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-none focus:border-pink-500 cursor-pointer"
            >
              {wardrobe.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.category})
                </option>
              ))}
            </select>
          </div>
          {getCharacterRevisions(activeChar).length > 0 && <div className="space-y-1"><label className="text-xs font-semibold text-slate-400 flex items-center gap-1"><History className="w-3.5 h-3.5" />{isAr ? 'الإصدارات المحفوظة' : 'Saved versions'}</label><select defaultValue="" onChange={e => { if (e.target.value) handleRestoreVersion(e.target.value); e.currentTarget.value = ''; }} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"><option value="">{isAr ? 'اختر إصداراً للاستعادة' : 'Choose version to restore'}</option>{getCharacterRevisions(activeChar).map(revision => <option key={revision.id} value={revision.id}>{revision.label} · {new Date(revision.createdAt).toLocaleString()}</option>)}</select></div>}
          {activeChar.schema?.layers?.length ? (
            <section className="space-y-2 border-t border-slate-800 pt-3">
              <div className="text-xs font-bold text-slate-300">{isAr ? 'محرر الطبقات' : 'Layer editor'} · {activeChar.schema.layers.length}</div>
              {[...activeChar.schema.layers].sort((a, b) => a.order - b.order).map((layer) => (
                <label key={layer.id} className="flex items-center justify-between gap-2 text-xs text-slate-300 bg-slate-950/60 rounded-lg p-2">
                  <span className="truncate">{layer.name} <span className="text-slate-500">({layer.part || layer.assetId})</span></span>
                  <input type="checkbox" checked={layer.visible} onChange={(event) => handleUpdateActive({ schema: { ...activeChar.schema!, layers: activeChar.schema!.layers.map((item) => item.id === layer.id ? { ...item, visible: event.target.checked } : item) } })} />
                </label>
              ))}
            </section>
          ) : null}
          {activeChar.schema?.skeleton?.bones?.length ? (
            <section className="space-y-2 border-t border-slate-800 pt-3">
              <div className="text-xs font-bold text-slate-300">{isAr ? 'الهيكل والمفاصل' : 'Skeleton & joints'}</div>
              {activeChar.schema.skeleton.bones.map((bone) => (
                <div key={bone.id} className="grid grid-cols-[1fr_72px] items-center gap-2 text-xs text-slate-300">
                  <span>{bone.name} <span className="text-slate-500">{bone.parentId ? `← ${bone.parentId}` : 'root'}</span></span>
                  <input aria-label={`${bone.name} rotation`} type="number" value={bone.rotation} onChange={(event) => handleUpdateActive({ schema: { ...activeChar.schema!, skeleton: { ...activeChar.schema!.skeleton, bones: activeChar.schema!.skeleton.bones.map((item) => item.id === bone.id ? { ...item, rotation: Number(event.target.value) || 0 } : item) } } })} className="bg-slate-950 border border-slate-700 rounded px-2 py-1" />
                </div>
              ))}
            </section>
          ) : null}
        </div>
      </div>

      {/* Code Modal */}
      <CodeModal
        isOpen={codeModalOpen}
        title={isImportMode ? (isAr ? 'استيراد شخصية من كود' : 'Import Character Code') : `${activeChar.name} - SVG & JS Rig Code`}
        code={isImportMode ? '' : CharacterRenderer.generateCode(activeChar, matchingOutfit)}
        language="javascript"
        filename={`${activeChar.id}_character.js`}
        isImportMode={isImportMode}
        onClose={() => setCodeModalOpen(false)}
        onImport={handleImportCode}
      />
    </div>
  );
};
