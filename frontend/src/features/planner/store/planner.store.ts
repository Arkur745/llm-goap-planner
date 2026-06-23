import { create } from "zustand";

import type {
  PlannerExecutionSnapshot,
  PlannerGeneratePlanRequest,
  PlannerGeneratePlanResponse,
} from "@features/planner/model/planner.models";

interface PlannerStoreActions {
  beginExecution: (request: PlannerGeneratePlanRequest) => void;
  completeExecution: (result: PlannerGeneratePlanResponse) => void;
  failExecution: (message: string) => void;
  resetExecution: () => void;
}

export type PlannerStoreState = PlannerExecutionSnapshot & PlannerStoreActions;

const initialState: PlannerExecutionSnapshot = {
  request: null,
  result: null,
  status: "idle",
  errorMessage: null,
};

export const usePlannerStore = create<PlannerStoreState>((set) => ({
  ...initialState,
  beginExecution: (request) =>
    set({
      request,
      result: null,
      status: "loading",
      errorMessage: null,
    }),
  completeExecution: (result) =>
    set((state) => ({
      request: state.request,
      result,
      status: "success",
      errorMessage: null,
    })),
  failExecution: (message) =>
    set((state) => ({
      request: state.request,
      result: null,
      status: "error",
      errorMessage: message,
    })),
  resetExecution: () => set(initialState),
}));
