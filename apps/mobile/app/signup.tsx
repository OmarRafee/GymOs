import { Link } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Action, Field, Message, Page, Title, colors, ui } from '@/lib/ui';

export default function Signup() {
  const [name,setName]=useState('');const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [message,setMessage]=useState('');const [error,setError]=useState(false);const [busy,setBusy]=useState(false);
  async function submit(){if(!supabase){setError(true);setMessage('Add the Expo Supabase URL and publishable key to apps/mobile/.env.');return;}setBusy(true);const {data,resultError}=await supabase.auth.signUp({email:email.trim(),password,options:{data:{full_name:name.trim()}}}).then(({data,error})=>({data,resultError:error}));setBusy(false);if(resultError){setError(true);setMessage(resultError.message);}else{setError(false);setMessage(data.session?'Account created. Link your existing gym membership to continue.':'Check your email to confirm your account, then sign in and link your membership.');}}
  return <Page><Title eyebrow="GET STARTED">Create your account</Title><Text style={ui.muted}>Your account is private. You’ll need a one-time code from gym staff to connect your existing member record.</Text>{message?<Message error={error}>{message}</Message>:null}<Field label="Full name" value={name} onChangeText={setName} placeholder="Your name"/><Field label="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="you@example.com"/><Field label="Password (8+ characters)" value={password} onChangeText={setPassword} secureTextEntry placeholder="Choose a password"/><Action title={busy?'Creating account…':'Create account'} onPress={submit} disabled={busy}/><Text style={ui.muted}>Already registered? <Link href="/login" style={{color:colors.deep,fontWeight:'700'}}>Sign in</Link></Text></Page>;
}
