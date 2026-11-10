import { CharacterDesign, WardrobeItem } from '../types/studio';

export class CharacterRenderer {
  // Generate SVG markup string representing the character (and worn outfit if provided)
  public static generateSvg(
    character: CharacterDesign,
    outfit?: WardrobeItem,
    animationTime = 0,
    width = 300,
    height = 400
  ): string {
    // Animation offsets based on state
    let bodyY = 0;
    let legRotationLeft = 0;
    let legRotationRight = 0;
    let armRotationLeft = 0;
    let armRotationRight = 0;
    let headTilt = 0;

    const anim = character.animation || 'idle';
    const t = animationTime;

    if (anim === 'idle') {
      bodyY = Math.sin(t * 3) * 3;
      armRotationLeft = Math.sin(t * 3) * 4;
      armRotationRight = -Math.sin(t * 3) * 4;
    } else if (anim === 'walk') {
      bodyY = Math.abs(Math.sin(t * 8)) * 6;
      legRotationLeft = Math.sin(t * 8) * 25;
      legRotationRight = -Math.sin(t * 8) * 25;
      armRotationLeft = -Math.sin(t * 8) * 30;
      armRotationRight = Math.sin(t * 8) * 30;
      headTilt = Math.sin(t * 8) * 3;
    } else if (anim === 'jump') {
      bodyY = -15 + Math.sin(t * 5) * 4;
      legRotationLeft = -20;
      legRotationRight = 20;
      armRotationLeft = -60;
      armRotationRight = 60;
    } else if (anim === 'attack') {
      bodyY = 2;
      armRotationRight = -70 + Math.sin(t * 12) * 35;
      armRotationLeft = 20;
      headTilt = -5;
    } else if (anim === 'dance') {
      bodyY = Math.abs(Math.sin(t * 10)) * 10;
      headTilt = Math.sin(t * 10) * 12;
      armRotationLeft = Math.sin(t * 10) * 50;
      armRotationRight = -Math.cos(t * 10) * 50;
      legRotationLeft = Math.sin(t * 5) * 15;
    }

    const skin = character.skinTone || '#f6d8ae';
    const hair = character.hairColor || '#3b2f2f';
    const eyes = character.eyeColor || '#22d3ee';

    const topCol = outfit?.topColor || '#4f46e5';
    const botCol = outfit?.bottomColor || '#1e293b';
    const accentCol = outfit?.accentColor || '#fbbf24';
    const shoeCol = outfit?.shoesColor || '#0f172a';
    const capeCol = outfit?.capeColor || '#dc2626';

    const hasCape = outfit?.cape || false;
    const weapon = outfit?.weapon || 'none';
    const headwear = outfit?.headwear || 'none';

    // SVG Construction
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400" width="${width}" height="${height}">
  <defs>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="6" flood-opacity="0.35"/>
    </filter>
    <linearGradient id="glowWeapon" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#818cf8"/>
    </linearGradient>
  </defs>

  <!-- Ground Shadow -->
  <ellipse cx="150" cy="370" rx="${60 - (anim === 'jump' ? 20 : 0)}" ry="12" fill="rgba(0,0,0,0.3)" />

  <g transform="translate(0, ${bodyY})">
    <!-- Back Cape -->
    ${
      hasCape
        ? `<path d="M 115 155 Q 85 240, 100 330 Q 150 350, 200 330 Q 215 240, 185 155 Z" fill="${capeCol}" opacity="0.9" />`
        : ''
    }

    <!-- Left Leg -->
    <g transform="translate(130, 245) rotate(${legRotationLeft}, 0, 0)">
      <rect x="-10" y="0" width="20" height="75" rx="10" fill="${botCol}" />
      <rect x="-12" y="70" width="24" height="20" rx="6" fill="${shoeCol}" />
    </g>

    <!-- Right Leg -->
    <g transform="translate(170, 245) rotate(${legRotationRight}, 0, 0)">
      <rect x="-10" y="0" width="20" height="75" rx="10" fill="${botCol}" />
      <rect x="-12" y="70" width="24" height="20" rx="6" fill="${shoeCol}" />
    </g>

    <!-- Torso -->
    <rect x="115" y="150" width="70" height="100" rx="16" fill="${topCol}" filter="url(#shadow)" />
    <!-- Armor / Outfit Details -->
    <path d="M 125 150 L 150 190 L 175 150" fill="none" stroke="${accentCol}" stroke-width="4" stroke-linecap="round"/>
    <rect x="115" y="232" width="70" height="18" fill="${botCol}" />
    <circle cx="150" cy="241" r="7" fill="${accentCol}" />

    <!-- Left Arm -->
    <g transform="translate(110, 165) rotate(${armRotationLeft}, 0, 0)">
      <rect x="-9" y="0" width="18" height="65" rx="9" fill="${topCol}" />
      <circle cx="0" cy="68" r="10" fill="${skin}" />
      ${
        weapon === 'shield'
          ? `<ellipse cx="-5" cy="55" rx="18" ry="26" fill="${accentCol}" stroke="#fff" stroke-width="2"/>`
          : ''
      }
    </g>

    <!-- Right Arm & Weapon -->
    <g transform="translate(190, 165) rotate(${armRotationRight}, 0, 0)">
      <rect x="-9" y="0" width="18" height="65" rx="9" fill="${topCol}" />
      <circle cx="0" cy="68" r="10" fill="${skin}" />
      <!-- Weapon Slot -->
      ${
        weapon === 'sword'
          ? `<g transform="translate(0, 68) rotate(-40)">
              <rect x="-3" y="-55" width="6" height="55" rx="3" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.5" />
              <rect x="-14" y="0" width="28" height="6" rx="2" fill="${accentCol}" />
              <rect x="-3" y="6" width="6" height="16" rx="2" fill="#475569" />
              <circle cx="0" cy="22" r="5" fill="${accentCol}" />
            </g>`
          : weapon === 'energy_blade'
          ? `<g transform="translate(0, 68) rotate(-35)">
              <rect x="-4" y="-65" width="8" height="65" rx="4" fill="url(#glowWeapon)" filter="url(#shadow)" />
              <rect x="-6" y="0" width="12" height="18" rx="3" fill="#1e293b" />
            </g>`
          : weapon === 'magic_staff'
          ? `<g transform="translate(0, 68) rotate(-20)">
              <rect x="-3" y="-70" width="6" height="90" rx="3" fill="#78350f" />
              <circle cx="0" cy="-75" r="12" fill="#38bdf8" opacity="0.8" />
              <circle cx="0" cy="-75" r="7" fill="#fff" />
            </g>`
          : ''
      }
    </g>

    <!-- Head & Face -->
    <g transform="translate(150, 110) rotate(${headTilt}, 0, 0)">
      <!-- Neck -->
      <rect x="-12" y="30" width="24" height="15" fill="${skin}" />
      <!-- Head Base -->
      <circle cx="0" cy="0" r="38" fill="${skin}" filter="url(#shadow)" />

      <!-- Hair Style -->
      ${CharacterRenderer.renderHair(character.hairStyle, hair)}

      <!-- Eyes & Expression -->
      ${CharacterRenderer.renderFace(character.expression, eyes)}

      <!-- Headwear -->
      ${CharacterRenderer.renderHeadwear(headwear, accentCol)}
    </g>
  </g>
</svg>`;
  }

  private static renderHair(style: string, color: string): string {
    switch (style) {
      case 'short':
        return `<path d="M -40 -10 C -40 -48, 40 -48, 40 -10 C 35 -25, 20 -38, 0 -38 C -20 -38, -35 -25, -40 -10 Z" fill="${color}" />
                <path d="M -38 -5 Q -10 -25, 15 -18 Q -10 -15, -38 -5 Z" fill="${color}" />`;
      case 'spiky':
        return `<path d="M -40 -5 L -35 -35 L -20 -20 L -5 -45 L 10 -22 L 28 -40 L 35 -5 C 20 -20, -20 -20, -40 -5 Z" fill="${color}" />`;
      case 'long':
        return `<path d="M -40 -10 C -40 -50, 40 -50, 40 -10 C 45 30, 35 60, 30 75 C 25 50, 35 15, 30 -5 C 20 -25, -20 -25, -30 -5 C -35 15, -25 50, -30 75 C -35 60, -45 30, -40 -10 Z" fill="${color}" />`;
      case 'curly':
        return `<circle cx="-25" cy="-25" r="15" fill="${color}" />
                <circle cx="0" cy="-35" r="18" fill="${color}" />
                <circle cx="25" cy="-25" r="15" fill="${color}" />
                <circle cx="-35" cy="-5" r="12" fill="${color}" />
                <circle cx="35" cy="-5" r="12" fill="${color}" />`;
      case 'cyberpunk':
        return `<path d="M -40 -15 C -35 -45, 10 -45, 35 -20 L 40 10 L 32 -10 L 0 -30 L -30 -15 Z" fill="${color}" />
                <line x1="-35" y1="0" x2="-20" y2="0" stroke="#06b6d4" stroke-width="2" />
                <line x1="-35" y1="5" x2="-25" y2="5" stroke="#06b6d4" stroke-width="2" />`;
      case 'none':
      default:
        return '';
    }
  }

  private static renderFace(expr: string, eyeColor: string): string {
    let eyeL = `<circle cx="-13" cy="2" r="4.5" fill="${eyeColor}" /><circle cx="-14" cy="0.5" r="1.5" fill="#fff"/>`;
    let eyeR = `<circle cx="13" cy="2" r="4.5" fill="${eyeColor}" /><circle cx="12" cy="0.5" r="1.5" fill="#fff"/>`;
    let mouth = `<path d="M -8 18 Q 0 24, 8 18" stroke="#78350f" stroke-width="2" fill="none" stroke-linecap="round"/>`;

    if (expr === 'happy') {
      mouth = `<path d="M -10 16 Q 0 28, 10 16" fill="#be123c" stroke="#78350f" stroke-width="2"/>`;
    } else if (expr === 'fierce') {
      mouth = `<line x1="-8" y1="20" x2="8" y2="18" stroke="#78350f" stroke-width="2.5" stroke-linecap="round"/>`;
      eyeL += `<line x1="-20" y1="-5" x2="-6" y2="0" stroke="#334155" stroke-width="2"/>`;
      eyeR += `<line x1="20" y1="-5" x2="6" y2="0" stroke="#334155" stroke-width="2"/>`;
    } else if (expr === 'surprised') {
      mouth = `<circle cx="0" cy="20" r="6" fill="#78350f"/>`;
      eyeL = `<circle cx="-13" cy="2" r="6" fill="${eyeColor}" /><circle cx="-14" cy="0" r="2" fill="#fff"/>`;
      eyeR = `<circle cx="13" cy="2" r="6" fill="${eyeColor}" /><circle cx="12" cy="0" r="2" fill="#fff"/>`;
    } else if (expr === 'focused') {
      mouth = `<path d="M -7 20 L 7 20" stroke="#78350f" stroke-width="2" stroke-linecap="round"/>`;
    }

    return `${eyeL}${eyeR}${mouth}`;
  }

  private static renderHeadwear(type: string, accent: string): string {
    switch (type) {
      case 'knight_helmet':
        return `<path d="M -38 -15 C -38 -55, 38 -55, 38 -15 L 35 15 L 20 25 L -20 25 L -35 15 Z" fill="#94a3b8" stroke="#475569" stroke-width="2"/>
                <rect x="-24" y="-2" width="48" height="8" rx="4" fill="#0f172a" />
                <path d="M 0 -55 Q -10 -75, -25 -80 Q -5 -65, 0 -55" fill="#dc2626" />`;
      case 'wizard_hat':
        return `<path d="M -50 -10 C -25 -20, 25 -20, 50 -10 C 25 -15, -25 -15, -50 -10 Z" fill="#4338ca"/>
                <path d="M -30 -15 L 0 -85 L 25 -15 Z" fill="#4f46e5" />
                <circle cx="0" cy="-85" r="5" fill="${accent}" />`;
      case 'cyber_visor':
        return `<path d="M -30 -5 L 30 -5 L 26 10 L -26 10 Z" fill="#06b6d4" opacity="0.9" stroke="#fff" stroke-width="1.5" />`;
      case 'crown':
        return `<path d="M -25 -25 L -30 -45 L -15 -35 L 0 -50 L 15 -35 L 30 -45 L 25 -25 Z" fill="${accent}" stroke="#d97706" stroke-width="1.5"/>
                <circle cx="0" cy="-40" r="3" fill="#ef4444"/>`;
      case 'hood':
        return `<path d="M -44 -15 C -44 -55, 44 -55, 44 -15 C 44 25, 30 40, 20 45 C -20 45, -30 40, -44 25 Z" fill="#334155" opacity="0.95"/>`;
      case 'none':
      default:
        return '';
    }
  }

  // Generate standalone SVG code
  public static generateCode(character: CharacterDesign, outfit?: WardrobeItem): string {
    const svg = CharacterRenderer.generateSvg(character, outfit, 0, 400, 500);
    return `// ==========================================
// OmniStudio Character Generator Code
// Character: ${character.name} (${character.role})
// ==========================================

export const characterData = ${JSON.stringify(character, null, 2)};
${outfit ? `export const outfitData = ${JSON.stringify(outfit, null, 2)};` : ''}

export const characterSvg = \`${svg}\`;

// Render into container:
export function renderCharacter(containerId) {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = characterSvg;
}
`;
  }
}
