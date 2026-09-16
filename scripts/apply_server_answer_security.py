from pathlib import Path


def once(text, old, new, label):
    if old not in text:
        raise RuntimeError(f'missing pattern: {label}')
    return text.replace(old, new, 1)

# Runtime: campaign submission goes through a server action and consumes server feedback.
p=Path('components/game-runtime-pro-v4.tsx')
s=p.read_text()
s=once(s,"import { submitPlantaoAnswer } from '@/app/plantao/actions';","import { submitPlantaoAnswer } from '@/app/plantao/actions';\nimport { submitCampaignDecision } from '@/app/game/actions';",'campaign action import')

old="  async function nextDbAttempt(decisionId:string){const{data,error}=await sb.current.from('decision_attempts').select('attempt_no').eq('user_id',userId).eq('mission_id',missionId).eq('decision_id',decisionId).order('attempt_no',{ascending:false}).limit(1).maybeSingle();if(error){console.error(error);return null}return Number(data?.attempt_no||0)+1}\n"
s=s.replace(old,'')

old="""      const dbAttempt=await nextDbAttempt(d.id);if(!dbAttempt){setOverlay({type:'decisionError',d,message:'Não foi possível preparar o registro da tentativa. Tente novamente.'});setCloud('Falha ao registrar tentativa');return}
      const correct=!!c.correct,wrong=!correct&&runAttempt===1&&!r.wrong.includes(d.id)?[...r.wrong,d.id]:r.wrong,base={...r,wrong,attemptCounts:{...r.attemptCounts,[d.id]:runAttempt}},next=correct?{...base,decisions:base.decisions.includes(d.id)?base.decisions:[...base.decisions,d.id]}:base;
      const{error}=await sb.current.from('decision_attempts').insert({user_id:userId,mission_id:missionId,decision_id:d.id,attempt_no:dbAttempt,selected_index:i,selected_text:c.text,correct,mode:replayMode?'replay':'mission',feedback_snapshot:{...(d.feedback||{}),choice_feedback:c.feedback,choice_index:i,correct}});
      if(error){console.error(error);setOverlay({type:'decisionError',d,message:'A tentativa não foi registrada. Nada foi perdido; clique para tentar novamente.'});setCloud('Falha ao registrar tentativa');return}
      setLocal(next);const fb:FeedbackOverlay={type:'feedback',d,choice:c,choiceIndex:i,correct,next,saved:false};setOverlay(fb);setCloud(correct?'Resposta registrada • salvando…':'Erro registrado • salvando…');await saveFeedbackState(fb)"""
new="""      const response=await submitCampaignDecision({missionId,decisionId:d.id,index:i,mode:replayMode?'replay':'mission'});
      if(!response.ok||!response.data){setOverlay({type:'decisionError',d,message:response.error||'A tentativa não foi registrada. Nada foi perdido; clique para tentar novamente.'});setCloud('Falha ao registrar tentativa');return}
      const server=response.data,actualAttempt=Number(server.attemptNo||runAttempt),correct=!!server.correct,wrong=!correct&&actualAttempt===1&&!r.wrong.includes(d.id)?[...r.wrong,d.id]:r.wrong,base={...r,wrong,attemptCounts:{...r.attemptCounts,[d.id]:actualAttempt}},next=correct?{...base,decisions:base.decisions.includes(d.id)?base.decisions:[...base.decisions,d.id]}:base;
      const serverDecision={...d,feedback:server.feedback||{}},serverChoice={...c,text:server.selectedText||c.text,feedback:server.feedback?.choice_feedback};
      setLocal(next);const fb:FeedbackOverlay={type:'feedback',d:serverDecision,choice:serverChoice,choiceIndex:i,correct,next,saved:false};setOverlay(fb);setCloud(correct?'Resposta registrada • salvando…':'Erro registrado • salvando…');await saveFeedbackState(fb)"""
s=once(s,old,new,'campaign server answer block')
p.write_text(s)

# Campaign page: keep authoritative mission on server, send sanitized mission to client.
p=Path('app/game/[id]/page.tsx')
s=p.read_text()
s=once(s,"import GameCommercialLayer from '@/components/game-commercial-layer';","import GameCommercialLayer from '@/components/game-commercial-layer';\nimport { missionForClient } from '@/lib/game/client-mission';",'game sanitizer import')
s=once(s,"  const mission: any = missionRow.mission_json;\n  if (!mission || mission.schema !== 'jurisquest.mission.v2') notFound();","  const mission: any = missionRow.mission_json;\n  if (!mission || mission.schema !== 'jurisquest.mission.v2') notFound();\n  const clientMission=missionForClient(mission);",'game client mission')
s=once(s,"      mission={mission}\n","      mission={clientMission}\n",'game sanitized prop')
p.write_text(s)

# Plantão page: build with authoritative mission, then sanitize only at client boundary.
p=Path('app/plantao/page.tsx')
s=p.read_text()
s=once(s,"import GameCommercialLayer from '@/components/game-commercial-layer';","import GameCommercialLayer from '@/components/game-commercial-layer';\nimport { missionForClient } from '@/lib/game/client-mission';",'plantao sanitizer import')
s=once(s,"  const initialCharacter=character||{","  const clientRuntimeMission=missionForClient(runtimeMission);\n\n  const initialCharacter=character||{",'plantao client mission')
s=once(s,"      mission={runtimeMission}\n","      mission={clientRuntimeMission}\n",'plantao sanitized prop')
p.write_text(s)
