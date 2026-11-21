/** 调度图的中英文标签 */
export const schedulingOverviewI18n = {
  zh: { input: '场景声明', runtime: '准备本次执行环境', tree: '遍历并组装子树', snapshot: '组装整图快照' },
  en: {
    input: 'Scene declaration',
    runtime: 'Prepare runtime',
    tree: 'Assemble subtree',
    snapshot: 'Finalize snapshot',
  },
} as const;
