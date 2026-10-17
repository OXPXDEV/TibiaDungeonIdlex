// Sistema central do jogo - Fórmulas, balanceamento e dados
// Inspirado no Tibia: level 1-9999, batalha idle automatizada

// ============================================================
// FÓRMULAS DE XP POR LEVEL (1 ao 9999)
// Sistema de progressão com dificuldade crescente:
// 1-100: ~5h de jogo (fácil)
// 100-200: já dificulta
// 200-1000: dificulta mais
// 1000-9999: cada level é significativamente mais difícil
// ============================================================
export function xpForLevel(level) {
  if (level <= 1) return 0;
  if (level > 9999) return Infinity;

  // Fórmula base com curva exponencial dupla:
  // Parte 1 (1-100): ~5 horas = ~1.8M XP total
  // Parte 2 (100-1000): crescimento moderado
  // Parte 3 (1000-9999): crescimento brutal
  let totalXp = 0;

  if (level <= 100) {
    // Curva suave inicial - alvo: chegar no 100 com ~1.8M XP
    // Fórmula: 50 + level*30 + level^2 * 0.5
    for (let l = 1; l < level; l++) {
      totalXp += Math.floor(50 + l * 30 + l * l * 0.5);
    }
  } else if (level <= 1000) {
    // 1-100 já calculado
    for (let l = 1; l <= 100; l++) {
      totalXp += Math.floor(50 + l * 30 + l * l * 0.5);
    }
    // 101-1000: curva mais íngreme
    for (let l = 101; l < level; l++) {
      const t = l - 100;
      totalXp += Math.floor(8000 + t * 180 + Math.pow(t, 1.6) * 2.5);
    }
  } else {
    // Acumulado até 1000
    let acc = 0;
    for (let l = 1; l <= 100; l++) acc += Math.floor(50 + l * 30 + l * l * 0.5);
    for (let l = 101; l <= 1000; l++) {
      const t = l - 100;
      acc += Math.floor(8000 + t * 180 + Math.pow(t, 1.6) * 2.5);
    }
    // 1001-9999: curva exponencial brutal
    for (let l = 1001; l < level; l++) {
      const t = l - 1000;
      acc += Math.floor(200000 + t * 1200 + Math.pow(t, 2.1) * 18);
    }
    totalXp = acc;
  }

  return Math.floor(totalXp);
}

// XP necessário para ir do level atual para o próximo
export function xpToNextLevel(level) {
  return xpForLevel(level + 1) - xpForLevel(level);
}

// ============================================================
// SISTEMA DE HABILIDADES (Skills estilo Tibia)
// Cada skill tem level separado que afeta desempenho em combate
// ============================================================
export const SKILL_DEFS = [
  { id: 'melee',   name: 'Melee',    icon: '⚔️', desc: 'Ataques corpo a corpo e dano físico' },
  { id: 'distance',name: 'Distance', icon: '🏹', desc: 'Ataques à distância' },
  { id: 'shielding',name:'Shielding',icon: '🛡️', desc: 'Defesa com escudo' },
  { id: 'magic',   name: 'Magic',    icon: '🔮', desc: 'Poder mágico e feitiços' },
  { id: 'fist',    name: 'Fist',     icon: '👊', desc: 'Combate desarmado' },
];

// Cada skill começa em 1 e pode ir até 200
// Dificuldade progressiva conforme pedido:
// - 1-100: relativamente acessível
// - 100-125: já dificulta bastante
// - 125-150: cada level custa significativamente mais
// - 150-200: muito difícil, dificultando mais ainda a cada level
export const MAX_SKILL_LEVEL = 200;

export function skillXpForLevel(skillLevel) {
  if (skillLevel <= 1) return 0;
  if (skillLevel > MAX_SKILL_LEVEL) return Infinity;

  let total = 0;
  for (let l = 1; l < skillLevel; l++) {
    if (l < 100) {
      // 1-99: curva suave e acessível
      // ~50K XP total para chegar no 100 (cabe em ~2-3h de gameplay ativo)
      total += Math.floor(20 + l * 8 + l * l * 0.15);
    } else if (l < 125) {
      // 100-124: já dificulta bastante (curva mais íngreme)
      const t = l - 100;
      total += Math.floor(800 + t * 90 + t * t * 4);
    } else if (l < 150) {
      // 125-149: dificulta cada level mais ainda
      const t = l - 125;
      // base acumulada até 125 (precisamos somar)
      // mas como estamos em loop, só usamos a fórmula por level
      total += Math.floor(2400 + t * 220 + t * t * 18 + Math.pow(t, 1.3) * 12);
    } else {
      // 150-199: muito difícil passar cada level, dificultando mais ainda
      const t = l - 150;
      total += Math.floor(8500 + t * 480 + t * t * 55 + Math.pow(t, 1.6) * 80);
    }
  }
  return Math.floor(total);
}

export function skillXpToNext(skillLevel) {
  return skillXpForLevel(skillLevel + 1) - skillXpForLevel(skillLevel);
}

// ============================================================
// SISTEMA DE STATS/ATRIBUTOS base estilo Tibia
// Cada atributo afeta fórmulas diferentes em combate
// ============================================================
export const STAT_DEFS = [
  { id: 'health',  name: 'Health',     icon: '❤️', short: 'HP', desc: 'Pontos de vida máximos' },
  { id: 'mana',    name: 'Mana',       icon: '🔵', short: 'MP', desc: 'Pontos de mana' },
  { id: 'strength',name: 'Strength',   icon: '💪', short: 'STR', desc: 'Aumenta dano melee e capacidade de carga' },
  { id: 'dexterity',name:'Dexterity',  icon: '🎯', short: 'DEX', desc: 'Velocidade, defesa e precisão à distância' },
  { id: 'intelligence',name:'Intelligence',icon:'🧠', short: 'INT', desc: 'Poder mágico e mana máxima' },
  { id: 'vitality',name: 'Vitality',   icon: '🩸', short: 'VIT', desc: 'Regeneração e HP máximo' },
];

// Stats base por vocação
export const VOCATIONS = [
  {
    id: 'knight',
    name: 'Knight',
    icon: '🛡️',
    desc: 'Guerreiro corpo a corpo com alta defesa',
    baseStats: { health: 150, mana: 50, strength: 15, dexterity: 10, intelligence: 5, vitality: 12 },
    statGrowth: { health: 8, mana: 2, strength: 2, dexterity: 1, intelligence: 0, vitality: 1 },
    preferredSkills: ['melee', 'shielding', 'fist'],
  },
  {
    id: 'paladin',
    name: 'Paladin',
    icon: '🏹',
    desc: 'Caçador versátil de médio alcance',
    baseStats: { health: 130, mana: 70, strength: 12, dexterity: 14, intelligence: 8, vitality: 10 },
    statGrowth: { health: 5, mana: 4, strength: 1, dexterity: 2, intelligence: 1, vitality: 1 },
    preferredSkills: ['distance', 'melee', 'shielding'],
  },
  {
    id: 'sorcerer',
    name: 'Sorcerer',
    icon: '🔮',
    desc: 'Mago elemental ofensivo',
    baseStats: { health: 110, mana: 150, strength: 6, dexterity: 8, intelligence: 18, vitality: 8 },
    statGrowth: { health: 4, mana: 6, strength: 0, dexterity: 1, intelligence: 3, vitality: 1 },
    preferredSkills: ['magic', 'distance'],
  },
  {
    id: 'druid',
    name: 'Druid',
    icon: '🌿',
    desc: 'Mago da natureza com suporte',
    baseStats: { health: 110, mana: 150, strength: 6, dexterity: 8, intelligence: 18, vitality: 8 },
    statGrowth: { health: 4, mana: 6, strength: 0, dexterity: 1, intelligence: 2, vitality: 1 },
    preferredSkills: ['magic', 'fist'],
  },
  {
    // Monk - classe mais nova do Tibia, focada em combate desarmado e chi
    // Stats equilibrados: HP médio, mana alta, STR e DEX bem distribuídos
    // Seu diferencial é o bônus passivo de dano em Fist e cura com Magic
    id: 'monk',
    name: 'Monk',
    icon: '🥋',
    desc: 'Guerreiro espiritual que domina combate desarmado e chi',
    baseStats: { health: 125, mana: 100, strength: 13, dexterity: 13, intelligence: 12, vitality: 11 },
    statGrowth: { health: 5, mana: 4, strength: 1, dexterity: 2, intelligence: 1, vitality: 1 },
    preferredSkills: ['fist', 'magic', 'melee'],
    // Bônus de classe aplicados nos cálculos de combate (vistos em playerDamage / playerDefense)
    passiveBonus: {
      // Dano adicional quando usa Fist (body damage de chi)
      fistDamageMul: 1.35,
      // Chance de esquiva (reduz dano recebido)
      dodgeChance: 0.08,
      // Cura passiva por hit (X% do dano causado como HP)
      lifeStealPct: 0.04,
      // Defesa base maior (treinamento físico)
      defenseFlat: 4,
    },
  },
];

