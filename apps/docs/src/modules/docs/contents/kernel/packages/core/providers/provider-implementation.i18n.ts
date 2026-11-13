/** 同键检查，按贡献顺序收集参数流程图的双语文案 */
export const providerImplementationI18n = {
  zh: {
    index: '同键检查，按贡献顺序收集参数',
    visit: '从 roots 遍历有序依赖',
    factory: '预检通过后物化并核对标识',
    append: '同一对象去重，异对象同键失败',
    freeze: '冻结集合外壳，省略空类别',
    adapter: '归一化贡献 + compile 定义',
  },
  en: {
    index: 'Check identity; collect parameters',
    visit: 'Visit ordered dependencies from roots',
    factory: 'Materialize after graph preflight',
    append: 'Deduplicate objects; reject conflicts',
    freeze: 'Freeze collection shells; omit empties',
    adapter: 'Normalized contributions + definitions',
  },
};
