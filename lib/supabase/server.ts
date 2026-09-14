import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { env } from '@/lib/env';
export async function createClient(){
  const store = await cookies();
  return createServerClient(env.supabaseUrl, env.supabaseKey, {cookies:{getAll(){return store.getAll();},setAll(items){try{items.forEach(({name,value,options})=>store.set(name,value,options));}catch{}}}});
}
