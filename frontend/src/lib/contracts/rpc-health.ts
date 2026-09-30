import { rpc } from "./rpc";

interface RpcHealthStatus {
  healthy: boolean;
  latencyMs: number;
  lastChecked: number;
}

class RpcHealthManager {
  private intervalId: NodeJS.Timeout | null = null;
  private status: RpcHealthStatus = {
    healthy: true,
    latencyMs: 0,
    lastChecked: Date.now(),
  };
  private listeners: ((status: RpcHealthStatus) => void)[] = [];

  public startHealthChecks(intervalMs = 30000): void {
    if (this.intervalId) {
      return;
    }

    if (process.env.NODE_ENV === "test") {
      return;
    }

    // HMR safety: clear existing if any
    if (import.meta.hot) {
      import.meta.hot.dispose(() => {
        this.stopHealthChecks();
      });
    }

    this.intervalId = setInterval(async () => {
      const start = Date.now();
      try {
        await rpc.ping();
        this.status = {
          healthy: true,
          latencyMs: Date.now() - start,
          lastChecked: Date.now(),
        };
      } catch {
        this.status = {
          healthy: false,
          latencyMs: Date.now() - start,
          lastChecked: Date.now(),
        };
      }
      this.notifyListeners();
    }, intervalMs);
  }

  public stopHealthChecks(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  public getStatus(): RpcHealthStatus {
    return { ...this.status };
  }

  public subscribe(listener: (status: RpcHealthStatus) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.status);
    }
  }
}

export const rpcHealthManager = new RpcHealthManager();
