/** 启动根子树执行流程图的双语文案 */
export const compilationImplementationI18n = {
  zh: {
    manager: '启动根子树执行',
    run: '调度子项、路径与汇总',
    dispatch: 'Node / Coordinate / Scope / Composite',
    flush: 'resolvePath → compilePath → 原位回填',
    assemble: '汇总边界、排序后形成 Scene 快照',
    registry: '注册表、宿主服务、独立工作区',
  },
  en: {
    manager: 'Start root subtree compilation',
    run: 'Own dispatch, path flush and collection',
    dispatch: 'Dispatch by child contract',
    flush: 'Resolve, compile and replace path slots',
    assemble: 'Collect, sort and assemble Scene',
    registry: 'Registries, host services, workspace',
  },
};
