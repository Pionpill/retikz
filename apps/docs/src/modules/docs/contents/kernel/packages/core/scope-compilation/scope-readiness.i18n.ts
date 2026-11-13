/** 名称与几何就绪状态 */
export const scopeReadinessI18n = {
  zh: {
    placeholder: '具名 Scope：位置占位',
    children: '子树执行 → 包络计算',
    published: '具名 Scope：完整几何',
    s0: '子树执行前：发布位置占位',
    s1: '子布局完成：计算并投影包络',
    s2: '替换占位后：处理本 Scope 的延迟路径',
    context: '子项在局部名称环境中注册与查找',
  },
  en: {
    placeholder: 'Named Scope: position placeholder',
    children: 'Execute children → Build envelope',
    published: 'Named Scope: full geometry',
    s0: 'Before children: publish position',
    s1: 'After child layout: project the envelope',
    s2: 'Replace placeholder, then flush deferred paths',
    context: 'Children register and look up local names',
  },
};
