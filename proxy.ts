import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { env } from '@/lib/env';
export async function proxy(request:NextRequest){let response=NextResponse.next({request});const supabase=createServerClient(env.supabaseUrl,env.supabaseKey,{cookies:{getAll(){return request.cookies.getAll();},setAll(items){items.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});items.forEach(({name,value,options})=>response.cookies.set(name,value,options));}}});await supabase.auth.getUser();return response;}
export const config={matcher:['/((?!_next/static|_next/image|favicon.ico).*)']};
