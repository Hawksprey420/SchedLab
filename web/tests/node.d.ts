// Minimal declarations for the few Node APIs the tests use. The project's dev dependencies
// are limited to typescript and vitest, so @types/node is not installed.
declare module "node:fs" {
  export function readFileSync(path: string, encoding: "utf8"): string;
  export function readdirSync(path: string): string[];
  export function existsSync(path: string): boolean;
}

declare module "node:path" {
  export function join(...parts: string[]): string;
  export function resolve(...parts: string[]): string;
}

declare module "node:child_process" {
  export function spawnSync(
    command: string,
    args: string[],
    options: { input: string; encoding: "utf8" },
  ): { status: number | null; stdout: string; error?: Error };
}

interface ImportMeta {
  dirname: string;
}
