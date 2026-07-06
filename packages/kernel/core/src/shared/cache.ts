/** 缓存条目被移除的原因。 */
export type CacheEvictReason = 'maxSize' | 'expired' | 'delete' | 'clear';

/**
 * 缓存条目移除事件。
 * @description 供调用方释放与缓存值关联的外部资源或做诊断；缓存本身不理解 value 的业务语义。
 */
export type CacheEviction<TKey, TOutput> = {
  /** 被移除条目的 key。 */
  key: TKey;
  /** 被移除的缓存值。 */
  value: TOutput;
  /** 条目被移除的原因。 */
  reason: CacheEvictReason;
};

/**
 * 通用计算缓存配置。
 * @description 调用方负责把输入映射成稳定 key，并提供实际计算函数；缓存只管理 key 命中、容量、可选 TTL 和淘汰通知。
 */
export type CacheOptions<TInput, TOutput, TKey = string> = {
  /** 输入到缓存 key 的映射；同 key 必须代表同一计算结果。 */
  keyOf: (input: TInput) => TKey;
  /** key 未命中时执行的实际计算。 */
  compute: (input: TInput) => TOutput;
  /** 最多缓存多少条结果；小于 1 时按 1 处理。 */
  maxSize: number;
  /** 条目存活毫秒数；省略或小于等于 0 时不按时间过期。 */
  ttlMs?: number;
  /** 条目被淘汰、删除、清空或过期移除时触发。 */
  onEvict?: (eviction: CacheEviction<TKey, TOutput>) => void;
};

/**
 * 通用计算缓存函数。
 * @description 函数调用负责读 / 算缓存；附带方法负责显式查询、删除和清空。
 */
export type CacheFunction<TInput, TOutput> = ((input: TInput) => TOutput) & {
  /** 当前缓存条目数量。 */
  readonly size: number;
  /** 判断输入对应的缓存条目是否存在且未过期。 */
  has: (input: TInput) => boolean;
  /** 删除输入对应的缓存条目。 */
  delete: (input: TInput) => boolean;
  /** 清空全部缓存条目。 */
  clear: () => void;
};

type CacheEntry<TOutput> = {
  value: TOutput;
  expiresAt: number | undefined;
};

const normalizeMaxSize = (maxSize: number): number => {
  if (!Number.isFinite(maxSize) || maxSize <= 0) {
    throw new Error('createCache: maxSize must be a finite positive number.');
  }
  return Math.floor(maxSize);
};

/**
 * 创建一个通用计算缓存。
 * @description 命中时刷新条目到最新使用位置；超过 maxSize 时淘汰最久未使用条目。适合纯计算结果在进程内复用。
 */
export const createCache = <TInput, TOutput, TKey = string>({
  keyOf,
  compute,
  maxSize,
  ttlMs,
  onEvict,
}: CacheOptions<TInput, TOutput, TKey>): CacheFunction<TInput, TOutput> => {
  const cache = new Map<TKey, CacheEntry<TOutput>>();
  const maxEntries = normalizeMaxSize(maxSize);
  const ttl = ttlMs !== undefined && Number.isFinite(ttlMs) && ttlMs > 0 ? ttlMs : undefined;
  const isExpired = (entry: CacheEntry<TOutput>): boolean =>
    entry.expiresAt !== undefined && entry.expiresAt <= Date.now();
  const evict = (key: TKey, entry: CacheEntry<TOutput>, reason: CacheEvictReason): void => {
    cache.delete(key);
    onEvict?.({ key, value: entry.value, reason });
  };
  const touch = (key: TKey, entry: CacheEntry<TOutput>): TOutput => {
    cache.delete(key);
    cache.set(key, entry);
    return entry.value;
  };
  const read = ((input: TInput): TOutput => {
    const key = keyOf(input);
    const cached = cache.get(key);
    if (cached !== undefined) {
      if (isExpired(cached)) {
        evict(key, cached, 'expired');
      } else {
        return touch(key, cached);
      }
    }
    const value = compute(input);
    if (cache.size >= maxEntries) {
      const first = cache.entries().next().value;
      if (first !== undefined) {
        const [firstKey, firstEntry] = first;
        evict(firstKey, firstEntry, 'maxSize');
      }
    }
    cache.set(key, { value, expiresAt: ttl === undefined ? undefined : Date.now() + ttl });
    return value;
  }) as CacheFunction<TInput, TOutput>;

  read.has = (input: TInput): boolean => {
    const key = keyOf(input);
    const cached = cache.get(key);
    if (cached === undefined) return false;
    if (!isExpired(cached)) return true;
    evict(key, cached, 'expired');
    return false;
  };
  read.delete = (input: TInput): boolean => {
    const key = keyOf(input);
    const cached = cache.get(key);
    if (cached === undefined) return false;
    evict(key, cached, 'delete');
    return true;
  };
  read.clear = (): void => {
    if (onEvict) {
      for (const [key, entry] of cache) onEvict({ key, value: entry.value, reason: 'clear' });
    }
    cache.clear();
  };
  Object.defineProperty(read, 'size', { get: () => cache.size });
  return read;
};
