import React, { useState, useMemo } from 'react';
import { VOCATIONS, playerMaxHealth, playerMaxMana } from '../game/data.js';
import { SLOT_COST } from '../game/state.js';
import { isAdmin } from '../game/content.js';

// ============================================================
// Tela de personagens: 2 grátis + 5 pagos
// Modal de criação refeito: preview vivo, layout imersivo
// ============================================================
export default function Characters({ gameState, dispatch, onAdmin }) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [vocationId, setVocationId] = useState('knight');
  const [error, setError] = useState('');

  const acc = gameState.account;
  const totalSlots = 2 + acc.paidSlotsUnlocked;
  const slots = [];
  for (let i = 0; i < totalSlots; i++) {
    slots.push(acc.characters[i] || null);
  }
  const lockedSlots = [];
  for (let i = totalSlots; i < 7; i++) {
    lockedSlots.push(i);
  }

  function handleCreate(e) {
    e.preventDefault();
    setError('');
    const trimmed = name.trim();
    if (trimmed.length < 3) return setError('Nome precisa ter pelo menos 3 letras');
    if (trimmed.length > 20) return setError('Nome máximo 20 letras');
    if (!/^[a-zA-Z\s]+$/.test(trimmed)) return setError('Apenas letras são permitidas');
    dispatch({ type: 'CREATE_CHARACTER', name: trimmed, vocationId });
    setName('');
    setCreating(false);
  }

  function handleSelect(charId) {
    dispatch({ type: 'SELECT_CHARACTER', characterId: charId });
  }

  function handleDelete(charId, e) {
    e.stopPropagation();
    if (confirm('Apagar este personagem? Esta ação não pode ser desfeita.')) {
      dispatch({ type: 'DELETE_CHARACTER', characterId: charId });
    }
  }

  function handleUnlockSlot() {
    if (acc.paidSlotsUnlocked >= 5) return;
    if (confirm(`Desbloquear slot adicional por ${SLOT_COST} gold?`)) {
      dispatch({ type: 'UNLOCK_SLOT' });
    }
  }

  function handleLogout() {
    dispatch({ type: 'LOGOUT' });
  }

  return (
    <div className="chars-page">
      <header className="chars-header">
        <div>
          <h1>⚔️ Dungeon Invader Idle</h1>
          <p className="muted">{acc.email}</p>
        </div>
        <div className="header-actions">
          <span className="slot-count">{acc.characters.length}/{totalSlots} slots</span>
          {isAdmin(acc) && (
            <button className="btn ghost" onClick={onAdmin} title="Painel de administração" style={{ borderColor: 'var(--boss)', color: 'var(--boss)' }}>
              🛠️ Admin
            </button>
          )}
          <button className="btn ghost" onClick={handleLogout}>Sair</button>
        </div>
      </header>

      <div className="slot-grid">
        {slots.map((char, idx) => (
          <CharSlot
            key={idx}
            char={char}
            onSelect={() => char && handleSelect(char.id)}
            onDelete={(e) => char && handleDelete(char.id, e)}
            onCreate={() => setCreating(true)}
          />
        ))}

        {lockedSlots.map((idx) => (
          <div key={'locked_' + idx} className="char-slot locked" onClick={handleUnlockSlot}>
            <div className="lock-icon">🔒</div>
            <p className="muted">Slot Bloqueado</p>
            <button className="unlock-btn">Comprar ({SLOT_COST}g)</button>
          </div>
        ))}
      </div>

      {creating && (
        <CreateCharacterModal
          name={name}
          setName={setName}
          vocationId={vocationId}
          setVocationId={setVocationId}
          error={error}
          onSubmit={handleCreate}
          onClose={() => { setCreating(false); setError(''); }}
        />
      )}
    </div>
  );
}

