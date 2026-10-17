// Estado do jogo - persistência via localStorage + ações do Reducer
import { VOCATIONS, getMonsterAt, ITEMS, VOCATION_CAN_SHIELD } from './data.js';

const STORAGE_KEY = 'dungeon_invader_idle_v1';
// Registry global: lista de TODAS as contas já criadas nesta máquina.
// A conta logada também é duplicada aqui pra que o admin possa vê-la.
const REGISTRY_KEY = 'dungeon_invader_idle_accounts_v1';

// ============================================================
// ACCOUNT (conta de usuário)
// ============================================================
export function createAccount(email, provider = 'gmail') {
  return registerAccount({
    id: 'acc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
    email,
    provider,
    createdAt: Date.now(),
    characters: [],
    // 2 slots grátis + 5 pagos
    paidSlotsUnlocked: 0,
  });
}

// ============================================================
// REGISTRY: índice de contas para o painel admin ver tudo
// ============================================================
function readRegistry() {
  try {
    const raw = localStorage.getItem(REGISTRY_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

function writeRegistry(list) {
  try {
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(list));
  } catch (e) {
    // silencioso
  }
}

// Adiciona conta nova OU atualiza a existente (mesmo email)
export function registerAccount(account) {
  const list = readRegistry();
  const idx = list.findIndex(a => (a.email || '').toLowerCase() === (account.email || '').toLowerCase());
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...account };
  } else {
    list.push({ ...account });
  }
  writeRegistry(list);
  return account;
}

export function listAccounts() {
  return readRegistry();
}

export function getAccountById(id) {
  return readRegistry().find(a => a.id === id) || null;
}

export function getAccountByEmail(email) {
  return readRegistry().find(a => (a.email || '').toLowerCase() === (email || '').toLowerCase()) || null;
}

export function updateAccountInRegistry(account) {
  if (!account) return;
  registerAccount(account);
}

export function deleteAccountFromRegistry(id) {
  const list = readRegistry().filter(a => a.id !== id);
  writeRegistry(list);
}

export function newCharacter(name, vocationId) {
  const vocation = VOCATIONS.find(v => v.id === vocationId) || VOCATIONS[0];
  return {
    id: 'char_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    name: name.slice(0, 20),
    vocationId: vocation.id,
    level: 1,
    xp: 0,
    skills: { melee: 0, distance: 0, shielding: 0, magic: 0, fist: 0 },
    skillXp: { melee: 0, distance: 0, shielding: 0, magic: 0, fist: 0 },
    stats: { ...vocation.baseStats },
    hp: vocation.baseStats.health,
    mana: vocation.baseStats.mana,
    inventory: [{ id: 'health_potion', name: 'Health Potion', icon: '🧪', amount: 10, sellValue: 50 }],
    // Arma inicial coerente com a vocação (Tibia-style: todo char nasce armado)
    equipment: startingEquipmentFor(vocation.id),
    gold: 0,
    currentZone: 1,
    totalPlayTime: 0,
    monstersKilled: 0,
    bossesKilled: 0,
    deaths: 0,
    createdAt: Date.now(),
    lastSeen: Date.now(),
  };
}

// ============================================================
// PERSISTÊNCIA
// ============================================================
export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { account: null, currentCharacterId: null };
    const parsed = JSON.parse(raw);
    // Migração: chars antigos com skills em 1 passam para 0
    if (parsed?.account?.characters) {
      parsed.account.characters = parsed.account.characters.map((ch) => {
        const skills = { melee: 0, distance: 0, shielding: 0, magic: 0, fist: 0 };
        if (ch.skills) {
          for (const k of Object.keys(skills)) {
            // Se a skill salva for >=1 (legacy default), mantém o valor;
            // mas força quem está em 1 (default inicial antigo) a 0.
            if (ch.skills[k] && ch.skills[k] > 1) skills[k] = ch.skills[k];
          }
        }
        const equipment = ch.equipment || {};
        if (!equipment.weapon) {
          // char antigo sem arma equipada — recebe a arma padrão da vocação
          const weapon = defaultWeaponFor(ch.vocationId);
          if (weapon) equipment.weapon = { ...weapon };
        }
        return { ...ch, skills, equipment };
      });
    }
    return parsed;
  } catch (e) {
    return { account: null, currentCharacterId: null };
  }
}

