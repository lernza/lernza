declare module "@stellar/stellar-sdk" {
  export namespace rpc {
    export class Server {
      constructor(serverURL: string, opts?: any);
      getLatestLedger(): Promise<any>;
      getEvents(request: any): Promise<any>;
    }
  }
}
declare module "@sentry/node";
declare module "pg" {
  export class Pool {
    constructor(config?: any);
    end(): Promise<void>;
    query<T = any>(queryTextOrConfig: string | any, values?: any[]): Promise<any>;
  }
  const pg: { Pool: typeof Pool };
  export default pg;
}
declare module "dotenv/config";
declare var process: any;
declare module "node:fs";
declare module "node:path";
declare module "node:url";
