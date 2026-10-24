export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
}

export interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
