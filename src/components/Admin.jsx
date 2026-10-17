// ============================================================
// Admin Panel - Dungeon Invader Idle
// Acesso restrito: williamcosmos1@gmail.com
// ============================================================

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  getContent, saveContent, seedContent, resetContent,
  upsertVocation,   deleteVocation,
  upsertMonster,    deleteMonster,
  upsertBoss,       deleteBoss,
  upsertItem,       deleteItem,
  upsertZone,       deleteZone,
  exportContent,    importContent,
  EQUIP_SLOTS, ITEM_CATEGORIES, ADMIN_EMAIL, isAdmin,
} from '../game/content.js';
import {
  listAccounts,
  deleteAccountFromRegistry,
  updateAccountInRegistry,
} from '../game/state.js';
import { VOCATIONS, xpForLevel, skillXpForLevel, MAX_SKILL_LEVEL, playerMaxHealth, playerMaxMana, MONSTERS, BOSSES, HUNT_ZONES, ITEMS } from '../game/data.js';
import SPRITES from '../game/sprites.json';
import * as SpriteStudio from '../game/spriteStudio.js';
import { unzip } from 'fflate';

// Helper: ícone da sprite
function Sprite({ spriteKey, fallback = '❓', size = 40 }) {
  const [failed, setFailed] = useState(false);
  const s = spriteKey ? SPRITES?.sprites : null;
  const entry = s ? findSprite(s, spriteKey) : null;
  const url = entry?.file;
  if (url && !failed) {
    return (
      <img
        src={SPRITES.basePath + url}
        alt={spriteKey}
        width={size}
        height={size}
        onError={() => setFailed(true)}
        style={{ imageRendering: 'pixelated', objectFit: 'contain' }}
      />
    );
  }
  return <span style={{ fontSize: size * 0.7, lineHeight: 1 }}>{fallback}</span>;
}

function findSprite(sprites, key) {
  for (const cat of Object.values(sprites)) {
    if (cat && cat[key]) return cat[key];
  }
  return null;
}

