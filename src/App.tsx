import React, { useState, useEffect } from 'react';
import { PortalType, StudioProject } from './types/studio';
import { DEFAULT_STUDIO_PROJECT, loadProjectFromStorage, saveProjectToStorage } from './utils/storage';
import { Navbar } from './components/Navbar';
import { StageDirectorPortal } from './components/StageDirectorPortal';
import { AudioPortal } from './components/AudioPortal';
import { PhysicsPortal } from './components/PhysicsPortal';
import { CharacterPortal } from './components/CharacterPortal';
import { WardrobePortal } from './components/WardrobePortal';
import { BackgroundPortal } from './components/BackgroundPortal';
import { SkillsPortal } from './components/SkillsPortal';

export default function App() {
  const [project, setProject] = useState<StudioProject>(() => loadProjectFromStorage());
  const [activePortal, setActivePortal] = useState<PortalType>('stage');

  // Save changes to localStorage
  useEffect(() => {
    saveProjectToStorage(project);
  }, [project]);

  // Sync RTL / LTR document direction with language setting
  useEffect(() => {
    const isAr = project.settings.language === 'ar';
    document.documentElement.lang = isAr ? 'ar' : 'en';
    document.documentElement.dir = isAr ? 'rtl' : 'ltr';
  }, [project.settings.language]);

  const handleResetProject = () => {
    if (window.confirm(project.settings.language === 'ar' ? 'هل أنت متأكد من رغبتك في إعادة ضبط الاستوديو؟ ستعود كافة البيانات إلى الإعدادات الافتراضية.' : 'Reset studio to initial factory settings?')) {
      setProject(DEFAULT_STUDIO_PROJECT);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar & Portal Navigation */}
      <Navbar
        activePortal={activePortal}
        setActivePortal={setActivePortal}
        project={project}
        setProject={setProject}
        onReset={handleResetProject}
      />

      {/* Main Portal Viewport */}
      <main className="flex-1 pb-16">
        {activePortal === 'stage' && (
          <StageDirectorPortal
            project={project}
            language={project.settings.language}
          />
        )}

        {activePortal === 'audio' && (
          <AudioPortal
            sounds={project.sounds}
            onUpdateSounds={(sounds) => setProject((prev) => ({ ...prev, sounds }))}
            language={project.settings.language}
          />
        )}

        {activePortal === 'physics' && (
          <PhysicsPortal
            presets={project.physicsPresets}
            activePresetId={project.activePhysicsPresetId}
            onSelectPreset={(id) => setProject((prev) => ({ ...prev, activePhysicsPresetId: id }))}
            onUpdatePresets={(physicsPresets) => setProject((prev) => ({ ...prev, physicsPresets }))}
            language={project.settings.language}
          />
        )}

        {activePortal === 'characters' && (
          <CharacterPortal
            characters={project.characters}
            wardrobe={project.wardrobe}
            activeCharacterId={project.activeCharacterId}
            onSelectCharacter={(id) => setProject((prev) => ({ ...prev, activeCharacterId: id }))}
            onUpdateCharacters={(characters) => setProject((prev) => ({ ...prev, characters }))}
            language={project.settings.language}
          />
        )}

        {activePortal === 'wardrobe' && (
          <WardrobePortal
            wardrobe={project.wardrobe}
            characters={project.characters}
            activeOutfitId={project.activeOutfitId}
            onSelectOutfit={(id) => setProject((prev) => ({ ...prev, activeOutfitId: id }))}
            onUpdateWardrobe={(wardrobe) => setProject((prev) => ({ ...prev, wardrobe }))}
            language={project.settings.language}
          />
        )}

        {activePortal === 'backgrounds' && (
          <BackgroundPortal
            backgrounds={project.backgrounds}
            activeBackgroundId={project.activeBackgroundId}
            onSelectBackground={(id) => setProject((prev) => ({ ...prev, activeBackgroundId: id }))}
            onUpdateBackgrounds={(backgrounds) => setProject((prev) => ({ ...prev, backgrounds }))}
            language={project.settings.language}
          />
        )}

        {activePortal === 'skills' && (
          <SkillsPortal
            skills={project.skills}
            onUpdateSkills={(skills) => setProject((prev) => ({ ...prev, skills }))}
            language={project.settings.language}
          />
        )}
      </main>

      {/* Footer Branding */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 text-center text-xs text-slate-500">
        <p>OmniStudio Engine • استوديو الألعاب والمحاكاة التفاعلية المتكامل • Extensible Modular Creative Engine</p>
      </footer>
    </div>
  );
}
