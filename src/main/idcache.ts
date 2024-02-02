class IDCache {
  private cache: Map<string, string> = new Map();

  public set(liveId: string, secOpenId: string, decodedOpenId: string) {
    const key = `${liveId}-${secOpenId}`;
    this.cache.set(key, decodedOpenId);
  }

  public get(liveId: string, secOpenId: string): string | null {
    const key = `${liveId}-${secOpenId}`;
    return this.cache.get(key) ?? null;
  }
}

export default IDCache;
