export function missionForClient<T=any>(mission:T):T{
  if(!mission||typeof mission!=='object')return mission;
  const source:any=mission;
  return {
    ...source,
    decisions:(source.decisions||[]).map((decision:any)=>{
      const{feedback:_feedback,...safeDecision}=decision||{};
      return{
        ...safeDecision,
        choices:(decision?.choices||[]).map((choice:any)=>({text:String(choice?.text||'')})),
      };
    }),
  } as T;
}
