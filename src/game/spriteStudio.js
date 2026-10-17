// ============================================================
// Sprite Studio - upload, matching automático e armazenamento
// ============================================================
// As imagens são salvas em localStorage como data URLs (base64).
// Para evitar estourar o limite (~5MB), cada arquivo passa por
// redimensionamento opcional via canvas antes de salvar.
//
// O "matcher" não é uma IA real — é um classificador baseado em
// regras que normaliza nomes de arquivo e compara com id/nome
// das entidades do jogo (vocações, monstros, bosses, itens,
// mapas/zonas). Ele também usa fuzzy match (Levenshtein) para
// tolerar pequenas variações (ex: "dragon-lord" vs "dragon_lord").
// ============================================================

import {
  VOCATIONS,
  MONSTERS,
  BOSSES,
  HUNT_ZONES,
  ITEMS,
} from './data.js';

const SPRITE_STORE_KEY = 'dungeon_invader_idle_sprites_v1';
const MAX_FILE_BYTES = 250_000; // 250KB por sprite
const MAX_CANVAS_SIDE = 96; // redimensiona pra no máximo 96x96

// ============================================================
// Carga/descarga
// ============================================================
function readStore() {
  try {
    const raw = localStorage.getItem(SPRITE_STORE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}

function writeStore(map) {
  try {
    localStorage.setItem(SPRITE_STORE_KEY, JSON.stringify(map));
    return true;
  } catch (e) {
    return false;
  }
}

// chave: `${kind}:${entityId}`  -> { dataUrl, name, updatedAt }
export function getSpriteMap() {
  return readStore();
}

export function getSprite(kind, entityId) {
  const map = readStore();
  return map[`${kind}:${entityId}`] || null;
}

export function setSprite(kind, entityId, dataUrl, name) {
  const map = readStore();
  map[`${kind}:${entityId}`] = {
    dataUrl,
    name: name || 'sprite',
    updatedAt: Date.now(),
  };
  writeStore(map);
}

export function deleteSprite(kind, entityId) {
  const map = readStore();
  delete map[`${kind}:${entityId}`];
  writeStore(map);
}

export function clearSprites() {
  writeStore({});
}

// Retorna URL absoluta do sprite: dataUrl custom OU base do sprites.json
export function resolveSpriteUrl(kind, entityId, fallback) {
  const custom = getSprite(kind, entityId);
  if (custom?.dataUrl) return custom.dataUrl;
  return fallback || '';
}

// ============================================================
// Redimensionamento via canvas (evita estourar localStorage)
// ============================================================
export async function fileToCompressedDataUrl(file, maxSide = MAX_CANVAS_SIDE) {
  if (!file.type.startsWith('image/')) {
    // GIFs animados: não dá pra redimensionar preservando animação.
    // Apenas rejeita se passar do limite.
    if (file.size > MAX_FILE_BYTES) {
      throw new Error(`Arquivo ${file.name} (${formatBytes(file.size)}) excede ${formatBytes(MAX_FILE_BYTES)}. Remova ou use um PNG/JPG.`);
    }
    return await readAsDataUrl(file);
  }

  const dataUrl = await readAsDataUrl(file);
  if (file.size <= MAX_FILE_BYTES) return dataUrl;

  // Imagem grande: redimensiona
  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxSide || height > maxSide) {
        const scale = Math.min(maxSide / width, maxSide / height);
        width = Math.max(1, Math.round(width * scale));
        height = Math.max(1, Math.round(height * scale));
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false; // pixel-art
      ctx.drawImage(img, 0, 0, width, height);
      // PNG pra preservar pixel-art; jpeg se user quiser
      const out = canvas.toDataURL('image/png');
      resolve(out);
    };
    img.onerror = () => reject(new Error(`Falha ao processar ${file.name}`));
    img.src = dataUrl;
  });
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error(`Falha ao ler ${file.name}`));
    r.readAsDataURL(file);
  });
}

function formatBytes(b) {
  if (b < 1024) return b + ' B';
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1024 / 1024).toFixed(2) + ' MB';
}
export { formatBytes };

// ============================================================
// Matching "IA" (baseado em regras + Levenshtein)
// ============================================================