// ============================================================
// FÓRMULAS DE BATALHA
// ============================================================
// Dano base do jogador baseado em level e skills
export function playerDamage(player, skillId = 'melee') {
  const vocation = VOCATIONS.find(v => v.id === player.vocationId);
  const passive = vocation?.passiveBonus || {};
  const isMonkFist = skillId === 'fist' && player.vocationId === 'monk';

  const levelFactor = 5 + player.level * 0.8;
  const strFactor = player.stats.strength * 2.2;
  const skillFactor = 1 + (player.skills[skillId] || 0) * 0.15;
  const dexFactor = player.stats.dexterity * 0.4;

  // Bônus do Monk: dano de Fist ganha multiplicador por chi
  const monkMul = isMonkFist ? (passive.fistDamageMul || 1) : 1;
  const base = (levelFactor + strFactor + dexFactor) * skillFactor * monkMul;

  // Taxa de ataque (golpes por segundo)
  const attacksPerSecond = 0.8 + player.stats.dexterity * 0.02 + (player.skills[skillId] || 0) * 0.005;

  return { damagePerHit: Math.floor(base), attacksPerSecond };
}

// Defesa do jogador (reduz dano recebido)
export function playerDefense(player) {
  const vocation = VOCATIONS.find(v => v.id === player.vocationId);
  const passive = vocation?.passiveBonus || {};
  const levelFactor = 2 + player.level * 0.3;
  const vitFactor = player.stats.vitality * 0.8;
  const dexFactor = player.stats.dexterity * 0.5;
  const shieldSkill = player.skills.shielding || 0;
  const shieldFactor = 1 + shieldSkill * 0.1;
  const flatPassive = passive.defenseFlat || 0;
  return Math.floor((levelFactor + vitFactor + dexFactor) * shieldFactor + flatPassive);
}

// Chance de esquiva (Monk tem dodgeChance)
export function playerDodgeChance(player) {
  const vocation = VOCATIONS.find(v => v.id === player.vocationId);
  const passive = vocation?.passiveBonus || {};
  const baseDodge = player.stats.dexterity * 0.0035;
  return Math.min(0.3, baseDodge + (passive.dodgeChance || 0));
}

// Roubo de vida passivo do Monk (retorna fração do dano convertido em HP)
export function playerLifeSteal(player) {
  const vocation = VOCATIONS.find(v => v.id === player.vocationId);
  const passive = vocation?.passiveBonus || {};
  return passive.lifeStealPct || 0;
}

// HP máximo
export function playerMaxHealth(player) {
  const baseHealth = player.stats.health + player.stats.vitality * 5;
  const levelGrowth = player.level * 5;
  return Math.floor(baseHealth + levelGrowth + player.stats.vitality * player.level * 0.8);
}

// Mana máxima
export function playerMaxMana(player) {
  const baseMana = player.stats.mana + player.stats.intelligence * 4;
  const levelGrowth = player.level * 3;
  return Math.floor(baseMana + levelGrowth + player.stats.intelligence * player.level * 0.5);
}

// Dano do monstro por hit
export function monsterDamage(monster, playerDefense) {
  const playerLevel = 1; // passado pelo contexto
  const raw = monster.baseDamage * (1 + (monster.level - 1) * 0.06);
  const reduced = Math.max(1, raw - playerDefense * 0.45);
  return Math.floor(reduced);
}

// HP do monstro
export function monsterHealth(monster) {
  return Math.floor(monster.baseHealth * (1 + (monster.level - 1) * 0.55));
}

// Defesa/Armor do monstro (reduz dano recebido)
export function monsterArmor(monster) {
  return Math.floor(monster.baseArmor * (1 + (monster.level - 1) * 0.08));
}

// Resistências do monstro (0-100, % de redução)
export function monsterResistances(monster) {
  return monster.resistances || { physical: 0, magical: 0 };
}

// XP que o monstro dá ao morrer
export function monsterXpReward(monster, playerLevel) {
  const levelDiff = Math.max(0.1, monster.level - playerLevel);
  // XP base do monstro * fator de diferença de level
  const diffFactor = levelDiff > 0
    ? 1 + Math.min(2, levelDiff * 0.05)
    : Math.max(0.1, 1 + levelDiff * 0.1);
  return Math.floor(monster.baseXp * diffFactor);
}

// Dano efetivo do jogador após resistências e armadura
export function effectivePlayerDamage(player, monster, skillId) {
  const { damagePerHit } = playerDamage(player, skillId);
  const armor = monsterArmor(monster);
  const res = monsterResistances(monster);
  const resistFactor = 1 - (res.physical || 0) / 100;
  const reduced = Math.max(1, damagePerHit - armor * 0.3);
  return Math.floor(reduced * resistFactor);
}

// Tempo para matar monstro (em segundos)
export function timeToKill(player, monster, skillId) {
  const { attacksPerSecond } = playerDamage(player, skillId);
  const dmg = effectivePlayerDamage(player, monster, skillId);
  const hp = monsterHealth(monster);
  const hitsToKill = Math.ceil(hp / dmg);
  return hitsToKill / attacksPerSecond;
}

// Dano que o jogador recebe por segundo do monstro
export function damagePerSecondTaken(player, monster) {
  const def = playerDefense(player);
  const dmg = monsterDamage(monster, def);
  const attacks = 0.5 + monster.level * 0.005; // monstros batem mais rápido com o level
  const dodge = playerDodgeChance(player);
  return Math.max(1, dmg * attacks * (1 - dodge));
}

// Chance do jogador sobreviver ao combate (HP vs dano/tempo)
export function battleSurvivalChance(player, monster) {
  const maxHp = playerMaxHealth(player);
  const dps = damagePerSecondTaken(player, monster);
  const ttk = timeToKill(player, monster, 'melee');
  const totalDmgTaken = dps * ttk;
  // Ratio: se jogador toma mais dano que HP, chance cai
  const ratio = maxHp / Math.max(1, totalDmgTaken);
  // ratio > 1 = sobrevive fácil; < 1 = morre
  return Math.max(0, Math.min(1, ratio));
}

// ============================================================
// BESTIÁRIO / MONSTROS DO TIBIA
// Dados aproximados baseados no Tibia clássico/OT (HP, dano,
// armadura, XP, magias lançadas, dano mágico, e TODAS as
// resistências elementais e físicas).
// Lista completa de criaturas de todas as hunting zones.
// ============================================================

// Resistências padrão (todas em 0-100%)
function zeroRes() {
  return {
    physical: 0, fire: 0, ice: 0, energy: 0, earth: 0,
    holy: 0, death: 0, drown: 0, lifedrain: 0, manadrain: 0,
  };
}

