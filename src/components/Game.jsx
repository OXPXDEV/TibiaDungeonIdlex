import React, { useEffect, useReducer, useRef } from 'react';
import { isAdmin } from '../game/content.js';
import {
  VOCATIONS,
  SKILL_DEFS,
  STAT_DEFS,
  EQUIP_SLOTS,
  HUNT_ZONES,
  zoneForLevel,
  getMonsterAt,
  getBossAt,
  xpToNextLevel,
  skillXpToNext,
  MAX_SKILL_LEVEL,
  playerMaxHealth,
  playerMaxMana,
  playerDamage,
  playerDefense,
  playerDodgeChance,
  playerLifeSteal,
  effectivePlayerDamage,
  monsterHealth,
  monsterArmor,
  monsterDamage,
  timeToKill,
  damagePerSecondTaken,
  monsterXpReward,
} from '../game/data.js';
import { createBattleState, tickBattle, formatTime, formatNumber } from '../game/engine.js';

// ============================================================
// Componente principal do jogo (idle battle automatizada)
// ============================================================
export default function Game({ character, dispatch, onAdmin }) {
  const [state, localDispatch] = useReducer(gameReducer, {
    targetMode: 'normal',
    selectedZone: 0,
    skillToUse: 'melee',
    autoHeal: true,
    log: [],
    lastEvent: null,
    battle: null,
  });

  const charRef = useRef(character);
  useEffect(() => { charRef.current = character; }, [character]);

  // =========================================================
  // LOOP IDLE - 1 tick por segundo (combate + regeneração passiva)
  // =========================================================
  useEffect(() => {
    const id = setInterval(() => {
      const ch = charRef.current;
      if (!ch) return;

      // 1) Regenerar HP e MP passivamente (1% por segundo)
      const maxHpNow = playerMaxHealth(ch);
      const maxManaNow = playerMaxMana(ch);
      const hpRegen = Math.max(1, maxHpNow * 0.01);
      const manaRegen = Math.max(1, maxManaNow * 0.02);
      const newHp = Math.min(maxHpNow, ch.hp + hpRegen);
      const newMana = Math.min(maxManaNow, ch.mana + manaRegen);
      if (newHp !== ch.hp || newMana !== ch.mana) {
        dispatch({ type: 'REGEN', characterId: ch.id, hp: newHp, mana: newMana });
      }

      // 2) Tempo de jogo
      dispatch({ type: 'TICK_PLAY_TIME', characterId: ch.id });

      // 3) Batalha
      const zone = HUNT_ZONES[state.selectedZone];
      const zoneCap = zone.maxLevel;
      // Nível efetivo de caça (limitado pela zona escolhida)
      let huntLevel = Math.min(ch.level, zoneCap);
      // Para o boss, sempre o boss dentro da zona
      const isBoss = state.targetMode === 'boss';
      const target = isBoss
        ? (getBossAt(Math.min(ch.level, zoneCap)) || getBossAt(zoneCap))
        : getMonsterAt(huntLevel);

      // Garantir que mob existe
      if (!target) return;

      // Criar batalha se mudou de alvo ou não existe
      if (!state.battle || state.battle.monsterId !== (target.id)) {
        const battle = createBattleState(ch, target);
        localDispatch({ type: 'SET_BATTLE', battle });
        return;
      }

      // Processa 1 tick de combate
      const { state: newBattle, events } = tickBattle(
        state.battle,
        ch,
        target,
        [state.skillToUse]
      );

      localDispatch({ type: 'TICK', battle: newBattle, events, target });
    }, 1000);

    return () => clearInterval(id);
    // eslint-disable-next-line
  }, [state.battle?.monsterId, state.targetMode, state.selectedZone, state.skillToUse]);

  // =========================================================
  // Quando o monstro morre, acumular XP no personagem
  // =========================================================
  const lastProcessedKillRef = useRef(null);
  useEffect(() => {
    if (!state.battle || !state.battle.monsterKilled) return;
    if (lastProcessedKillRef.current === state.battle) return;
    lastProcessedKillRef.current = state.battle;

    const events = state.lastEvent?.events || [];
    for (const ev of events) {
      if (ev.type === 'kill') {
        dispatch({
          type: 'APPLY_KILL',
          characterId: character.id,
          xp: ev.xpGained,
          gold: ev.goldGained,
          items: ev.itemsDropped,
          skillXp: ev.skillXpGained,
        });
      } else if (ev.type === 'death') {
        dispatch({
          type: 'APPLY_DEATH',
          characterId: character.id,
        });
      }
    }
  }, [state.battle?.monsterKilled, state.lastEvent]);

  // =========================================================
  // Auto-heal: para de caçar se HP muito baixo
  // =========================================================
  const maxHp = playerMaxHealth(character);
  const lowHp = character.hp < maxHp * 0.3;

  // Não morrer no loop: se HP zerar, revive com 30% HP e perde XP
  useEffect(() => {
    if (character.hp <= 0) {
      dispatch({ type: 'RESPAWN', characterId: character.id });
    }
  }, [character.hp, character.id, dispatch]);

  // =========================================================
  // UI
  // =========================================================
  const vocation = VOCATIONS.find(v => v.id === character.vocationId) || VOCATIONS[0];
  const maxMana = playerMaxMana(character);
  const { damagePerHit, attacksPerSecond } = playerDamage(character, state.skillToUse);
  const def = playerDefense(character);
  const currentZone = zoneForLevel(character.level);

  const target = (() => {
    const zone = HUNT_ZONES[state.selectedZone];
    if (state.targetMode === 'boss') {
      return getBossAt(Math.min(character.level, zone.maxLevel)) || getMonsterAt(character.level);
    }
    return getMonsterAt(Math.min(character.level, zone.maxLevel));
  })();

  const mobHp = state.battle?.monsterCurrentHp ?? monsterHealth(target);
  const mobMaxHp = state.battle?.monsterMaxHp ?? monsterHealth(target);
  const playerHpPct = Math.max(0, Math.min(100, (character.hp / maxHp) * 100));
  const mobHpPct = Math.max(0, Math.min(100, (mobHp / mobMaxHp) * 100));

  const ttk = timeToKill(character, target, state.skillToUse);
  const dpsTaken = damagePerSecondTaken(character, target);

  // XP para próximo level
  const xpNeeded = xpToNextLevel(character.level);
  const xpPct = (character.xp / xpNeeded) * 100;

  return (
    <div className="game">
      {/* HEADER */}
      <header className="game-header">
        <div className="char-summary">
          <div className="char-avatar">{vocation.icon}</div>
          <div>
            <h2>{character.name}</h2>
            <p className="muted">{vocation.name} · Nível <strong>{character.level}</strong></p>
          </div>
        </div>
        <div className="header-stats">
          <div className="stat-pill">
            <span className="stat-icon">🪙</span>
            <span>{formatNumber(character.gold)}</span>
          </div>
          <div className="stat-pill">
            <span className="stat-icon">⏱️</span>
            <span>{formatTime(character.totalPlayTime)}</span>
          </div>
          {isAdmin({ email: character.email || '' }) && onAdmin && (
            <button className="btn ghost" onClick={onAdmin} style={{ borderColor: 'var(--boss)', color: 'var(--boss)' }} title="Painel Admin">
              🛠️ Admin
            </button>
          )}
          <button className="btn ghost" onClick={() => dispatch({ type: 'TO_CHARACTERS' })}>
            ← Personagens
          </button>
        </div>
      </header>

      <div className="game-grid">
        {/* COLUNA ESQUERDA - Personagem */}
        <aside className="panel char-panel">
          <h3>⚔️ {character.name}</h3>

          {/* HP e Mana */}
          <div className="bar-block">
            <div className="bar-label">
              <span>❤️ HP</span>
              <span>{Math.floor(character.hp)} / {maxHp}</span>
            </div>
            <div className="bar hp"><div className="fill" style={{ width: playerHpPct + '%' }}/></div>
          </div>

          <div className="bar-block">
            <div className="bar-label">
              <span>🔵 MP</span>
              <span>{Math.floor(character.mana)} / {maxMana}</span>
            </div>
            <div className="bar mana"><div className="fill" style={{ width: (character.mana / maxMana) * 100 + '%' }}/></div>
          </div>

          {/* XP */}
          <div className="bar-block">
            <div className="bar-label">
              <span>⭐ XP</span>
              <span>{formatNumber(character.xp)} / {formatNumber(xpNeeded)}</span>
            </div>
            <div className="bar xp"><div className="fill" style={{ width: Math.min(100, xpPct) + '%' }}/></div>
          </div>

          {/* Stats / Atributos */}
          <h4>Atributos</h4>
          <div className="stats-list">
            {STAT_DEFS.map(s => (
              <div key={s.id} className="stat-row">
                <span>{s.icon} {s.short}</span>
                <strong>{character.stats[s.id]}</strong>
              </div>
            ))}
          </div>

          {/* Equipamentos */}
          <h4>Equipamentos</h4>
          <div className="equip-grid">
            {EQUIP_SLOTS.map(slot => (
              <div key={slot} className={'equip-slot' + (character.equipment[slot] ? ' filled' : '')}>
                <span className="equip-label">{slot}</span>
                <span className="equip-icon">
                  {character.equipment[slot]?.icon || '—'}
                </span>
              </div>
            ))}
          </div>

          {/* Inventário rápido */}
          <h4>Inventário</h4>
          <div className="inventory">
            {character.inventory.length === 0 && <p className="muted small">Vazio</p>}
            {character.inventory.slice(0, 12).map((it, i) => (
              <div key={i} className="inv-item" title={it.name}>
                <span>{it.icon}</span>
                <small>x{it.amount || 1}</small>
              </div>
            ))}
          </div>
        </aside>

        {/* COLUNA CENTRAL - Batalha */}
        <main className="panel battle-panel">
          {/* Controles de caça */}
          <div className="hunt-controls">
            <div className="control-row">
              <span className="muted">Modo:</span>
              <button
                className={state.targetMode === 'normal' ? 'toggle active' : 'toggle'}
                onClick={() => localDispatch({ type: 'SET_MODE', mode: 'normal' })}
              >
                Monstros
              </button>
              <button
                className={state.targetMode === 'boss' ? 'toggle active' : 'toggle'}
                onClick={() => localDispatch({ type: 'SET_MODE', mode: 'boss' })}
              >
                👑 Boss
              </button>
            </div>

            <div className="control-row">
              <span className="muted">Zona:</span>
              {HUNT_ZONES.map((z, i) => (
                <button
                  key={z.id}
                  className={state.selectedZone === i ? 'toggle active small' : 'toggle small'}
                  onClick={() => localDispatch({ type: 'SET_ZONE', zone: i })}
                  disabled={character.level < z.minLevel}
                >
                  {z.icon} {z.minLevel}-{z.maxLevel}
                </button>
              ))}
            </div>

            <div className="control-row">
              <span className="muted">Skill:</span>
              {SKILL_DEFS.map(s => (
                <button
                  key={s.id}
                  className={state.skillToUse === s.id ? 'toggle active small' : 'toggle small'}
                  onClick={() => localDispatch({ type: 'SET_SKILL', skill: s.id })}
                >
                  {s.icon} {s.name}
                </button>
              ))}
            </div>
          </div>

          {/* Arena */}
          <div className="arena">
            <div className="fighter player">
              <div className="fighter-name">
                {vocation.icon} {character.name}
                {vocation.id === 'monk' && <span className="boss-tag">🥋 Monk</span>}
              </div>
              <div className="fighter-stat">⚔️ {damagePerHit} dmg · {attacksPerSecond.toFixed(2)} atk/s</div>
              <div className="fighter-stat">🛡️ {def} def</div>
              {vocation.id === 'monk' && (
                <div className="fighter-stat monk-bonus">
                  🌀 {(playerDodgeChance(character) * 100).toFixed(1)}% esquiva
                  · 🩸 {(playerLifeSteal(character) * 100).toFixed(0)}% roubo de vida
                </div>
              )}
              <div className="bar hp big"><div className="fill" style={{ width: playerHpPct + '%' }}/></div>
              <div className="hp-text">{Math.floor(character.hp)} / {maxHp}</div>
            </div>

            <div className="vs">⚔️ VS ⚔️</div>

            <div className="fighter monster">
              <div className="fighter-name">
                {target.icon} {target.name}
                {target.isBoss && <span className="boss-tag">👑 BOSS</span>}
              </div>
              <div className="fighter-stat">Nível {target.level} · {target.family}</div>
              <div className="fighter-stat">🛡️ {monsterArmor(target)} arm · 💥 {monsterDamage(target, def)} dmg</div>
              <div className="bar mob"><div className="fill" style={{ width: mobHpPct + '%' }}/></div>
              <div className="hp-text">{Math.floor(mobHp)} / {mobMaxHp}</div>
            </div>
          </div>

          {/* Análise */}
          <div className="analysis">
            <div className="analysis-card">
              <div className="label">Dano/hit</div>
              <div className="value">{effectivePlayerDamage(character, target, state.skillToUse)}</div>
            </div>
            <div className="analysis-card">
              <div className="label">DPS</div>
              <div className="value">{(effectivePlayerDamage(character, target, state.skillToUse) * attacksPerSecond).toFixed(1)}</div>
            </div>
            <div className="analysis-card">
              <div className="label">Tempo para matar</div>
              <div className="value">{ttk.toFixed(1)}s</div>
            </div>
            <div className="analysis-card">
              <div className="label">Dano recebido/s</div>
              <div className="value">{dpsTaken.toFixed(1)}</div>
            </div>
            <div className="analysis-card">
              <div className="label">XP por kill</div>
              <div className="value">{formatNumber(monsterXpReward(target, character.level))}</div>
            </div>
          </div>

          {lowHp && (
            <div className="warning">
              ⚠️ HP baixo! Considere mudar de zona ou usar poções.
            </div>
          )}

          <div className="hint-text muted small">
            A batalha ocorre automaticamente a cada segundo. O combate continua até matar o monstro, morrer, ou trocar de alvo. Monstros dropam ouro, XP, e itens conforme o level.
          </div>
        </main>

        {/* COLUNA DIREITA - Skills e Log */}
        <aside className="panel right-panel">
          <h3>📊 Skills</h3>
          <div className="skills-list">
            {SKILL_DEFS.map(s => {
              const level = character.skills[s.id] || 1;
              const xpNeed = skillXpToNext(level);
              const cur = character.skillXp[s.id] || 0;
              const isMax = level >= MAX_SKILL_LEVEL;
              const pct = isMax ? 100 : Math.min(100, (cur / xpNeed) * 100);
              return (
                <div key={s.id} className="skill-row">
                  <div className="skill-head">
                    <span>{s.icon} {s.name}</span>
                    <strong className={isMax ? 'max' : ''}>
                      {isMax ? 'Nv. ' + level + ' ✨ MAX' : 'Nv. ' + level}
                    </strong>
                  </div>
                  <div className="bar skill"><div className="fill" style={{ width: pct + '%' }}/></div>
                  <small className="muted">
                    {isMax ? 'Cap atingido' : formatNumber(cur) + ' / ' + formatNumber(xpNeed) + ' XP'}
                  </small>
                </div>
              );
            })}
          </div>

          <h3>📜 Log de Batalha</h3>
          <div className="log">
            {state.log.slice(-8).reverse().map((l, i) => (
              <div key={i} className={'log-line log-' + l.type}>{l.text}</div>
            ))}
            {state.log.length === 0 && <p className="muted small">Caça iniciada. Procure monstros na sua zona!</p>}
          </div>
        </aside>
      </div>
    </div>
  );
}

