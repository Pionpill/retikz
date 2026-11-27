/** 名称与坐标示意图的双语标签 */
export const executionLookupI18n = {
  zh: {
    local: '内层 A 的局部中心',
    global: '向右平移 100',
    inner: '登记到局部帧',
    path: '路径命中内层 A',
    outer: '退出后根 A 再次可见',
  },
  en: {
    local: 'Local center of inner A',
    global: 'Translate right by 100',
    inner: 'Bind A in the local frame',
    path: 'Path finds the inner A',
    outer: 'Root A visible after exit',
  },
} as const;
