'use client';

import { FormEvent, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Status = 'idle' | 'loading' | 'done' | 'error';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === 'loading') return;

    const display_name = name.trim();
    const normalized = email.trim().toLowerCase();
    if (display_name.length < 2) {
      setStatus('error'); setMessage('Informe um nome válido.'); return;
    }
    if (!normalized.includes('@')) {
      setStatus('error'); setMessage('Informe um e-mail válido.'); return;
    }
    if (password.length < 8 || password !== confirm) {
      setStatus('error'); setMessage('As senhas devem ser iguais e ter pelo menos 8 caracteres.'); return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke('public-signup', {
        body: { email: normalized, password, display_name },
      });

      if (error || data?.error) {
        const detail = data?.message || data?.error || error?.message || 'Não foi possível criar sua conta.';
        setStatus('error');
        setMessage(String(detail));
        return;
      }

      const userId = data?.user?.id;
      if (!userId) {
        setStatus('error');
        setMessage('Não foi possível confirmar a criação da conta. Tente novamente.');
        return;
      }

      const auth = await supabase.auth.signInWithPassword({ email: normalized, password });
      if (auth.error) {
        setStatus('done');
        setMessage('Conta criada. Entre com seu e-mail e senha para continuar.');
        return;
      }

      window.location.href = '/dashboard';
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Falha inesperada ao criar a conta.');
    }
  }

  if (status === 'done') {
    return <main className="shell"><section className="card center"><div className="ey">ACESSO CRIADO</div><h1>Cadastro concluído</h1><p className="ok">{message}</p><a className="btn primary" href="/">Entrar no JurisQuest</a></section></main>;
  }

  return (
    <main className="shell">
      <section className="card center">
        <div className="ey">COMECE SUA CAMPANHA</div>
        <h1>Criar conta</h1>
        <p className="muted">Crie seu acesso ao JurisQuest. Seu progresso, decisões e revisões ficam vinculados à sua conta.</p>
        {status === 'error' && <p className="error">{message}</p>}
        <form onSubmit={submit}>
          <div className="field"><label>NOME</label><input value={name} onChange={e=>setName(e.target.value)} autoComplete="name" required disabled={status==='loading'}/></div>
          <div className="field"><label>E-MAIL</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" required disabled={status==='loading'}/></div>
          <div className="field"><label>SENHA</label><input type="password" minLength={8} value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password" required disabled={status==='loading'}/></div>
          <div className="field"><label>CONFIRMAR SENHA</label><input type="password" minLength={8} value={confirm} onChange={e=>setConfirm(e.target.value)} autoComplete="new-password" required disabled={status==='loading'}/></div>
          <button className="btn primary" type="submit" disabled={status==='loading'}>{status==='loading'?'Criando acesso...':'Criar conta'}</button>
        </form>
      </section>
    </main>
  );
}