// Catálogo base de monstros do Tibia
// Campos: name, icon, family, hp, mp, damage, armor, xp, magicDamage, abilities[], res{}
const TIBIA_BESTIARY = [
  // --- Continent of Edron / Rookgaard (1-30) ---
  { name: 'Rat',          icon: '🐀', family: 'beast',     hp: 20,    damage: 5,   armor: 1,  xp: 5,    res: { physical: 0 } },
  { name: 'Cave Rat',     icon: '🐀', family: 'beast',     hp: 30,    damage: 6,   armor: 1,  xp: 10,   res: { physical: 0 } },
  { name: 'Spider',       icon: '🕷️', family: 'venom',     hp: 35,    damage: 8,   armor: 2,  xp: 12,   res: { earth: 10 } },
  { name: 'Poison Spider',icon: '🕷️', family: 'venom',     hp: 50,    damage: 10,  armor: 3,  xp: 18,   abilities: ['poison'], res: { earth: 15, lifedrain: 25 } },
  { name: 'Crocodile',    icon: '🐊', family: 'beast',     hp: 60,    damage: 12,  armor: 3,  xp: 25 },
  { name: 'Wolf',         icon: '🐺', family: 'beast',     hp: 70,    damage: 14,  armor: 4,  xp: 30,   res: { holy: 10 } },
  { name: 'Snake',        icon: '🐍', family: 'venom',     hp: 35,    damage: 10,  armor: 2,  xp: 20,   abilities: ['poison'] },
  { name: 'Troll',        icon: '🧌', family: 'humanoid',  hp: 90,    damage: 18,  armor: 5,  xp: 35 },
  { name: 'Troll Champion',icon:'🧌',family: 'humanoid',   hp: 140,   damage: 24,  armor: 7,  xp: 70,   res: { physical: 5 } },
  { name: 'Goblin',       icon: '👺', family: 'humanoid',  hp: 50,    damage: 10,  armor: 3,  xp: 22 },
  { name: 'Goblin Assassin',icon:'👺',family:'humanoid',   hp: 75,    damage: 16,  armor: 4,  xp: 50,   abilities: ['invisible'] },
  { name: 'Skeleton',     icon: '💀', family: 'undead',    hp: 45,    damage: 9,   armor: 2,  xp: 18,   res: { holy: 30, death: -10 } },
  { name: 'Skeleton Knight',icon:'💀',family:'undead',     hp: 70,    damage: 14,  armor: 5,  xp: 40,   res: { holy: 30, death: -10, physical: 5 } },
  { name: 'Ghoul',        icon: '🧟', family: 'undead',    hp: 100,   damage: 20,  armor: 6,  xp: 55,   res: { holy: 20, death: -10 }, abilities: ['lifedrain'] },
  { name: 'Zombie',       icon: '🧟', family: 'undead',    hp: 130,   damage: 22,  armor: 7,  xp: 65,   res: { holy: 20, death: -10, physical: 10 } },
  { name: 'Mummy',        icon: '🧟', family: 'undead',    hp: 240,   damage: 35,  armor: 10, xp: 90,   res: { holy: 15, death: -5, physical: 15 } },
  { name: 'Rotworm',      icon: '🪱', family: 'vermin',    hp: 60,    damage: 12,  armor: 3,  xp: 28 },
  { name: 'Carrion Worm', icon: '🪱', family: 'vermin',    hp: 110,   damage: 22,  armor: 5,  xp: 60,   abilities: ['poison'] },
  { name: 'Minotaur',     icon: '🐂', family: 'humanoid',  hp: 150,   damage: 28,  armor: 9,  xp: 80,   res: { physical: 10 } },
  { name: 'Minotaur Guard',icon:'🐂',family: 'humanoid',   hp: 200,   damage: 36,  armor: 12, xp: 110,  res: { physical: 15 } },
  { name: 'Minotaur Mage',icon: '🐂', family: 'humanoid',  hp: 155,   mp: 90,    damage: 22, armor: 8, xp: 130,  magicDamage: 45, abilities: ['fire wave'], res: { fire: 30, energy: -10 } },
  { name: 'Orc',          icon: '👹', family: 'humanoid',  hp: 110,   damage: 18,  armor: 6,  xp: 45 },
  { name: 'Orc Warrior',  icon: '👹', family: 'humanoid',  hp: 160,   damage: 26,  armor: 9,  xp: 75 },
  { name: 'Orc Spearman', icon: '👹', family: 'humanoid',  hp: 175,   damage: 30,  armor: 9,  xp: 85,   res: { physical: 5 } },
  { name: 'Orc Berserker',icon: '👹', family: 'humanoid',  hp: 210,   damage: 38,  armor: 11, xp: 110,  res: { physical: 10 } },
  { name: 'Orc Leader',   icon: '👹', family: 'humanoid',  hp: 270,   damage: 42,  armor: 13, xp: 140,  res: { physical: 15 } },
  { name: 'Cyclops',      icon: '👁️', family: 'humanoid',  hp: 320,   damage: 45,  armor: 14, xp: 145,  res: { physical: 10 } },
  { name: 'Cyclops Drone',icon: '👁️', family: 'humanoid',  hp: 290,   damage: 40,  armor: 12, xp: 130 },
  { name: 'Cyclops Smith',icon: '👁️', family: 'humanoid',  hp: 380,   damage: 52,  armor: 16, xp: 175,  res: { physical: 12 } },
  { name: 'Cyclops Thief',icon: '👁️', family: 'humanoid',  hp: 250,   damage: 36,  armor: 11, xp: 120,  res: { physical: 8 } },
  { name: 'Dwarf',        icon: '🧔', family: 'humanoid',  hp: 130,   damage: 22,  armor: 8,  xp: 65,   res: { physical: 5 } },
  { name: 'Dwarf Soldier',icon: '🧔', family: 'humanoid',  hp: 180,   damage: 32,  armor: 11, xp: 95,   res: { physical: 10 } },
  { name: 'Dwarf Guard',  icon: '🧔', family: 'humanoid',  hp: 230,   damage: 40,  armor: 14, xp: 130,  res: { physical: 15 } },
  { name: 'Dwarf Geomancer',icon:'🧔',family:'humanoid',    hp: 220,   mp: 120,   damage: 28, armor: 11, xp: 160,  magicDamage: 60, abilities: ['fireball', 'energy strike'], res: { physical: 10, fire: 20, energy: 20 } },
  { name: 'Amazon',       icon: '🧝‍♀️', family: 'humanoid', hp: 110,   damage: 26,  armor: 6,  xp: 60 },
  { name: 'Valkyrie',     icon: '🧝‍♀️', family: 'humanoid', hp: 195,   damage: 38,  armor: 11, xp: 115,  res: { physical: 8 } },
  { name: 'Hunter',       icon: '🏹', family: 'humanoid',  hp: 150,   damage: 30,  armor: 9,  xp: 80 },
  { name: 'Wild Hunter',  icon: '🏹', family: 'humanoid',  hp: 190,   damage: 36,  armor: 10, xp: 110,  res: { physical: 5 } },
  { name: 'Elf',          icon: '🧝', family: 'humanoid',  hp: 100,   damage: 22,  armor: 7,  xp: 55,   abilities: ['arrow'] },
  { name: 'Elf Scout',    icon: '🧝', family: 'humanoid',  hp: 140,   damage: 28,  armor: 8,  xp: 75,   abilities: ['arrow'] },
  { name: 'Elf Arcanist', icon: '🧝', family: 'humanoid',  hp: 170,   mp: 150,   damage: 24, armor: 8,  xp: 130,  magicDamage: 65, abilities: ['ice strike', 'energy beam'], res: { ice: 20, energy: 20 } },
  { name: 'Druid',        icon: '🧙', family: 'humanoid',  hp: 180,   mp: 180,   damage: 26, armor: 9,  xp: 145,  magicDamage: 70, abilities: ['ice wave', 'heal friend'] },
  { name: 'Warlock',      icon: '🧙', family: 'humanoid',  hp: 220,   mp: 220,   damage: 30, armor: 10, xp: 175,  magicDamage: 85, abilities: ['fireball', 'energy wave', 'heal friend'] },
  { name: 'Sorcerer',     icon: '🧙', family: 'humanoid',  hp: 200,   mp: 240,   damage: 28, armor: 9,  xp: 165,  magicDamage: 90, abilities: ['fire wave', 'energy beam'] },

  // --- Edron / Asura / DLs ---
  { name: 'Wyvern',       icon: '🐉', family: 'dragon',    hp: 540,   damage: 62,  armor: 18, xp: 220,  res: { earth: 50, physical: 10 }, abilities: ['poison', 'lifedrain'] },
  { name: 'Dragon',       icon: '🐲', family: 'dragon',    hp: 900,   damage: 85,  armor: 24, xp: 340,  res: { fire: 30, physical: 15 }, abilities: ['fire wave'] },
  { name: 'Dragon Lord',  icon: '🐲', family: 'dragon',    hp: 1900,  damage: 110, armor: 32, xp: 500,  res: { fire: 40, physical: 20 }, abilities: ['fireball', 'fire wave'] },
  { name: 'Dragon Lord Hatchling', icon:'🐲', family:'dragon', hp: 750, damage: 50, armor: 18, xp: 220, res: { fire: 30 } },
  { name: 'Frost Dragon', icon: '🐲', family: 'dragon',    hp: 1800,  damage: 95,  armor: 28, xp: 420,  res: { ice: 50, physical: 15 }, abilities: ['ice wave'] },
  { name: 'Ice Dragon',   icon: '🐲', family: 'dragon',    hp: 2200,  damage: 100, armor: 30, xp: 460,  res: { ice: 60, physical: 20 }, abilities: ['ice wave', 'ice strike'] },
  { name: 'Frost Dragon Hatchling', icon:'🐲', family:'dragon', hp: 800, damage: 55, armor: 18, xp: 240, res: { ice: 40 } },
  { name: 'Emerald Dragon', icon:'🐲', family: 'dragon',    hp: 1700,  damage: 90,  armor: 26, xp: 380,  res: { earth: 40, physical: 15 } },
  { name: 'Emerald Dragon Hatchling', icon:'🐲', family:'dragon', hp: 700, damage: 48, armor: 17, xp: 210, res: { earth: 30 } },
  { name: 'Bone Dragon',  icon: '💀', family: 'undead',    hp: 2100,  damage: 105, armor: 30, xp: 480,  res: { holy: 30, death: -5, physical: 20 }, abilities: ['lifedrain', 'paralyze'] },
  { name: 'Ghost Dragon', icon: '👻', family: 'undead',    hp: 2300,  damage: 115, armor: 28, xp: 520,  res: { holy: 40, death: -10, physical: 30, lifedrain: 100 }, abilities: ['lifedrain', 'mana drain'] },
  { name: 'Undead Dragon',icon: '💀', family: 'undead',    hp: 2700,  damage: 130, armor: 32, xp: 600,  res: { holy: 35, death: -5, physical: 25, lifedrain: 50 } },
  { name: 'Hydra',        icon: '🐍', family: 'dragon',    hp: 2400,  damage: 140, armor: 42, xp: 720,  res: { fire: 30, ice: -20, physical: 20 }, abilities: ['multi-shot'] },

  // --- Demons ---
  { name: 'Demon',        icon: '👿', family: 'demon',     hp: 1450,  damage: 110, armor: 32, xp: 500,  res: { fire: 50, holy: -20, death: 50, physical: 20 }, abilities: ['fireball', 'lifedrain'] },
  { name: 'Demon Skeleton', icon:'💀', family:'demon',     hp: 950,   damage: 85,  armor: 28, xp: 320,  res: { holy: 30, death: 30, physical: 15, fire: 30 } },
  { name: 'Fire Devil',   icon: '👹', family: 'demon',     hp: 1100,  damage: 90,  armor: 26, xp: 360,  res: { fire: 100, physical: 15 } },
  { name: 'Fire Elemental',icon:'🔥', family: 'elemental', hp: 850,   damage: 78,  armor: 22, xp: 280,  res: { fire: 100, ice: -25, physical: 10 }, abilities: ['fire wave'] },
  { name: 'Energy Elemental', icon:'⚡', family:'elemental', hp: 900,  damage: 80,  armor: 24, xp: 300,  res: { energy: 100, physical: 15, ice: -20 }, abilities: ['energy beam'] },
  { name: 'Ice Elemental',icon: '❄️', family: 'elemental', hp: 880,   damage: 76,  armor: 24, xp: 290,  res: { ice: 100, fire: -25, physical: 15 }, abilities: ['ice wave'] },
  { name: 'Earth Elemental', icon:'🌍', family:'elemental', hp: 920,  damage: 82,  armor: 28, xp: 310,  res: { earth: 100, energy: -20, physical: 20 }, abilities: ['physical strike'] },
  { name: 'Dark Monk',    icon: '🧘', family: 'humanoid',  hp: 1700,  damage: 90,  armor: 26, xp: 420,  res: { physical: 25, holy: 20 }, abilities: ['heal friend', 'strong strike'] },
  { name: 'Demon Lord',   icon: '😈', family: 'demon',     hp: 2900,  damage: 150, armor: 38, xp: 800,  res: { fire: 60, holy: -25, death: 60, physical: 25, lifedrain: 50 }, abilities: ['fireball', 'fire wave', 'lifedrain'] },

  // --- Beasts / Venom ---
  { name: 'Snake God',    icon: '🐍', family: 'venom',     hp: 4500,  damage: 200, armor: 50, xp: 1100, res: { earth: 75, fire: 25, physical: 20 }, abilities: ['poison', 'paralyze', 'lifedrain'] },
  { name: 'Cobra',        icon: '🐍', family: 'venom',     hp: 130,   damage: 24,  armor: 6,  xp: 65,   abilities: ['poison'] },
  { name: 'Sand Cobra',   icon: '🐍', family: 'venom',     hp: 180,   damage: 30,  armor: 7,  xp: 95,   abilities: ['poison'], res: { earth: 10 } },
  { name: 'Black Cobra',  icon: '🐍', family: 'venom',     hp: 220,   damage: 38,  armor: 9,  xp: 130,  abilities: ['poison', 'paralyze'], res: { earth: 15 } },
  { name: 'Spider Queen', icon: '🕷️', family: 'venom',     hp: 1100,  damage: 90,  armor: 22, xp: 320,  res: { earth: 25, physical: 15 }, abilities: ['poison', 'paralyze', 'lifedrain'] },
  { name: 'Tarantula',    icon: '🕷️', family: 'venom',     hp: 320,   damage: 48,  armor: 12, xp: 160,  abilities: ['poison'], res: { earth: 20 } },
  { name: 'Crystal Spider',icon:'🕷️', family: 'venom',     hp: 950,   damage: 85,  armor: 22, xp: 320,  res: { ice: 30, physical: 15, fire: -10 }, abilities: ['ice strike', 'paralyze'] },
  { name: 'Wailing Widow',icon: '🕷️', family: 'venom',     hp: 850,   damage: 78,  armor: 20, xp: 290,  res: { earth: 30, physical: 10 }, abilities: ['poison', 'lifedrain'] },
  { name: 'Sandstone Scorpion', icon:'🦂', family:'venom', hp: 700,  damage: 70,  armor: 18, xp: 250,  res: { earth: 30 }, abilities: ['poison'] },
  { name: 'Bonebeast',    icon: '💀', family: 'undead',    hp: 1300,  damage: 95,  armor: 26, xp: 380,  res: { holy: 20, death: -5, physical: 15 }, abilities: ['lifedrain', 'paralyze'] },
  { name: 'Bonelord',     icon: '💀', family: 'undead',    hp: 1200,  damage: 100, armor: 26, xp: 360,  res: { holy: 25, death: -5, physical: 20 }, abilities: ['lifedrain', 'paralyze', 'mana drain'] },
  { name: 'Bonelord Spectre',icon:'💀',family:'undead',     hp: 1500,  damage: 115, armor: 30, xp: 460,  res: { holy: 30, death: -10, physical: 25 }, abilities: ['lifedrain', 'paralyze'] },
  { name: 'Braindeath',   icon: '🧠', family: 'undead',    hp: 1800,  damage: 125, armor: 32, xp: 540,  res: { holy: 25, death: -5, physical: 25 }, abilities: ['lifedrain', 'mana drain', 'paralyze'] },
  { name: 'Beholder',     icon: '👁️', family: 'magical',   hp: 1600,  damage: 110, armor: 28, xp: 480,  res: { physical: 30, holy: 25 }, abilities: ['energy beam', 'paralyze'] },
  { name: 'Elder Beholder',icon:'👁️', family: 'magical',   hp: 2200,  damage: 135, armor: 34, xp: 620,  res: { physical: 35, holy: 30 }, abilities: ['energy beam', 'lifedrain', 'paralyze'] },
  { name: 'Behemoth',     icon: '🦏', family: 'beast',     hp: 2500,  damage: 130, armor: 40, xp: 600,  res: { physical: 20, fire: 25, ice: -10 }, abilities: ['physical strike'] },
  { name: 'Ancient Behemoth', icon:'🦏', family:'beast',   hp: 3200,  damage: 160, armor: 45, xp: 800,  res: { physical: 25, fire: 30, ice: -10 } },
  { name: 'Giant Spider', icon: '🕷️', family: 'venom',     hp: 600,   damage: 65,  armor: 16, xp: 230,  res: { earth: 25 }, abilities: ['poison'] },
  { name: 'Demon Outcast',icon: '👿', family: 'demon',     hp: 1800,  damage: 120, armor: 32, xp: 560,  res: { fire: 50, holy: -20, death: 50, physical: 25 }, abilities: ['fireball'] },

  // --- Magicals ---
  { name: 'Witch',        icon: '🧙‍♀️', family: 'humanoid', hp: 300,   mp: 200,   damage: 30, armor: 10, xp: 200,  magicDamage: 70, abilities: ['fire wave', 'energy strike'] },
  { name: 'Dark Apprentice', icon:'🧙', family:'humanoid', hp: 250,   mp: 220,   damage: 26, armor: 9,  xp: 180,  magicDamage: 65, abilities: ['fireball'] },
  { name: 'Ice Witch',    icon: '🧙‍♀️', family: 'humanoid', hp: 320,   mp: 240,   damage: 32, armor: 10, xp: 230,  magicDamage: 80, abilities: ['ice wave', 'ice strike'], res: { ice: 30 } },
  { name: 'Mad Scientist',icon: '🧑‍🔬', family: 'humanoid', hp: 280,   mp: 180,  damage: 28, armor: 9,  xp: 210,  magicDamage: 75, abilities: ['energy beam', 'explosion'], res: { physical: 5 } },
  { name: 'Priestess',    icon: '👩‍🦰', family: 'humanoid',  hp: 390,   mp: 280,  damage: 24, armor: 11, xp: 270,  magicDamage: 90, abilities: ['heal friend', 'holy magic'], res: { holy: 50, death: -20 } },
  { name: 'Monk',         icon: '🧘', family: 'humanoid',  hp: 480,   damage: 65,  armor: 16, xp: 240,  res: { physical: 20, holy: 30 }, abilities: ['strong strike'] },
  { name: 'Dark Monk',    icon: '🧘', family: 'humanoid',  hp: 1700,  damage: 90,  armor: 26, xp: 420,  res: { physical: 25, holy: 20 }, abilities: ['heal friend', 'strong strike'] },
  { name: 'Necromancer',  icon: '🧙', family: 'magical',   hp: 1200,  mp: 700,   damage: 80, armor: 22, xp: 580,  magicDamage: 110, abilities: ['lifedrain', 'mana drain', 'death strike'], res: { holy: -30, death: 50, physical: 15 } },
  { name: 'Necromancer Servant', icon:'🧟', family:'undead', hp: 600, damage: 50, armor: 14, xp: 180, res: { holy: 10, death: 20 } },
  { name: 'Vampire',      icon: '🧛', family: 'undead',    hp: 1750,  damage: 110, armor: 28, xp: 500,  res: { holy: -30, death: 50, physical: 20, lifedrain: 100 }, abilities: ['lifedrain', 'invisible', 'paralyze'] },
  { name: 'Vampire Bride',icon: '🧛‍♀️', family: 'undead',  hp: 1500,  damage: 95,  armor: 26, xp: 440,  res: { holy: -30, death: 50, physical: 18, lifedrain: 100 }, abilities: ['lifedrain', 'invisible'] },
  { name: 'Vampire Viscount', icon:'🧛', family:'undead',  hp: 2000,  damage: 125, armor: 32, xp: 620,  res: { holy: -30, death: 60, physical: 25, lifedrain: 100 }, abilities: ['lifedrain', 'paralyze'] },
  { name: 'Banshee',      icon: '👻', family: 'undead',    hp: 850,   damage: 75,  armor: 16, xp: 320,  res: { holy: -30, death: 50, physical: 30, lifedrain: 100 }, abilities: ['silence', 'lifedrain'] },
  { name: 'Ghost',        icon: '👻', family: 'undead',    hp: 700,   damage: 65,  armor: 12, xp: 280,  res: { holy: -30, death: 50, physical: 30, lifedrain: 100 }, abilities: ['lifedrain', 'mana drain'] },
  { name: 'Wraith',       icon: '👻', family: 'undead',    hp: 1100,  damage: 90,  armor: 22, xp: 400,  res: { holy: -30, death: 60, physical: 35, lifedrain: 100 }, abilities: ['lifedrain', 'mana drain'] },
  { name: 'Phantasm',     icon: '👻', family: 'undead',    hp: 1300,  damage: 100, armor: 24, xp: 460,  res: { holy: -40, death: 60, physical: 40, lifedrain: 100 }, abilities: ['lifedrain'] },
  { name: 'Spectre',      icon: '👻', family: 'undead',    hp: 1500,  damage: 110, armor: 26, xp: 520,  res: { holy: -30, death: 60, physical: 35, lifedrain: 100 }, abilities: ['lifedrain', 'mana drain'] },
  { name: 'Lost Soul',    icon: '👻', family: 'undead',    hp: 1900,  damage: 120, armor: 28, xp: 600,  res: { holy: -40, death: 70, physical: 40, lifedrain: 100, manadrain: 100 }, abilities: ['lifedrain', 'mana drain', 'paralyze'] },
  { name: 'Lich',         icon: '💀', family: 'undead',    hp: 2400,  damage: 140, armor: 32, xp: 750,  res: { holy: -30, death: 70, physical: 30, lifedrain: 100, manadrain: 100 }, magicDamage: 90, abilities: ['mana drain', 'death strike', 'lifedrain'] },

  // --- Goblins / Lizards / Barbarians ---
  { name: 'Goblin Leader',icon: '👺', family: 'humanoid',  hp: 200,   damage: 32,  armor: 9,  xp: 100 },
  { name: 'Goblin Scavenger', icon:'👺', family:'humanoid', hp: 130, damage: 22, armor: 6,  xp: 55,  res: { physical: 5 } },
  { name: 'Lizard',       icon: '🦎', family: 'humanoid',  hp: 130,   damage: 26,  armor: 7,  xp: 60 },
  { name: 'Lizard Sentinel', icon:'🦎', family:'humanoid', hp: 175,  damage: 34,  armor: 9,  xp: 85,   res: { physical: 5 } },
  { name: 'Lizard Templar', icon:'🦎', family:'humanoid',  hp: 230,   mp: 200,   damage: 30, armor: 11, xp: 180,  magicDamage: 65, abilities: ['fire wave'], res: { fire: 30 } },
  { name: 'Lizard Snakecharmer', icon:'🦎', family:'humanoid', hp: 200, mp:180, damage: 26, armor: 10, xp: 160, magicDamage: 60, abilities: ['poison', 'mana drain'] },
  { name: 'Lizard Dragonwarden', icon:'🦎', family:'humanoid', hp: 2200, mp:600, damage: 110, armor: 26, xp: 700, magicDamage: 110, abilities: ['fire wave', 'lifedrain'] },
  { name: 'Barbarian',    icon: '⚔️', family: 'humanoid',  hp: 220,   damage: 40,  armor: 12, xp: 110,  res: { physical: 10 } },
  { name: 'Barbarian Bloodwalker', icon:'⚔️', family:'humanoid', hp: 290, damage: 50, armor: 14, xp: 150, res: { physical: 15 } },
  { name: 'Barbarian Brutetamer', icon:'⚔️', family:'humanoid', hp: 260, damage: 45, armor: 13, xp: 140, res: { physical: 12 } },
  { name: 'Barbarian Headsplitter', icon:'⚔️', family:'humanoid', hp: 320, damage: 55, armor: 15, xp: 180, res: { physical: 15 } },
  { name: 'Barbarian Skullhunter', icon:'⚔️', family:'humanoid', hp: 350, damage: 60, armor: 16, xp: 200, res: { physical: 15 } },
  { name: 'Barbarian Axethrower', icon:'⚔️', family:'humanoid', hp: 360, damage: 65, armor: 15, xp: 210, res: { physical: 18 } },
  { name: 'Bearing',      icon: '🐻', family: 'beast',     hp: 130,   damage: 26,  armor: 6,  xp: 55 },
  { name: 'Polar Bear',   icon: '🐻‍❄️', family: 'beast',   hp: 200,   damage: 38,  armor: 9,  xp: 90,   res: { ice: 20 } },
  { name: 'Undead Gladiator', icon:'💀', family:'undead',  hp: 950,   damage: 80,  armor: 24, xp: 320,  res: { holy: 25, death: 30, physical: 18 } },
  { name: 'Demon Goblin', icon: '👹', family: 'demon',     hp: 320,   damage: 45,  armor: 12, xp: 160,  res: { fire: 30, holy: -10 } },
  { name: 'Crypt Demon',  icon: '👹', family: 'demon',     hp: 1500,  damage: 110, armor: 28, xp: 480,  res: { fire: 30, holy: -15, death: 30, physical: 20 } },
  { name: 'Plaguesmith',  icon: '🧪', family: 'magical',   hp: 1600,  mp: 800,   damage: 95, armor: 24, xp: 600,  magicDamage: 120, abilities: ['poison', 'lifedrain', 'paralyze'], res: { earth: 30, physical: 15, fire: 20 } },
  { name: 'Defiler',      icon: '🧪', family: 'magical',   hp: 1700,  mp: 900,   damage: 100, armor: 26, xp: 650, magicDamage: 130, abilities: ['lifedrain', 'mana drain', 'poison'], res: { earth: 40, physical: 15, fire: 25 } },
  { name: 'Undead Cavebear', icon:'🐻', family:'undead',   hp: 600,   damage: 60,  armor: 18, xp: 220,  res: { holy: 30, death: 50, physical: 15 } },
  { name: 'Glooth Bandit',icon: '🥷', family: 'humanoid',  hp: 240,   damage: 42,  armor: 11, xp: 130 },
  { name: 'Glooth Brute', icon: '🥷', family: 'humanoid',  hp: 280,   damage: 50,  armor: 12, xp: 150,  res: { physical: 5 } },
  { name: 'Glooth Golem', icon: '🗿', family: 'construct', hp: 700,   damage: 70,  armor: 24, xp: 260,  res: { physical: 30, fire: 30, ice: 30, energy: 30, earth: 30 } },
  { name: 'Glooth Trasher',icon:'🥷', family: 'humanoid',  hp: 320,   damage: 55,  armor: 14, xp: 180,  res: { physical: 10 } },
  { name: 'Maw',          icon: '👹', family: 'demon',     hp: 1300,  damage: 100, armor: 26, xp: 420,  res: { fire: 30, death: 30, physical: 20, lifedrain: 50 } },
  { name: 'Choking Fear', icon: '👻', family: 'undead',    hp: 1700,  damage: 105, armor: 22, xp: 540,  res: { holy: -30, death: 60, physical: 40, lifedrain: 100 } },
  { name: 'Frazzlemaw',   icon: '👹', family: 'demon',     hp: 1900,  damage: 120, armor: 30, xp: 620,  res: { fire: 40, death: 40, physical: 25 }, abilities: ['fire wave'] },
  { name: 'Silencer',     icon: '🧝', family: 'humanoid',  hp: 360,   mp: 350,   damage: 36, armor: 12, xp: 220,  magicDamage: 85, abilities: ['silence', 'energy wave'], res: { physical: 10 } },
  { name: 'Tunnel Tyrant',icon: '🪱', family: 'vermin',    hp: 1500,  damage: 100, armor: 26, xp: 480,  res: { earth: 30, physical: 15 }, abilities: ['poison', 'paralyze'] },
  { name: 'Rot elemental',icon: '🟢', family: 'elemental', hp: 750,   damage: 70,  armor: 20, xp: 280,  res: { earth: 100, fire: -20, physical: 15 }, abilities: ['poison'] },

  // --- Asura Palace / Roshamuul / Hero Fortress ---
  { name: 'Asura',        icon: '🧘‍♂️', family: 'divine',   hp: 2400,  mp: 1200,  damage: 130, armor: 32, xp: 700,  magicDamage: 140, abilities: ['fire wave', 'energy wave', 'heal friend', 'paralyze'], res: { physical: 25, holy: 50, fire: 50, energy: 50 } },
  { name: 'Asura Priest', icon: '🧘‍♂️', family: 'divine',   hp: 2100,  mp: 1500,  damage: 115, armor: 30, xp: 620,  magicDamage: 150, abilities: ['holy magic', 'heal friend'], res: { physical: 25, holy: 70 } },
  { name: 'Asura Mother', icon: '🧘‍♀️', family: 'divine',   hp: 2700,  mp: 2000,  damage: 140, armor: 34, xp: 850,  magicDamage: 160, abilities: ['holy magic', 'fire wave', 'heal friend'], res: { physical: 30, holy: 70, fire: 50 } },
  { name: 'Roshamuul Pyromancer', icon:'🔥', family:'divine', hp: 1600, mp: 900, damage: 90, armor: 24, xp: 520, magicDamage: 130, abilities: ['fireball', 'fire wave', 'lifedrain'], res: { fire: 70, holy: 30 } },
  { name: 'Roshamuul Blood Mage', icon:'🩸', family:'divine', hp: 1500, mp: 1100, damage: 80, armor: 24, xp: 500, magicDamage: 130, abilities: ['lifedrain', 'mana drain', 'death strike'], res: { death: 60, holy: -20 } },
  { name: 'Roshamuul Warlock', icon:'🩸', family:'divine',   hp: 1400, mp: 1300, damage: 80, armor: 24, xp: 500, magicDamage: 130, abilities: ['fire wave', 'energy wave'], res: { fire: 60, energy: 60 } },
  { name: 'Roshamuul Cultist', icon:'🩸', family:'divine',   hp: 1200, mp: 700,  damage: 70, armor: 22, xp: 420, magicDamage: 110, abilities: ['fireball'], res: { fire: 50 } },
  { name: 'Burning Book', icon: '📕', family: 'magical',   hp: 600,   damage: 50,  armor: 14, xp: 240,  res: { fire: 80, physical: 20 } },
  { name: 'Hellfire Fighter', icon:'👹', family:'demon',   hp: 1700,  damage: 105, armor: 28, xp: 540,  res: { fire: 60, holy: -20, death: 60, physical: 20 } },
  { name: 'Hellfire Mystic', icon:'🧙', family:'demon',     hp: 1500,  mp: 1200,  damage: 90, armor: 26, xp: 520, magicDamage: 130, abilities: ['fireball', 'fire wave'], res: { fire: 80, holy: -20, death: 60 } },
  { name: 'Hero Fortress Hero', icon:'🛡️', family:'humanoid', hp: 1900, damage: 130, armor: 36, xp: 650, res: { physical: 25, holy: 30 } },

  // --- Krailos / Misc ---
  { name: 'Crazed Winter Vanguard', icon:'❄️', family:'humanoid', hp: 1800, damage: 120, armor: 32, xp: 600, res: { ice: 50, physical: 20 } },
  { name: 'Crazed Summer Vanguard', icon:'☀️', family:'humanoid', hp: 1800, damage: 120, armor: 32, xp: 600, res: { fire: 50, physical: 20 } },
  { name: 'Crazed Spring Vanguard', icon:'🌸', family:'humanoid', hp: 1800, damage: 120, armor: 32, xp: 600, res: { earth: 50, physical: 20 } },
  { name: 'Crazed Autumn Vanguard', icon:'🍂', family:'humanoid', hp: 1800, damage: 120, armor: 32, xp: 600, res: { physical: 25, holy: 20 } },
  { name: 'Soul Catcher', icon: '👻', family: 'undead',    hp: 1500,  damage: 100, armor: 26, xp: 500,  res: { holy: -30, death: 70, physical: 30, lifedrain: 100 } },
  { name: 'Enfeebled Silencer', icon:'🧝', family:'magical', hp: 800, mp: 500, damage: 55, armor: 18, xp: 320, magicDamage: 90, abilities: ['silence', 'energy wave'] },
  { name: 'Weakened Frazzlemaw', icon:'👹', family:'demon', hp: 1300, damage: 90, armor: 26, xp: 420, res: { fire: 30, death: 30, physical: 20 } },
  { name: 'Lizard Chosen', icon: '🦎', family: 'humanoid', hp: 3200, mp: 1200, damage: 150, armor: 36, xp: 950, magicDamage: 140, abilities: ['fire wave', 'lifedrain'], res: { fire: 50 } },
  { name: 'Lizard High Guard', icon:'🦎', family:'humanoid', hp: 2500, damage: 140, armor: 34, xp: 750, res: { physical: 25 } },
  { name: 'Lizard Zaogun', icon: '🦎', family: 'humanoid',  hp: 4000, damage: 170, armor: 40, xp: 1100, res: { fire: 50, physical: 25 } },
  { name: 'Draken Spellweaver', icon:'🐲', family:'dragon', hp: 3500, mp: 1500, damage: 150, armor: 36, xp: 950, magicDamage: 160, abilities: ['fire wave', 'energy wave'], res: { fire: 60, energy: 50, physical: 25 } },
  { name: 'Draken Warmaster', icon:'🐲', family:'dragon',  hp: 4000, damage: 175, armor: 42, xp: 1100, res: { fire: 60, physical: 30 } },
  { name: 'Draken Elite', icon: '🐲', family: 'dragon',    hp: 4500, damage: 190, armor: 44, xp: 1300, res: { fire: 60, physical: 35 } },
  { name: 'Draken Abomination', icon:'🐲', family:'dragon', hp: 5500, damage: 220, armor: 48, xp: 1700, res: { fire: 70, physical: 40, lifedrain: 50 }, abilities: ['lifedrain', 'paralyze'] },
  { name: 'Medusa',        icon: '🐍', family: 'magical',   hp: 2200,  damage: 130, armor: 32, xp: 700,  res: { physical: 20, earth: 30 }, abilities: ['paralyze', 'lifedrain'] },
  { name: 'Behemoth Bull', icon: '🦏', family: 'beast',     hp: 4500,  damage: 200, armor: 50, xp: 1300, res: { physical: 30, fire: 30, ice: -10 } },
  { name: 'Grand Mother Foulscale', icon:'🐍', family:'dragon', hp: 8000, damage: 250, armor: 60, xp: 2200, res: { fire: 70, physical: 40, lifedrain: 50 }, abilities: ['lifedrain', 'paralyze', 'poison', 'fire wave'] },
  { name: 'Feral Sphinx',  icon: '🦁', family: 'magical',   hp: 2400,  damage: 140, armor: 36, xp: 800,  res: { physical: 25, holy: 30 } },
  { name: 'Sphinx',        icon: '🦁', family: 'magical',   hp: 1900,  damage: 120, armor: 32, xp: 600,  res: { physical: 20, holy: 30 } },
  { name: 'Demon in Armor', icon:'🛡️', family:'demon',     hp: 2800,  damage: 150, armor: 50, xp: 900,  res: { fire: 50, holy: -20, death: 50, physical: 40 } },

  // --- Hellgore / Lower Roshamuul ---
  { name: 'Hellflayer',    icon: '👹', family: 'demon',     hp: 3200,  damage: 160, armor: 38, xp: 950,  res: { fire: 50, holy: -20, death: 50, physical: 30 }, abilities: ['fire wave', 'lifedrain'] },
  { name: 'Hellhound',     icon: '🐕‍🦺', family: 'demon',  hp: 1900,  damage: 130, armor: 32, xp: 650,  res: { fire: 50, holy: -20, death: 50, physical: 20 }, abilities: ['fireball', 'lifedrain'] },
  { name: 'Plague Hellhound', icon:'🐕‍🦺', family:'demon', hp: 1700, damage: 120, armor: 30, xp: 580, res: { fire: 50, holy: -20, death: 50, physical: 20, earth: 30 }, abilities: ['poison', 'lifedrain'] },
  { name: 'Pig Worker',    icon: '🐖', family: 'humanoid',  hp: 200,   damage: 30,  armor: 8,  xp: 90 },
  { name: 'Minotaur Amazon', icon:'🐂', family:'humanoid',  hp: 230,   damage: 38,  armor: 12, xp: 130,  res: { physical: 12 } },
  { name: 'Minotaur Hunter', icon:'🐂', family:'humanoid',  hp: 270,   damage: 42,  armor: 13, xp: 150,  res: { physical: 15 } },
  { name: 'Breach Brood',  icon: '🕷️', family: 'venom',     hp: 1500,  damage: 105, armor: 26, xp: 500,  res: { earth: 40, physical: 20 }, abilities: ['poison', 'lifedrain'] },
  { name: 'Gazer Spectre', icon: '👁️', family: 'magical',   hp: 1200,  damage: 95,  armor: 24, xp: 420,  res: { physical: 30, holy: 25 }, abilities: ['energy beam'] },
  { name: 'Carrion Worm Horror', icon:'🪱', family:'vermin', hp: 1500, damage: 110, armor: 28, xp: 520, res: { earth: 30, physical: 20 }, abilities: ['poison', 'paralyze'] },
  { name: 'Bony Sea Devil', icon:'🐟', family: 'aquatic',   hp: 1700,  damage: 115, armor: 28, xp: 540,  res: { ice: 30, drown: 100, physical: 25 } },
  { name: 'Shark',         icon: '🦈', family: 'aquatic',   hp: 250,   damage: 40,  armor: 10, xp: 110,  res: { ice: 20, drown: 100 } },
  { name: 'Quara Predator',icon: '🐟', family: 'aquatic',   hp: 700,   damage: 60,  armor: 18, xp: 240,  res: { ice: 30, drown: 100 } },
  { name: 'Quara Mantassin',icon:'🐟', family: 'aquatic',   hp: 800,   damage: 65,  armor: 20, xp: 280,  res: { ice: 30, drown: 100, physical: 10 } },
  { name: 'Quara Hydromancer',icon:'🐟',family:'aquatic',   hp: 1100,  mp: 700,   damage: 60, armor: 20, xp: 420,  magicDamage: 110, abilities: ['ice wave', 'ice strike'], res: { ice: 50, drown: 100 } },
  { name: 'Quara Constrictor',icon:'🐟', family:'aquatic',  hp: 1200,  damage: 85,  armor: 22, xp: 460,  res: { ice: 40, drown: 100, physical: 15 } },
  { name: 'Quara Pincher', icon: '🦀', family: 'aquatic',   hp: 1500,  damage: 100, armor: 26, xp: 540,  res: { ice: 40, drown: 100, physical: 20 } },
  { name: 'Deepsea Blood Crab', icon:'🦀', family:'aquatic', hp: 1900, damage: 120, armor: 30, xp: 620, res: { ice: 50, drown: 100, physical: 25 } },
  { name: 'Tentugly',      icon: '🦑', family: 'aquatic',   hp: 800,   damage: 65,  armor: 18, xp: 280,  res: { ice: 30, drown: 100, physical: 10 } },
  { name: 'Thornback Tortoise', icon:'🐢', family:'beast',  hp: 1500,  damage: 60,  armor: 50, xp: 480,  res: { physical: 40, earth: 30 } },
  { name: 'Mollusk',       icon: '🐌', family: 'aquatic',   hp: 200,   damage: 30,  armor: 22, xp: 95,   res: { physical: 30, ice: 20 } },
  { name: 'Slug',          icon: '🐌', family: 'vermin',    hp: 130,   damage: 22,  armor: 12, xp: 60,   res: { physical: 20, earth: 20 } },
  { name: 'Coral Snake',   icon: '🐍', family: 'venom',     hp: 220,   damage: 30,  armor: 8,  xp: 90,   abilities: ['poison'] },
  { name: 'Coral Frog',    icon: '🐸', family: 'venom',     hp: 130,   damage: 22,  armor: 6,  xp: 50,   abilities: ['poison'] },
  { name: 'Marsh Stalker', icon: '🦅', family: 'beast',     hp: 350,   damage: 50,  armor: 12, xp: 160,  res: { earth: 20 } },
  { name: 'Water Buffalo', icon: '🐃', family: 'beast',     hp: 350,   damage: 40,  armor: 14, xp: 150 },
  { name: 'Terror Bird',   icon: '🦤', family: 'beast',     hp: 360,   damage: 50,  armor: 12, xp: 160 },
  { name: 'Cockroach',     icon: '🪳', family: 'vermin',    hp: 20,    damage: 5,   armor: 2,  xp: 8 },
  { name: 'Lizard Gate Guardian', icon:'🦎', family:'humanoid', hp: 2200, damage: 130, armor: 32, xp: 700, res: { fire: 30, physical: 25 } },
  { name: 'Lizard Noble',  icon: '🦎', family: 'humanoid',  hp: 1700,  mp: 800,   damage: 110, armor: 30, xp: 580, magicDamage: 130, abilities: ['fire wave'], res: { fire: 50 } },
  { name: 'Draken Minor',  icon: '🐲', family: 'dragon',    hp: 2000,  damage: 120, armor: 30, xp: 620,  res: { fire: 50, physical: 20 } },
  { name: 'Grim Reaper',   icon: '☠️', family: 'undead',    hp: 7500,  damage: 230, armor: 50, xp: 2200, res: { holy: -50, death: 100, physical: 40, lifedrain: 100, manadrain: 100 }, abilities: ['lifedrain', 'mana drain', 'paralyze', 'death strike'] },

  // --- Misc clássicos ---
  { name: 'Sheep',         icon: '🐑', family: 'beast',     hp: 25,    damage: 5,   armor: 1,  xp: 8 },
  { name: 'Deer',          icon: '🦌', family: 'beast',     hp: 35,    damage: 6,   armor: 2,  xp: 12 },
  { name: 'Dog',           icon: '🐕', family: 'beast',     hp: 30,    damage: 6,   armor: 2,  xp: 10 },
  { name: 'Cat',           icon: '🐈', family: 'beast',     hp: 25,    damage: 5,   armor: 1,  xp: 8 },
  { name: 'Pig',           icon: '🐖', family: 'beast',     hp: 60,    damage: 10,  armor: 4,  xp: 25 },
  { name: 'Chicken',       icon: '🐔', family: 'beast',     hp: 15,    damage: 3,   armor: 1,  xp: 5 },
  { name: 'Rabbit',        icon: '🐇', family: 'beast',     hp: 20,    damage: 4,   armor: 1,  xp: 6 },
  { name: 'Silver Rabbit', icon: '🐇', family: 'beast',     hp: 40,    damage: 8,   armor: 2,  xp: 18 },
  { name: 'Brown Horse',   icon: '🐎', family: 'beast',     hp: 75,    damage: 14,  armor: 5,  xp: 30 },
  { name: 'White Horse',   icon: '🐎', family: 'beast',     hp: 80,    damage: 15,  armor: 5,  xp: 32 },
  { name: 'Black Sheep',   icon: '🐑', family: 'beast',     hp: 30,    damage: 6,   armor: 2,  xp: 12 },
];

