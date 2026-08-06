import type { SchemaPathSegment } from './types';

import { serializeSchemaPath } from './schema-path';

type DescriptionMap = Record<string, string>;

const field = (key: string): SchemaPathSegment => ({ kind: 'field', key });
const array = (): SchemaPathSegment => ({ kind: 'array' });
const union = (index: number): SchemaPathSegment => ({ kind: 'union', index });
const caseOf = (value: string): SchemaPathSegment => ({ kind: 'case', discriminator: 'kind', value });

const setDescription = (target: DescriptionMap, path: ReadonlyArray<SchemaPathSegment>, description: string): void => {
  target[serializeSchemaPath(path)] = description;
};

const childPath = (path: ReadonlyArray<SchemaPathSegment>, key: string): Array<SchemaPathSegment> => [
  ...path,
  field(key),
];

const addRectDescriptions = (
  target: DescriptionMap,
  path: ReadonlyArray<SchemaPathSegment>,
  description: string,
): void => {
  setDescription(target, path, description);
  setDescription(target, childPath(path, 'x'), '容器分配坐标中的水平原点');
  setDescription(target, childPath(path, 'y'), '容器分配坐标中的垂直原点');
  setDescription(target, childPath(path, 'width'), '有限且非负的矩形宽度');
  setDescription(target, childPath(path, 'height'), '有限且非负的矩形高度');
};

const addContainerDescriptions = (target: DescriptionMap, path: ReadonlyArray<SchemaPathSegment>): void => {
  setDescription(target, path, '求解后的 Legend 容器几何');
  addRectDescriptions(target, childPath(path, 'allocationBounds'), '容器最终的分配矩形');
  addRectDescriptions(target, childPath(path, 'contentBounds'), '扣除内边距后的内容矩形');
  addRectDescriptions(target, childPath(path, 'visualBounds'), '所有已放置子项视觉边界的并集');
  setDescription(target, childPath(path, 'visibleBounds'), '应用溢出策略后仍可见的视觉并集；无正面积时为 null');
};

const addPlacedChildDescriptions = (
  target: DescriptionMap,
  path: ReadonlyArray<SchemaPathSegment>,
  description: string,
): void => {
  setDescription(target, path, description);
  addRectDescriptions(target, childPath(path, 'slotBounds'), '父级分配且不含外边距的区域');
  addRectDescriptions(target, childPath(path, 'allocationBounds'), '子图形接受或拒绝 slot 后的真实布局占用');
  addRectDescriptions(target, childPath(path, 'visualBounds'), '包含描边与标签等效果的保守视觉包络');
  setDescription(target, childPath(path, 'visibleBounds'), '裁切后仍可见的视觉区域；无可见面积时为 null');
  const translation = childPath(path, 'translation');
  setDescription(target, translation, 'replay 前应用到子图形的最终平移');
  setDescription(target, childPath(translation, 'x'), '容器局部坐标中的水平平移');
  setDescription(target, childPath(translation, 'y'), '容器局部坐标中的垂直平移');
  const overflow = childPath(path, 'overflow');
  setDescription(target, overflow, '相对 slot 与容器裁切的可观察溢出状态');
  const allocation = childPath(overflow, 'allocation');
  setDescription(target, allocation, '真实分配边界相对 slot 的轴向溢出');
  setDescription(target, childPath(allocation, 'x'), '真实分配边界是否在 x 轴超出 slot');
  setDescription(target, childPath(allocation, 'y'), '真实分配边界是否在 y 轴超出 slot');
  const visual = childPath(overflow, 'visual');
  setDescription(target, visual, '视觉边界相对 slot 的轴向溢出');
  setDescription(target, childPath(visual, 'x'), '视觉边界是否在 x 轴超出 slot');
  setDescription(target, childPath(visual, 'y'), '视觉边界是否在 y 轴超出 slot');
  setDescription(target, childPath(overflow, 'clipped'), '容器裁切是否移除了部分视觉边界');
};

