/**
 * 带有容器局部有效 key 的 Layout item
 * @template TItem 原始布局项类型，结果将其可选 key 收窄为必填
 */
export type EffectiveLayoutItem<
  TItem extends Readonly<{
    /** 保留作者显式值或补齐后保证唯一的布局项键 */
    key?: string;
  }>,
> = Omit<TItem, 'key'> &
  Readonly<{
    /** 保留作者显式值或补齐后保证唯一的布局项键 */
    key: string;
  }>;

/**
 * 为缺失 authored key 的 Layout items 创建确定且唯一的容器局部有效 key
 * @template TItem 需要补齐稳定 key 的原始布局项类型
 */
export const createEffectiveLayoutItems = <TItem extends Readonly<{ key?: string }>>(
  items: ReadonlyArray<TItem>,
): Array<EffectiveLayoutItem<TItem>> => {
  const usedKeys = new Set(items.flatMap(item => (item.key === undefined ? [] : [item.key])));

  return items.map((item, sourceIndex) => {
    if (item.key !== undefined) return item as EffectiveLayoutItem<TItem>;

    const baseKey = `item:${sourceIndex}`;
    let effectiveKey = baseKey;
    let suffix = 1;

    while (usedKeys.has(effectiveKey)) {
      effectiveKey = `${baseKey}:${suffix}`;
      suffix += 1;
    }

    usedKeys.add(effectiveKey);

    return { ...item, key: effectiveKey };
  });
};
