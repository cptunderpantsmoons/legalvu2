declare module 'better-sqlite3' {
  export default class Database {
    constructor(path: string, options?: Record<string, unknown>);
    exec(sql: string): void;
    prepare(sql: string): Statement;
    close(): void;
    pragma(command: string, options?: { simple?: boolean }): unknown;
  }

  export class Statement {
    run(...params: unknown[]): { lastInsertRowid: number | bigint; changes: number };
    get(...params: unknown[]): unknown;
    all(...params: unknown[]): unknown[];
    pluck(toggle?: boolean): this;
  }
}
