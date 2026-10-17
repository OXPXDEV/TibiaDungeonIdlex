import React, { useEffect, useReducer, useState } from 'react';
import Login from './components/Login.jsx';
import Characters from './components/Characters.jsx';
import Game from './components/Game.jsx';
import Admin from './components/Admin.jsx';
import { isAdmin } from './game/content.js';
import {
  loadState,
  saveState,
  login,
  createCharacter,
  selectCharacter,
  deleteCharacter,
  unlockPaidSlot,
  newCharacter as createNewChar,
  updateAccountInRegistry,
} from './game/state.js';
import { xpForLevel, skillXpForLevel, MAX_SKILL_LEVEL, playerMaxHealth, playerMaxMana } from './game/data.js';

// ============================================================
// App raiz - roteamento entre Login, Characters, Game e Admin
// Rota Admin: /admin (hash) OU /auth williamcosmos1@gmail.com
// ============================================================
export default function App() {
  const [state, dispatch] = useReducer(rootReducer, null, loadState);
  const [route, setRoute] = useState(() => parseRoute());

  useEffect(() => {
    saveState(state);
    // Espelha a conta logada no registry global (para o painel admin)
    if (state?.account) {
      updateAccountInRegistry(state.account);
    }
  }, [state]);

  useEffect(() => {
    function onHash() { setRoute(parseRoute()); }
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  function handleLogin(email, password, isGmail) {
    if (isGmail) {
      // Para Gmail, cria conta nova limpa
      dispatch({ type: 'LOGIN', email });
    } else {
      // Email normal: cria conta nova
      dispatch({ type: 'LOGIN', email });
    }
  }

  // Rota admin: visível SOMENTE para a conta autorizada
  if (route === 'admin' && state?.account && isAdmin(state.account)) {
    return <Admin account={state.account} onExit={() => { window.location.hash = ''; }} />;
  }

  if (!state?.account) {
    return <Login onLogin={handleLogin} />;
  }

  const goAdmin = () => { window.location.hash = 'admin'; };

  // Botão flutuante de admin (visível APENAS para a conta autorizada)
  const adminFab = isAdmin(state.account) ? (
    <button className="admin-fab" onClick={goAdmin} title="Painel de administração">
      🛠️ <span>Admin</span><span className="badge">{state.account.email}</span>
    </button>
  ) : null;

  if (!state.currentCharacterId) {
    return (
      <>
        {adminFab}
        <Characters
          gameState={state}
          dispatch={dispatch}
          onAdmin={goAdmin}
        />
      </>
    );
  }

  const character = state.account.characters.find(c => c.id === state.currentCharacterId);
  if (!character) {
    return (
      <>
        {adminFab}
        <Characters
          gameState={{ ...state, currentCharacterId: null }}
          dispatch={dispatch}
          onAdmin={goAdmin}
        />
      </>
    );
  }

  return (
    <>
      {adminFab}
      <Game character={character} dispatch={dispatch} onAdmin={goAdmin} />
    </>
  );
}

function parseRoute() {
  const h = (window.location.hash || '').replace(/^#\/?/, '').trim();
  if (!h) return null;
  // Aceita: #admin, #/admin, /auth <email>
  if (h === 'admin' || h.startsWith('admin')) return 'admin';
  if (h.startsWith('auth')) {
    const email = h.split(/\s+/)[1] || '';
    if (email.toLowerCase() === 'williamcosmos1@gmail.com') return 'admin';
  }
  return null;
}

// ============================================================
// Reducer raiz do app
// ============================================================
function rootReducer(state, action) {
  if (!state) state = { account: null, currentCharacterId: null };

  switch (action.type) {
    case 'LOGIN':
      return login(state, action.email);

    case 'LOGOUT':
      return { account: null, currentCharacterId: null };

    case 'SELECT_CHARACTER':
      return selectCharacter(state, action.characterId);

    case 'TO_CHARACTERS':
      return { ...state, currentCharacterId: null };

    case 'CREATE_CHARACTER': {
      const next = createCharacter(state, action.name, action.vocationId);
      const newChar = next.account.characters[next.account.characters.length - 1];
      return { ...next, currentCharacterId: newChar?.id || state.currentCharacterId };
    }

    case 'DELETE_CHARACTER':
      return deleteCharacter(state, action.characterId);

    case 'UNLOCK_SLOT':
      return unlockPaidSlot(state);

    // ====================================================
    // Eventos do motor de batalha
    // ====================================================
    case 'APPLY_KILL': {
      const charId = action.characterId;
      return applyToCharacter(state, charId, (ch) => {
        let newXp = ch.xp + action.xp;
        let newLevel = ch.level;
        let levelsGained = 0;

        // Loop para múltiplos level ups
        while (newXp >= xpForLevel(newLevel + 1)) {
          newLevel += 1;
          levelsGained += 1;
        }

        // Skill XP — aceita objeto único (legacy) OU array de {skill, amount}
        const newSkillXp = { ...ch.skillXp };
        const newSkills = { ...ch.skills };
        const skillXpList = action.skillXp
          ? (Array.isArray(action.skillXp) ? action.skillXp : [action.skillXp])
          : [];
        for (const entry of skillXpList) {
          if (!entry || !entry.skill) continue;
          const sk = entry.skill;
          newSkillXp[sk] = (newSkillXp[sk] || 0) + (entry.amount || 0);
          // Level up de skill (até o cap de 200)
          while (newSkills[sk] < MAX_SKILL_LEVEL && newSkillXp[sk] >= skillXpForLevel(newSkills[sk] + 1)) {
            newSkills[sk] += 1;
          }
          // XP acima do cap trava no cap (não vira level infinito)
          if (newSkills[sk] >= MAX_SKILL_LEVEL) {
            newSkillXp[sk] = skillXpForLevel(MAX_SKILL_LEVEL);
          }
        }

        // Inventário: agrupa drops
        const inventory = [...ch.inventory];
        for (const item of action.items) {
          const existing = inventory.find(i => i.id === item.id);
          if (existing) {
            existing.amount = (existing.amount || 1) + (item.amount || 1);
          } else {
            inventory.push({ ...item });
          }
        }

        return {
          ...ch,
          xp: newXp,
          level: newLevel,
          monstersKilled: ch.monstersKilled + 1,
          ...(ch.level < 25 && newLevel >= 25 ? {} : {}),
          skills: newSkills,
          skillXp: newSkillXp,
          inventory,
          gold: ch.gold + (action.gold || 0),
          hp: playerMaxHealth({ ...ch, level: newLevel, stats: ch.stats }), // cura ao upar
          mana: playerMaxMana({ ...ch, level: newLevel, stats: ch.stats }),
          lastSeen: Date.now(),
        };
      });
    }

    case 'APPLY_DEATH': {
      return applyToCharacter(state, action.characterId, (ch) => {
        // Penalidade: perde 5% do XP atual
        const xpLost = Math.floor(ch.xp * 0.05);
        return {
          ...ch,
          xp: Math.max(0, ch.xp - xpLost),
          deaths: ch.deaths + 1,
          hp: playerMaxHealth(ch), // revive com HP cheio
          mana: playerMaxMana(ch),
        };
      });
    }

    case 'RESPAWN': {
      return applyToCharacter(state, action.characterId, (ch) => ({
        ...ch,
        hp: playerMaxHealth(ch),
        mana: playerMaxMana(ch),
        deaths: ch.deaths + 1,
      }));
    }

    case 'TICK_PLAY_TIME': {
      // Atualiza tempo de jogo (1 segundo)
      return applyToCharacter(state, action.characterId, (ch) => ({
        ...ch,
        totalPlayTime: ch.totalPlayTime + 1,
      }));
    }

    case 'REGEN': {
      return applyToCharacter(state, action.characterId, (ch) => ({
        ...ch,
        hp: action.hp,
        mana: action.mana,
      }));
    }

    default:
      return state;
  }
}

function applyToCharacter(state, charId, updater) {
  if (!state.account) return state;
  return {
    ...state,
    account: {
      ...state.account,
      characters: state.account.characters.map(c =>
        c.id === charId ? updater(c) : c
      ),
    },
  };
}
