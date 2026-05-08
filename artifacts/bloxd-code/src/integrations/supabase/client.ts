// Supabase has been replaced with the API server + Clerk auth.
// This stub exists to satisfy any remaining imports that haven't been migrated yet.
export const supabase = {
  auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }) },
  from: (_table: string) => ({ select: () => Promise.resolve({ data: [], error: null }) }),
  channel: () => ({ on: () => ({ subscribe: () => {} }), unsubscribe: () => {} }),
  storage: { from: () => ({ upload: async () => ({ error: new Error("Not available") }), getPublicUrl: () => ({ data: { publicUrl: "" } }) }) },
};
