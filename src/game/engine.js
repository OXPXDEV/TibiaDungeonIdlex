// Motor de batalha - processa ticks automáticos de combate idle
import {
  effectivePlayerDamage,
  monsterHealth,
  monsterArmor,
  monsterDamage,
  monsterXpReward,
  playerDamage,
  playerDefense,
  playerDodgeChance,
  playerLifeSteal,
  playerMaxHealth,
  damagePerSecondTaken,
  timeToKill,
  ITEMS,
  monsterResistances,
  weaponTypeToSkill,
  vocationCanUseWeapon,
  VOCATION_CAN_SHIELD,
} from './data.js';

// ============================================================
// Resolve a skill usada em combate com base na arma equipada
// e nas armas permitidas pela vocação (Tibia-style).
// Retorna também as skills que devem receber XP neste tick
// (ex: com escudo equipado, shielding também treina).
// ============================================================
export function resolveCombatSkills(player) {
  const voc = player.vocationId;
  const weapon = player.equipment?.weapon;

  // 1. Tenta usar a arma equipada
  let damageSkill = 'fist'; // padrão se nada equipado
  if (weapon && weapon.weaponType && vocationCanUseWeapon(voc, weapon.weaponType)) {
    damageSkill = weaponTypeToSkill(weapon.weaponType);
  } else if (weapon && weapon.weaponType) {
    // Arma equipada mas a vocação não pode usar — ignora
    damageSkill = 'fist';
  }

  // 2. Skills que vão receber XP neste tick
  const skillXpTargets = [damageSkill];

  // Shielding treina para qualquer classe que possa usar escudo
  // (Tibia: mesmo Sorcerer/Druid com shield ganha shielding)
  const hasShield = !!player.equipment?.shield;
  const canShield = VOCATION_CAN_SHIELD[voc] !== false;
  if (hasShield && canShield) {
    skillXpTargets.push('shielding');
  }

  return { damageSkill, skillXpTargets };
}

// Cria estado de combate inicial
export function createBattleState(player, monster) {
  return {
    monsterId: monster.id,
    monsterName: monster.name,
    monsterLevel: monster.level,
    monsterIcon: monster.icon,
    monsterMaxHp: monsterHealth(monster),
    monsterCurrentHp: monsterHealth(monster),
    monsterArmor: monsterArmor(monster),
    monsterBaseDamage: monster.baseDamage,
    playerMaxHp: playerMaxHealth(player),
    playerCurrentHp: playerMaxHealth(player),
    startTime: Date.now(),
    elapsed: 0,
    monsterKilled: false,
    playerDied: false,
    logs: [],
    xpAccumulated: 0,
  };
}