// Resistências completas por level (escala)
function resistancesForLevel(level) {
  return {
    physical: Math.min(45, Math.floor(level / 80)),
    fire:     Math.min(45, Math.floor(level / 95)),
    ice:      Math.min(45, Math.floor(level / 95)),
    energy:   Math.min(45, Math.floor(level / 95)),
    earth:    Math.min(45, Math.floor(level / 100)),
    holy:     Math.min(45, Math.floor(level / 110)),
    death:    Math.min(45, Math.floor(level / 100)),
    drown:    0,
    lifedrain: Math.min(40, Math.floor(level / 120)),
    manadrain: 0,
  };
}

// Gera lista estática de monstros do level 1 ao 5000
function generateMonsters() {
  const monsters = [];
  // Catálogo Tibia = base, escalado por tier/level
  for (let level = 1; level <= 5000; level++) {
    const arch = TIBIA_BESTIARY[(level - 1) % TIBIA_BESTIARY.length];

    // Variações por level
    const tier = Math.floor((level - 1) / 40) % 10;
    const tierNames = ['', 'Elder ', 'Alpha ', 'Ancient ', 'Void ', 'Dread ', 'Infernal ', 'Celestial ', 'Abyssal ', 'Eternal '];

    // Escala stats por level
    const lvl = level;
    const scale = 1 + (lvl - 1) * 0.05;

    const res = { ...zeroRes(), ...(arch.res || {}) };
    // Soma com resistências escalonadas por level
    const lvlRes = resistancesForLevel(lvl);
    for (const k of Object.keys(res)) {
      res[k] = Math.max(-100, Math.min(100, (res[k] || 0) + (lvlRes[k] || 0)));
    }

    monsters.push({
      id: `mob_${level}`,
      name: `${tierNames[tier]}${arch.name}`,
      icon: arch.icon,
      level: lvl,
      family: arch.family,
      baseHealth: Math.floor((arch.hp || 50) * scale),
      baseDamage: Math.floor((arch.damage || 10) * scale),
      baseArmor: Math.floor((arch.armor || 1) * (1 + (lvl - 1) * 0.04)),
      baseXp: Math.floor((arch.xp || 20) * (1 + (lvl - 1) * 0.08)),
      // Campos estendidos Tibia
      hp: Math.floor((arch.hp || 50) * scale),
      mp: arch.mp ? Math.floor(arch.mp * scale) : 0,
      damage: Math.floor((arch.damage || 10) * scale),
      magicDamage: arch.magicDamage ? Math.floor(arch.magicDamage * scale) : 0,
      armor: Math.floor((arch.armor || 1) * (1 + (lvl - 1) * 0.04)),
      xp: Math.floor((arch.xp || 20) * (1 + (lvl - 1) * 0.08)),
      abilities: arch.abilities || [],
      resistances: res,
      xpNeeded: xpForLevel(lvl),
      isBoss: false,
    });
  }
  return monsters;
}