const addGeometryDescriptions = (target: DescriptionMap, path: ReadonlyArray<SchemaPathSegment>): void => {
  setDescription(target, path, '样本与可选标签合并后的区域几何');
  addRectDescriptions(target, childPath(path, 'allocationBounds'), '已平移真实子图形分配边界的并集');
  addRectDescriptions(target, childPath(path, 'visualBounds'), '已平移保守视觉边界的并集');
  setDescription(target, childPath(path, 'visibleBounds'), 'Legend 溢出策略下仍可见的视觉并集；无正面积时为 null');
};

const addCompositeChildDescriptions = (target: DescriptionMap, path: ReadonlyArray<SchemaPathSegment>): void => {
  const composite = [...path, union(1)];
  setDescription(target, childPath(composite, 'namespace'), '内嵌 Tier 2 composite 的能力命名空间');
  setDescription(target, childPath(composite, 'type'), '内嵌 Tier 2 composite 的能力类型');
};

const createLegendSchemaDescriptions = (): Readonly<DescriptionMap> => {
  const descriptions: DescriptionMap = {};
  setDescription(descriptions, [field('namespace')], 'Standard 绘图能力使用的 composite 命名空间');
  setDescription(descriptions, [field('type')], '已解析视觉图例使用的 composite 类型');
  setDescription(descriptions, [field('color')], '主图形颜色以及未单独覆盖的继承颜色');
  setDescription(descriptions, [field('fill')], '主图形填充画笔');
  setDescription(descriptions, [field('stroke')], '主图形描边画笔');
  setDescription(descriptions, [field('fillOpacity')], '填充区域的不透明度');
  setDescription(descriptions, [field('strokeWidth')], '描边宽度');
  setDescription(descriptions, [field('strokeOpacity')], '描边的不透明度');
  setDescription(descriptions, [field('opacity')], '整个图形的总不透明度');
  setDescription(descriptions, [field('theme')], '由当前 Scope 后代继承的稀疏 Theme 覆盖');
  setDescription(descriptions, [field('id')], '用于引用整个图例 Scope 的可选标识');
  setDescription(descriptions, [field('localNamespace')], '是否将子级标识保持在当前 Scope 的本地命名空间');
  setDescription(descriptions, [field('transforms')], '按编写顺序应用于所有图例子级的局部变换');
  setDescription(descriptions, [field('placement')], '在固有布局和局部变换之后应用的最终放置');
  setDescription(descriptions, [field('nodeDefault')], '当前 Scope 内 Node 的默认样式');
  setDescription(descriptions, [field('pathDefault')], '当前 Scope 内路径图元的默认样式');
  setDescription(descriptions, [field('labelDefault')], '当前 Scope 内标签的默认样式');
  setDescription(descriptions, [field('arrowDefault')], '当前 Scope 内箭头的默认样式');
  setDescription(descriptions, [field('resetStyle')], '重置继承样式通道的边界');
  setDescription(descriptions, [field('zIndex')], '图例 Scope 在兄弟 IR 子级中的堆叠顺序');
  setDescription(descriptions, [field('clip')], '当前 Scope 局部坐标中的裁切区域');
  setDescription(descriptions, [field('boundingShape')], '为图例 Scope 标识生成的矩形或圆形包络');
  setDescription(descriptions, [field('meta')], '随图例携带并保持不透明的 JSON 元数据');
  setDescription(descriptions, [field('animations')], '声明式动画轨道；不参与布局');
  setDescription(descriptions, [field('title')], '显示在图例主体上方的可选 JSON-safe Core child');
  setDescription(descriptions, [field('titleGap')], '仅在标题与非空主体同时存在时使用的垂直间距');
  setDescription(descriptions, [field('contentAlign')], '标题与主体结构块在 Legend 内容框物理 x 轴上的独立对齐方式');
  setDescription(descriptions, [field('size')], '包含内边距的容器分配尺寸');
  setDescription(descriptions, [field('padding')], '从分配框到内容框的内边距');
  setDescription(descriptions, [field('overflow')], '容器的视觉溢出策略');
  setDescription(descriptions, [field('content')], '已解析的离散或连续图例呈现');

  const size = [field('size')];
  (['x', 'y'] as const).forEach(axis => {
    const axisPath = childPath(size, axis);
    setDescription(descriptions, axisPath, axis === 'x' ? '水平分配尺寸策略' : '垂直分配尺寸策略');
    const content = [...axisPath, caseOf('content')];
    setDescription(descriptions, childPath(content, 'kind'), '使用内容固有尺寸的判别字段');
    setDescription(descriptions, childPath(content, 'min'), '可选的最小分配尺寸');
    setDescription(descriptions, childPath(content, 'max'), '可选的最大分配尺寸');
    const fixed = [...axisPath, caseOf('fixed')];
    setDescription(descriptions, childPath(fixed, 'kind'), '使用固定分配尺寸的判别字段');
    setDescription(descriptions, childPath(fixed, 'value'), '作者指定的固定分配尺寸');
    const fill = [...axisPath, caseOf('fill')];
    setDescription(descriptions, childPath(fill, 'kind'), '填充有限父级空间的判别字段');
    setDescription(descriptions, childPath(fill, 'min'), '可选的最小填充尺寸');
    setDescription(descriptions, childPath(fill, 'max'), '可选的最大填充尺寸');
  });

  const paddingObject = [field('padding'), union(1)];
  setDescription(descriptions, childPath(paddingObject, 'default'), '所有边的回退内边距');
  setDescription(descriptions, childPath(paddingObject, 'x'), '左右两侧的水平内边距');
  setDescription(descriptions, childPath(paddingObject, 'y'), '上下两侧的垂直内边距');
  setDescription(descriptions, childPath(paddingObject, 'left'), '左侧内边距');
  setDescription(descriptions, childPath(paddingObject, 'right'), '右侧内边距');
  setDescription(descriptions, childPath(paddingObject, 'top'), '顶部内边距');
  setDescription(descriptions, childPath(paddingObject, 'bottom'), '底部内边距');

  const items = [field('content'), caseOf('items')];
  setDescription(descriptions, childPath(items, 'kind'), '离散样本与标签列表的判别字段');
  setDescription(descriptions, childPath(items, 'direction'), '按编写顺序放置条目的物理主轴方向');
  setDescription(descriptions, childPath(items, 'wrap'), '受约束时条目是否形成额外的行或列');
  const gap = childPath(items, 'gap');
  setDescription(descriptions, gap, '相邻行列之间的物理间距；标量同时应用于两轴');
  const gapObject = [...gap, union(1)];
  setDescription(descriptions, childPath(gapObject, 'row'), '相邻物理行之间的垂直间距');
  setDescription(descriptions, childPath(gapObject, 'column'), '相邻物理列之间的水平间距');
  setDescription(descriptions, childPath(items, 'sampleGap'), '单个条目中样本与标签的水平间距');
  setDescription(descriptions, childPath(items, 'sampleAlign'), '单个条目中样本与标签在 y 轴上的对齐方式');
  const itemList = childPath(items, 'items');
  setDescription(descriptions, itemList, '按稳定编写顺序保存的离散图例条目');
  const item = [...itemList, array()];
  setDescription(descriptions, childPath(item, 'key'), '当前 Legend 容器内稳定且唯一的条目标识');
  const itemSample = childPath(item, 'sample');
  setDescription(descriptions, itemSample, '直观展示该条目含义的 JSON-safe Core child');
  addCompositeChildDescriptions(descriptions, itemSample);
  setDescription(descriptions, childPath(item, 'label'), '解释样本含义的可选 JSON-safe Core child');

  const ramp = [field('content'), caseOf('ramp')];
  setDescription(descriptions, childPath(ramp, 'kind'), '连续样本与归一化刻度的判别字段');
  setDescription(descriptions, childPath(ramp, 'direction'), '解析归一化刻度位置的物理轴');
  const rampSample = childPath(ramp, 'sample');
  setDescription(descriptions, rampSample, '显示连续视觉变化的 JSON-safe Core child');
  addCompositeChildDescriptions(descriptions, rampSample);
  setDescription(descriptions, childPath(ramp, 'sampleGap'), '连续样本与可选刻度标签区域之间的间距');
  const tickList = childPath(ramp, 'ticks');
  setDescription(descriptions, tickList, '按非递减编写顺序保存的归一化刻度');
  const tick = [...tickList, array()];
  setDescription(descriptions, childPath(tick, 'key'), '当前 Legend 容器内稳定且唯一的刻度标识');
  setDescription(descriptions, childPath(tick, 'offset'), '沿样本主轴的归一化编写位置，范围为 0 到 1');
  setDescription(descriptions, childPath(tick, 'label'), '解释刻度位置的可选 JSON-safe Core child');
  return Object.freeze(descriptions);
};

