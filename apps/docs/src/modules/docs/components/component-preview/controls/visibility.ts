import type { PreviewControlCondition, PreviewControlSection, PreviewControlValues } from '../types';

/** 判断声明式显示条件是否匹配当前控件值 */
export const isPreviewControlVisible = (
  condition: PreviewControlCondition | undefined,
  values: Readonly<PreviewControlValues>,
): boolean => {
  if (condition === undefined) return true;
  const value = values[condition.controlId];
  return !Array.isArray(value) && condition.oneOf.includes(value);
};

/** 根据当前控件值过滤可见字段与分组 */
export const resolveVisiblePreviewControlSections = (
  sections: ReadonlyArray<PreviewControlSection>,
  values: Readonly<PreviewControlValues>,
): Array<PreviewControlSection> =>
  sections.flatMap(section => {
    if (!isPreviewControlVisible(section.visibleWhen, values)) return [];

    const controls = section.controls.filter(control => isPreviewControlVisible(control.visibleWhen, values));
    return controls.length === 0 ? [] : [{ ...section, controls }];
  });

/** 构建只包含显示条件来源值的稳定序列化键 */
export const buildPreviewControlVisibilityKey = (
  sections: ReadonlyArray<PreviewControlSection>,
  values: Readonly<PreviewControlValues>,
): string => {
  const controlIds = new Set<string>();

  for (const section of sections) {
    if (section.visibleWhen) controlIds.add(section.visibleWhen.controlId);
    for (const control of section.controls) {
      if (control.visibleWhen) controlIds.add(control.visibleWhen.controlId);
    }
  }

  return JSON.stringify(Object.fromEntries(Array.from(controlIds, controlId => [controlId, values[controlId]])));
};
