import React, { useState, useEffect } from 'react';
import {
  Cloud,
  FolderOpen,
  Upload,
  Download,
  Trash2,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileJson,
  FileCode,
  Music,
  User as UserIcon,
  Archive,
  ExternalLink,
  Loader2,
  LogOut,
  Layers
} from 'lucide-react';
import { StudioProject } from '../types/studio';
import { DriveService, DriveFileItem } from '../utils/driveService';
import { googleSignIn, logout, getAccessToken } from '../utils/firebaseAuth';
import { User } from 'firebase/auth';
import { AudioSynthesizer } from '../utils/audioSynth';
import { CharacterRenderer } from '../utils/characterRenderer';
import { exportStudioProjectZip } from '../utils/projectZip';

interface DrivePortalProps {
  project: StudioProject;
  setProject: React.Dispatch<React.SetStateAction<StudioProject>>;
  user: User | null;
  token: string | null;
  onLoginSuccess: (user: User, token: string) => void;
  onLogout: () => void;
  language: 'ar' | 'en';
}

export const DrivePortal: React.FC<DrivePortalProps> = ({
  project,
  setProject,
  user,
  token,
  onLoginSuccess,
  onLogout,
  language
}) => {
  const isAr = language === 'ar';
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [appFolderId, setAppFolderId] = useState<string>('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Destructive delete confirmation modal state
  const [fileToDelete, setFileToDelete] = useState<DriveFileItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch or create folder and load files when token is available
  useEffect(() => {
    if (!token) return;

    let mounted = true;
    const fetchFiles = async () => {
      setLoading(true);
      try {
        const folderId = await DriveService.getOrCreateAppFolder(token);
        if (mounted) setAppFolderId(folderId);

        const list = await DriveService.listFiles(token, folderId, searchQuery);
        if (mounted) setFiles(list);
      } catch (err) {
        console.warn('Failed to load drive files:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchFiles();
    return () => {
      mounted = false;
    };
  }, [token, searchQuery]);

  const handleRefresh = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const list = await DriveService.listFiles(token, appFolderId, searchQuery);
      setFiles(list);
      showToast(isAr ? 'تم تحديث قائمة ملفات Google Drive' : 'Drive file list refreshed');
    } catch (e) {
      console.warn('Refresh error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    setIsLoggingIn(true);
    try {
      const res = await googleSignIn();
      if (res) {
        onLoginSuccess(res.user, res.accessToken);
        showToast(isAr ? 'تم تسجيل الدخول وربط Google Drive بنجاح!' : 'Connected to Google Drive successfully!');
      }
    } catch (err: unknown) {
      console.error('Sign in error:', err);
      showToast(isAr ? 'تعذر إتمام تسجيل الدخول مع Google' : 'Google sign-in could not be completed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    onLogout();
    setFiles([]);
    showToast(isAr ? 'تم تسجيل الخروج من Google Drive' : 'Signed out from Google Drive');
  };

  // Upload full studio project JSON to Drive
  const handleSaveProjectToDrive = async () => {
    if (!token) return;
    setActionLoading('project');
    try {
      const fileName = `${project.name.replace(/\s+/g, '_')}_${Date.now()}.json`;
      const content = JSON.stringify(project, null, 2);
      await DriveService.uploadFile(token, fileName, 'application/json', content, appFolderId);
      showToast(isAr ? `تم حفظ ملف المشروع (${fileName}) في Google Drive بنجاح!` : `Saved ${fileName} to Google Drive!`);
      handleRefresh();
    } catch (err) {
      console.error('Upload error:', err);
      showToast(isAr ? 'فشل حفظ المشروع في Google Drive' : 'Failed to save project to Drive');
    } finally {
      setActionLoading(null);
    }
  };

  // Upload full ZIP Bundle to Drive
  const handleSaveZipToDrive = async () => {
    if (!token) return;
    setActionLoading('zip');
    try {
      const zipBlob = await exportStudioProjectZip(project);
      const fileName = `${project.name.replace(/\s+/g, '_')}_Bundle.zip`;
      await DriveService.uploadFile(token, fileName, 'application/zip', zipBlob, appFolderId);
      showToast(isAr ? 'تم رفع حزمة الاستوديو المضغوطة (ZIP) إلى Google Drive بنجاح!' : 'Uploaded ZIP Bundle to Google Drive!');
      handleRefresh();
    } catch (err) {
      console.error('ZIP upload error:', err);
      showToast(isAr ? 'فشل رفع حزمة ZIP إلى Google Drive' : 'Failed to upload ZIP');
    } finally {
      setActionLoading(null);
    }
  };

  // Upload Active Character SVG
  const handleSaveCharacterToDrive = async () => {
    if (!token) return;
    const activeChar = project.characters.find((c) => c.id === project.activeCharacterId) || project.characters[0];
    const outfit = project.wardrobe.find((w) => w.id === activeChar?.outfitId);
    if (!activeChar) return;

    setActionLoading('character');
    try {
      const svg = CharacterRenderer.generateSvg(activeChar, outfit, 0, 400, 500);
      const fileName = `${activeChar.name.replace(/\s+/g, '_')}_rig.svg`;
      await DriveService.uploadFile(token, fileName, 'image/svg+xml', svg, appFolderId);
      showToast(isAr ? `تم رفع صورة الشخصية (${activeChar.name}) إلى Google Drive!` : `Uploaded ${activeChar.name} to Drive!`);
      handleRefresh();
    } catch (err) {
      console.error('SVG upload error:', err);
      showToast(isAr ? 'فشل رفع الشخصية' : 'Failed to upload character');
    } finally {
      setActionLoading(null);
    }
  };

  // Upload Active Sound WAV
  const handleSaveSoundToDrive = async () => {
    if (!token) return;
    const activeSound = project.sounds[0];
    if (!activeSound) return;

    setActionLoading('sound');
    try {
      const wavBlob = AudioSynthesizer.generateWavBlob(activeSound);
      const fileName = `${activeSound.name.replace(/\s+/g, '_')}.wav`;
      await DriveService.uploadFile(token, fileName, 'audio/wav', wavBlob, appFolderId);
      showToast(isAr ? `تم رفع المؤثر الصوتي (${activeSound.name}) إلى Google Drive!` : `Uploaded sound to Drive!`);
      handleRefresh();
    } catch (err) {
      console.error('WAV upload error:', err);
      showToast(isAr ? 'فشل رفع المؤثر الصوتي' : 'Failed to upload sound');
    } finally {
      setActionLoading(null);
    }
  };

  // Import / Load project from Drive
  const handleImportFromDrive = async (file: DriveFileItem) => {
    if (!token) return;
    try {
      const content = await DriveService.downloadFileText(token, file.id);
      const parsed = JSON.parse(content) as StudioProject;
      if (parsed.sounds && parsed.characters) {
        setProject(parsed);
        showToast(isAr ? `تم استيراد وتحميل المشروع (${file.name}) بنجاح!` : `Loaded project ${file.name}!`);
      } else {
        showToast(isAr ? 'الملف لا يحتوي على صيغة مشروع OmniStudio متوافقة' : 'File is not a valid project JSON');
      }
    } catch (err) {
      console.error('Download error:', err);
      showToast(isAr ? 'تعذر قراءة ملف المشروع من Google Drive' : 'Failed to load project from Drive');
    }
  };

  // Execute Destructive Delete with confirmed user action
  const confirmDeleteFile = async () => {
    if (!token || !fileToDelete) return;
    setIsDeleting(true);
    try {
      await DriveService.deleteFile(token, fileToDelete.id);
      setFiles((prev) => prev.filter((f) => f.id !== fileToDelete.id));
      showToast(isAr ? `تم حذف الملف "${fileToDelete.name}" من Google Drive بنجاح.` : `Deleted "${fileToDelete.name}" from Drive.`);
      setFileToDelete(null);
    } catch (err) {
      console.error('Delete error:', err);
      showToast(isAr ? 'فشل حذف الملف من Google Drive' : 'Failed to delete file');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatFileSize = (bytes?: string) => {
    if (!bytes) return '--';
    const num = parseInt(bytes, 10);
    if (isNaN(num)) return '--';
    if (num < 1024) return `${num} B`;
    if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
    return `${(num / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mimeType: string, name: string) => {
    if (name.endsWith('.json') || mimeType.includes('json')) {
      return <FileJson className="w-5 h-5 text-amber-400" />;
    }
    if (name.endsWith('.svg') || mimeType.includes('svg')) {
      return <UserIcon className="w-5 h-5 text-pink-400" />;
    }
    if (name.endsWith('.wav') || mimeType.includes('audio')) {
      return <Music className="w-5 h-5 text-cyan-400" />;
    }
    if (name.endsWith('.zip') || mimeType.includes('zip')) {
      return <Archive className="w-5 h-5 text-indigo-400" />;
    }
    return <FileCode className="w-5 h-5 text-slate-400" />;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Cloud className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-100">
              {isAr ? 'سحابة Google Drive لحفظ ومزامنة الأصول' : 'Google Drive Cloud Asset Vault'}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {isAr
              ? 'مزامنة وحفظ مشاريع الاستوديو، الشخصيات، المؤثرات الصوتية، وحزم الألعاب مباشرة على Google Drive'
              : 'Backup, sync, and restore full studio projects, characters, audio, and game archives with Google Drive'}
          </p>
        </div>

        {/* User Account / Sign In Status */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2.5 bg-slate-900 border border-slate-800 p-1.5 pr-3 rounded-2xl">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || 'User'} className="w-8 h-8 rounded-full border border-slate-700" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                  {user.displayName?.[0] || 'U'}
                </div>
              )}
              <div className="text-right">
                <div className="text-xs font-bold text-slate-200">{user.displayName || 'Google User'}</div>
                <div className="text-[10px] text-slate-400">{user.email}</div>
              </div>
              <button
                onClick={handleSignOut}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer mr-1"
                title={isAr ? 'تسجيل الخروج' : 'Sign out'}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleSignIn}
              disabled={isLoggingIn}
              className="flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 shadow-md shadow-white/10 transition-all cursor-pointer border border-slate-200"
            >
              {isLoggingIn ? (
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
              )}
              <span>{isAr ? 'تسجيل الدخول باستخدام Google' : 'Sign in with Google'}</span>
            </button>
          )}
        </div>
      </div>

      {!user ? (
        /* Sign-in Callout Box */
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 rounded-3xl p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-2xl space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto shadow-inner">
            <Cloud className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white">
              {isAr ? 'ربط استوديو OmniStudio بحساب Google Drive' : 'Connect OmniStudio to Google Drive'}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
              {isAr
                ? 'يتيح لك ربط Google Drive تخزين ملفات الاستوديو والمؤثرات والشخصيات السحابية واسترجاعها من أي جهاز بأمان تام وبإذن مباشر منك.'
                : 'Connecting Google Drive allows you to store and sync your studio projects, sound effects, characters, and game archives securely.'}
            </p>
          </div>

          <button
            onClick={handleSignIn}
            disabled={isLoggingIn}
            className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl text-sm font-bold text-slate-900 bg-white hover:bg-slate-100 shadow-xl shadow-blue-500/10 transition-all cursor-pointer border border-slate-200"
          >
            {isLoggingIn ? (
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
            )}
            <span>{isAr ? 'تسجيل الدخول وربط Google Drive' : 'Sign in and Connect Google Drive'}</span>
          </button>
        </div>
      ) : (
        /* Connected Dashboard */
        <div className="space-y-6">
          {/* Quick Action Cloud Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Save Entire Project */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <FileJson className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">{isAr ? 'حفظ المشروع كاملاً' : 'Save Full Project'}</h4>
                  <p className="text-[11px] text-slate-400">{isAr ? 'بصيغة JSON في مجلد السحابة' : 'Save JSON to Drive'}</p>
                </div>
              </div>
              <button
                onClick={handleSaveProjectToDrive}
                disabled={actionLoading === 'project'}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 transition-colors cursor-pointer disabled:opacity-50"
              >
                {actionLoading === 'project' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                <span>{isAr ? 'حفظ في Google Drive' : 'Upload JSON'}</span>
              </button>
            </div>

            {/* Save ZIP Bundle */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <Archive className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">{isAr ? 'حزمة اللعبة (ZIP)' : 'Full Game ZIP'}</h4>
                  <p className="text-[11px] text-slate-400">{isAr ? 'حزمة مستقلة مع محرك اللعبة' : 'Standalone game engine bundle'}</p>
                </div>
              </div>
              <button
                onClick={handleSaveZipToDrive}
                disabled={actionLoading === 'zip'}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors cursor-pointer disabled:opacity-50"
              >
                {actionLoading === 'zip' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                <span>{isAr ? 'رفع حزمة ZIP' : 'Upload ZIP'}</span>
              </button>
            </div>

            {/* Save Active Character */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400">
                  <UserIcon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">{isAr ? 'الشخصية النشطة' : 'Active Character'}</h4>
                  <p className="text-[11px] text-slate-400">{isAr ? 'تصدير المتجهات SVG للسحابة' : 'Upload SVG rig to Drive'}</p>
                </div>
              </div>
              <button
                onClick={handleSaveCharacterToDrive}
                disabled={actionLoading === 'character'}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold text-white bg-pink-600 hover:bg-pink-500 transition-colors cursor-pointer disabled:opacity-50"
              >
                {actionLoading === 'character' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                <span>{isAr ? 'رفع الشخصية (SVG)' : 'Upload SVG'}</span>
              </button>
            </div>

            {/* Save Active Sound */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                  <Music className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">{isAr ? 'المؤثر الصوتي' : 'Audio Preset'}</h4>
                  <p className="text-[11px] text-slate-400">{isAr ? 'ملف صوتي WAV نقي' : 'Upload WAV file to Drive'}</p>
                </div>
              </div>
              <button
                onClick={handleSaveSoundToDrive}
                disabled={actionLoading === 'sound'}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 transition-colors cursor-pointer disabled:opacity-50"
              >
                {actionLoading === 'sound' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                <span>{isAr ? 'رفع الصوت (WAV)' : 'Upload WAV'}</span>
              </button>
            </div>
          </div>

          {/* Drive Files Browser */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-sm text-slate-200">
                  {isAr ? 'مستودع ملفات OmniStudio Vault في Google Drive' : 'OmniStudio Vault Files in Google Drive'}
                </h3>
                <span className="text-xs text-slate-500 font-mono">({files.length} ملف)</span>
              </div>

              <div className="flex items-center gap-2">
                {/* Search in Drive */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={isAr ? 'بحث في ملفات Drive...' : 'Search in Drive...'}
                    className="bg-slate-950 border border-slate-800 rounded-xl pr-8 pl-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 w-44 sm:w-56"
                  />
                </div>

                <button
                  onClick={handleRefresh}
                  disabled={loading}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                  title="تحديث القائمة"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
                </button>
              </div>
            </div>

            {/* Files List Table */}
            <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950/60">
              {loading ? (
                <div className="py-16 flex flex-col items-center justify-center text-slate-400 space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                  <p className="text-xs">{isAr ? 'جاري الاتصال بـ Google Drive وتحميل الملفات...' : 'Loading Drive files...'}</p>
                </div>
              ) : files.length === 0 ? (
                <div className="py-16 text-center text-slate-500 space-y-2">
                  <FolderOpen className="w-8 h-8 mx-auto text-slate-600" />
                  <p className="text-xs">{isAr ? 'لم يتم العثور على ملفات في مجلد OmniStudio Vault' : 'No files found in OmniStudio Vault'}</p>
                  <p className="text-[11px] text-slate-600">
                    {isAr ? 'استخدم أزرار الرفع أعلاه لحفظ مشاريعك وأصولك في Google Drive' : 'Use the upload buttons above to save files'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800/80">
                  {files.map((file) => {
                    const isProjectJson = file.name.endsWith('.json') || file.mimeType.includes('json');
                    return (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-3.5 hover:bg-slate-900/60 transition-colors gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex-shrink-0">
                            {getFileIcon(file.mimeType, file.name)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-200 truncate">{file.name}</div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                              <span>{formatFileSize(file.size)}</span>
                              <span>•</span>
                              <span>
                                {file.modifiedTime
                                  ? new Date(file.modifiedTime).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')
                                  : ''}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {/* Load / Import Project Button */}
                          {isProjectJson && (
                            <button
                              onClick={() => handleImportFromDrive(file)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-colors cursor-pointer"
                              title={isAr ? 'استيراد وتشغيل هذا المشروع في الاستوديو' : 'Load project into Studio'}
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>{isAr ? 'استيراد للاستوديو' : 'Load'}</span>
                            </button>
                          )}

                          {/* Open in Drive (if webViewLink available) */}
                          {file.webViewLink && (
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                              title={isAr ? 'فتح في Google Drive' : 'Open in Google Drive'}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}

                          {/* Destructive Delete Button - Triggers Confirmation Dialog */}
                          <button
                            onClick={() => setFileToDelete(file)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/30 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                            title={isAr ? 'حذف من Google Drive' : 'Delete from Drive'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MANDATORY USER CONFIRMATION DIALOG FOR DESTRUCTIVE DELETE OPERATIONS */}
      {fileToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-rose-500/40 rounded-2xl p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-bold text-white">
                {isAr ? 'تأكيد حذف الملف من Google Drive' : 'Confirm File Deletion'}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {isAr ? (
                  <>
                    هل أنت متأكد من رغبتك في حذف الملف{' '}
                    <span className="font-bold text-rose-300 font-mono">"{fileToDelete.name}"</span> نهائياً من حساب
                    Google Drive الخاص بك؟
                    <br />
                    <span className="text-slate-400 mt-1 block">لا يمكن التراجع عن هذا الإجراء بعد تنفيذه.</span>
                  </>
                ) : (
                  <>
                    Are you sure you want to permanently delete{' '}
                    <span className="font-bold text-rose-300">"{fileToDelete.name}"</span> from your Google Drive?
                    This action cannot be undone.
                  </>
                )}
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setFileToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={confirmDeleteFile}
                disabled={isDeleting}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-600/30 transition-all cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{isAr ? 'نعم، حذف نهائي' : 'Yes, Delete Permanently'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-900 border border-blue-500/30 text-blue-300 shadow-2xl text-xs font-semibold animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-blue-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
