export function useAuth() {
  return {
    user: null,
    loading: false,
    error: null as string | null,
  };
}
