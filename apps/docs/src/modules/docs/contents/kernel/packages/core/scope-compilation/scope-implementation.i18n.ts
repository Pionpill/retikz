/** 确定继承与局部配置流程图的双语文案 */
export const scopeImplementationI18n = {
  zh: {
    inherit: '确定继承与局部配置',
    prepare: '先求不依赖自身包络的放置',
    visit: '进入名称帧并收集子布局',
    layout: 'layoutScopeEnvelope + placement + emit',
    publish: '发布几何、回填路径、输出分组',
    layouts: '节点、坐标与子 Scope 布局',
  },
  en: {
    inherit: 'Resolve inheritance and group config',
    prepare: 'Prepare envelope-independent placement',
    visit: 'Enter naming scope; collect child layouts',
    layout: 'Envelope, final placement and attributes',
    publish: 'Publish geometry, flush paths, emit group',
    layouts: 'Node, coordinate and child Scope layouts',
  },
};