// ============================================================
// Slot individual com hover rico, gradiente por vocação
// ============================================================
function CharSlot({ char, onSelect, onDelete, onCreate }) {
  if (!char) {
    return (
      <div className="char-slot empty" onClick={onCreate}>
        <div className="plus">+</div>
        <p>Criar Personagem</p>
      </div>
    );
  }
  const vocation = VOCATIONS.find(v => v.id === char.vocationId);
  const maxHp = playerMaxHealth(char);
  const maxMp = playerMaxMana(char);

  return (
    <div
      className={'char-slot filled voc-' + char.vocationId}
      onClick={onSelect}
      style={{ '--voc-color': vocationColor(char.vocationId) }}
    >
      <div className="char-glow" />
      <button className="delete-btn" onClick={onDelete}>✕</button>
      <div className="char-orb">
        <span className="char-icon-big">{vocation.icon}</span>
      </div>
      <h3 className="char-name">{char.name}</h3>
      <span className="char-voc">{vocation.name}</span>
      <div className="char-lv">Nível <strong>{char.level}</strong></div>

      <div className="char-mini-bars">
        <div className="mini-bar hp"><div className="fill" style={{ width: '100%' }}/></div>
        <span>{maxHp} HP</span>
      </div>
      <div className="char-mini-bars">
        <div className="mini-bar mp"><div className="fill" style={{ width: '100%' }}/></div>
        <span>{maxMp} MP</span>
      </div>

      <div className="char-meta muted">
        ☠️ {char.monstersKilled} kills · 💀 {char.deaths}
      </div>

      <button className="play-btn">Jogar ▶</button>
    </div>
  );
}