// Processa um tick de combate (1 segundo)
// Retorna novo estado + eventos: { xpGained, itemDrop, leveledUp, skillsGained }
export function tickBattle(state, player, monster, _ignoredSkills = null) {
  if (state.monsterKilled || state.playerDied) return { state, events: [] };

  const newState = { ...state, logs: [...state.logs] };
  const events = [];

  const elapsed = state.elapsed + 1;

  // Tibia-style: a skill de dano é definida pela ARMA EQUIPADA + vocação.
  // O parâmetro skillsUsed (legacy) é ignorado de propósito.
  const { damageSkill, skillXpTargets } = resolveCombatSkills(player);
  const playerSkillLevel = player.skills[damageSkill] || 0;

  // DPS do jogador considerando skill
  const playerDmg = effectivePlayerDamage(player, monster, damageSkill);
  const attacksPerSec = playerDamage(player, damageSkill).attacksPerSecond;
  const playerDps = playerDmg * attacksPerSec;

  // Lifesteal passivo do Monk (converte X% do DPS em HP)
  const lifesteal = playerLifeSteal(player);
  if (lifesteal > 0) {
    newState.playerCurrentHp = Math.min(
      state.playerCurrentHp + playerDps * lifesteal,
      state.playerMaxHp
    );
  }

  // DPS do monstro contra o jogador, considerando chance de dodge (Monk)
  const def = playerDefense(player);
  const monsterRawDmg = monsterDamage(monster, def);
  const monsterAttackRate = 0.5 + monster.level * 0.005;
  const dodge = playerDodgeChance(player);
  const dodgeFactor = 1 - dodge;
  const monsterDps = monsterRawDmg * monsterAttackRate * dodgeFactor;

  // Aplica dano no monstro
  const monsterHp = state.monsterCurrentHp - playerDps;
  // Aplica dano no jogador (a partir do HP atual, já considerando lifesteal acima)
  const playerHp = newState.playerCurrentHp - monsterDps;

  newState.monsterCurrentHp = monsterHp;
  newState.playerCurrentHp = playerHp;
  newState.elapsed = elapsed;

  // Player matou o monstro
  if (newState.monsterCurrentHp <= 0) {
    newState.monsterKilled = true;
    const xp = monsterXpReward(monster, player.level);
    newState.xpAccumulated = xp;

    // Dropa loot baseado na sorte e level
    const dropChance = 0.15 + monster.level * 0.001;
    const droppedItems = [];
    if (Math.random() < dropChance) {
      const item = pickItemDrop(monster);
      if (item) droppedItems.push(item);
    }
    // Gold garantido
    const goldAmount = Math.floor(monster.level * (1 + Math.random() * 2));
    droppedItems.push({ id: 'gold', name: 'Gold', icon: '🪙', sellValue: 1, amount: goldAmount });

    // Bônus de skill XP (Tibia-style)
    // O ganho base é dividido entre todas as skills que estão sendo treinadas
    // neste tick (arma + escudo, por exemplo).
    const skillXpGainTotal = Math.floor(xp * 0.05 * (playerSkillLevel / (1 + playerSkillLevel * 0.1)));
    const perSkillXp = Math.floor(skillXpGainTotal / Math.max(1, skillXpTargets.length));
    const skillXpGained = skillXpTargets.map(s => ({ skill: s, amount: perSkillXp }));

    events.push({
      type: 'kill',
      xpGained: xp,
      goldGained: goldAmount,
      itemsDropped: droppedItems,
      skillXpGained, // AGORA É UM ARRAY
    });

    return { state: newState, events };
  }

  // Monstro matou o jogador
  if (newState.playerCurrentHp <= 0) {
    newState.playerDied = true;
    events.push({ type: 'death', lostXpPercent: 0.05 });
  }

  // Manter apenas os últimos 5 logs
  if (newState.logs.length > 5) newState.logs.shift();

  return { state: newState, events };
}

// Escolhe item de drop baseado no level do monstro
// Usa id lookup pra ser resiliente a reordenação de ITEMS
function pickItemDrop(monster) {
  const lv = monster.level;
  const byId = (id) => ITEMS.find(i => i.id === id);
  const pool = [];
  if (lv >= 1)   pool.push(byId('health_potion'));
  if (lv >= 5)   pool.push(byId('mana_potion'));
  if (lv >= 15)  pool.push(byId('sword'));
  if (lv >= 15)  pool.push(byId('shield'));
  if (lv >= 25)  pool.push(byId('armor'));
  if (lv >= 30)  pool.push(byId('helmet'));
  if (lv >= 35)  pool.push(byId('boots'));
  if (lv >= 50)  pool.push(byId('ring'));
  if (lv >= 70)  pool.push(byId('amulet'));
  if (lv >= 100) pool.push(byId('rune'));

  const filtered = pool.filter(Boolean);
  if (filtered.length === 0) return null;
  const item = filtered[Math.floor(Math.random() * filtered.length)];
  return { ...item, amount: 1 };
}

// Formata tempo em hh:mm:ss
export function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// Formata número grande (1234 -> 1.2K)
export function formatNumber(n) {
  if (n < 1000) return Math.floor(n).toString();
  if (n < 1e6) return (n / 1e3).toFixed(1) + 'K';
  if (n < 1e9) return (n / 1e6).toFixed(2) + 'M';
  if (n < 1e12) return (n / 1e9).toFixed(2) + 'B';
  return (n / 1e12).toFixed(2) + 'T';
}
