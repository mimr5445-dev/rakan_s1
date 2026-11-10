import React, { useEffect, useState } from 'react';
import { Copy, Check, Download, X, Code2, Upload, AlertTriangle, Eye } from 'lucide-react';
import { CharacterImportResult, importCharacterFile, parseCharacterText } from '../utils/characterImport';
import { CharacterRenderer } from '../utils/characterRenderer';
import type { WardrobeItem } from '../types/studio';

interface CodeModalProps {
  isOpen: boolean; title: string; code: string; language?: string; filename?: string; isImportMode?: boolean; importKind?: 'character' | 'generic';
  onClose: () => void; onImport?: (importedCode: string) => void | string | Promise<void | string>;
}
export const CodeModal: React.FC<CodeModalProps> = ({ isOpen, title, code, language = 'javascript', filename = 'code.js', isImportMode = false, importKind = 'character', onClose, onImport }) => {
  const [copied, setCopied] = useState(false); const [importText, setImportText] = useState(code);
  const [preview, setPreview] = useState<CharacterImportResult | null>(null); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [progress, setProgress] = useState(0);
  useEffect(() => { if (isOpen) { setImportText(code); setPreview(null); setError(''); } }, [isOpen, code]);
  if (!isOpen) return null;
  const previewText = () => {
    try {
      if (importKind === 'generic') { JSON.parse(importText); setPreview(null); setError(''); return; }
      const result = parseCharacterText(importText); setPreview(result); setError('');
    } catch (err) { setPreview(null); setError(err instanceof Error ? err.message : 'Invalid data'); }
  };
  const handleFile = async (file?: File) => {
    if (!file) return;
    setBusy(true); setProgress(0); setError('');
    try { const result = await importCharacterFile(file, value => setProgress(value)); setProgress(100); setPreview(result); setImportText(JSON.stringify(result.character, null, 2)); }
    catch (err) { setPreview(null); setError(err instanceof Error ? err.message : 'Unable to import file'); }
    finally { setBusy(false); }
  };
  const handleCopy = async () => { try { await navigator.clipboard.writeText(isImportMode ? importText : code); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { setError('Clipboard access failed'); } };
  const handleDownload = () => { const blob = new Blob([isImportMode ? importText : code], { type: 'text/plain;charset=utf-8' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url); };
  const handleApplyImport = async () => {
    if (!onImport) return;
    setBusy(true); setError('');
    try {
      if (importKind === 'generic') JSON.parse(importText);
      const importedText = importKind === 'generic' ? importText : JSON.stringify((preview ?? parseCharacterText(importText)).character);
      const message = await onImport(importedText);
      if (typeof message === 'string' && message) { setError(message); return; }
      onClose();
    } catch (err) { setError(err instanceof Error ? err.message : 'Import failed'); }
    finally { setBusy(false); }
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" role="dialog" aria-modal="true">
    <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70"><div className="flex items-center gap-3"><div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400"><Code2 className="w-5 h-5" /></div><div><h3 className="font-bold text-slate-100">{title}</h3><p className="text-xs text-slate-400">{isImportMode ? 'استورد JSON أو JavaScript المعتمد أو SVG أو صوراً أو حزمة ZIP. تتم المعاينة قبل الإضافة.' : `صيغة الملف: ${language.toUpperCase()} (${filename})`}</p></div></div><button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-white" aria-label="إغلاق"><X className="w-5 h-5" /></button></div>
      <div className="flex-1 overflow-auto p-4 bg-slate-950" dir="ltr">
        {isImportMode ? <>
          {importKind === 'character' && <label className="flex items-center gap-2 w-fit mb-3 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-white cursor-pointer"><Upload className="w-4 h-4" />Choose JSON, JS, SVG, image or ZIP<input type="file" accept=".json,.js,.mjs,.svg,.png,.webp,.jpg,.jpeg,.gif,.avif,.zip,application/json,image/*,application/zip" className="hidden" onChange={e => void handleFile(e.target.files?.[0])} /></label>}
          <textarea value={importText} onChange={e => { setImportText(e.target.value); setPreview(null); setError(''); }} onBlur={previewText} placeholder="Paste character JSON or official OmniStudio JavaScript export..." className="w-full h-64 p-4 font-mono text-xs text-emerald-300 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 resize-y text-left" spellCheck={false} />
          <button type="button" onClick={previewText} className="mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 text-xs text-slate-200"><Eye className="w-4 h-4" />معاينة والتحقق</button>
          {busy && <div className="mt-3" role="status"><div className="flex justify-between text-xs text-slate-300 mb-1"><span>جارٍ فحص الأصول وفك الحزمة…</span><span>{progress}%</span></div><div className="h-2 rounded bg-slate-800 overflow-hidden"><div className="h-full bg-indigo-500 transition-all" style={{width:`${Math.max(5,progress)}%`}} /></div></div>}
          {preview && <div className="mt-3 p-3 rounded-xl border border-emerald-700/60 bg-emerald-950/30 text-xs text-emerald-100 flex items-center gap-4" dir="auto"><div className="shrink-0 h-32 w-24 bg-slate-950/70 rounded-lg flex items-center justify-center overflow-hidden" dangerouslySetInnerHTML={{__html:CharacterRenderer.generateSvg(preview.character, preview.character.schema?.extensions.officialExportOutfit as WardrobeItem | undefined, 0, 96, 128)}} /><div><strong>معاينة جاهزة:</strong><div className="mt-1">{preview.character.name} · {preview.character.id}</div><div className="mt-1">{preview.character.schema?.renderer} · {preview.assetsImported} أصل · الصيغة {preview.format}</div>{preview.warnings.map((warning,index)=><div key={index} className="mt-1 text-amber-200">تحذير: {warning}</div>)}</div></div>}
          {error && <div className="mt-3 p-3 rounded-xl border border-rose-700/60 bg-rose-950/30 text-xs text-rose-200" role="alert"><AlertTriangle className="inline w-4 h-4 me-1" />{error}</div>}
        </> : <pre className="p-4 font-mono text-xs text-cyan-300 bg-slate-900/80 border border-slate-800 rounded-xl overflow-x-auto whitespace-pre leading-relaxed select-all text-left">{code}</pre>}
      </div>
      <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/90"><div className="flex items-center gap-2">{!isImportMode && <><button onClick={handleCopy} className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs bg-slate-800 text-slate-200 border border-slate-700">{copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}{copied ? 'تم النسخ' : 'نسخ الكود'}</button><button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs bg-slate-800 text-slate-200 border border-slate-700"><Download className="w-4 h-4" />تحميل الملف</button></>}</div><div className="flex items-center gap-3"><button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800">{isImportMode ? 'إلغاء' : 'إغلاق'}</button>{isImportMode ? <button disabled={busy || (importKind === 'character' ? !preview : !importText.trim())} onClick={() => void handleApplyImport()} className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40">{busy ? 'جارٍ التحقق…' : 'إضافة الشخصية إلى المكتبة'}</button> : null}</div></div>
    </div>
  </div>;
};
