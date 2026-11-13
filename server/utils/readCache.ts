export class ReadCache<T> {
  private values = new Map<string, { value: T; expires: number }>();
  private pending = new Map<string, Promise<T>>();
  private version = 0;
  constructor(private ttl = 60_000, private max = 200) {}
  clear() { this.version++; this.values.clear(); this.pending.clear(); }
  async get(key: string, loader: () => Promise<T>, fresh = false): Promise<T> {
    if (fresh) return loader();
    const old = this.values.get(key);
    if (old && old.expires > Date.now()) return structuredClone(old.value);
    if (this.pending.has(key)) return structuredClone(await this.pending.get(key)!);
    const version = this.version;
    const request = loader(); this.pending.set(key, request);
    try {
      const value = await request;
      if (version === this.version) {
        if (this.values.size >= this.max) this.values.delete(this.values.keys().next().value!);
        this.values.set(key, { value: structuredClone(value), expires: Date.now() + this.ttl });
      }
      return structuredClone(value);
    } finally { if (this.pending.get(key) === request) this.pending.delete(key); }
  }
}
