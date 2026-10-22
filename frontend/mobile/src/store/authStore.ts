import { create } from 'zustand';
import { UserProfile } from '../types/auth';
import { supabase, isSupabaseConfigured } from '../services/supabase';

interface AuthStore {
  user: UserProfile | null;
  isLoading: boolean;
  initialize: () => Promise<void>;
  setUser: (user: UserProfile | null) => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: {
    id: 'user-demo',
    email: 'demo@taichinh.vn',
    fullName: 'Người dùng Thử nghiệm',
    createdAt: new Date().toISOString(),
  },
  isLoading: false,

  initialize: async () => {
    if (!isSupabaseConfigured) {
      set({ isLoading: false });
      return;
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        set({
          user: {
            id: session.user.id,
            email: session.user.email || '',
            fullName: session.user.user_metadata?.full_name || 'Người dùng',
            createdAt: session.user.created_at,
          },
          isLoading: false,
        });
      } else {
        set({ user: null, isLoading: false });
      }
    } catch (e) {
      set({ isLoading: false });
    }
  },

  setUser: (user) => set({ user }),

  signOut: async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    set({ user: null });
  },
}));