export const MONSTERS = generateMonsters();

// ============================================================
// BOSSES - significativamente mais difíceis que monstros
// Bosses aparecem a cada 25 levels e escalam até 5000
// Modelo Tibia: HP, MP, dano físico, dano mágico, magias,
// armadura, e TODAS as resistências elementais e físicas.
// ============================================================
const BOSS_BASE_STATS = [
  { name: 'Rotworm Queen', icon: '👑', healthMul: 8, damageMul: 3, armorMul: 2, xpMul: 25, family: 'beast',   abilities: [] },
  { name: 'Necromancer',   icon: '🧙', healthMul: 10, damageMul: 3.5, armorMul: 2.5, xpMul: 30, family: 'magical',  mp: 700, magicDamageMul: 4, abilities: ['lifedrain', 'mana drain', 'death strike'] },
  { name: 'Behemoth',      icon: '🦏', healthMul: 12, damageMul: 4, armorMul: 3, xpMul: 40, family: 'beast',   abilities: ['physical strike'] },
  { name: 'Dragon Lord',   icon: '🐲', healthMul: 15, damageMul: 5, armorMul: 4, xpMul: 55, family: 'dragon',  mp: 600, magicDamageMul: 3, abilities: ['fireball', 'fire wave'] },
  { name: 'Demon Overlord',icon: '😈', healthMul: 18, damageMul: 6, armorMul: 5, xpMul: 70, family: 'demon',   mp: 800, magicDamageMul: 3.5, abilities: ['fireball', 'fire wave', 'lifedrain'] },
  { name: 'Lich King',      icon: '💀', healthMul: 22, damageMul: 7, armorMul: 6, xpMul: 90, family: 'undead',  mp: 1200, magicDamageMul: 4, abilities: ['mana drain', 'death strike', 'lifedrain'] },
  { name: 'World Hydra',   icon: '🐍', healthMul: 28, damageMul: 9, armorMul: 8, xpMul: 120, family: 'dragon', abilities: ['multi-shot', 'fire wave'] },
  { name: 'Chaos God',     icon: '👁️‍🗨️', healthMul: 35, damageMul: 12, armorMul: 10, xpMul: 160, family: 'divine',  mp: 1500, magicDamageMul: 5, abilities: ['fire wave', 'energy wave', 'holy magic', 'paralyze', 'lifedrain'] },
];

