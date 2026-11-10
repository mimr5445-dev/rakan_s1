import React, { useState } from 'react';
import { Copy, Check, Download, X, Code2 } from 'lucide-react';

interface CodeModalProps {
  isOpen: boolean;
  title: string;
  code: string;
  language?: string;
  filename?: string;
  isImportMode?: boolean;
  onClose: () => void;
  onImport?: (importedCode: string) => void;
}

export const CodeModal: React.FC<CodeModalProps> = ({
  isOpen,
  title,
  code,
  language = 'javascript',
  filename = 'code.js',
  isImportMode = false,
  onClose,
  onImport
}) => {
  const [copied, setCopied] = useState(false);
  const [importText, setImportText] = useState(code);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(isImportMode ? importText : code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.warn('Copy error:', e);
    }
  };

  const handleDownload = () => {
    const textToDownload = isImportMode ? importText : code;
    const blob = new Blob([textToDownload], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleApplyImport = () => {
    if (onImport && importText.trim()) {
      onImport(importText);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[85vh] flex flex-col bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base">{title}</h3>
              <p className="text-xs text-slate-400">
                {isImportMode ? 'ألصق الكود البرمجي هنا لتطبيقه وتحويله لعنصر تفاعلي' : `صيغة الملف: ${language.toUpperCase()} (${filename})`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Code Content */}
        <div className="flex-1 overflow-auto p-4 bg-slate-950" dir="ltr">
          {isImportMode ? (
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Paste JSON or JavaScript code here..."
              className="w-full h-80 p-4 font-mono text-xs text-emerald-300 bg-slate-900/90 border border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 resize-none text-left"
              dir="ltr"
              spellCheck={false}
            />
          ) : (
            <pre className="p-4 font-mono text-xs text-cyan-300 bg-slate-900/80 border border-slate-800 rounded-xl overflow-x-auto whitespace-pre leading-relaxed select-all text-left" dir="ltr">
              {code}
            </pre>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2">
            {!isImportMode && (
              <>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'تم النسخ للحافظة!' : 'نسخ الكود'}
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700"
                >
                  <Download className="w-4 h-4" />
                  تحميل الملف ({filename})
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            {isImportMode ? (
              <>
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleApplyImport}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition-all"
                >
                  تحويل واستيراد الكود
                </button>
              </>
            ) : (
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
              >
                إغلاق
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
