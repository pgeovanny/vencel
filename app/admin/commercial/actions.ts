'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function saveCommercialConfig(formData:FormData){
  const sb=await createClient();
  const {data:{user}}=await sb.auth.getUser();
  if(!user)throw new Error('Sessão necessária.');
  const {data:isAdmin}=await sb.rpc('is_admin');
  if(isAdmin!==true)throw new Error('Acesso administrativo necessário.');
  const planName=String(formData.get('plan_name')||'').trim();
  const priceLabel=String(formData.get('price_label')||'').trim();
  const checkoutUrl=String(formData.get('checkout_url')||'').trim();
  const salesHeadline=String(formData.get('sales_headline')||'').trim();
  const trialDays=Number(formData.get('trial_days')||7);
  const trialMissionLimit=Number(formData.get('trial_mission_limit')||2);
  const {error}=await sb.rpc('admin_update_product_config',{p_plan_name:planName,p_price_label:priceLabel||null,p_checkout_url:checkoutUrl||null,p_trial_days:trialDays,p_trial_mission_limit:trialMissionLimit,p_sales_headline:salesHeadline});
  if(error)throw new Error(error.message);
  revalidatePath('/admin/commercial');revalidatePath('/premium');revalidatePath('/dashboard');
}
