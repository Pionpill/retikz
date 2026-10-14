import type { Lang } from '@/i18n';

/** 兄弟 Scope 中路径引用的先后顺序 */
export const pathReferenceTimingI18n: Record<
  Lang,
  Record<'registerA' | 'resolveA' | 'registerB' | 'resolveB', string>
> = {
  zh: {
    registerA: '遍历 Scope A\n布局并注册 a\n写入共享 Map',
    resolveA: 'Scope A 收尾\nPath 查找 b：失败\nb 尚未注册',
    registerB: '遍历 Scope B\n布局并注册 b\nMap 中仍保留 a',
    resolveB: 'Scope B 收尾\nPath 查找 a：成功\na 已注册且仍可见',
  },
  en: {
    registerA: 'Traverse Scope A\nLay out and register a\nUse the shared Map',
    resolveA: 'Finalize Scope A\nPath lookup of b fails\nb is not registered yet',
    registerB: 'Traverse Scope B\nLay out and register b\na remains in the Map',
    resolveB: 'Finalize Scope B\nPath finds a\na is registered and visible',
  },
};
