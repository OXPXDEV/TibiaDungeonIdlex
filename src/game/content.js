// ============================================================
// Módulo de conteúdo editável pelo Admin
// ============================================================
// Persistência: localStorage com chave 'dungeon_invader_idle_content_v1'
// Seed: gerado a partir de data.js quando o admin cria o primeiro item.
// O admin pode editar/incluir/excluir em runtime; as alterações ficam
// salvas no navegador atual. Para compartilhar, use o botão "Exportar JSON".
// ============================================================

import {
  VOCATIONS,
  MONSTERS,
  BOSSES,
} from './data.js';

const CONTENT_KEY = 'dungeon_invader_idle_content_v1';

// Catálogo completo de tipos de equipamento / slots (Tibia clássico)
export const EQUIP_SLOTS = [
  'head', 'armor', 'legs', 'boots', 'amulet', 'ring',
  'weapon', 'shield', 'ammunition', 'backpack',
];

// Categorias de item
export const ITEM_CATEGORIES = [
  { id: 'weapon',     name: 'Armas'      },
  { id: 'shield',     name: 'Escudos'    },
  { id: 'armor',      name: 'Armaduras'  },
  { id: 'helmet',     name: 'Elmos'      },
  { id: 'legs',       name: 'Calças'     },
  { id: 'boots',      name: 'Botas'      },
  { id: 'amulet',     name: 'Amuletos'   },
  { id: 'ring',       name: 'Anéis'      },
  { id: 'consumable', name: 'Consumíveis'},
  { id: 'resource',   name: 'Recursos'   },
];

// Zonas / áreas de caça (Tibia-like)
export const HUNT_ZONES = [
  { id: 'rookgaard',    name: 'Rookgaard',     minLevel: 1,   color: '#27ae60' },
  { id: 'thais',        name: 'Thais',         minLevel: 8,   color: '#5dade2' },
  { id: 'venore',       name: 'Venore',        minLevel: 20,  color: '#9b59b6' },
  { id: 'kazordoon',    name: 'Kazordoon',     minLevel: 50,  color: '#c9a747' },
  { id: 'edron',        name: 'Edron',         minLevel: 80,  color: '#27ae60' },
  { id: 'cyclopolis',   name: 'Cyclopolis',    minLevel: 150, color: '#5dade2' },
  { id: 'ab_dendriel',  name: 'Ab. Dendriel',  minLevel: 200, color: '#9b59b6' },
  { id: 'hunt_cyclops', name: 'Caça dos Cyclops', minLevel: 400, color: '#c9a747' },
  { id: 'hellgate',     name: 'Portão do Inferno', minLevel: 800, color: '#e74c3c' },
  { id: 'dragon_lair',  name: 'Cova do Dragão', minLevel: 1500, color: '#ff6b35' },
  { id: 'fury_grotto',  name: 'Caverna da Fúria', minLevel: 3000, color: '#e74c3c' },
  { id: 'dread_mire',   name: 'Pântano do Pavor', minLevel: 5000, color: '#9b59b6' },
];

// Catálogo de exemplo de itens (seed)
export const SAMPLE_ITEMS = [
  { id: 'health_potion',  name: 'Health Potion',  category: 'consumable', slot: null,             weight: 1.5, attack: 0, defense: 0, bonusHp: 0, bonusMana: 0, price: 50,   spriteKey: 'health_potion' },
  { id: 'mana_potion',    name: 'Mana Potion',    category: 'consumable', slot: null,             weight: 1.5, attack: 0, defense: 0, bonusHp: 0, bonusMana: 0, price: 50,   spriteKey: 'mana_potion' },
  { id: 'steel_sword',    name: 'Espada de Aço',  category: 'weapon',     slot: 'weapon',         weight: 5,   attack: 18, defense: 0, bonusHp: 0, bonusMana: 0, price: 500,  spriteKey: 'sword' },
  { id: 'iron_axe',       name: 'Machado de Ferro', category: 'weapon',   slot: 'weapon',         weight: 6,   attack: 22, defense: 0, bonusHp: 0, bonusMana: 0, price: 800,  spriteKey: 'axe' },
  { id: 'hunting_bow',    name: 'Arco de Caça',   category: 'weapon',     slot: 'weapon',         weight: 3,   attack: 16, defense: 0, bonusHp: 0, bonusMana: 0, price: 400,  spriteKey: 'bow' },
  { id: 'focused_rod',    name: 'Cajado Focado',  category: 'weapon',     slot: 'weapon',         weight: 4,   attack: 20, defense: 0, bonusHp: 0, bonusMana: 0, price: 700,  spriteKey: 'rod' },
  { id: 'noble_wand',     name: 'Cajado Nobre',   category: 'weapon',     slot: 'weapon',         weight: 3,   attack: 14, defense: 0, bonusHp: 0, bonusMana: 0, price: 350,  spriteKey: 'wand' },
  { id: 'fist_knuckles',  name: 'Cestos de Combate', category: 'weapon', slot: 'weapon',          weight: 1,   attack: 12, defense: 0, bonusHp: 0, bonusMana: 0, price: 200,  spriteKey: 'knuckles' },
  { id: 'wooden_shield',  name: 'Escudo de Madeira', category: 'shield',  slot: 'shield',         weight: 4,   attack: 0,  defense: 8,  bonusHp: 0, bonusMana: 0, price: 250,  spriteKey: 'shield' },
  { id: 'leather_armor',  name: 'Armadura de Couro', category: 'armor',  slot: 'armor',           weight: 6,   attack: 0,  defense: 10, bonusHp: 0, bonusMana: 0, price: 400,  spriteKey: 'armor' },
  { id: 'steel_helmet',   name: 'Elmo de Aço',     category: 'helmet',    slot: 'head',            weight: 3,   attack: 0,  defense: 6,  bonusHp: 0, bonusMana: 0, price: 350,  spriteKey: 'helmet' },
  { id: 'leather_boots',  name: 'Botas de Couro',  category: 'boots',     slot: 'boots',           weight: 2,   attack: 0,  defense: 3,  bonusHp: 0, bonusMana: 0, price: 150,  spriteKey: 'boots' },
  { id: 'life_ring',      name: 'Anel da Vida',    category: 'ring',      slot: 'ring',            weight: 0.5, attack: 0,  defense: 0,  bonusHp: 20, bonusMana: 0, price: 1000, spriteKey: 'ring' },
  { id: 'power_amulet',   name: 'Amuleto do Poder', category: 'amulet',   slot: 'amulet',          weight: 1,   attack: 5,  defense: 0,  bonusHp: 0,  bonusMana: 0, price: 1200, spriteKey: 'amulet' },
];

