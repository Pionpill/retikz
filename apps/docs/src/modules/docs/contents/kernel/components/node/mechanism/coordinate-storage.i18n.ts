/** 坐标点记录图的双语说明 */
export const coordinateStorageI18n = {
  zh: {
    input: 'Coordinate 输入',
    map: '当前栈顶 Map',
    record: 'hub 的 NamespaceEntry',
    register: '1. 解析位置并登记',
    expand: '展开 value',
    lookup: '2. 查询 hub.right',
    result: '查询结果（全局坐标）',
    note: '记录可被引用；Coordinate 本身不生成 Scene 图元',
  },
  en: {
    input: 'Coordinate input',
    map: 'Current top-frame Map',
    record: 'NamespaceEntry for hub',
    register: '1. Resolve and register',
    expand: 'Expand value',
    lookup: '2. Look up hub.right',
    result: 'Query result (global coordinates)',
    note: 'The record is referenceable; Coordinate emits no Scene primitive',
  },
};
