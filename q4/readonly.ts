type DeepReadonlyExcept<T, K extends keyof T = never> = {
  readonly [P in keyof T]: P extends K
    ? T[P]
    : T[P] extends object
    ? DeepReadonlyExcept<T[P], never>
    : T[P];
};

interface Config {
  db: { host: string; port: number };
  cache: { ttl: number };
}
type RuntimeConfig = DeepReadonlyExcept<Config, "cache" | "host">;

const cfg: RuntimeConfig = {
  db: { host: "x", port: 5432 },
  cache: { ttl: 30 },
};

cfg.db.host = "new"; // readonly field is immutable
cfg.cache.ttl = 45; // cache is exempt from readonly
cfg.cache = {}; // error: can't reassign the whole cache object
(cfg.db as any).host = "bypass"; // can bypass readonly with "any"

/*Tradeoff or limitations
1. cfg.cache = {} is unassigable as it is a readonly field, but its inner fields are mutable
2. usage of "any" can bypass the readonly rule
3. for large nested objects, type checking can be slower
*/
