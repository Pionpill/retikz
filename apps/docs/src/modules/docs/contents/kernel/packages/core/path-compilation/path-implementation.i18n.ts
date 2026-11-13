/** Reconciler 调度 resolvePath / compilePath流程图的双语文案 */
export const pathImplementationI18n = {
  zh: {
    flush: 'Reconciler 调度 resolvePath / compilePath',
    bind: '绑定目标，保留必要的游标表达',
    host: '为 Definition 创建受控宿主上下文',
    stroke: '内置 stroke：layout → emit',
    snapshot: '物化可迭代产物与资源引用检查',
    builtin: '也可自行生成图元与边界',
  },
  en: {
    flush: 'Schedule resolution and compilation',
    bind: 'Bind targets; retain cursor expressions',
    host: 'Create a bounded host context',
    stroke: 'Built-in stroke: layout → emit',
    snapshot: 'Materialize and validate output',
    builtin: 'May generate its own geometry',
  },
};