function defaultWeaponFor(vocationId) {
  switch (vocationId) {
    case 'knight':    return ITEMS.find(i => i.id === 'sword');
    case 'paladin':   return ITEMS.find(i => i.id === 'bow');
    case 'sorcerer':  return ITEMS.find(i => i.id === 'wand');
    case 'druid':     return ITEMS.find(i => i.id === 'rod');
    case 'monk':      return ITEMS.find(i => i.id === 'knuckles');
    default:          return null;
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    // silencioso
  }
}

export function clearState() {
  localStorage.removeItem(STORAGE_KEY);
}

// ============================================================
// AÇÕES DO REDUCER
// ============================================================
export function login(state, email) {
  return { ...state, account: { ...createAccount(email) } };
}

export function loginExisting(state, account) {
  return { ...state, account: account };
}

export function selectCharacter(state, characterId) {
  return { ...state, currentCharacterId: characterId };
}

export function logout() {
  return { account: null, currentCharacterId: null };
}

// Comprar slot adicional (5 pagos a partir do índice 2)
export const SLOT_COST = 1000; // gold in-game

export function unlockPaidSlot(state) {
  if (!state.account) return state;
  const acc = state.account;
  if (acc.paidSlotsUnlocked >= 5) return state;
  if (acc.characters.length < 2 + acc.paidSlotsUnlocked) return state;
  return { ...state, account: { ...acc, paidSlotsUnlocked: acc.paidSlotsUnlocked + 1 } };
}

export function createCharacter(state, name, vocationId) {
  if (!state.account) return state;
  const acc = state.account;
  const totalSlots = 2 + acc.paidSlotsUnlocked;
  if (acc.characters.length >= totalSlots) return state;
  const char = newCharacter(name, vocationId);
  return {
    ...state,
    account: { ...acc, characters: [...acc.characters, char] },
  };
}

export function deleteCharacter(state, characterId) {
  if (!state.account) return state;
  return {
    ...state,
    account: {
      ...state.account,
      characters: state.account.characters.filter(c => c.id !== characterId),
    },
  };
}

// Atualiza o personagem ativo (mutação inalterada)
export function updateCharacter(state, characterId, updater) {
  if (!state.account) return state;
  return {
    ...state,
    account: {
      ...state.account,
      characters: state.account.characters.map(c =>
        c.id === characterId ? updater(c) : c
      ),
    },
  };
}

// ============================================================
// Util: encontra o personagem atual no estado
// ============================================================
export function currentCharacter(state) {
  if (!state.account || !state.currentCharacterId) return null;
  return state.account.characters.find(c => c.id === state.currentCharacterId) || null;
}

// Recupera o monstro alvo do player baseado no level dele
export function targetMonsterFor(character, preferBoss = false) {
  if (preferBoss) {
    // boss sempre disponível a cada 25 levels
    const bossLevel = Math.floor(character.level / 25) * 25;
    if (bossLevel < 25) return { mob: getMonsterAt(character.level), isBoss: false };
    return { mob: getMonsterAt(bossLevel), isBoss: true, bossLevel };
  }
  return { mob: getMonsterAt(character.level), isBoss: false };
}

// ============================================================
// Equipment inicial por vocação (Tibia-style)
// Knight: sword + shield
// Paladin: bow + shield
// Sorcerer: wand
// Druid: rod
// Monk: knuckles (sem shield, monk não usa)
// ============================================================
function startingEquipmentFor(vocationId) {
  const findItem = (id) => {
    const it = ITEMS.find(i => i.id === id);
    return it ? { ...it } : null;
  };
  const canShield = VOCATION_CAN_SHIELD[vocationId] !== false;

  switch (vocationId) {
    case 'knight':    return { weapon: findItem('sword'),    shield: canShield ? findItem('shield') : null, helmet: null, armor: null, boots: null, ring: null, amulet: null };
    case 'paladin':   return { weapon: findItem('bow'),      shield: canShield ? findItem('shield') : null, helmet: null, armor: null, boots: null, ring: null, amulet: null };
    case 'sorcerer':  return { weapon: findItem('wand'),     shield: canShield ? findItem('shield') : null, helmet: null, armor: null, boots: null, ring: null, amulet: null };
    case 'druid':     return { weapon: findItem('rod'),      shield: canShield ? findItem('shield') : null, helmet: null, armor: null, boots: null, ring: null, amulet: null };
    case 'monk':      return { weapon: findItem('knuckles'), shield: null,                                                                helmet: null, armor: null, boots: null, ring: null, amulet: null };
    default:          return { weapon: null,                  shield: canShield ? findItem('shield') : null, helmet: null, armor: null, boots: null, ring: null, amulet: null };
  }
}
