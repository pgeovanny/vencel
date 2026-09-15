'use client';

import { FormEvent, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Status = 'idle' | 'loading' | 'sent' | 'error' | 'rate-limited';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === 'loading' || status === 'rate-limited') return;

    const normalized = email.trim().toLowerCase();
    if (!normalized || !normalized.includes('@')) {
      setStatus('error');
      setMessage('Informe um e-mail válido.');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(normalized, { redirectTo });

      if (error) {
        const text = (error.message || '').toLowerCase();
        const code = String((error as { code?: string }).code || '').toLowerCase();
        const isRateLimit = text.includes('rate limit') || text.includes('too many') || code.includes('rate_limit');

        if (isRateLimit) {
          setStatus('rate-limited');
          setMessage('O provedor de e-mail padrão do Supabase atingiu o limite do projeto. Não adianta clicar novamente agora.');
          return;
        }

        setStatus('error');
        setMessage(error.message || 'Não foi possível enviar o link de recuperação.');
        return;
      }

      setStatus('sent');
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Falha inesperada ao solicitar a recuperação.');
    }
  }

  if (status === 'sent') {
    return (
      <main className="shell">
        <section className="card center">
          <div className="ey">RECUPERAÇÃO SOLICITADA</div>
          <h1>E-mail enviado</h1>
          <p className="ok">A solicitação foi aceita pelo Supabase Auth.</p>
          <p className="muted">
            Abra a caixa de entrada de <strong>{email.trim().toLowerCase()}</strong> e use o link de recuperação. O link deve retornar para o JurisQuest e abrir a tela de nova senha.
          </p>
          <div className="row">
            <a className="btn primary" href="/">Voltar ao login</a>
          </div>
        </section>
      </main>
    );
  }

  if (status === 'rate-limited') {
    return (
      <main className="shell">
        <section className="card center">
          <div className="ey">LIMITE DO PROVEDOR</div>
          <h1>Envio temporariamente bloqueado</h1>
          <p className="error">{message}</p>
          <p className="muted">
            O SMTP padrão do Supabase no plano gratuito tem limite global muito baixo para e-mails de autenticação. O botão fica bloqueado de propósito para evitar novas tentativas inúteis. Para produção, o JurisQuest deve usar SMTP transacional próprio.
          </p>
          <div className="row">
            <a className="btn primary" href="/">Voltar ao login</a>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <section className="card center">
        <div className="ey">RECUPERAÇÃO</div>
        <h1>Recuperar senha</h1>
        <p className="muted">
          Informe o e-mail da conta. O envio é feito diretamente pelo Supabase Auth e o resultado aparece aqui na tela.
        </p>
        {status === 'error' && <p className="error">{message}</p>}
        <form onSubmit={submit}>
          <div className="field">
            <label>E-MAIL</label>
            <input
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={status === 'loading'}
            />
          </div>
          <button className="btn primary" type="submit" disabled={status === 'loading'}>
            {status === 'loading' ? 'Enviando...' : 'Enviar link de recuperação'}
          </button>
        </form>
      </section>
    </main>
  );
}
