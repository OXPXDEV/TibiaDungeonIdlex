import React, { useState } from 'react';

// Painel de login / cadastro via Gmail (simulado, sem backend)
// Persiste a conta no estado do jogo
export default function Login({ onLogin }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isGmail, setIsGmail] = useState(false);

  function validateEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!validateEmail(email)) {
      setError('Email inválido');
      return;
    }
    if (mode === 'register' && password.length < 4) {
      setError('Senha precisa ter pelo menos 4 caracteres');
      return;
    }
    if (mode === 'login' && password.length < 1) {
      setError('Digite sua senha');
      return;
    }
    // Verifica se é Gmail
    const gmailOk = email.toLowerCase().endsWith('@gmail.com');
    setIsGmail(gmailOk);
    onLogin(email, password, gmailOk);
  }

  function handleGmailClick() {
    // Simula fluxo OAuth do Google
    const fakeEmail = 'player' + Math.floor(Math.random() * 9999) + '@gmail.com';
    setEmail(fakeEmail);
    setPassword('google_oauth_' + Math.random().toString(36).slice(2, 12));
    setIsGmail(true);
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="logo">⚔️</div>
          <h1>Dungeon Invader Idle</h1>
          <p className="subtitle">Batalha automatizada estilo Tibia</p>
        </div>

        <div className="tabs">
          <button
            type="button"
            className={mode === 'login' ? 'tab active' : 'tab'}
            onClick={() => setMode('login')}
          >
            Entrar
          </button>
          <button
            type="button"
            className={mode === 'register' ? 'tab active' : 'tab'}
            onClick={() => setMode('register')}
          >
            Criar Conta
          </button>
        </div>

        <form onSubmit={handleSubmit} className="form">
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@gmail.com"
              autoComplete="email"
              required
            />
          </label>

          <label className="field">
            <span>Senha</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'login' ? 'Sua senha' : 'Crie uma senha'}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </label>

          {error && <div className="error">{error}</div>}

          <button type="submit" className="btn primary">
            {mode === 'login' ? 'Entrar' : 'Criar Conta'}
          </button>
        </form>

        <div className="divider">
          <span>ou</span>
        </div>

        <button type="button" className="btn google" onClick={handleGmailClick}>
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
            <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
            <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
            <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
          </svg>
          Entrar com Gmail
        </button>

        <p className="hint">
          {isGmail
            ? '✓ Gmail conectado'
            : 'Dica: use um @gmail.com para entrar com um clique'}
        </p>
      </div>
    </div>
  );
}