function generateBosses() {
  const bosses = [];
  const bossEveryN = 25;
  for (let level = bossEveryN; level <= 5000; level += bossEveryN) {
    const archIndex = Math.min(
      BOSS_BASE_STATS.length - 1,
      Math.floor((level - 1) / 625)
    );
    const arch = BOSS_BASE_STATS[archIndex];

    // Boss ganha bônus adicional por level
    const levelBonus = level * 0.04;
    const hpVal     = Math.floor(arch.healthMul * (50 + level * 0.8) * (1 + levelBonus));
    const dmgVal    = Math.floor(arch.damageMul * (8 + level * 0.25) * (1 + levelBonus * 0.5));
    const armorVal  = Math.floor(arch.armorMul * (1 + level * 0.15));
    const xpVal     = Math.floor(arch.xpMul * (10 + level * 0.9) * (1 + levelBonus));
    const mpVal     = arch.mp ? Math.floor(arch.mp * (1 + (level - 1) * 0.05)) : 0;
    const magicDmg  = arch.magicDamageMul
      ? Math.floor(arch.magicDamageMul * (10 + level * 0.3) * (1 + levelBonus * 0.5))
      : 0;

    // Resistências escaladas (Tibia: bosses têm alto resist)
    const baseResPct = Math.min(60, 5 + Math.floor(level / 40));
    const baseResM   = Math.min(60, 5 + Math.floor(level / 60));
    const res = {
      physical: baseResPct,
      fire:     arch.family === 'dragon'  || arch.family === 'demon' || arch.family === 'divine' ? Math.min(70, baseResM + 10) : baseResM,
      ice:      arch.family === 'dragon'  && arch.name.includes('Frost') ? Math.min(70, baseResM + 10) : baseResM,
      energy:   arch.family === 'divine'  ? Math.min(70, baseResM + 10) : baseResM,
      earth:    arch.family === 'dragon'  ? Math.min(70, baseResM + 10) : baseResM,
      holy:     arch.family === 'divine'  ? Math.min(70, baseResM + 10) : 0,
      death:    arch.family === 'undead'  || arch.family === 'demon' ? Math.min(70, baseResM + 10) : 0,
      drown:    0,
      lifedrain: arch.family === 'undead' || arch.family === 'demon' || arch.family === 'divine' ? Math.min(50, 10 + Math.floor(level / 80)) : 0,
      manadrain: 0,
    };

    bosses.push({
      id: `boss_${level}`,
      name: `${arch.name} (Lv.${level})`,
      icon: arch.icon,
      level,
      isBoss: true,
      family: arch.family,
      baseHealth: hpVal,
      baseDamage: dmgVal,
      baseArmor: armorVal,
      baseXp: xpVal,
      // Campos estendidos Tibia
      hp: hpVal,
      mp: mpVal,
      damage: dmgVal,
      magicDamage: magicDmg,
      armor: armorVal,
      xp: xpVal,
      abilities: arch.abilities,
      resistances: res,
      xpNeeded: xpForLevel(level),
    });
  }
  return bosses;
}

