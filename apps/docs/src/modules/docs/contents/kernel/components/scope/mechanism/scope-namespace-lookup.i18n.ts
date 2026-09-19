import type { Lang } from '@/i18n';

export const scopeNamespaceLookupI18n: Record<
  Lang,
  {
    stages: readonly [string, string];
    nodes: Record<'current' | 'outer' | 'hit' | 'absent' | 'register' | 'replace', readonly [string, string]>;
    edges: Record<'hit' | 'miss' | 'allMiss' | 'exists', string>;
  }
> = {
  zh: {
    stages: ['查找 · 首次命中即停止', '注册 · 只写当前 frame'],
    nodes: {
      current: ['查当前 frame', 'lookup(id)'],
      outer: ['逐层查外层 frame', '父 frame → … → 根 frame'],
      hit: ['返回命中条目', '不再访问更外层'],
      absent: ['返回 undefined', '所有 frame 都未命中'],
      register: ['写入当前 frame', 'id → 新条目'],
      replace: ['覆盖已有条目', '同时发出重名警告'],
    },
    edges: { hit: '命中', miss: '未命中', allMiss: '均未命中', exists: '同层 id 已存在' },
  },
  en: {
    stages: ['Lookup · Stop at first match', 'Registration · Current frame only'],
    nodes: {
      current: ['Search current frame', 'lookup(id)'],
      outer: ['Search outer frames', 'Parent → … → root frame'],
      hit: ['Return matched entry', 'Do not search further'],
      absent: ['Return undefined', 'No match in any frame'],
      register: ['Write current frame', 'id → new entry'],
      replace: ['Replace existing entry', 'Also warn about duplicate id'],
    },
    edges: { hit: 'Hit', miss: 'Miss', allMiss: 'All miss', exists: 'Same-frame id exists' },
  },
};
