import { StudioProject } from '../types/studio';

export const DEFAULT_STUDIO_PROJECT: StudioProject = {
  version: '2.0.0',
  name: 'OmniStudio Project',
  description: 'مشروع استوديو الألعاب والمحاكاة التفاعلية',
  activeCharacterId: 'char_ninja',
  activeOutfitId: 'outfit_cyber',
  activeBackgroundId: 'bg_cyber',
  activePhysicsPresetId: 'phys_earth',
  settings: {
    language: 'ar',
    theme: 'dark',
    volume: 0.8
  },
  sounds: [
    {
      id: 'snd_jump',
      name: 'قفزة بكسل (8-Bit Jump)',
      category: 'jump',
      type: 'square',
      startFreq: 150,
      endFreq: 580,
      duration: 0.22,
      attack: 0.01,
      decay: 0.08,
      sustain: 0.2,
      release: 0.1,
      pitchJump: 6,
      distortion: 0.15,
      noise: 0.02,
      volume: 0.85,
      createdAt: Date.now()
    },
    {
      id: 'snd_laser',
      name: 'شعاع ليزر بلازما (Laser Blaster)',
      category: 'laser',
      type: 'sawtooth',
      startFreq: 880,
      endFreq: 110,
      duration: 0.2,
      attack: 0.005,
      decay: 0.07,
      sustain: 0.1,
      release: 0.08,
      pitchJump: -8,
      distortion: 0.4,
      noise: 0.05,
      volume: 0.8,
      createdAt: Date.now()
    },
    {
      id: 'snd_explosion',
      name: 'انفجار نيزكي (Meteor Blast)',
      category: 'explosion',
      type: 'triangle',
      startFreq: 180,
      endFreq: 40,
      duration: 0.65,
      attack: 0.02,
      decay: 0.2,
      sustain: 0.3,
      release: 0.35,
      pitchJump: -12,
      distortion: 0.8,
      noise: 0.75,
      volume: 0.9,
      createdAt: Date.now()
    },
    {
      id: 'snd_coin',
      name: 'التقاط بلورة ذهبية (Crystal Coin)',
      category: 'coin',
      type: 'sine',
      startFreq: 659,
      endFreq: 987,
      duration: 0.3,
      attack: 0.01,
      decay: 0.06,
      sustain: 0.5,
      release: 0.15,
      pitchJump: 7,
      distortion: 0.05,
      noise: 0,
      volume: 0.85,
      createdAt: Date.now()
    },
    {
      id: 'snd_powerup',
      name: 'ترقية الطاقة الفائقة (Hyper Powerup)',
      category: 'powerup',
      type: 'square',
      startFreq: 220,
      endFreq: 1200,
      duration: 0.45,
      attack: 0.02,
      decay: 0.1,
      sustain: 0.4,
      release: 0.2,
      pitchJump: 14,
      distortion: 0.2,
      noise: 0.08,
      volume: 0.8,
      createdAt: Date.now()
    }
  ],
  physicsPresets: [
    {
      id: 'phys_earth',
      name: 'جاذبية الأرض والكرات المرنة',
      description: 'محاكاة الجاذبية الأرضية القياسية مع ارتداد ديناميكي واصطدامات متعددة',
      gravity: 980,
      airResistance: 0.002,
      wind: 0,
      bodies: [
        {
          id: 'b1',
          type: 'circle',
          x: 200,
          y: 80,
          vx: 120,
          vy: 0,
          radius: 24,
          mass: 1.2,
          restitution: 0.82,
          friction: 0.05,
          color: '#6366f1'
        },
        {
          id: 'b2',
          type: 'circle',
          x: 380,
          y: 120,
          vx: -80,
          vy: 0,
          radius: 32,
          mass: 2.5,
          restitution: 0.75,
          friction: 0.08,
          color: '#ec4899'
        },
        {
          id: 'b3',
          type: 'box',
          x: 520,
          y: 70,
          vx: -50,
          vy: 50,
          width: 44,
          height: 44,
          mass: 1.8,
          restitution: 0.65,
          friction: 0.12,
          color: '#10b981'
        },
        {
          id: 'b4',
          type: 'circle',
          x: 650,
          y: 150,
          vx: 40,
          vy: -60,
          radius: 20,
          mass: 0.8,
          restitution: 0.9,
          friction: 0.02,
          color: '#f59e0b'
        }
      ]
    },
    {
      id: 'phys_space',
      name: 'انعدام الجاذبية الفضائي (Zero Gravity)',
      description: 'حركة خاملة في الفضاء المفتوح مع تصادمات مرنة واحتكاك هوائي منعدم',
      gravity: 0,
      airResistance: 0.0,
      wind: 0,
      bodies: [
        {
          id: 'sb1',
          type: 'circle',
          x: 250,
          y: 200,
          vx: 180,
          vy: 110,
          radius: 28,
          mass: 1.5,
          restitution: 0.98,
          friction: 0,
          color: '#06b6d4'
        },
        {
          id: 'sb2',
          type: 'circle',
          x: 550,
          y: 260,
          vx: -150,
          vy: -130,
          radius: 36,
          mass: 3.0,
          restitution: 0.95,
          friction: 0,
          color: '#a855f7'
        }
      ]
    },
    {
      id: 'phys_pinball',
      name: 'مصفوفة البينبول التفاعلية (Pinball Matrix)',
      description: 'جاذبية قوية مع ارتداد فائق السرعة وأجسام ترتد بعنف',
      gravity: 1200,
      airResistance: 0.001,
      wind: 30,
      bodies: [
        {
          id: 'pb1',
          type: 'circle',
          x: 300,
          y: 50,
          vx: 200,
          vy: 0,
          radius: 18,
          mass: 0.9,
          restitution: 0.92,
          friction: 0.01,
          color: '#f43f5e'
        },
        {
          id: 'pb2',
          type: 'circle',
          x: 450,
          y: 90,
          vx: -180,
          vy: 20,
          radius: 22,
          mass: 1.1,
          restitution: 0.9,
          friction: 0.02,
          color: '#eab308'
        }
      ]
    }
  ],
  characters: [
    {
      id: 'char_ninja',
      name: 'ظل السايبورغ (Shadow Ninja)',
      skinTone: '#f6d8ae',
      hairStyle: 'cyberpunk',
      hairColor: '#06b6d4',
      eyeColor: '#22d3ee',
      expression: 'fierce',
      outfitId: 'outfit_cyber',
      scale: 1,
      animation: 'idle',
      role: 'مقاتل سايبر'
    },
    {
      id: 'char_knight',
      name: 'فارس المجد (Solar Paladin)',
      skinTone: '#ffd1a4',
      hairStyle: 'spiky',
      hairColor: '#f59e0b',
      eyeColor: '#3b82f6',
      expression: 'focused',
      outfitId: 'outfit_paladin',
      scale: 1,
      animation: 'walk',
      role: 'فارس مدرع'
    },
    {
      id: 'char_mage',
      name: 'عراف الأثير (Aether Mage)',
      skinTone: '#e0bb95',
      hairStyle: 'long',
      hairColor: '#c084fc',
      eyeColor: '#a855f7',
      expression: 'happy',
      outfitId: 'outfit_mage',
      scale: 1,
      animation: 'dance',
      role: 'ساحر أسطوري'
    }
  ],
  wardrobe: [
    {
      id: 'outfit_cyber',
      name: 'بذلة النيون الهجومية (Cyber Suit)',
      category: 'cyberpunk',
      topColor: '#0f172a',
      bottomColor: '#1e293b',
      accentColor: '#06b6d4',
      headwear: 'cyber_visor',
      cape: true,
      capeColor: '#06b6d4',
      weapon: 'energy_blade',
      shoesColor: '#0f172a'
    },
    {
      id: 'outfit_paladin',
      name: 'درع الفارس الملكي (Paladin Plate)',
      category: 'armor',
      topColor: '#334155',
      bottomColor: '#1e293b',
      accentColor: '#f59e0b',
      headwear: 'knight_helmet',
      cape: true,
      capeColor: '#dc2626',
      weapon: 'sword',
      shoesColor: '#090d16'
    },
    {
      id: 'outfit_mage',
      name: 'رداء السحر الكوني (Cosmic Robes)',
      category: 'wizard',
      topColor: '#4338ca',
      bottomColor: '#312e81',
      accentColor: '#c084fc',
      headwear: 'wizard_hat',
      cape: false,
      capeColor: '#4f46e5',
      weapon: 'magic_staff',
      shoesColor: '#1e1b4b'
    },
    {
      id: 'outfit_shield',
      name: 'حارس القلعة المدرع (Citadel Guard)',
      category: 'armor',
      topColor: '#1e293b',
      bottomColor: '#0f172a',
      accentColor: '#10b981',
      headwear: 'hood',
      cape: false,
      capeColor: '#10b981',
      weapon: 'shield',
      shoesColor: '#020617'
    }
  ],
  backgrounds: [
    {
      id: 'bg_cyber',
      name: 'مدينة السايبربانك (Neo Cyber City)',
      theme: 'cyberpunk',
      timeOfDay: 'night',
      weather: 'rain',
      weatherIntensity: 0.8,
      layers: []
    },
    {
      id: 'bg_synthwave',
      name: 'شمس السينثويف (Retro Synthwave)',
      theme: 'retro_synthwave',
      timeOfDay: 'sunset',
      weather: 'clear',
      weatherIntensity: 0,
      layers: []
    },
    {
      id: 'bg_forest',
      name: 'غابة الزمرد السحرية (Emerald Forest)',
      theme: 'fantasy_forest',
      timeOfDay: 'night',
      weather: 'sparks',
      weatherIntensity: 0.6,
      layers: []
    },
    {
      id: 'bg_space',
      name: 'سديم الفضاء السحيق (Deep Space Void)',
      theme: 'space_void',
      timeOfDay: 'night',
      weather: 'snow',
      weatherIntensity: 0.4,
      layers: []
    },
    {
      id: 'bg_desert',
      name: 'كثبان الرمال الأثرية (Ancient Dunes)',
      theme: 'desert_ruins',
      timeOfDay: 'sunset',
      weather: 'fog',
      weatherIntensity: 0.5,
      layers: []
    }
  ],
  skills: [
    {
      id: 'skill_double_jump',
      name: 'القفزة المزدوجة النفاثة (Double Jump)',
      triggerKey: 'Space',
      description: 'تمكن الشخصية من أداء قفزة دفع هوائي إضافية في الجو مصحوبة ببريق نيون',
      enabled: true,
      category: 'motion',
      cooldownMs: 800,
      code: `// Skill: Double Jump
function onDoubleJump(player, physics) {
  if (player.jumpCount === 1) {
    player.vy = -450;
    player.jumpCount = 2;
    physics.spawnParticles(player.x, player.y + 40, '#06b6d4', 12);
  }
}`
    },
    {
      id: 'skill_slow_mo',
      name: 'تمدد الزمن (Time Dilate)',
      triggerKey: 'KeyE',
      description: 'إبطاء فيزياء المشهد بنسبة 60% لإتاحة تفادي الضربات والمقذوفات بدقة متناهية',
      enabled: true,
      category: 'utility',
      cooldownMs: 3000,
      code: `// Skill: Time Dilate
function onTimeDilate(world) {
  world.timeScale = 0.4;
  setTimeout(() => { world.timeScale = 1.0; }, 2500);
}`
    },
    {
      id: 'skill_shockwave',
      name: 'الموجة الارتدادية العنيفة (Shockwave Blast)',
      triggerKey: 'KeyQ',
      description: 'إطلاق موجة تصادمية كروية تدفع جميع الأجسام الفيزيائية القريبة بعيداً عن اللاعب',
      enabled: true,
      category: 'combat',
      cooldownMs: 2000,
      code: `// Skill: Shockwave
function onShockwave(player, bodies) {
  bodies.forEach(b => {
    const dx = b.x - player.x;
    const dy = b.y - player.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 250 && dist > 0) {
      const force = (250 - dist) * 4;
      b.vx += (dx / dist) * force;
      b.vy += (dy / dist) * force;
    }
  });
}`
    }
  ]
};

