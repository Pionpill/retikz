/** 坐标阶段图的双语文案 */
export const coordinateImplementationI18n = {
  zh: {
    canon: 'P: of A + offset [40, 0]',
    evaluate: '查询 A → 转局部 → 加偏移 → 转世界',
    points: 'local [40, 0] · world [180, 50]',
    compiled: 'compileCoordinate 取 position [40, 0]',
    publish: '发布 P 世界位置；收集局部布局',
    context: 'lookupReference / toLocal / toWorld',
  },
  en: {
    canon: 'P: of A + offset [40, 0]',
    evaluate: 'Read A → local → offset → world',
    points: 'local [40, 0] · world [180, 50]',
    compiled: 'compileCoordinate keeps [40, 0]',
    publish: 'Publish P globally; collect local layout',
    context: 'lookupReference / toLocal / toWorld',
  },
};