// =========================================================
// Reducer local para a tela de jogo
// =========================================================
function gameReducer(state, action) {
  switch (action.type) {
    case 'SET_BATTLE':
      return { ...state, battle: action.battle, lastEvent: null };
    case 'TICK': {
      const logs = [...state.log];
      const elapsed = action.battle.elapsed;
      if (action.events.length > 0) {
        for (const ev of action.events) {
          if (ev.type === 'kill') {
            logs.push({
              type: 'kill',
              text: `⚔️ Você matou ${action.target.name}! +${ev.xpGained} XP, +${ev.goldGained} gold`,
            });
            if (ev.itemsDropped?.length) {
              const itemsStr = ev.itemsDropped.map(it => `${it.icon}${it.amount > 1 ? 'x' + it.amount : ''}`).join(' ');
              logs.push({ type: 'drop', text: `🎁 Drops: ${itemsStr}` });
            }
          } else if (ev.type === 'death') {
            logs.push({ type: 'death', text: '☠️ Você morreu! Voltou para a cidade.' });
          }
        }
      } else if (elapsed % 5 === 0) {
        const monsterHpPct = Math.max(0, Math.min(100, (action.battle.monsterCurrentHp / action.battle.monsterMaxHp) * 100));
        const playerHpPct = Math.max(0, Math.min(100, (action.battle.playerCurrentHp / action.battle.playerMaxHp) * 100));
        logs.push({
          type: 'info',
          text: `⏱️ ${formatTime(elapsed)} · Monstro: ${monsterHpPct.toFixed(0)}% · Você: ${playerHpPct.toFixed(0)}%`,
        });
      }
      return { ...state, battle: action.battle, log: logs.slice(-30), lastEvent: { events: action.events } };
    }
    case 'SET_MODE':
      return { ...state, targetMode: action.mode, battle: null };
    case 'SET_ZONE':
      return { ...state, selectedZone: action.zone, battle: null };
    case 'SET_SKILL':
      return { ...state, skillToUse: action.skill };
    default:
      return state;
  }
}
