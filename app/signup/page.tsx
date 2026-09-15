'use client';

import { FormEvent, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Status = 'idle' | 'loading' | 'done' | 'error';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('geovanny9+novo@gmail.com');
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
        const detail = data?.message || data?.error || error?.message || 'Falha ao criar a conta.';
        setStatus('error');
        setMessage(String(detail));
        return;
      }

      const userId = data?.user?.id;
      if (!userId) {
        setStatus('error');
        setMessage('O servidor não confirmou a criação da conta.');
        return;
      }

      const auth = await supabase.auth.signInWithPassword({ email: normalized, password });
      if (auth.error) {
        setStatus('done');
        setMessage('Conta criada e confirmada. Volte ao login para entrar.');
        return;
      }

      window.location.href = '/dashboard';
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Falha inesperada ao criar a conta.');
    }
  }

  if (status === 'done') {
    return <main className="shell"><section className="card center"><div className="ey">CONTA CRIADA</div><h1>Cadastro concluído</h1><p className="ok">{message}</p><a className="btn primary" href="/">Ir para o login</a></section></main>;
  }

  return (
    <main className="shell">
      <section className="card center">
        <div className="ey">NOVO ACESSO</div>
        <h1>Criar conta</h1>
        <p className="muted">O cadastro só é confirmado quando o Supabase Auth retorna um usuário real. Erros do backend aparecem nesta tela.</p>
        {status === 'error' && <p className="error">{message}</p>}
        <form onSubmit={submit}>
          <div className="field"><label>NOME</label><input value={name} onChange={e=>setName(e.target.value)} required disabled={status==='loading'}/></div>
          <div className="field"><label>E-MAIL</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required disabled={status==='loading'}/></div>
          <div className="field"><label>SENHA</label><input type="password" minLength={8} value={password} onChange={e=>setPassword(e.target.value)} required disabled={status==='loading'}/></div>
          <div className="field"><label>CONFIRMAR</label><input type="password" minLength={8} value={confirm} onChange={e=>setConfirm(e.target.value)} required disabled={status==='loading'}/></div>
          <button className="btn primary" type="submit" disabled={status==='loading'}>{status==='loading'?'Criando...':'Criar conta'}</button>
        </form>
      </section>
    </main>
  );
}
