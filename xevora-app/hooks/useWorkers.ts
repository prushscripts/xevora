import type { Worker } from "@/types";

export function useWorkers() {
  return {
    workers: [] as Worker[],
    loading: false,
    error: null as string | null,
  };
}