// Helper: input de campo
function Field({ label, children, full }) {
  return (
    <label className={'field' + (full ? ' full' : '')}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function NumberField({ label, value, onChange, step = 1, min = 0 }) {
  return (
    <Field label={label}>
      <input
        type="number"
        value={value ?? 0}
        step={step}
        min={min}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </Field>
  );
}

function TextField({ label, value, onChange, placeholder }) {
  return (
    <Field label={label}>
      <input
        type="text"
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <Field label={label}>
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </Field>
  );
}

function BoolField({ label, value, onChange }) {
  return (
    <div className="checkbox-row">
      <input
        id={'bool-' + label}
        type="checkbox"
        checked={!!value}
        onChange={(e) => onChange(e.target.checked)}
      />
      <label htmlFor={'bool-' + label}>{label}</label>
    </div>
  );
}

// ============================================================
// Editor genérico de Vocação
// ============================================================
function VocationEditor({ initial, onSave, onCancel }) {
  const [v, setV] = useState(() => initial || {
    id: '',
    name: '',
    icon: '⚔️',
    desc: '',
    color: '#c9a747',
    baseStats: { health: 100, mana: 50, strength: 10, dexterity: 10, intelligence: 10, vitality: 10 },
    statGrowth: { health: 5, mana: 3, strength: 1, dexterity: 1, intelligence: 1, vitality: 1 },
    preferredSkills: ['melee'],
    passiveBonus: { fistDamageMul: 1, dodgeChance: 0, lifeStealPct: 0, defenseFlat: 0 },
  });

  function up(field, val) {
    setV(prev => ({ ...prev, [field]: val }));
  }
  function upStat(group, key, val) {
    setV(prev => ({ ...prev, [group]: { ...prev[group], [key]: val } }));
  }
  function upPassive(key, val) {
    setV(prev => ({ ...prev, passiveBonus: { ...prev.passiveBonus, [key]: val } }));
  }

  return (
    <div className="editor-form">
      <TextField label="ID" value={v.id} onChange={(x) => up('id', x)} placeholder="monk" />
      <TextField label="Nome" value={v.name} onChange={(x) => up('name', x)} />
      <TextField label="Ícone" value={v.icon} onChange={(x) => up('icon', x)} />
      <TextField label="Cor (#hex)" value={v.color} onChange={(x) => up('color', x)} placeholder="#c9a747" />
      <Field label="Descrição" full>
        <textarea value={v.desc} onChange={(e) => up('desc', e.target.value)} />
      </Field>

      <h4 className="full" style={{ marginTop: 8 }}>Atributos base</h4>
      <NumberField label="HP base"      value={v.baseStats.health}      onChange={(x) => upStat('baseStats', 'health', x)} />
      <NumberField label="MP base"      value={v.baseStats.mana}        onChange={(x) => upStat('baseStats', 'mana', x)} />
      <NumberField label="Força base"   value={v.baseStats.strength}    onChange={(x) => upStat('baseStats', 'strength', x)} />
      <NumberField label="Destreza"     value={v.baseStats.dexterity}   onChange={(x) => upStat('baseStats', 'dexterity', x)} />
      <NumberField label="Inteligência" value={v.baseStats.intelligence} onChange={(x) => upStat('baseStats', 'intelligence', x)} />
      <NumberField label="Vitalidade"   value={v.baseStats.vitality}    onChange={(x) => upStat('baseStats', 'vitality', x)} />

      <h4 className="full">Crescimento por nível</h4>
      <NumberField label="HP/nível"      value={v.statGrowth.health}      onChange={(x) => upStat('statGrowth', 'health', x)} />
      <NumberField label="MP/nível"      value={v.statGrowth.mana}        onChange={(x) => upStat('statGrowth', 'mana', x)} />
      <NumberField label="Força/nível"   value={v.statGrowth.strength}    onChange={(x) => upStat('statGrowth', 'strength', x)} />
      <NumberField label="Destreza/nível" value={v.statGrowth.dexterity} onChange={(x) => upStat('statGrowth', 'dexterity', x)} />
      <NumberField label="Int/nível"     value={v.statGrowth.intelligence} onChange={(x) => upStat('statGrowth', 'intelligence', x)} />
      <NumberField label="Vit/nível"     value={v.statGrowth.vitality}    onChange={(x) => upStat('statGrowth', 'vitality', x)} />

      <h4 className="full">Bônus passivos</h4>
      <NumberField label="Multiplicador dano de soco" value={v.passiveBonus.fistDamageMul} step={0.05} onChange={(x) => upPassive('fistDamageMul', x)} />
      <NumberField label="Chance de esquiva (0-1)"    value={v.passiveBonus.dodgeChance}   step={0.01} onChange={(x) => upPassive('dodgeChance', x)} />
      <NumberField label="Roubo de vida (0-1)"        value={v.passiveBonus.lifeStealPct}  step={0.01} onChange={(x) => upPassive('lifeStealPct', x)} />
      <NumberField label="Defesa plana"               value={v.passiveBonus.defenseFlat}            onChange={(x) => upPassive('defenseFlat', x)} />

      <Field label="Skills preferidas (vírgula)" full>
        <input
          type="text"
          value={(v.preferredSkills || []).join(', ')}
          onChange={(e) => up('preferredSkills', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
        />
      </Field>

      <div className="actions">
        <button className="btn ghost" onClick={onCancel}>Cancelar</button>
        <button className="btn primary" onClick={() => onSave(v)} disabled={!v.id || !v.name}>
          {initial ? 'Salvar alterações' : 'Criar vocação'}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Editor de Monstro
// ============================================================
function MonsterEditor({ initial, onSave, onCancel, zones }) {
  const [m, setM] = useState(() => initial || {
    id: '', name: '', icon: '👹', level: 1,
    hp: 50, exp: 5, damage: 5, armor: 0, speed: 1,
    resists: { physical: 0, fire: 0, ice: 0, energy: 0, holy: 0, death: 0, earth: 0 },
    zone: zones?.[0]?.id || 'rookgaard',
    isBoss: false,
    drops: [],
    spriteKey: '',
  });
  function up(field, val) { setV(prev => ({ ...prev, [field]: val })); }
  function upRes(key, val) { setV(prev => ({ ...prev, resists: { ...prev.resists, [key]: val } })); }

  return (
    <div className="editor-form">
      <TextField label="ID" value={m.id} onChange={(x) => up('id', x)} placeholder="cyclops" />
      <TextField label="Nome" value={m.name} onChange={(x) => up('name', x)} />
      <TextField label="Ícone (emoji)" value={m.icon} onChange={(x) => up('icon', x)} />
      <TextField label="Sprite key" value={m.spriteKey} onChange={(x) => up('spriteKey', x)} placeholder="cyclops" />
      <NumberField label="Nível" value={m.level} onChange={(x) => up('level', x)} />
      <SelectField label="Zona" value={m.zone} onChange={(x) => up('zone', x)} options={(zones || []).map(z => ({ value: z.id, label: z.name }))} />

      <NumberField label="HP" value={m.hp} onChange={(x) => up('hp', x)} />
      <NumberField label="Dano" value={m.damage} onChange={(x) => up('damage', x)} />
      <NumberField label="Armadura" value={m.armor} onChange={(x) => up('armor', x)} />
      <NumberField label="EXP" value={m.exp} onChange={(x) => up('exp', x)} />
      <NumberField label="Velocidade" value={m.speed} step={0.1} onChange={(x) => up('speed', x)} />
      <BoolField label="É Boss?" value={!!m.isBoss} onChange={(x) => up('isBoss', x)} />

      <h4 className="full">Resistências (0–100%)</h4>
      <NumberField label="Físico" value={m.resists.physical} onChange={(x) => upRes('physical', x)} />
      <NumberField label="Fogo" value={m.resists.fire} onChange={(x) => upRes('fire', x)} />
      <NumberField label="Gelo" value={m.resists.ice} onChange={(x) => upRes('ice', x)} />
      <NumberField label="Energia" value={m.resists.energy} onChange={(x) => upRes('energy', x)} />
      <NumberField label="Sagrado" value={m.resists.holy} onChange={(x) => upRes('holy', x)} />
      <NumberField label="Morte" value={m.resists.death} onChange={(x) => upRes('death', x)} />
      <NumberField label="Terra" value={m.resists.earth} onChange={(x) => upRes('earth', x)} />

      <div className="actions">
        <button className="btn ghost" onClick={onCancel}>Cancelar</button>
        <button className="btn primary" onClick={() => onSave(m)} disabled={!m.id || !m.name}>
          {initial ? 'Salvar' : 'Criar monstro'}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Editor de Item
// ============================================================
function ItemEditor({ initial, onSave, onCancel }) {
  const [it, setIt] = useState(() => initial || {
    id: '', name: '', category: 'weapon', slot: 'weapon',
    weight: 1, attack: 0, defense: 0, bonusHp: 0, bonusMana: 0, price: 100, spriteKey: '',
  });
  function up(field, val) { setV(prev => ({ ...prev, [field]: val })); }

  return (
    <div className="editor-form">
      <TextField label="ID" value={it.id} onChange={(x) => up('id', x)} placeholder="steel_sword" />
      <TextField label="Nome" value={it.name} onChange={(x) => up('name', x)} />
      <SelectField label="Categoria" value={it.category} onChange={(x) => up('category', x)} options={ITEM_CATEGORIES.map(c => ({ value: c.id, label: c.name }))} />
      <SelectField label="Slot" value={it.slot || ''} onChange={(x) => up('slot', x || null)} options={[{ value: '', label: '— nenhum —' }, ...EQUIP_SLOTS.map(s => ({ value: s, label: s }))]} />
      <NumberField label="Peso" value={it.weight} step={0.1} onChange={(x) => up('weight', x)} />
      <NumberField label="Preço (gold)" value={it.price} onChange={(x) => up('price', x)} />
      <NumberField label="Ataque" value={it.attack} onChange={(x) => up('attack', x)} />
      <NumberField label="Defesa" value={it.defense} onChange={(x) => up('defense', x)} />
      <NumberField label="Bonus HP" value={it.bonusHp} onChange={(x) => up('bonusHp', x)} />
      <NumberField label="Bonus MP" value={it.bonusMana} onChange={(x) => up('bonusMana', x)} />
      <Field label="Sprite key" full>
        <input type="text" value={it.spriteKey || ''} onChange={(e) => up('spriteKey', e.target.value)} placeholder="sword" />
      </Field>

      <div className="actions">
        <button className="btn ghost" onClick={onCancel}>Cancelar</button>
        <button className="btn primary" onClick={() => onSave(it)} disabled={!it.id || !it.name}>
          {initial ? 'Salvar' : 'Criar item'}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Editor de Zona
// ============================================================
function ZoneEditor({ initial, onSave, onCancel }) {
  const [z, setZ] = useState(() => initial || { id: '', name: '', minLevel: 1, color: '#27ae60' });
  function up(field, val) { setV(prev => ({ ...prev, [field]: val })); }
  return (
    <div className="editor-form">
      <TextField label="ID" value={z.id} onChange={(x) => up('id', x)} placeholder="my_zone" />
      <TextField label="Nome" value={z.name} onChange={(x) => up('name', x)} />
      <NumberField label="Nível mínimo" value={z.minLevel} onChange={(x) => up('minLevel', x)} />
      <TextField label="Cor (#hex)" value={z.color} onChange={(x) => up('color', x)} />
      <div className="actions">
        <button className="btn ghost" onClick={onCancel}>Cancelar</button>
        <button className="btn primary" onClick={() => onSave(z)} disabled={!z.id || !z.name}>
          {initial ? 'Salvar' : 'Criar zona'}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Componente principal Admin
// ============================================================
export default function Admin({ account, onExit }) {
  const [tab, setTab] = useState('overview');
  const [content, setContent] = useState(() => getContent());
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [importText, setImportText] = useState('');
  const [feedback, setFeedback] = useState(null);

  useEffect(() => { saveContent(content); }, [content]);

  function flash(msg, kind = 'success') {
    setFeedback({ msg, kind });
    setTimeout(() => setFeedback(null), 2500);
  }

  function handleSave(kind, item) {
    let next = content;
    if (kind === 'vocation') next = upsertVocation(content, item);
    if (kind === 'monster')  next = upsertMonster(content, item);
    if (kind === 'boss')     next = upsertBoss(content, item);
    if (kind === 'item')     next = upsertItem(content, item);
    if (kind === 'zone')     next = upsertZone(content, item);
    setContent(next);
    setEditing(null);
    flash(`Salvo: ${item.name || item.id}`);
  }

  function handleDelete(kind, id) {
    if (!window.confirm('Excluir este item? Esta ação afeta o jogo em tempo real.')) return;
    let next = content;
    if (kind === 'vocation') next = deleteVocation(content, id);
    if (kind === 'monster')  next = deleteMonster(content, id);
    if (kind === 'boss')     next = deleteBoss(content, id);
    if (kind === 'item')     next = deleteItem(content, id);
    if (kind === 'zone')     next = deleteZone(content, id);
    setContent(next);
    flash('Item removido', 'info');
  }

  function handleReset() {
    if (!window.confirm('Restaurar TODO o conteúdo para o padrão? Suas edições serão perdidas.')) return;
    resetContent();
    setContent(seedContent());
    flash('Conteúdo restaurado ao padrão', 'info');
  }

  function handleExport() {
    const json = exportContent(content);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dungeon-invader-content-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    flash('JSON exportado');
  }

  function handleImport() {
    try {
      const next = importContent(importText);
      setContent(next);
      setImportText('');
      flash('JSON importado com sucesso');
    } catch (e) {
      flash('Erro ao importar: ' + e.message, 'danger');
    }
  }

  // Verificação de permissão
  if (!isAdmin(account)) {
    return (
      <div className="denied-page">
        <div className="denied-card">
          <h1>🔒 Acesso negado</h1>
          <p>Esta área é restrita ao administrador do jogo.</p>
          <p className="muted">Conta atual: {account?.email || '(nenhuma)'}</p>
          <p className="muted small">Somente o email autorizado <strong>{ADMIN_EMAIL}</strong> pode acessar o painel.</p>
          <button className="btn primary" onClick={onExit} style={{ marginTop: 16 }}>Voltar ao jogo</button>
        </div>
      </div>
    );
  }

  // Stats gerais
  const stats = useMemo(() => ({
    vocations: content.vocations.length,
    monsters: content.monsters.length,
    bosses: content.bosses.length,
    items: content.items.length,
    zones: content.zones.length,
  }), [content]);

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>🛠️ Admin Panel</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="muted small">Logado como <strong>{account.email}</strong></span>
          <button className="btn ghost" onClick={onExit}>← Voltar ao jogo</button>
        </div>
      </div>

      <div className="admin-tabs">
        <button className={'admin-tab' + (tab === 'overview'  ? ' active' : '')} onClick={() => setTab('overview')}>📊 Visão Geral</button>
        <button className={'admin-tab' + (tab === 'vocations' ? ' active' : '')} onClick={() => setTab('vocations')}>⚔️ Vocações</button>
        <button className={'admin-tab' + (tab === 'monsters'  ? ' active' : '')} onClick={() => setTab('monsters')}>👹 Monstros</button>
        <button className={'admin-tab' + (tab === 'bosses'    ? ' active' : '')} onClick={() => setTab('bosses')}>💀 Bosses</button>
        <button className={'admin-tab' + (tab === 'items'     ? ' active' : '')} onClick={() => setTab('items')}>🎒 Itens</button>
        <button className={'admin-tab' + (tab === 'zones'     ? ' active' : '')} onClick={() => setTab('zones')}>🗺️ Zonas</button>
        <button className={'admin-tab' + (tab === 'balance'   ? ' active' : '')} onClick={() => setTab('balance')}>⚖️ Balanceamento</button>
        <button className={'admin-tab' + (tab === 'sprites'   ? ' active' : '')} onClick={() => setTab('sprites')}>🖼️ Sprites Tibia</button>
        <button className={'admin-tab' + (tab === 'players'   ? ' active' : '')} onClick={() => setTab('players')}>👥 Players</button>
        <button className={'admin-tab' + (tab === 'data'      ? ' active' : '')} onClick={() => setTab('data')}>💾 Dados</button>
      </div>

      {feedback && (
        <div className={`admin-info-banner ${feedback.kind === 'danger' ? 'danger' : feedback.kind === 'info' ? '' : 'success'}`}>
          {feedback.msg}
        </div>
      )}

      <div className="admin-panel">
        {/* Visão geral */}
        {tab === 'overview' && (
          <>
            <h2>Visão Geral do Conteúdo</h2>
            <div className="kpi-grid">
              <div className="kpi"><div className="label">Vocações</div><div className="value">{stats.vocations}</div></div>
              <div className="kpi"><div className="label">Monstros</div><div className="value">{stats.monsters}</div></div>
              <div className="kpi success"><div className="label">Bosses</div><div className="value">{stats.bosses}</div></div>
              <div className="kpi"><div className="label">Itens</div><div className="value">{stats.items}</div></div>
              <div className="kpi"><div className="label">Zonas</div><div className="value">{stats.zones}</div></div>
              <div className="kpi danger"><div className="label">Última atualização</div><div className="value" style={{ fontSize: 14 }}>{new Date(content.updatedAt).toLocaleString()}</div></div>
            </div>
            <div className="admin-info-banner">
              💡 Todas as alterações ficam salvas automaticamente no <strong>localStorage</strong> deste navegador.
              Use o botão <strong>Exportar JSON</strong> na aba <strong>Dados</strong> para compartilhar ou versionar.
            </div>
            <h3>Resumo rápido</h3>
            <ul>
              <li>{content.vocations.length} vocações (Knight, Paladin, Sorcerer, Druid, Monk, etc.)</li>
              <li>{content.monsters.filter(m => !m.isBoss).length} monstros comuns + {content.bosses.length} bosses</li>
              <li>Escala de monstros até o nível 5000 (1-100: fácil, 100-1000: médio, 1000-5000: brutal)</li>
              <li>{content.items.length} itens catalogados (armas, escudos, armaduras, consumíveis…)</li>
              <li>Skills com cap em 200 (1-100 fácil, 100-125 duro, 125-150 muito duro, 150-200 brutal)</li>
            </ul>
          </>
        )}

        {/* Vocações */}
        {tab === 'vocations' && !editing && (
          <VocList content={content} search={search} setSearch={setSearch} onAdd={() => setEditing({ kind: 'vocation' })} onEdit={(x) => setEditing({ kind: 'vocation', item: x })} onDelete={(id) => handleDelete('vocation', id)} />
        )}
        {tab === 'vocations' && editing && (
          <>
            <h2>{editing.item ? `Editar: ${editing.item.name}` : 'Nova vocação'}</h2>
            <VocationEditor initial={editing.item} onCancel={() => setEditing(null)} onSave={(v) => handleSave('vocation', v)} />
          </>
        )}

        {/* Monstros */}
        {tab === 'monsters' && !editing && (
          <MonsterList content={content} search={search} setSearch={setSearch} onAdd={() => setEditing({ kind: 'monster' })} onEdit={(x) => setEditing({ kind: 'monster', item: x })} onDelete={(id) => handleDelete('monster', id)} />
        )}
        {tab === 'monsters' && editing && (
          <>
            <h2>{editing.item ? `Editar: ${editing.item.name}` : 'Novo monstro'}</h2>
            <MonsterEditor initial={editing.item} onCancel={() => setEditing(null)} onSave={(m) => handleSave('monster', { ...m, isBoss: false })} zones={content.zones} />
          </>
        )}

        {/* Bosses */}
        {tab === 'bosses' && !editing && (
          <BossList content={content} search={search} setSearch={setSearch} onAdd={() => setEditing({ kind: 'boss' })} onEdit={(x) => setEditing({ kind: 'boss', item: x })} onDelete={(id) => handleDelete('boss', id)} />
        )}
        {tab === 'bosses' && editing && (
          <>
            <h2>{editing.item ? `Editar: ${editing.item.name}` : 'Novo boss'}</h2>
            <MonsterEditor initial={editing.item || { isBoss: true }} onCancel={() => setEditing(null)} onSave={(m) => handleSave('boss', { ...m, isBoss: true })} zones={content.zones} />
          </>
        )}

        {/* Itens */}
        {tab === 'items' && !editing && (
          <ItemList content={content} search={search} setSearch={setSearch} onAdd={() => setEditing({ kind: 'item' })} onEdit={(x) => setEditing({ kind: 'item', item: x })} onDelete={(id) => handleDelete('item', id)} />
        )}
        {tab === 'items' && editing && (
          <>
            <h2>{editing.item ? `Editar: ${editing.item.name}` : 'Novo item'}</h2>
            <ItemEditor initial={editing.item} onCancel={() => setEditing(null)} onSave={(i) => handleSave('item', i)} />
          </>
        )}

        {/* Zonas */}
        {tab === 'zones' && !editing && (
          <ZoneList content={content} search={search} setSearch={setSearch} onAdd={() => setEditing({ kind: 'zone' })} onEdit={(x) => setEditing({ kind: 'zone', item: x })} onDelete={(id) => handleDelete('zone', id)} />
        )}
        {tab === 'zones' && editing && (
          <>
            <h2>{editing.item ? `Editar: ${editing.item.name}` : 'Nova zona'}</h2>
            <ZoneEditor initial={editing.item} onCancel={() => setEditing(null)} onSave={(z) => handleSave('zone', z)} />
          </>
        )}

        {/* Balanceamento */}
        {tab === 'balance' && <BalancePanel content={content} />}

        {/* Sprites */}
        {tab === 'sprites' && <SpritesPanel />}
        {tab === 'players' && <PlayersPanel currentAccount={account} />}

        {/* Dados (import/export/reset) */}
        {tab === 'data' && (
          <>
            <h2>Dados e Persistência</h2>
            <div className="admin-info-banner">
              O conteúdo é salvo no <strong>localStorage</strong> sob a chave <code>dungeon_invader_idle_content_v1</code>.
              Use os botões abaixo para versionar, compartilhar ou restaurar.
            </div>

            <h3>Exportar</h3>
            <p className="muted">Baixa um JSON com todo o conteúdo atual. Use para compartilhar com outros admins ou guardar backup.</p>
            <button className="btn primary" onClick={handleExport} style={{ maxWidth: 240 }}>📥 Exportar JSON</button>

            <h3 style={{ marginTop: 24 }}>Importar</h3>
            <p className="muted">Cole um JSON exportado anteriormente. Ele substituirá todo o conteúdo atual.</p>
            <Field label="JSON" full>
              <textarea value={importText} onChange={(e) => setImportText(e.target.value)} placeholder='{"vocations": [...], "monsters": [...], ...}' rows={6} />
            </Field>
            <button className="btn primary" onClick={handleImport} disabled={!importText.trim()} style={{ maxWidth: 240 }}>📤 Importar JSON</button>

            <h3 style={{ marginTop: 24 }}>Restaurar padrão</h3>
            <p className="muted danger-text">⚠️ Apaga TODAS as suas edições e volta ao conteúdo gerado pelo data.js.</p>
            <button className="btn danger" onClick={handleReset} style={{ maxWidth: 240 }}>♻️ Resetar tudo</button>

            <h3 style={{ marginTop: 24 }}>Limpar registry de contas</h3>
            <p className="muted danger-text">⚠️ Apaga o registro de TODAS as contas (a conta logada será re-registrada na próxima ação).</p>
            <button
              className="btn danger"
              style={{ maxWidth: 280 }}
              onClick={() => {
                if (!window.confirm('Limpar o registro de TODAS as contas? A conta logada atual será mantida por estar ativa.')) return;
                try {
                  const me = account;
                  localStorage.setItem('dungeon_invader_idle_accounts_v1', '[]');
                  if (me) updateAccountInRegistry(me);
                  window.location.reload();
                } catch (e) { /* */ }
              }}
            >🧹 Limpar registry (manter conta atual)</button>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Sub-componentes de listagem
// ============================================================
function VocList({ content, search, setSearch, onAdd, onEdit, onDelete }) {
  const filtered = content.vocations.filter(v => !search || v.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <>
      <div className="admin-toolbar">
        <input className="search-box" placeholder="Buscar vocação…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button className="btn primary" onClick={onAdd} style={{ maxWidth: 220 }}>+ Nova vocação</button>
      </div>
      <div className="admin-list">
        {filtered.map(v => (
          <div key={v.id} className="admin-card" style={{ borderLeft: `3px solid ${v.color || '#c9a747'}` }}>
            <div className="admin-card-head">
              <div className="admin-card-icon">{v.icon || '⚔️'}</div>
              <div className="admin-card-title">{v.name}</div>
            </div>
            <p className="muted small" style={{ margin: 0 }}>{v.desc}</p>
            <div className="admin-card-meta">
              <span className="tag">HP: {v.baseStats.health}</span>
              <span className="tag">MP: {v.baseStats.mana}</span>
              <span className="tag">FOR: {v.baseStats.strength}</span>
              <span className="tag">DES: {v.baseStats.dexterity}</span>
            </div>
            <div className="admin-card-actions">
              <button className="icon-btn" onClick={() => onEdit(v)}>✏️ Editar</button>
              <button className="icon-btn danger" onClick={() => onDelete(v.id)}>🗑️ Excluir</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function MonsterList({ content, search, setSearch, onAdd, onEdit, onDelete }) {
  const list = content.monsters.filter(m => !m.isBoss);
  const filtered = list.filter(m => !search || m.name.toLowerCase().includes(search.toLowerCase()) || (m.id || '').includes(search.toLowerCase()));
  return (
    <>
      <div className="admin-toolbar">
        <input className="search-box" placeholder="Buscar monstro…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <span className="muted small">Mostrando {filtered.length} de {list.length}</span>
        <button className="btn primary" onClick={onAdd} style={{ maxWidth: 220 }}>+ Novo monstro</button>
      </div>
      <div className="admin-list">
        {filtered.slice(0, 200).map(m => (
          <div key={m.id} className="admin-card">
            <div className="admin-card-head">
              <div className="admin-card-icon"><Sprite spriteKey={m.spriteKey} fallback={m.icon || '👹'} size={36} /></div>
              <div className="admin-card-title">{m.name}</div>
            </div>
            <div className="admin-card-meta">
              <span className="tag">Lv. {m.level}</span>
              <span className="tag">HP: {m.hp}</span>
              <span className="tag">Dano: {m.damage}</span>
              <span className="tag">Arm: {m.armor}</span>
              <span className="tag common">{m.zone}</span>
            </div>
            <div className="admin-card-actions">
              <button className="icon-btn" onClick={() => onEdit(m)}>✏️ Editar</button>
              <button className="icon-btn danger" onClick={() => onDelete(m.id)}>🗑️ Excluir</button>
            </div>
          </div>
        ))}
      </div>
      {filtered.length > 200 && <p className="muted" style={{ marginTop: 12 }}>Exibindo apenas os 200 primeiros — refine a busca para ver mais.</p>}
    </>
  );
}

function BossList({ content, search, setSearch, onAdd, onEdit, onDelete }) {
  const filtered = content.bosses.filter(b => !search || b.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <>
      <div className="admin-toolbar">
        <input className="search-box" placeholder="Buscar boss…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button className="btn primary" onClick={onAdd} style={{ maxWidth: 220 }}>+ Novo boss</button>
      </div>
      <div className="admin-info-banner danger">
        ⚠️ Bosses são <strong>significativamente mais difíceis</strong> que monstros comuns: HP ~10×, dano ~5×, EXP ~25×. Ajuste com cuidado.
      </div>
      <div className="admin-list">
        {filtered.map(b => (
          <div key={b.id} className="admin-card" style={{ borderColor: 'var(--boss)' }}>
            <div className="admin-card-head">
              <div className="admin-card-icon" style={{ borderColor: 'var(--boss)' }}><Sprite spriteKey={b.spriteKey} fallback={b.icon || '💀'} size={36} /></div>
              <div className="admin-card-title">{b.name} <span className="boss-tag">BOSS</span></div>
            </div>
            <div className="admin-card-meta">
              <span className="tag boss">Lv. {b.level}</span>
              <span className="tag boss">HP: {b.hp}</span>
              <span className="tag boss">Dano: {b.damage}</span>
              <span className="tag boss">Arm: {b.armor}</span>
            </div>
            <div className="admin-card-actions">
              <button className="icon-btn" onClick={() => onEdit(b)}>✏️ Editar</button>
              <button className="icon-btn danger" onClick={() => onDelete(b.id)}>🗑️ Excluir</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function ItemList({ content, search, setSearch, onAdd, onEdit, onDelete }) {
  const filtered = content.items.filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <>
      <div className="admin-toolbar">
        <input className="search-box" placeholder="Buscar item…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button className="btn primary" onClick={onAdd} style={{ maxWidth: 220 }}>+ Novo item</button>
      </div>
      <div className="admin-list">
        {filtered.map(it => (
          <div key={it.id} className="admin-card">
            <div className="admin-card-head">
              <div className="admin-card-icon"><Sprite spriteKey={it.spriteKey} fallback="📦" size={36} /></div>
              <div className="admin-card-title">{it.name}</div>
            </div>
            <div className="admin-card-meta">
              <span className="tag">{it.category}</span>
              {it.slot && <span className="tag">slot: {it.slot}</span>}
              <span className="tag">🪙 {it.price}</span>
              {it.attack > 0  && <span className="tag">ATK +{it.attack}</span>}
              {it.defense > 0 && <span className="tag">DEF +{it.defense}</span>}
            </div>
            <div className="admin-card-actions">
              <button className="icon-btn" onClick={() => onEdit(it)}>✏️ Editar</button>
              <button className="icon-btn danger" onClick={() => onDelete(it.id)}>🗑️ Excluir</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function ZoneList({ content, search, setSearch, onAdd, onEdit, onDelete }) {
  const filtered = content.zones.filter(z => !search || z.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <>
      <div className="admin-toolbar">
        <input className="search-box" placeholder="Buscar zona…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button className="btn primary" onClick={onAdd} style={{ maxWidth: 220 }}>+ Nova zona</button>
      </div>
      <div className="admin-list">
        {filtered.map(z => (
          <div key={z.id} className="admin-card" style={{ borderLeft: `3px solid ${z.color || '#c9a747'}` }}>
            <div className="admin-card-head">
              <div className="admin-card-icon">🗺️</div>
              <div className="admin-card-title">{z.name}</div>
            </div>
            <div className="admin-card-meta">
              <span className="tag">Nível mín: {z.minLevel}</span>
              <span className="tag">id: {z.id}</span>
            </div>
            <div className="admin-card-actions">
              <button className="icon-btn" onClick={() => onEdit(z)}>✏️ Editar</button>
              <button className="icon-btn danger" onClick={() => onDelete(z.id)}>🗑️ Excluir</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ============================================================
// Painel de balanceamento (mostra onde cada classe fica no nível 1/100/500/2000/5000)
// ============================================================
function BalancePanel({ content }) {
  const levels = [1, 50, 100, 500, 1000, 2000, 5000];
  return (
    <>
      <h2>Balanceamento por Nível</h2>
      <div className="admin-info-banner">
        📐 Mostra o poder estimado de cada vocação conforme o nível do personagem.
        Use pra encontrar curvas quebradas.
      </div>
      <h3>Vocações (preview)</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: 6 }}>Vocação</th>
            {levels.map(l => <th key={l} style={{ padding: 6, color: 'var(--accent)' }}>Lv {l}</th>)}
          </tr>
        </thead>
        <tbody>
          {content.vocations.map(v => {
            const power = (lv) => {
              // estimativa simples: HP/10 + MP/5 + STR*2 + DEX + INT + VIT
              const s = v.statGrowth;
              return Math.round(
                (v.baseStats.health  + s.health  * lv) / 10 +
                (v.baseStats.mana    + s.mana    * lv) / 5  +
                (v.baseStats.strength  + s.strength  * lv) * 2 +
                (v.baseStats.dexterity + s.dexterity * lv) +
                (v.baseStats.intelligence + s.intelligence * lv) +
                (v.baseStats.vitality    + s.vitality    * lv)
              );
            };
            return (
              <tr key={v.id} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: 6, color: v.color }}>{v.icon} {v.name}</td>
                {levels.map(l => <td key={l} style={{ padding: 6, textAlign: 'center' }}>{power(l)}</td>)}
              </tr>
            );
          })}
        </tbody>
      </table>

      <h3 style={{ marginTop: 24 }}>Monstros (amostra por nível)</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: 6 }}>ID</th>
            <th style={{ padding: 6 }}>Nome</th>
            <th style={{ padding: 6 }}>Nível</th>
            <th style={{ padding: 6 }}>HP</th>
            <th style={{ padding: 6 }}>Dano</th>
            <th style={{ padding: 6 }}>Arm</th>
            <th style={{ padding: 6 }}>EXP</th>
          </tr>
        </thead>
        <tbody>
          {[1, 10, 50, 100, 200, 500, 1000, 2000, 5000].map(lv => {
            const m = content.monsters.find(x => x.level === lv && !x.isBoss);
            if (!m) return null;
            return (
              <tr key={lv} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: 6, color: 'var(--muted)' }}>{m.id}</td>
                <td style={{ padding: 6 }}>{m.icon} {m.name}</td>
                <td style={{ padding: 6, textAlign: 'center' }}>{m.level}</td>
                <td style={{ padding: 6, textAlign: 'center' }}>{m.hp}</td>
                <td style={{ padding: 6, textAlign: 'center' }}>{m.damage}</td>
                <td style={{ padding: 6, textAlign: 'center' }}>{m.armor}</td>
                <td style={{ padding: 6, textAlign: 'center' }}>{m.exp}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}

// ============================================================
// Painel de sprites Tibia
// ============================================================
function SpritesPanel() {
  const [tick, setTick] = useState(0);
  const [results, setResults] = useState([]); // [{file, match, dataUrl, applied, chosenKind, chosenId, error}]
  const [busy, setBusy] = useState(false);
  const [busyMsg, setBusyMsg] = useState('');
  const [isDrag, setIsDrag] = useState(false);
  const fileInputRef = useRef(null);
  const zipInputRef = useRef(null);

  const custom = SpriteStudio.getSpriteMap();
  const customCount = Object.keys(custom).length;

  // entities por categoria
  const entities = useMemo(() => ({
    vocation: VOCATIONS,
    monster:  MONSTERS.filter(m => !m.isBoss),
    boss:     BOSSES,
    item:     ITEMS.filter(i => i.id !== 'gold'),
    map:      HUNT_ZONES,
  }), [tick]);

  function refresh() { setTick(t => t + 1); }

  // ---- Helpers de UI
  function pickFiles() { fileInputRef.current?.click(); }
  function pickZip() { zipInputRef.current?.click(); }

  async function handleFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setBusy(true);
    setBusyMsg(`Processando ${files.length} arquivo(s)…`);
    const out = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      setBusyMsg(`Processando ${i + 1}/${files.length}: ${f.name}`);
      try {
        const c = await SpriteStudio.classifyAndStore(f);
        out.push({ ...c, applied: false });
      } catch (e) {
        out.push({ file: f, error: e.message });
      }
    }
    setResults(prev => [...out, ...prev]);
    setBusy(false);
    setBusyMsg('');
  }

  async function handleZip(file) {
    setBusy(true);
    setBusyMsg('Lendo .zip…');
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      const files = {};
      await new Promise((resolve, reject) => {
        unzip(buf, (err, data) => {
          if (err) return reject(err);
          Object.assign(files, data);
          resolve();
        });
      });
      const arr = [];
      for (const [name, bytes] of Object.entries(files)) {
        if (name.endsWith('/') || name.startsWith('__MACOSX') || name.includes('/.')) continue;
        const lower = name.toLowerCase();
        if (!(lower.endsWith('.png') || lower.endsWith('.gif') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.webp') || lower.endsWith('.bmp'))) continue;
        const blob = new Blob([bytes]);
        const f = new File([blob], name.split('/').pop(), { type: blob.type || 'image/png' });
        arr.push(f);
      }
      setBusyMsg(`Descompactado: ${arr.length} imagem(s). Classificando…`);
      await handleFiles(arr);
    } catch (e) {
      alert('Erro ao ler .zip: ' + e.message);
      setBusy(false);
      setBusyMsg('');
    }
  }

  function applyOne(idx) {
    const r = results[idx];
    if (!r || r.error || !r.match) return;
    SpriteStudio.applySprite(r);
    setResults(prev => prev.map((x, i) => i === idx ? { ...x, applied: true } : x));
    refresh();
  }

  function applyAllAuto() {
    let count = 0;
    const newResults = results.map(r => {
      if (r.applied || r.error || !r.match) return r;
      if (r.match.score >= 0.85) {
        SpriteStudio.applySprite(r);
        count++;
        return { ...r, applied: true };
      }
      return r;
    });
    setResults(newResults);
    if (count > 0) refresh();
  }

  function reMatch(idx, kind, entityId) {
    setResults(prev => prev.map((r, i) => {
      if (i !== idx) return r;
      const ent = entityByKindAndId(kind, entityId);
      return { ...r, match: { kind, entityId, name: ent?.name || entityId, score: 1, manual: true }, chosenKind: kind, chosenId: entityId };
    }));
  }

  function clearResults() { setResults([]); }

  function clearAllSprites() {
    if (!window.confirm('Apagar TODAS as sprites customizadas desta máquina?')) return;
    SpriteStudio.clearSprites();
    refresh();
  }

  return (
    <>
      <h2>🖼️ Sprite Studio — Tibia OT</h2>

      {/* Stats */}
      <div className="studio-stats">
        <div className="kpi"><div className="label">Sprites customizadas</div><div className="value">{customCount}</div></div>
        <div className="kpi"><div className="label">Vocações</div><div className="value">{entities.item.length > 0 ? VOCATIONS.length : 0}</div></div>
        <div className="kpi"><div className="label">Monstros</div><div className="value">{entities.monster.length}</div></div>
        <div className="kpi"><div className="label">Bosses</div><div className="value">{entities.boss.length}</div></div>
        <div className="kpi"><div className="label">Itens</div><div className="value">{entities.item.length}</div></div>
        <div className="kpi"><div className="label">Mapas</div><div className="value">{entities.map.length}</div></div>
      </div>

      <div className="admin-info-banner">
        🧠 <strong>IA de matching:</strong> ao subir um arquivo (ou .zip), o nome é normalizado e comparado com
        id/nome de cada entidade do jogo via Levenshtein. Ex: <code>monster_dragon_lord.gif</code> casa com
        o monstro <strong>Dragon Lord</strong>. Aplique todos os matches com score ≥ 85% em massa ou corrija
        manualmente na tabela de resultados.
        <br /><br />
        ⚠️ GIFs animados não são redimensionados (perderiam a animação). PNG/JPG &gt; 250KB são reduzidos a 96×96.
      </div>

      {/* Dropzone */}
      <div
        className={'studio-dropzone' + (isDrag ? ' dragover' : '')}
        onClick={pickFiles}
        onDragOver={(e) => { e.preventDefault(); setIsDrag(true); }}
        onDragLeave={() => setIsDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDrag(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <div className="big-icon">📤</div>
        <div><strong>Arraste imagens aqui</strong> ou clique para selecionar</div>
        <div className="small">Aceita PNG, JPG, GIF, WEBP, BMP. Vários arquivos de uma vez.</div>
        <div style={{ marginTop: 12 }}>
          <button
            className="btn primary"
            onClick={(e) => { e.stopPropagation(); pickZip(); }}
            style={{ maxWidth: 280, margin: '0 auto' }}
          >📦 Ou envie um .zip</button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
        />
        <input
          ref={zipInputRef}
          type="file"
          accept=".zip"
          style={{ display: 'none' }}
          onChange={(e) => { if (e.target.files[0]) handleZip(e.target.files[0]); e.target.value = ''; }}
        />
      </div>

      {busy && (
        <div className="admin-info-banner" style={{ marginTop: 12 }}>
          ⏳ {busyMsg}
        </div>
      )}

      {/* Resultados */}
      {results.length > 0 && (
        <>
          <div className="admin-toolbar" style={{ marginTop: 16 }}>
            <h3 style={{ margin: 0 }}>Resultados da Classificação ({results.length})</h3>
            <span className="grow"></span>
            <button className="btn" onClick={applyAllAuto} disabled={busy}>✅ Aplicar matches ≥ 85%</button>
            <button className="btn ghost" onClick={clearResults} disabled={busy}>🧹 Limpar lista</button>
            <button className="btn danger" onClick={clearAllSprites} disabled={busy}>🔥 Apagar todas as sprites</button>
          </div>

          <div className="studio-results">
            {results.map((r, idx) => (
              <StudioResultRow
                key={idx + '-' + r.file?.name}
                r={r}
                onApply={() => applyOne(idx)}
                onChangeMatch={(k, id) => reMatch(idx, k, id)}
              />
            ))}
          </div>
        </>
      )}

      {/* Galeria final: cada entidade mostra a sprite atual (custom ou base) */}
      <h3 style={{ marginTop: 32 }}>📚 Galeria — Sprites em uso</h3>
      <SpriteGallery custom={custom} onChanged={refresh} />
    </>
  );
}

function StudioResultRow({ r, onApply, onChangeMatch }) {
  if (r.error) {
    return (
      <div className="studio-row" style={{ gridTemplateColumns: '56px 1fr 100px' }}>
        <div className="thumb">⚠️</div>
        <div>
          <div className="filename">{r.file?.name || '?'}</div>
          <small style={{ color: 'var(--danger)' }}>{r.error}</small>
        </div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
      </div>
    );
  }

  const m = r.match;
  const status = r.applied
    ? { label: 'APLICADO', cls: 'app' }
    : !m
      ? { label: 'SEM MATCH', cls: 'none' }
      : m.score >= 0.85
        ? { label: `AUTO ${(m.score * 100).toFixed(0)}%`, cls: 'ok' }
        : { label: `BAIXO ${(m.score * 100).toFixed(0)}%`, cls: 'warn' };

  return (
    <div className="studio-row">
      <div className="thumb">
        {r.dataUrl ? <img src={r.dataUrl} alt="" /> : '🖼️'}
      </div>
      <div>
        <div className="filename">{r.file.name} <small>{(r.size / 1024).toFixed(1)} KB</small></div>
        <small style={{ color: 'var(--muted)' }}>normalizado: <code>{SpriteStudio.normalizeName(r.file.name)}</code></small>
      </div>
      <div className="match-pick">
        {m ? (
          <select
            value={`${m.kind}:${m.entityId}`}
            onChange={(e) => {
              const [k, id] = e.target.value.split(':');
              onChangeMatch(k, id);
            }}
          >
            {Object.entries(ALL_ENTITIES()).map(([k, list]) => (
              <optgroup key={k} label={k.toUpperCase()}>
                {list.map(ent => (
                  <option key={`${k}:${ent.id}`} value={`${k}:${ent.id}`}>
                    {ent.name} ({ent.id})
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        ) : (
          <select
            value=""
            onChange={(e) => {
              const [k, id] = e.target.value.split(':');
              onChangeMatch(k, id);
            }}
          >
            <option value="">— escolha manualmente —</option>
            {Object.entries(ALL_ENTITIES()).map(([k, list]) => (
              <optgroup key={k} label={k.toUpperCase()}>
                {list.map(ent => (
                  <option key={`${k}:${ent.id}`} value={`${k}:${ent.id}`}>
                    {ent.name} ({ent.id})
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        )}
        <small style={{ color: 'var(--muted)', display: 'block', marginTop: 2 }}>
          {m ? `→ ${m.name} (${m.kind})` : 'sem match automático'}
        </small>
      </div>
      <div>
        <span className={'match-badge ' + status.cls}>{status.label}</span>
      </div>
      <div></div>
      <div className="actions">
        <button
          className={'icon-btn ' + (r.applied ? '' : '')}
          disabled={!m || r.applied}
          onClick={onApply}
        >{r.applied ? '✓' : 'Aplicar'}</button>
      </div>
    </div>
  );
}

function SpriteGallery({ custom, onChanged }) {
  const [tab, setTab] = useState('vocation');
  const [tick, setTick] = useState(0);
  const lists = useMemo(() => ({
    vocation: VOCATIONS.map(v => ({ kind: 'vocation', id: v.id, name: v.name, fallback: v.icon })),
    monster:  MONSTERS.filter(m => !m.isBoss).map(m => ({ kind: 'monster', id: m.id, name: m.name, fallback: m.icon })),
    boss:     BOSSES.map(b => ({ kind: 'boss', id: b.id, name: b.name, fallback: b.icon })),
    item:     ITEMS_LIST().map(i => ({ kind: 'item', id: i.id, name: i.name, fallback: '📦' })),
    map:      MAPS_LIST().map(m => ({ kind: 'map', id: m.id, name: m.name, fallback: '🗺️' })),
  }), [tick]);
  const cur = lists[tab] || [];
  return (
    <>
      <div className="admin-tabs" style={{ marginTop: 8 }}>
        {Object.keys(lists).map(k => (
          <button
            key={k}
            className={'admin-tab' + (tab === k ? ' active' : '')}
            onClick={() => setTab(k)}
          >{k}</button>
        ))}
      </div>
      <div className="admin-list" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
        {cur.map(ent => (
          <SpriteCard key={`${ent.kind}:${ent.id}`} entry={ent} onChanged={() => { setTick(t => t + 1); onChanged?.(); }} />
        ))}
      </div>
    </>
  );
}

function SpriteCard({ entry, onChanged }) {
  const inputRef = useRef(null);
  const custom = SpriteStudio.getSprite(entry.kind, entry.id);
  const [has, setHas] = useState(!!custom);

  function open() { inputRef.current?.click(); }
  async function onFile(e) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      const dataUrl = await SpriteStudio.fileToCompressedDataUrl(f);
      SpriteStudio.setSprite(entry.kind, entry.id, dataUrl, f.name);
      setHas(true);
      onChanged?.();
    } catch (err) {
      alert('Erro: ' + err.message);
    }
  }
  function clear() {
    if (!window.confirm('Remover sprite customizada desta entidade?')) return;
    SpriteStudio.deleteSprite(entry.kind, entry.id);
    setHas(false);
    onChanged?.();
  }

  const url = has ? custom.dataUrl : null;

  return (
    <div className="sprite-card">
      {has && (
        <button className="remove-btn" onClick={clear} title="Remover sprite customizada">×</button>
      )}
      <div className="sprite-thumb">
        {url ? <img src={url} alt={entry.name} /> : <span style={{ fontSize: 32 }}>{entry.fallback}</span>}
      </div>
      <div className="sprite-key">{entry.name}</div>
      <div className="sprite-sub"><code>{entry.id}</code></div>
      <button
        className={'upload-btn' + (has ? ' has-custom' : '')}
        onClick={open}
      >{has ? '🔄 Substituir' : '📤 Upload'}</button>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFile} />
    </div>
  );
}

// ============================================================
// Helpers locais — listas de entidades (re-aproveitam imports do data.js)
// ============================================================
function ALL_ENTITIES() {
  return {
    vocation: VOCATIONS.map(v => ({ id: v.id, name: v.name, icon: v.icon })),
    monster:  MONSTERS.filter(m => !m.isBoss).map(m => ({ id: m.id, name: m.name, icon: m.icon })),
    boss:     BOSSES.map(b => ({ id: b.id, name: b.name, icon: b.icon })),
    item:     ITEMS.filter(i => i.id !== 'gold').map(i => ({ id: i.id, name: i.name, icon: i.icon })),
    map:      HUNT_ZONES.map(z => ({ id: z.id, name: z.name, icon: z.icon || '🗺️' })),
  };
}

function ITEMS_LIST() {
  return ITEMS.filter(i => i.id !== 'gold').map(i => ({ id: i.id, name: i.name, fallback: i.icon }));
}
function MAPS_LIST() {
  return HUNT_ZONES.map(z => ({ id: z.id, name: z.name, fallback: z.icon || '🗺️' }));
}
function entityByKindAndId(kind, id) {
  const all = ALL_ENTITIES();
  return (all[kind] || []).find(e => e.id === id) || null;
}

// ============================================================
// Players Panel - lista todas as contas e drill-down nos personagens
// ============================================================
function PlayersPanel({ currentAccount }) {
  const [accounts, setAccounts] = useState(() => listAccounts());
  const [selectedId, setSelectedId] = useState(() => {
    const list = listAccounts();
    if (currentAccount) {
      const me = list.find(a => a.id === currentAccount.id);
      if (me) return me.id;
    }
    return list[0]?.id || null;
  });
  const [search, setSearch] = useState('');

  function refresh() {
    setAccounts(listAccounts());
  }

  function handleDeleteAccount(id) {
    if (!window.confirm('Excluir esta conta do registro? Os personagens dela também serão removidos desta máquina.')) return;
    deleteAccountFromRegistry(id);
    if (selectedId === id) {
      const next = listAccounts().filter(a => a.id !== id)[0];
      setSelectedId(next?.id || null);
    }
    refresh();
  }

  const filtered = accounts.filter(a => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (a.email || '').toLowerCase().includes(s)
      || (a.characters || []).some(c => (c.name || '').toLowerCase().includes(s));
  });

  const selected = accounts.find(a => a.id === selectedId) || null;

  return (
    <>
      <h2>👥 Players / Contas</h2>
      <div className="admin-info-banner">
        🔍 Lista de todas as contas registradas nesta máquina. Os dados vêm do registro global
        <code> dungeon_invader_idle_accounts_v1</code>. Toda conta que logou é espelhada aqui automaticamente.
      </div>

      <div className="admin-toolbar">
        <input
          className="search-box"
          placeholder="Buscar por email ou nome de personagem…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="muted small">{filtered.length} de {accounts.length} contas</span>
        <button className="btn ghost" onClick={refresh}>🔄 Atualizar</button>
      </div>

      <div className="players-layout">
        {/* Lista de contas */}
        <div className="players-list">
          {filtered.length === 0 && (
            <p className="muted" style={{ padding: 20, textAlign: 'center' }}>
              Nenhuma conta encontrada.
            </p>
          )}
          {filtered.map(a => (
            <button
              key={a.id}
              className={'player-row' + (a.id === selectedId ? ' active' : '')}
              onClick={() => setSelectedId(a.id)}
            >
              <div className="player-row-head">
                <div className="player-row-email">{a.email}</div>
                <span className="player-row-provider">{a.provider || 'gmail'}</span>
              </div>
              <div className="player-row-meta">
                <span>👤 {(a.characters || []).length} chars</span>
                <span>💳 {2 + (a.paidSlotsUnlocked || 0)}/7 slots</span>
                <span>📅 {new Date(a.createdAt).toLocaleDateString()}</span>
                {currentAccount && a.id === currentAccount.id && <span style={{ color: 'var(--success)' }}>• online</span>}
              </div>
            </button>
          ))}
        </div>

        {/* Detalhe da conta selecionada */}
        {selected ? (
          <AccountDetail account={selected} onDelete={handleDeleteAccount} isSelf={currentAccount?.id === selected.id} />
        ) : (
          <div className="player-detail empty">
            Selecione uma conta à esquerda para ver os personagens.
          </div>
        )}
      </div>
    </>
  );
}

function AccountDetail({ account, onDelete, isSelf }) {
  const chars = account.characters || [];
  return (
    <div className="player-detail">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <h2>{account.email}</h2>
          <div className="email-line">
            ID: <code style={{ fontSize: 11 }}>{account.id}</code> ·
            provider: <strong>{account.provider || 'gmail'}</strong> ·
            criado em {new Date(account.createdAt).toLocaleString()} ·
            slots: {chars.length}/{2 + (account.paidSlotsUnlocked || 0)} (pagos: {account.paidSlotsUnlocked || 0})
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className="icon-btn"
            onClick={() => {
              const data = JSON.stringify(account, null, 2);
              const blob = new Blob([data], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `player-${(account.email || 'acc').replace(/[^a-z0-9]/gi, '_')}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >📥 Exportar conta</button>
          {!isSelf && (
            <button className="icon-btn danger" onClick={() => onDelete(account.id)}>🗑️ Excluir</button>
          )}
        </div>
      </div>

      {chars.length === 0 ? (
        <p className="muted" style={{ marginTop: 24, textAlign: 'center' }}>
          Esta conta ainda não tem personagens.
        </p>
      ) : (
        <div className="chars-grid">
          {chars.map(ch => (
            <CharFullCard key={ch.id} ch={ch} />
          ))}
        </div>
      )}
    </div>
  );
}

function CharFullCard({ ch }) {
  const voc = VOCATIONS.find(v => v.id === ch.vocationId);
  const xpNext = xpForLevel(ch.level + 1);
  const xpPct = xpNext > 0 ? Math.min(100, (ch.xp / xpNext) * 100) : 0;
  const maxHp = playerMaxHealth(ch);
  const maxMp = playerMaxMana(ch);
  const eq = ch.equipment || {};
  const equipSlots = ['helmet', 'armor', 'weapon', 'shield', 'boots', 'ring', 'amulet', 'legs', 'backpack', 'ammunition'];

  return (
    <div className="char-card-full" style={{ borderLeftColor: voc?.color || 'var(--accent)' }}>
      <div className="char-card-head">
        <div className="char-card-orb" style={{ borderColor: voc?.color || 'var(--accent)' }}>{voc?.icon || '❓'}</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="char-card-name">{ch.name}</div>
          <div className="char-card-sub" style={{ color: voc?.color || 'var(--muted)' }}>{voc?.name || ch.vocationId}</div>
        </div>
        <div className="char-card-lv">
          <small>Nível</small><br />
          <strong>{ch.level}</strong>
        </div>
      </div>

      {/* Recursos */}
      <div className="char-section">
        <h4>Recursos</h4>
        <div className="row"><span>HP</span><span className="v">{Math.floor(ch.hp || 0)} / {maxHp}</span></div>
        <div className="row"><span>MP</span><span className="v">{Math.floor(ch.mana || 0)} / {maxMp}</span></div>
        <div className="row"><span>XP</span><span className="v xp">{(ch.xp || 0).toLocaleString()} / {xpNext.toLocaleString()} ({xpPct.toFixed(1)}%)</span></div>
        <div className="row"><span>💰 Gold</span><span className="v gold">{(ch.gold || 0).toLocaleString()}</span></div>
      </div>

      {/* Stats base */}
      <div className="char-section">
        <h4>Atributos</h4>
        <div className="row"><span>❤️ Vitalidade</span><span className="v">{ch.stats?.health ?? '-'}</span></div>
        <div className="row"><span>🔵 Mana base</span><span className="v">{ch.stats?.mana ?? '-'}</span></div>
        <div className="row"><span>💪 Força</span><span className="v">{ch.stats?.strength ?? '-'}</span></div>
        <div className="row"><span>🎯 Destreza</span><span className="v">{ch.stats?.dexterity ?? '-'}</span></div>
        <div className="row"><span>🧠 Inteligência</span><span className="v">{ch.stats?.intelligence ?? '-'}</span></div>
        <div className="row"><span>🩸 Vitalidade (stat)</span><span className="v">{ch.stats?.vitality ?? '-'}</span></div>
      </div>

      {/* Skills */}
      <div className="char-section">
        <h4>Skills (cap {MAX_SKILL_LEVEL})</h4>
        <div className="skills-table">
          {Object.entries(ch.skills || {}).map(([k, lv]) => {
            const cur = skillXpForLevel(lv);
            const next = skillXpForLevel(lv + 1);
            const isMax = lv >= MAX_SKILL_LEVEL;
            return (
              <div key={k} className="skill-mini">
                <span className="lbl">{k}</span>
                <span className={'val' + (isMax ? ' max' : '')}>
                  {isMax ? '✨ MAX' : `${lv} • ${Math.floor((ch.skillXp?.[k] || 0) - cur).toLocaleString()}/${(next - cur).toLocaleString()}`}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Equipamento */}
      <div className="char-section">
        <h4>Equipamento</h4>
        <div className="equip-mini">
          {equipSlots.map(slot => {
            const it = eq[slot];
            if (!it) {
              return <div key={slot} className="slot"><span className="icon">·</span><span className="name">{slot}</span></div>;
            }
            return (
              <div key={slot} className="slot filled" title={it.name}>
                <span className="icon">{it.icon || '🎽'}</span>
                <span className="name">{it.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Inventário */}
      <div className="char-section">
        <h4>Inventário ({(ch.inventory || []).length} itens)</h4>
        <div className="inv-mini">
          {(ch.inventory || []).slice(0, 30).map((it, idx) => (
            <span key={idx} className="inv-chip" title={it.name}>
              {it.icon || '📦'} {it.name} {it.amount > 1 && <span className="amt">×{it.amount}</span>}
            </span>
          ))}
          {(ch.inventory || []).length > 30 && (
            <span className="inv-chip">+{(ch.inventory || []).length - 30} mais…</span>
          )}
        </div>
      </div>

      {/* Estatísticas */}
      <div className="char-section">
        <h4>Estatísticas</h4>
        <div className="row"><span>👹 Monstros mortos</span><span className="v">{(ch.monstersKilled || 0).toLocaleString()}</span></div>
        <div className="row"><span>💀 Bosses derrotados</span><span className="v">{(ch.bossesKilled || 0).toLocaleString()}</span></div>
        <div className="row"><span>☠️ Mortes</span><span className="v">{ch.deaths || 0}</span></div>
        <div className="row"><span>⏱️ Tempo jogado</span><span className="v">{formatHMS(ch.totalPlayTime || 0)}</span></div>
        <div className="row"><span>📅 Criado em</span><span className="v">{new Date(ch.createdAt).toLocaleDateString()}</span></div>
        <div className="row"><span>🕒 Último acesso</span><span className="v">{ch.lastSeen ? new Date(ch.lastSeen).toLocaleString() : '—'}</span></div>
      </div>
    </div>
  );
}

function formatHMS(s) {
  s = Math.floor(s || 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}
