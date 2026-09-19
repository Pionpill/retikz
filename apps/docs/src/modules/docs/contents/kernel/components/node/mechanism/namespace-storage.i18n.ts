/** 命名表结构图的双语说明 */
export const namespaceStorageI18n = {
  zh: {
    frames: 'frames：Array<Map<string, NamespaceEntry>>',
    root: '[0] 根 frame',
    current: '[1] 当前 frame',
    map: '当前 Map：id → entry',
    record: 'a 的 NamespaceEntry',
    source: '布局并投影后的 a',
    write: 'register：写栈顶',
    reference: '展开 value',
    note: '只画引用所需字段；layout 是几何记录，不是原始 Node IR',
  },
  en: {
    frames: 'frames: Array<Map<string, NamespaceEntry>>',
    root: '[0] root frame',
    current: '[1] current frame',
    map: 'Current Map: id → entry',
    record: 'NamespaceEntry for a',
    source: 'a after layout + projection',
    write: 'register: write top',
    reference: 'Expand value',
    note: 'Reference fields only; layout is a geometry record, not the source Node IR',
  },
};