// ============================================================
// Modal de criação de personagem — novo visual
// Layout: header com brasão | corpo dividido em
//   ESQUERDA: nome + cards de vocação selecionáveis
//   DIREITA: preview vivo do personagem com stats
// ============================================================
function CreateCharacterModal({ name, setName, vocationId, setVocationId, error, onSubmit, onClose }) {
  const selected = VOCATIONS.find(v => v.id === vocationId) || VOCATIONS[0];
  const previewChar = useMemo(() => ({
    name: name.trim() || 'Seu Herói',
    vocationId: selected.id,
    level: 1,
    stats: selected.baseStats,
  }), [name, selected]);

  const maxHp = playerMaxHealth(previewChar);
  const maxMp = playerMaxMana(previewChar);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={'create-modal voc-theme-' + selected.id} onClick={(e) => e.stopPropagation()}>
        {/* Faixa superior com brasão */}
        <div className="create-banner">
          <div className="create-banner-bg" />
          <div className="create-banner-content">
            <span className="create-eyebrow">✦ Forjar Nova Lenda ✦</span>
            <h2>Novo Personagem</h2>
          </div>
          <button type="button" className="create-close" onClick={onClose} aria-label="Fechar">✕</button>
        </div>

        <div className="create-body">
          {/* COLUNA ESQUERDA */}
          <div className="create-left">
            <label className="field">
              <span>Nome do Herói</span>
              <div className="name-input-wrap">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Aragorn"
                  maxLength={20}
                  autoFocus
                  spellCheck={false}
                />
                <span className="char-counter">{name.length}/20</span>
              </div>
            </label>

            <div className="voc-section">
              <div className="section-label">
                <span>⚜️ Escolha sua Vocação</span>
                <small className="muted">Define seus atributos e estilo de combate</small>
              </div>

              <div className="voc-grid">
                {VOCATIONS.map(v => (
                  <VocationCard
                    key={v.id}
                    vocation={v}
                    selected={vocationId === v.id}
                    onClick={() => setVocationId(v.id)}
                  />
                ))}
              </div>
            </div>

            {error && <div className="error">⚠️ {error}</div>}

            <div className="create-actions">
              <button type="button" className="btn ghost big" onClick={onClose}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn primary big"
                onClick={onSubmit}
                disabled={!name.trim()}
              >
                ✨ Forjar Personagem
              </button>
            </div>
          </div>

          {/* COLUNA DIREITA — preview vivo */}
          <div className="create-right">
            <div className="preview-stage">
              <div className="preview-aura" />
              <div className="preview-figure">
                <div className="preview-icon">{selected.icon}</div>
              </div>
              <div className="preview-name">{previewChar.name}</div>
              <div className="preview-voc">{selected.name}</div>

              {/* Barras de HP/MP */}
              <div className="preview-bars">
                <div className="preview-bar">
                  <div className="preview-bar-label">
                    <span>❤️ Vida</span>
                    <span><strong>{maxHp}</strong></span>
                  </div>
                  <div className="bar hp big">
                    <div className="fill" style={{ width: '100%' }} />
                  </div>
                </div>
                <div className="preview-bar">
                  <div className="preview-bar-label">
                    <span>🔵 Mana</span>
                    <span><strong>{maxMp}</strong></span>
                  </div>
                  <div className="bar mana big">
                    <div className="fill" style={{ width: '100%' }} />
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="preview-stats">
                {Object.entries(selected.baseStats).map(([k, v]) => {
                  const def = {
                    health: { name: 'HP base', icon: '❤️', color: '#e74c3c' },
                    mana: { name: 'Mana base', icon: '🔵', color: '#3498db' },
                    strength: { name: 'Força', icon: '💪', color: '#e67e22' },
                    dexterity: { name: 'Destreza', icon: '🎯', color: '#27ae60' },
                    intelligence: { name: 'Inteligência', icon: '🧠', color: '#9b59b6' },
                    vitality: { name: 'Vitalidade', icon: '🩸', color: '#c0392b' },
                  }[k];
                  const max = 30;
                  const pct = Math.min(100, (v / max) * 100);
                  return (
                    <div key={k} className="preview-stat">
                      <div className="preview-stat-head">
                        <span>{def.icon} {def.name}</span>
                        <strong>{v}</strong>
                      </div>
                      <div className="bar preview-stat-bar">
                        <div className="fill" style={{ width: pct + '%', background: def.color }}/>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Crescimento por level */}
              <div className="preview-growth">
                <div className="section-label small">
                  <span>📈 Crescimento por Level</span>
                </div>
                <div className="growth-grid">
                  {Object.entries(selected.statGrowth).map(([k, v]) => {
                    const icons = { health: '❤️', mana: '🔵', strength: '💪', dexterity: '🎯', intelligence: '🧠', vitality: '🩸' };
                    return (
                      <div key={k} className={'growth-item ' + (v > 0 ? 'positive' : '')}>
                        <span>{icons[k]}</span>
                        <strong>+{v}</strong>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Skills preferidas */}
              <div className="preview-skills">
                <div className="section-label small">
                  <span>🎯 Skills Preferidas</span>
                </div>
                <div className="skills-chips">
                  {selected.preferredSkills.map(s => (
                    <span key={s} className="skill-chip">{s}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Card de vocação rico (clicável, com glow por cor)
// ============================================================
function VocationCard({ vocation, selected, onClick }) {
  const color = vocationColor(vocation.id);
  return (
    <button
      type="button"
      className={'voc-card' + (selected ? ' selected' : '')}
      onClick={onClick}
      style={{ '--voc-color': color }}
    >
      <div className="voc-card-bg" />
      <div className="voc-card-content">
        <div className="voc-icon-wrap">
          <span className="voc-icon">{vocation.icon}</span>
        </div>
        <strong className="voc-name">{vocation.name}</strong>
        <p className="voc-desc">{vocation.desc}</p>

        <div className="voc-mini-stats">
          <span title="HP">❤️{vocation.baseStats.health}</span>
          <span title="MP">🔵{vocation.baseStats.mana}</span>
          <span title="STR">💪{vocation.baseStats.strength}</span>
          <span title="DEX">🎯{vocation.baseStats.dexterity}</span>
          <span title="INT">🧠{vocation.baseStats.intelligence}</span>
        </div>
      </div>

      {selected && (
        <div className="voc-selected-badge">
          <span>✓ Selecionado</span>
        </div>
      )}
    </button>
  );
}

// ============================================================
// Mapa de cores por vocação (gradiente no card e no preview)
// ============================================================
function vocationColor(id) {
  return {
    knight: '#c9a747',
    paladin: '#5dade2',
    sorcerer: '#9b59b6',
    druid: '#27ae60',
    monk: '#af7ac5',
  }[id] || '#c9a747';
}
