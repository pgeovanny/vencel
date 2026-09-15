import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { saveCommercialConfig } from './actions';

export default async function CommercialAdmin(){
  const sb=await createClient();const {data:{user}}=await sb.auth.getUser();if(!user)redirect('/');const {data:isAdmin}=await sb.rpc('is_admin');if(isAdmin!==true)redirect('/dashboard');
  const {data:cfg}=await sb.rpc('product_public_config');const c:any=cfg||{};
  return <main className="adminShell"><section className="adminHero"><div><div className="ey">PRODUTO E CONVERSÃO</div><h1>Configuração Comercial</h1><p>Controle o trial e conecte o checkout sem alterar código. O acesso pago continua sendo concedido pelo fluxo de grants/webhook.</p></div><div className="adminHeroActions"><a className="btn" href="/admin">Voltar ao ADM</a><a className="btn" href="/premium">Ver página Premium</a></div></section>
  <section className="adminPanel"><div className="panelHead"><div><div className="ey">PLANO</div><h2>Oferta exibida ao aluno</h2></div></div><form action={saveCommercialConfig} style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
    <label>Nome do plano<input className="input" name="plan_name" required defaultValue={c.plan_name||'JurisQuest Premium'}/></label>
    <label>Preço exibido<input className="input" name="price_label" placeholder="Ex.: R$ 39,90/mês" defaultValue={c.price_label||''}/></label>
    <label style={{gridColumn:'1/-1'}}>Headline<input className="input" name="sales_headline" defaultValue={c.sales_headline||''}/></label>
    <label style={{gridColumn:'1/-1'}}>URL HTTPS do checkout<input className="input" type="url" name="checkout_url" placeholder="https://..." defaultValue={c.checkout_url||''}/></label>
    <label>Dias de trial<input className="input" type="number" min="0" max="90" name="trial_days" defaultValue={c.trial_days||7}/></label>
    <label>Missões liberadas no trial<input className="input" type="number" min="0" max="50" name="trial_mission_limit" defaultValue={c.trial_mission_limit||2}/></label>
    <div><button className="btn primary" type="submit">Salvar configuração</button></div>
  </form><p style={{fontSize:11,opacity:.7,marginTop:14}}>Ao informar uma URL de checkout, os CTAs Premium passam a enviar o aluno diretamente para ela. A confirmação automática de pagamento deve depois conceder um grant do tipo <b>payment</b> ou <b>subscription</b>.</p></section></main>;
}
