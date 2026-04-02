export type WorkerType = "W2" | "1099";

export interface Worker {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  workerType: WorkerType;
}
