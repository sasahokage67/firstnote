// Replaces Lovable's hosted OAuth broker (works only on *.lovable.app) with
// plain Supabase OAuth, so Google sign-in works on any domain (e.g. Vercel).
// The provider must be enabled in Supabase → Authentication → Providers.
import type { Provider } from "@supabase/supabase-js";
import { supabase } from "../supabase/client";

type SignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

export const lovable = {
  auth: {
    signInWithOAuth: async (provider: Provider, opts?: SignInOptions) => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: opts?.redirect_uri ?? window.location.origin,
          ...(opts?.extraParams ? { queryParams: opts.extraParams } : {}),
        },
      });
      return { error, redirected: !error };
    },
  },
};