const createLegendArtifactDescriptions = (): Readonly<DescriptionMap> => {
  const descriptions: DescriptionMap = {};

  const items = [caseOf('items')];
  setDescription(descriptions, childPath(items, 'kind'), '离散条目 Legend 产物的判别字段');
  addContainerDescriptions(descriptions, childPath(items, 'container'));
  setDescription(descriptions, childPath(items, 'title'), '求解后的标题 placement；省略标题时为 null');
  setDescription(descriptions, childPath(items, 'bodyBounds'), '条目分配与结构间距的并集；没有条目时为 null');
  const itemList = childPath(items, 'items');
  setDescription(descriptions, itemList, '按稳定编写顺序发布的离散条目产物');
  const item = [...itemList, array()];
  setDescription(descriptions, childPath(item, 'key'), '稳定的条目编写标识');
  setDescription(descriptions, childPath(item, 'sourceIndex'), '从零开始的条目编写顺序');
  addGeometryDescriptions(descriptions, childPath(item, 'geometry'));
  addPlacedChildDescriptions(descriptions, childPath(item, 'sample'), '求解后的条目样本 placement');
  setDescription(descriptions, childPath(item, 'label'), '求解后的条目标签 placement；省略标签时为 null');

  const ramp = [caseOf('ramp')];
  setDescription(descriptions, childPath(ramp, 'kind'), '连续样本 Legend 产物的判别字段');
  addContainerDescriptions(descriptions, childPath(ramp, 'container'));
  setDescription(descriptions, childPath(ramp, 'title'), '求解后的标题 placement；省略标题时为 null');
  addRectDescriptions(descriptions, childPath(ramp, 'bodyBounds'), '最终样本与非空刻度标签分配的并集');
  addPlacedChildDescriptions(descriptions, childPath(ramp, 'sample'), '求解后的连续样本 placement');
  const tickList = childPath(ramp, 'ticks');
  setDescription(descriptions, tickList, '按稳定编写顺序发布的刻度 anchor 与标签');
  const tick = [...tickList, array()];
  setDescription(descriptions, childPath(tick, 'key'), '稳定的刻度编写标识');
  setDescription(descriptions, childPath(tick, 'sourceIndex'), '从零开始的刻度编写顺序');
  const anchor = childPath(tick, 'anchor');
  setDescription(descriptions, anchor, '由样本和归一化 offset 求得的物理 anchor');
  setDescription(descriptions, childPath(anchor, 'x'), 'Legend 分配坐标中的有限水平 anchor');
  setDescription(descriptions, childPath(anchor, 'y'), 'Legend 分配坐标中的有限垂直 anchor');
  setDescription(descriptions, childPath(tick, 'label'), '求解后的刻度标签 placement；省略标签时为 null');
  return Object.freeze(descriptions);
};

/** Legend 输入 schema 的中文 docs 本地化 */
export const LegendSchemaZhLocalization = Object.freeze({
  description: '可序列化、已解析呈现语义的 Standard Legend composite',
  descriptions: createLegendSchemaDescriptions(),
});

/** Legend 类型化产物 schema 的中文 docs 本地化 */
export const LegendArtifactSchemaZhLocalization = Object.freeze({
  description: '由 kind 判别的 Standard Legend 类型化编译产物',
  descriptions: createLegendArtifactDescriptions(),
});
