import { Redirect } from 'expo-router';
import { useSession } from '@/lib/session';
import { Loading } from '@/lib/ui';

export default function Index() {
  const { session, loading } = useSession();
  if (loading) return <Loading />;
  return <Redirect href={session ? '/(tabs)' : '/login'} />;
}
