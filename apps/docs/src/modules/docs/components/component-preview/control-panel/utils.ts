import type { PreviewControlSection } from '../types';

/** 属性面板内部使用的带来源索引分组 */
export type PreviewControlColumnSection = PreviewControlSection & {
  /** definition.sections 中的原始索引 */
  sourceIndex: number;
  /** 当前列片段是否显示原始 section 标题 */
  showTitle: boolean;
};

/** 高度感知分栏使用的实际与回退尺寸 */
export type PreviewControlLayoutMetrics = {
  availableHeight: number;
  titleHeights: ReadonlyMap<number, number>;
  fieldHeights: ReadonlyMap<string, number>;
  fallbackTitleHeight: number;
  fallbackFieldHeight: number;
  itemGap: number;
  sectionGap: number;
};

/** 为单列属性面板分组附加稳定的内部来源索引 */
export const indexPreviewControlSections = (
  sections: ReadonlyArray<PreviewControlSection>,
): Array<PreviewControlColumnSection> =>
  sections.map((section, sourceIndex) => ({ ...section, sourceIndex, showTitle: true }));

/** 将属性面板分组按控件数量均衡拆成左右两列 */
export const splitPreviewControlSections = (
  sections: ReadonlyArray<PreviewControlSection>,
): [Array<PreviewControlColumnSection>, Array<PreviewControlColumnSection>] => {
  const controlCount = sections.reduce((total, section) => total + section.controls.length, 0);
  let remainingLeftCount = Math.ceil(controlCount / 2);
  const leftSections: Array<PreviewControlColumnSection> = [];
  const rightSections: Array<PreviewControlColumnSection> = [];

  indexPreviewControlSections(sections).forEach(section => {
    const leftControlCount = Math.min(remainingLeftCount, section.controls.length);
    const leftControls = section.controls.slice(0, leftControlCount);
    const rightControls = section.controls.slice(leftControlCount);

    if (leftControls.length > 0) leftSections.push({ ...section, controls: leftControls });
    if (rightControls.length > 0) {
      rightSections.push({ ...section, controls: rightControls, showTitle: leftControls.length === 0 });
    }
    remainingLeftCount -= leftControlCount;
  });

  return [leftSections, rightSections];
};

const getTitleHeight = (section: PreviewControlColumnSection, metrics: PreviewControlLayoutMetrics): number =>
  section.label && section.showTitle
    ? (metrics.titleHeights.get(section.sourceIndex) ?? metrics.fallbackTitleHeight)
    : 0;

const getFieldHeight = (fieldId: string, metrics: PreviewControlLayoutMetrics): number =>
  metrics.fieldHeights.get(fieldId) ?? metrics.fallbackFieldHeight;

const getSectionHeight = (
  section: PreviewControlColumnSection,
  collapsed: boolean,
  metrics: PreviewControlLayoutMetrics,
): number => {
  const elementHeights = [
    getTitleHeight(section, metrics),
    ...(collapsed ? [] : section.controls.map(field => getFieldHeight(field.id, metrics))),
  ].filter(height => height > 0);

  return (
    elementHeights.reduce((total, height) => total + height, 0) +
    Math.max(0, elementHeights.length - 1) * metrics.itemGap
  );
};

/** 根据可用高度把可见字段按阅读顺序布局为一列或最多两列 */
export const layoutPreviewControlSections = (
  sections: ReadonlyArray<PreviewControlSection>,
  collapsedSectionIndexes: ReadonlySet<number>,
  metrics: PreviewControlLayoutMetrics,
  maxColumns: 1 | 2,
): Array<Array<PreviewControlColumnSection>> => {
  const indexedSections = indexPreviewControlSections(sections);
  if (maxColumns === 1) return [indexedSections];
  if (metrics.availableHeight <= 0) return splitPreviewControlSections(sections);

  const sectionHeights = indexedSections.map(section =>
    getSectionHeight(section, collapsedSectionIndexes.has(section.sourceIndex), metrics),
  );
  const visibleSectionCount = sectionHeights.filter(height => height > 0).length;
  const totalHeight =
    sectionHeights.reduce((total, height) => total + height, 0) +
    Math.max(0, visibleSectionCount - 1) * metrics.sectionGap;
  if (totalHeight <= metrics.availableHeight) return [indexedSections];

  const leftSections: Array<PreviewControlColumnSection> = [];
  const rightSections: Array<PreviewControlColumnSection> = [];
  let leftHeight = 0;
  let fillingRight = false;

  indexedSections.forEach(section => {
    const collapsed = collapsedSectionIndexes.has(section.sourceIndex);
    if (fillingRight) {
      rightSections.push(section);
      return;
    }

    const sectionGap = leftSections.length > 0 ? metrics.sectionGap : 0;
    const sectionHeight = getSectionHeight(section, collapsed, metrics);
    if (leftHeight + sectionGap + sectionHeight <= metrics.availableHeight) {
      leftSections.push(section);
      leftHeight += sectionGap + sectionHeight;
      return;
    }

    const visibleControls = collapsed ? [] : section.controls;
    let candidateHeight = leftHeight + sectionGap + getTitleHeight(section, metrics);
    let leftControlCount = 0;

    for (const field of visibleControls) {
      const itemGap = section.label || leftControlCount > 0 ? metrics.itemGap : 0;
      const nextHeight = candidateHeight + itemGap + getFieldHeight(field.id, metrics);
      if (nextHeight <= metrics.availableHeight || (leftSections.length === 0 && leftControlCount === 0)) {
        candidateHeight = nextHeight;
        leftControlCount += 1;
      } else {
        break;
      }
    }

    if (leftControlCount === 0 && leftSections.length > 0) {
      rightSections.push(section);
      fillingRight = true;
      return;
    }

    const leftControls = visibleControls.slice(0, leftControlCount);
    const rightControls = visibleControls.slice(leftControlCount);
    leftSections.push({ ...section, controls: leftControls });
    leftHeight = candidateHeight;
    if (rightControls.length > 0) {
      rightSections.push({ ...section, controls: rightControls, showTitle: false });
      fillingRight = true;
    }
  });

  return rightSections.length > 0 ? [leftSections, rightSections] : [leftSections];
};
