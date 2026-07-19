"use client";

/**
 * Live notification push (EX-709). When Supabase env is configured, subscribe
 * to INSERTs on crm_notifications for the signed-in human and refresh the
 * server-rendered tree (bell count, notification list) on each arrival.
 * Renders nothing; without Supabase config it is a no-op and the bell
 * degrades to refresh-on-navigation.
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NotificationsLive({ recipient }: { recipient: string }) {
  const router = useRouter();
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;
    let cleanup = () => {};
    let cancelled = false;
    import("@supabase/supabase-js").then(({ createClient }) => {
      if (cancelled) return;
      const supabase = createClient(url, key, { auth: { persistSession: false } });
      const channel = supabase
        .channel(`crm-notify-${recipient}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "crm_notifications", filter: `recipient=eq.${recipient}` },
          () => router.refresh(),
        )
        .subscribe();
      cleanup = () => { supabase.removeChannel(channel); };
    });
    return () => { cancelled = true; cleanup(); };
  }, [recipient, router]);
  return null;
}
