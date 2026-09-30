/** Flow 编译阶段图的双语文字 */
export const flowStagesI18n = {
  zh: {
    source: 'Source',
    sourceNote: '声明与引用',
    resolve: '解析',
    resolveNote: '建立包含关系',
    measure: '测量',
    measureNote: '形成布局输入',
    layout: '布局与校验',
    layoutNote: '确定有效几何',
    materialize: '物化与装配',
    materializeNote: 'Scene 与 artifact',
  },
  en: {
    source: 'Source',
    sourceNote: 'Declarations',
    resolve: 'Resolve',
    resolveNote: 'Containment',
    measure: 'Measure',
    measureNote: 'Layout input',
    layout: 'Layout & validate',
    layoutNote: 'Valid geometry',
    materialize: 'Assemble',
    materializeNote: 'Scene & artifact',
  },
} as const;