// ============================================================
// Funções de persistência
// ============================================================

export function loadContent() {
  try {
    const raw = localStorage.getItem(CONTENT_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // ignora
  }
  return null;
}

export function saveContent(content) {
  try {
    localStorage.setItem(CONTENT_KEY, JSON.stringify(content));
    return true;
  } catch (e) {
    return false;
  }
}

export function resetContent() {
  try { localStorage.removeItem(CONTENT_KEY); } catch (e) { /* */ }
}

// ============================================================
// Seed do conteúdo (gerado a partir de data.js + samples acima)
// ============================================================

export function seedContent() {
  return {
    version: 1,
    vocations: VOCATIONS.map(v => ({ ...v })),
    monsters: MONSTERS.map(m => ({ ...m })),
    bosses:   BOSSES.map(b => ({ ...b })),
    items:    SAMPLE_ITEMS.map(i => ({ ...i })),
    zones:    HUNT_ZONES.map(z => ({ ...z })),
    updatedAt: Date.now(),
  };
}

// Retorna o conteúdo atual ou o seed se não houver nada salvo
export function getContent() {
  return loadContent() || seedContent();
}

// ============================================================
// Operações CRUD
// ============================================================

export function upsertVocation(content, voc) {
  const list = content.vocations.slice();
  const idx = list.findIndex(v => v.id === voc.id);
  if (idx >= 0) list[idx] = voc; else list.push(voc);
  return { ...content, vocations: list, updatedAt: Date.now() };
}

export function deleteVocation(content, id) {
  return { ...content, vocations: content.vocations.filter(v => v.id !== id), updatedAt: Date.now() };
}

export function upsertMonster(content, m) {
  const list = content.monsters.slice();
  const idx = list.findIndex(x => x.id === m.id);
  if (idx >= 0) list[idx] = m; else list.push(m);
  return { ...content, monsters: list, updatedAt: Date.now() };
}

export function deleteMonster(content, id) {
  return { ...content, monsters: content.monsters.filter(x => x.id !== id), updatedAt: Date.now() };
}

export function upsertBoss(content, b) {
  const list = content.bosses.slice();
  const idx = list.findIndex(x => x.id === b.id);
  if (idx >= 0) list[idx] = b; else list.push(b);
  return { ...content, bosses: list, updatedAt: Date.now() };
}

export function deleteBoss(content, id) {
  return { ...content, bosses: content.bosses.filter(x => x.id !== id), updatedAt: Date.now() };
}

export function upsertItem(content, it) {
  const list = content.items.slice();
  const idx = list.findIndex(x => x.id === it.id);
  if (idx >= 0) list[idx] = it; else list.push(it);
  return { ...content, items: list, updatedAt: Date.now() };
}

export function deleteItem(content, id) {
  return { ...content, items: content.items.filter(x => x.id !== id), updatedAt: Date.now() };
}

export function upsertZone(content, z) {
  const list = content.zones.slice();
  const idx = list.findIndex(x => x.id === z.id);
  if (idx >= 0) list[idx] = z; else list.push(z);
  return { ...content, zones: list, updatedAt: Date.now() };
}

export function deleteZone(content, id) {
  return { ...content, zones: content.zones.filter(x => x.id !== id), updatedAt: Date.now() };
}

// ============================================================
// Import/Export
// ============================================================

export function exportContent(content) {
  return JSON.stringify(content, null, 2);
}

export function importContent(jsonText) {
  const data = JSON.parse(jsonText);
  if (!data.vocations || !data.monsters) {
    throw new Error('JSON inválido: faltam campos obrigatórios (vocations, monsters)');
  }
  return { ...data, updatedAt: Date.now() };
}

// Email autorizado a acessar o painel admin
export const ADMIN_EMAIL = 'williamcosmos1@gmail.com';

export function isAdmin(account) {
  return !!account && (account.email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase();
}
