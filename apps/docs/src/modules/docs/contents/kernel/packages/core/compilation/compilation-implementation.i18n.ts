/** 启动根子树执行流程图的双语文案 */
export const compilationImplementationI18n = {
  zh: {
    manager: '启动根子树执行',
    dispatch: 'Node / Coordinate / Scope / Composite',
    flush: 'resolvePath → compilePath → 原位回填',
    collect: '边界聚合、稳定 zIndex 排序',
    assemble: 'Scene 与附属结果形成快照',
    registry: '注册表、宿主服务、独立工作区',
  },
  en: {
    manager: 'Start root subtree compilation',
    dispatch: 'Dispatch by child contract',
    flush: 'Resolve, compile and replace path slots',
    collect: 'Aggregate bounds; stable zIndex sort',
    assemble: 'Assemble the compilation snapshot',
    registry: 'Registries, host services, workspace',
  },
};
