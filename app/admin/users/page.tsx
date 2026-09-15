import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import UserManager from '@/components/admin/user-manager';

export default async function AdminUsers(){
  const sb=await createClient();
  const {data:{user}}=await sb.auth.getUser();
  if(!user) redirect('/');
  const {data:isAdmin}=await sb.rpc('is_admin');
  if(isAdmin!==true) redirect('/dashboard');
  return <UserManager/>;
}
