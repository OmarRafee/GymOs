import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Action, Field, Message, Page, Title, colors, ui } from '@/lib/ui';

export default function Login() {
  const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [error,setError]=useState(''); const [busy,setBusy]=useState(false);
  async function submit(){ if(!supabase){setError('Add the Expo Supabase URL and publishable key to apps/mobile/.env.');return;} setBusy(true);const {error}=await supabase.auth.signInWithPassword({email:email.trim(),password});setBusy(false);if(error)setError(error.message);else router.replace('/(tabs)'); }
  return <Page><View style={{marginTop:50,gap:16}}><View style={{width:42,height:42,borderRadius:12,backgroundColor:colors.lime,alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:23,fontWeight:'800',color:colors.deep}}>G</Text></View><Title eyebrow="GYMOS MEMBER">Welcome back</Title><Text style={ui.muted}>Sign in to view your membership, visits, and classes.</Text></View>{error? <Message error>{error}</Message>:null}<Field label="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="you@example.com"/><Field label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="Your password"/><Action title={busy?'Signing in…':'Sign in'} onPress={submit} disabled={busy}/><Text style={ui.muted}>New to the app? <Link href="/signup" style={{color:colors.deep,fontWeight:'700'}}>Create account</Link></Text></Page>;
}
