import type { IRTarget } from '@retikz/core';
import { parseTargetSugar } from '@retikz/core';
import type { InputPath } from '@retikz/vanilla';
import { normalizePath } from '@retikz/vanilla';
import type { InputTarget } from '@retikz/vanilla';

/** 保留几何分支与字面坐标约束，仅为完整 Target 开放作者简写 */
export type InputShape<TSource> = TSource extends object
  ? {
      [TKey in keyof TSource as TKey extends 'type' | 'namespace' | 'id' ? never : TKey]: TKey extends
        | 'center'
        | 'corner1'
        | 'corner2'
        ? IRTarget extends TSource[TKey]
          ? InputTarget
          : TSource[TKey]
        : TSource[TKey];
    } & InputShapeProperties
  : never;

type ShapeProperties<TSource> = TSource extends object ? Omit<TSource, 'namespace' | 'type'> : never;

/** 只解释作者 Target 与 Path 简写，不计算或物化形状几何 */
export const normalizeShapeInput = <TSource>(
  input: InputShape<TSource> & { id?: string },
): ShapeProperties<TSource> => {
  const properties = normalizeShapeProperties(input);
  return Object.fromEntries(
    Object.entries(properties)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [
        key,
        key === 'center' || key === 'corner1' || key === 'corner2' ? parseTargetSugar(value as InputTarget) : value,
      ]),
  ) as ShapeProperties<TSource>;
};

/** 路径作者简写，由 Kernel Vanilla 统一解释 */
export type InputShapeProperties = Pick<InputPath, 'thickness' | 'arrow' | 'arrowDetail' | 'arrowPlacement'>;

type NormalizedShapeProperties<TInput> = TInput extends object
  ? Omit<TInput, keyof InputShapeProperties> & Pick<InputPath, 'style' | 'marks'>
  : never;
/** 复用完整路径归一化，固定步骤仅满足路径结构，不参与形状几何 */
export const normalizeShapeProperties = <TInput extends InputShapeProperties>(
  input: TInput,
): NormalizedShapeProperties<TInput> => {
  const {
    type: _type,
    children: _children,
    ...source
  } = normalizePath({
    ...input,
    children: [
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'cycle' },
    ],
  });
  void _type;
  void _children;
  return source as NormalizedShapeProperties<TInput>;
};