// Cada tipo de sprite tem um conjunto de entidades
// (kind) -> array de { id, name, aliases? }
const KIND_ENTITIES = {
  vocation: VOCATIONS.map(v => ({ id: v.id, name: v.name, aliases: [v.id, v.name] })),
  monster:  MONSTERS.filter(m => !m.isBoss).map(m => ({ id: m.id, name: m.name, aliases: [m.id, m.name] })),
  boss:     BOSSES.map(b => ({ id: b.id, name: b.name, aliases: [b.id, b.name] })),
  item:     ITEMS.filter(i => i.id !== 'gold').map(i => ({ id: i.id, name: i.name, aliases: [i.id, i.name] })),
  map:      HUNT_ZONES.map(z => ({ id: z.id, name: z.name, aliases: [z.id, z.name] })),
};

const KIND_KEYWORDS = {
  vocation: ['voc', 'vocation', 'class', 'job', 'profession'],
  monster:  ['monster', 'mob', 'creature', 'npc', 'beast', 'enemy'],
  boss:     ['boss', 'raid', 'worldboss', 'elite'],
  item:     ['item', 'weapon', 'armor', 'armour', 'shield', 'potion', 'rune', 'tool', 'gear', 'equipment'],
  map:      ['map', 'zone', 'area', 'location', 'region', 'place', 'ground'],
};

// Normaliza nome: "Dragon Lord.png" -> "dragon_lord"
export function normalizeName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, '') // remove extensão
    .replace(/[^a-z0-9]+/g, '_')  // troca tudo que não é alfanum por _
    .replace(/^_+|_+$/g, '')       // trim _
    .replace(/_+/g, '_');
}

// Distância de Levenshtein (curto)
export function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const m = [];
  for (let i = 0; i <= b.length; i++) m[i] = [i];
  for (let j = 0; j <= a.length; j++) m[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        m[i][j] = m[i - 1][j - 1];
      } else {
        m[i][j] = Math.min(
          m[i - 1][j - 1] + 1,
          m[i][j - 1] + 1,
          m[i - 1][j] + 1
        );
      }
    }
  }
  return m[b.length][a.length];
}

// Calcula score entre o nome normalizado e a entidade
// Retorna -1 se nenhum sinal de match
function scoreMatch(normalized, entity) {
  const aliases = (entity.aliases || [entity.id, entity.name]).map(normalizeName);
  let best = -1;

  for (const alias of aliases) {
    if (!alias) continue;
    // match exato
    if (normalized === alias) return 1;
    // contido
    if (normalized.includes(alias) || alias.includes(normalized)) {
      const ratio = Math.min(alias.length, normalized.length) / Math.max(alias.length, normalized.length);
      best = Math.max(best, 0.6 + ratio * 0.3);
    }
    // fuzzy
    const dist = levenshtein(normalized, alias);
    const maxLen = Math.max(normalized.length, alias.length, 1);
    const sim = 1 - dist / maxLen;
    if (sim > 0.5) best = Math.max(best, sim * 0.7);
  }
  return best;
}

// Descobre o "kind" provável de um arquivo pelo nome
export function guessKind(normalized) {
  for (const [kind, kws] of Object.entries(KIND_KEYWORDS)) {
    for (const kw of kws) {
      if (normalized.includes(kw)) return kind;
    }
  }
  // fallback: tentar achar a substring em qualquer id
  // (sem kind conhecido, é mais difícil)
  return null;
}

// Tenta casar um arquivo com uma entidade.
// Retorna { kind, entityId, score } ou null se nada bater.
export function matchFile(filename) {
  const normalized = normalizeName(filename);
  if (!normalized) return null;

  // 1. Tenta adivinhar o kind pelo nome do arquivo
  let candidateKinds = guessKind(normalized) ? [guessKind(normalized)] : null;
  // se não adivinhou, testa todos
  if (!candidateKinds) candidateKinds = Object.keys(KIND_ENTITIES);

  let bestOverall = null;
  for (const kind of candidateKinds) {
    const entities = KIND_ENTITIES[kind] || [];
    for (const ent of entities) {
      const score = scoreMatch(normalized, ent);
      if (score > 0 && (!bestOverall || score > bestOverall.score)) {
        bestOverall = { kind, entityId: ent.id, score, name: ent.name };
      }
    }
  }
  return bestOverall;
}

// ============================================================
// Processa um arquivo individual (File) e retorna classificação
// ============================================================
export async function classifyAndStore(file) {
  const match = matchFile(file.name);
  const dataUrl = await fileToCompressedDataUrl(file);
  return {
    file,
    match, // { kind, entityId, score, name } ou null
    dataUrl,
    size: file.size,
  };
}

// ============================================================
// Aplica o sprite no store
// ============================================================
export function applySprite(classified) {
  if (!classified.match) return false;
  const { kind, entityId } = classified.match;
  setSprite(kind, entityId, classified.dataUrl, classified.file.name);
  return true;
}
