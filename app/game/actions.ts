'use server';

import { createClient } from '@/lib/supabase/server';

type Input={missionId:string;decisionId:string;index:number;mode?:'mission'|'replay'};

export async function submitCampaignDecision(input:Input){
  const sb=await createClient();
  const{data:{user}}=await sb.auth.getUser();
  if(!user)return{ok:false,error:'Sessão expirada.'};
  if(!input?.missionId||!input?.decisionId||!Number.isInteger(input.index))return{ok:false,error:'Decisão inválida.'};

  const{data,error}=await sb.from('decision_attempts').insert({
    user_id:user.id,
    mission_id:input.missionId,
    decision_id:input.decisionId,
    selected_index:input.index,
    selected_text:'',
    correct:false,
    mode:input.mode==='replay'?'replay':'mission',
    feedback_snapshot:{},
  }).select('correct,attempt_no,selected_text,feedback_snapshot').single();

  if(error)return{ok:false,error:error.message||'Não foi possível registrar a decisão.'};
  return{ok:true,data:{
    correct:!!data.correct,
    attemptNo:Number(data.attempt_no||1),
    selectedText:String(data.selected_text||''),
    feedback:data.feedback_snapshot||{},
  }};
}