export const BOSSES = generateBosses();

export function getMonsterAt(level) {
  const safe = Math.max(1, Math.min(5000, level));
  return MONSTERS[safe - 1];
}

export function getBossAt(level) {
  return BOSSES.find(b => b.level === level);
}

// ============================================================
// LOOT TABLE - drops dos monstros
// ============================================================
// ============================================================
// TIPOS DE ARMA (Tibia-style) — definem qual skill treinam
// Cada arma tem UM weaponType; a engine mapeia para skill
// ============================================================
export const WEAPON_TYPES = {
  SWORD:     'sword',      // treina: melee
  AXE:       'axe',        // treina: melee
  CLUB:      'club',       // treina: melee
  MACE:      'mace',       // treina: melee
  SPEAR:     'spear',      // treina: distance (Tibia clássico)
  BOW:       'bow',        // treina: distance
  CROSSBOW:  'crossbow',   // treina: distance
  WAND:      'wand',       // treina: magic
  ROD:       'rod',        // treina: magic
  FIST:      'fist',       // treina: fist (knuckles, fists)
  THROW:     'throw',      // treina: distance
};

// Quais armas cada vocação PODE usar (Tibia-style)
// Knight:    sword, axe, club, mace, fist
// Paladin:   spear, bow, crossbow, throw
// Sorcerer:  wand (level 7+), rod
// Druid:     wand, rod
// Monk:      fist, club (pode usar fist e algumas armas corpo-a-corpo)
export const VOCATION_WEAPONS = {
  knight:    ['sword', 'axe', 'club', 'mace', 'fist'],
  paladin:   ['spear', 'bow', 'crossbow', 'throw'],
  sorcerer:  ['wand', 'rod'],
  druid:     ['wand', 'rod'],
  monk:      ['fist', 'club', 'sword'],   // monk no Tibia: fist + algumas armas
};