const STORAGE_KEY = 'omni_studio_project_v2';

export function loadProjectFromStorage(): StudioProject {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Ensure merge with default properties in case new arrays were added
      return {
        ...DEFAULT_STUDIO_PROJECT,
        ...parsed,
        sounds: parsed.sounds?.length ? parsed.sounds : DEFAULT_STUDIO_PROJECT.sounds,
        physicsPresets: parsed.physicsPresets?.length ? parsed.physicsPresets : DEFAULT_STUDIO_PROJECT.physicsPresets,
        characters: parsed.characters?.length ? parsed.characters : DEFAULT_STUDIO_PROJECT.characters,
        wardrobe: parsed.wardrobe?.length ? parsed.wardrobe : DEFAULT_STUDIO_PROJECT.wardrobe,
        backgrounds: parsed.backgrounds?.length ? parsed.backgrounds : DEFAULT_STUDIO_PROJECT.backgrounds,
        skills: parsed.skills?.length ? parsed.skills : DEFAULT_STUDIO_PROJECT.skills
      };
    }
  } catch (e) {
    console.warn('Failed to load project from localStorage, using defaults', e);
  }
  return DEFAULT_STUDIO_PROJECT;
}

export function saveProjectToStorage(project: StudioProject): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
  } catch (e) {
    console.warn('Failed to save project to localStorage', e);
  }
}
