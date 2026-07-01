type ProcessLike = {
  env?: Record<string, string | undefined>;
};

const runtime = globalThis as typeof globalThis & { process?: ProcessLike };

export function getEnv(name: string) {
  return runtime.process?.env?.[name];
}

export function requireEnv(name: string) {
  const value = getEnv(name);
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}
