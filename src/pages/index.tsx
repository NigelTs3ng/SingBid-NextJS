"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '../lib/supabase-browser';

const supabase = createClient();

export default function HomePage() {
  const router = useRouter();
  const [status, setStatus] = useState<'checking' | 'redirecting'>('checking');

  useEffect(() => {
    let isMounted = true;

    const determineDestination = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (error) {
          console.error('HomePage: getSession failed', error);
          setStatus('redirecting');
          router.replace('/home-page');
          return;
        }

        const sessionUser = data.session?.user;

        if (!sessionUser) {
          setStatus('redirecting');
          router.replace('/home-page');
          return;
        }

        const role =
          typeof sessionUser.user_metadata?.user_role === 'string'
            ? sessionUser.user_metadata.user_role.toLowerCase()
            : 'bidder';

        const destination = role === 'seller' ? '/home/seller' : '/home/bidder';

        if (router.asPath !== destination) {
          setStatus('redirecting');
          await router.replace(destination);
        }
      } catch (err) {
        console.error('HomePage: unexpected error determining destination', err);
        if (!isMounted) return;
        setStatus('redirecting');
        router.replace('/home-page');
      }
    };

    determineDestination();

    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          {status === 'redirecting' ? 'Taking you to your dashboard...' : 'Loading BidWin...'}
        </h1>
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
      </div>
    </div>
  );
}