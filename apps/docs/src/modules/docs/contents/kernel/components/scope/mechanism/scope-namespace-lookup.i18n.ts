import type { Lang } from '@/i18n';

export const scopeNamespaceLookupI18n: Record<
  Lang,
  {
    nodes: Record<
      'lookup' | 'current' | 'hit' | 'register' | 'outer' | 'absent' | 'duplicate',
      readonly [string, string]
    >;
    edges: Record<'hit' | 'miss' | 'allMiss' | 'write' | 'exists', string>;
  }
> = {
  zh: {
    nodes: {
      lookup: ['查找 id', 'lookup'],
      current: ['当前 frame', '局部名称表'],
      hit: ['返回条目', '首次命中即停止'],
      register: ['注册 id', '只写当前 frame'],
      outer: ['向外层查找', '父 frame → 根'],
      absent: ['未找到', 'undefined'],
      duplicate: ['同层重名', '警告 + 后定义覆盖'],
    },
    edges: {
      hit: '命中',
      miss: '未命中',
      allMiss: '均未命中',
      write: '写入',
      exists: '已存在',
    },
  },
  en: {
    nodes: {
      lookup: ['Look up id', 'lookup'],
      current: ['Current frame', 'Local id table'],
      hit: ['Return entry', 'Stop at first hit'],
      register: ['Register id', 'Current frame only'],
      outer: ['Search outward', 'Parent → root'],
      absent: ['Not found', 'undefined'],
      duplicate: ['Duplicate id', 'Warn + last wins'],
    },
    edges: {
      hit: 'Hit',
      miss: 'Miss',
      allMiss: 'None',
      write: 'Write',
      exists: 'Exists',
    },
  },
};
