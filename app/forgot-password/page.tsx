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
    if (!normalized || !normalized.includes('@')) { setStatus('error'); setMessage('Informe um e-mail válido.'); return; }
    setStatus('loading'); setMessage('');
    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(normalized, { redirectTo });
      if (error) {
        const text=(error.message||'').toLowerCase(), code=String((error as {code?:string}).code||'').toLowerCase();
        if(text.includes('rate limit')||text.includes('too many')||code.includes('rate_limit')){setStatus('rate-limited');setMessage('O serviço de recuperação atingiu um limite temporário de envio. Aguarde alguns minutos antes de tentar novamente.');return;}
        setStatus('error');setMessage('Não foi possível enviar o link agora. Tente novamente em instantes.');return;
      }
      setStatus('sent');
    } catch { setStatus('error'); setMessage('Não foi possível solicitar a recuperação agora.'); }
  }

  if(status==='sent')return <main className="shell"><section className="card center"><div className="ey">RECUPERAÇÃO SOLICITADA</div><h1>Confira seu e-mail</h1><p className="ok">Se a conta estiver disponível para recuperação, você receberá as instruções em instantes.</p><p className="muted">Use o link recebido para definir uma nova senha e voltar à sua campanha.</p><a className="btn primary" href="/">Voltar ao login</a></section></main>;
  if(status==='rate-limited')return <main className="shell"><section className="card center"><div className="ey">ENVIO TEMPORARIAMENTE INDISPONÍVEL</div><h1>Tente novamente em alguns minutos</h1><p className="error">{message}</p><a className="btn primary" href="/">Voltar ao login</a></section></main>;

  return <main className="shell"><section className="card center"><div className="ey">RECUPERAÇÃO DE ACESSO</div><h1>Definir uma nova senha</h1><p className="muted">Informe o e-mail da sua conta. Enviaremos um link seguro de recuperação.</p>{status==='error'&&<p className="error">{message}</p>}<form onSubmit={submit}><div className="field"><label>E-MAIL</label><input name="email" type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} required disabled={status==='loading'}/></div><button className="btn primary" type="submit" disabled={status==='loading'}>{status==='loading'?'Enviando...':'Enviar link de recuperação'}</button></form></section></main>;
}
