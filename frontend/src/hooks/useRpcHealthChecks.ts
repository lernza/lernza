import { useEffect } from "react";
import { rpcHealthManager } from "../lib/contracts/rpc-health";

export function useRpcHealthChecks(intervalMs?: number): void {
  useEffect(() => {
    if (process.env.NODE_ENV === "test") {
      return;
    }

    rpcHealthManager.startHealthChecks(intervalMs);

    return () => {
      rpcHealthManager.stopHealthChecks();
    };
  }, [intervalMs]);
}