export const VOCATION_CAN_SHIELD = {
  knight:    true,
  paladin:   true,
  sorcerer:  true,
  druid:     true,
  monk:      false,   // monk não usa escudo
};

// Mapeamento arma → skill XP
export function weaponTypeToSkill(weaponType) {
  switch (weaponType) {
    case 'sword':
    case 'axe':
    case 'club':
    case 'mace':
      return 'melee';
    case 'spear':
    case 'bow':
    case 'crossbow':
    case 'throw':
      return 'distance';
    case 'wand':
    case 'rod':
      return 'magic';
    case 'fist':
    default:
      return 'fist';
  }
}

// Pode esta vocação usar este tipo de arma?
export function vocationCanUseWeapon(vocationId, weaponType) {
  const list = VOCATION_WEAPONS[vocationId] || [];
  return list.includes(weaponType);
}

export const ITEMS = [
  { id: 'gold', name: 'Gold', icon: '🪙', sellValue: 1 },
  { id: 'health_potion', name: 'Health Potion', icon: '🧪', sellValue: 50 },
  { id: 'mana_potion', name: 'Mana Potion', icon: '💎', sellValue: 50 },
  // Armas — sword (knight/monk), axe (knight), club (knight/monk), bow (paladin), wand (sorcerer/druid), rod (sorcerer/druid), knuckles (todos)
  { id: 'sword',     name: 'Sword',         icon: '🗡️', sellValue: 200, slot: 'weapon', weaponType: 'sword' },
  { id: 'axe',       name: 'Axe',           icon: '🪓', sellValue: 250, slot: 'weapon', weaponType: 'axe' },
  { id: 'club',      name: 'Club',          icon: '🏏', sellValue: 120, slot: 'weapon', weaponType: 'club' },
  { id: 'spear',     name: 'Spear',         icon: '🔱', sellValue: 220, slot: 'weapon', weaponType: 'spear' },
  { id: 'bow',       name: 'Bow',           icon: '🏹', sellValue: 300, slot: 'weapon', weaponType: 'bow' },
  { id: 'crossbow',  name: 'Crossbow',      icon: '🎯', sellValue: 450, slot: 'weapon', weaponType: 'crossbow' },
  { id: 'wand',      name: 'Wand',          icon: '🪄', sellValue: 380, slot: 'weapon', weaponType: 'wand' },
  { id: 'rod',       name: 'Rod',           icon: '🦯', sellValue: 360, slot: 'weapon', weaponType: 'rod' },
  { id: 'knuckles',  name: 'Knuckles',      icon: '🥊', sellValue: 180, slot: 'weapon', weaponType: 'fist' },
  { id: 'shield',    name: 'Shield',        icon: '🛡️', sellValue: 200, slot: 'shield' },
  { id: 'armor',     name: 'Armor',         icon: '🥋', sellValue: 350, slot: 'armor' },
  { id: 'helmet',    name: 'Helmet',        icon: '⛑️', sellValue: 180, slot: 'helmet' },
  { id: 'boots',     name: 'Boots',         icon: '👢', sellValue: 150, slot: 'boots' },
  { id: 'ring',      name: 'Ring of Power', icon: '💍', sellValue: 800, slot: 'ring' },
  { id: 'amulet',    name: 'Amulet',        icon: '📿', sellValue: 1000, slot: 'amulet' },
  { id: 'rune',      name: 'Magic Rune',    icon: '✨', sellValue: 600 },
];

// Slots de equipamento
export const EQUIP_SLOTS = ['helmet', 'armor', 'weapon', 'shield', 'boots', 'ring', 'amulet'];

// Equipamentos com bônus por raridade
export const EQUIPMENT = [];

// ============================================================
// HUNT ZONES - áreas de caça com level recomendado
// ============================================================
export const HUNT_ZONES = (() => {
  const zones = [];
  const tierNames = ['Troll', 'Dragon', 'Demon', 'Hellgate', 'Ice', 'Poison', 'Desert', 'Crystal', 'Shadow', 'Ethereal'];
  for (let i = 0; i < 10; i++) {
    const minLevel = i * 500 + 1;
    const maxLevel = (i + 1) * 500;
    zones.push({
      id: `zone_${i}`,
      name: `${tierNames[i]} Grounds`,
      icon: ['🌿', '🔥', '💀', '🌋', '❄️', '☠️', '🏜️', '💎', '🌑', '✨'][i],
      minLevel,
      maxLevel,
      multiplier: 1 + i * 0.15, // XP/drops melhor em zonas avançadas
    });
  }
  return zones;
})();

export function zoneForLevel(level) {
  const idx = Math.min(HUNT_ZONES.length - 1, Math.floor((level - 1) / 500));
  return HUNT_ZONES[idx];
}
