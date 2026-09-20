/** 命名表结构图的双语说明 */
export const namespaceStorageI18n = {
  zh: {
    frames: 'frames：Array<Map<string, NamespaceEntry>>',
    root: '[0] 根 frame',
    current: '[1] 当前 frame',
    map: '当前 Map：id → entry',
    record: 'a 的 NamespaceEntry',
    source: '布局并投影后的 a',
    select: '1. 确定栈顶 Map',
    write: '2. 写入栈顶',
    reference: '引用 value',
    note: '嵌套表示对象层级；仅展示部分字段，不是原始 Node IR',
  },
  en: {
    frames: 'frames: Array<Map<string, NamespaceEntry>>',
    root: '[0] root frame',
    current: '[1] current frame',
    map: 'Current Map: id → entry',
    record: 'NamespaceEntry for a',
    source: 'a after layout + projection',
    select: '1. Locate top Map',
    write: '2. Write to top frame',
    reference: 'Value reference',
    note: 'Nesting shows object structure; selected fields only, not the source Node IR',
  },
};
