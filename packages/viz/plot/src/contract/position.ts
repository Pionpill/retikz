import type { ExternalRow } from '@retikz/data';
import { resolveFieldPath } from '@retikz/data';

import { RetikzPlotError } from '../error';
import type { IRPlotPositionInput, IRPlotMark } from '../schemas';
import { BuiltinPlotMark } from '../schemas';
import type { PositionScale } from './scale';

/** 从位置输入提取真正的数据字段依赖 */
export const positionField = (input: IRPlotPositionInput | undefined): string | undefined =>
  input !== undefined && 'field' in input ? input.field : undefined;

/** 读取数据空间位置；边缘没有数据值 */
export const positionValue = (input: IRPlotPositionInput | undefined, row?: ExternalRow): unknown => {
  if (input === undefined || 'edge' in input) return undefined;
  if ('value' in input) return input.value;
  if (row === undefined) throw new RetikzPlotError('Field position requires a row instance');
  return resolveFieldPath(row, input.field);
};

/** 映射位置原子，边缘直接使用最终角色范围 */
export const mapPositionInput = (
  input: IRPlotPositionInput | undefined,
  scale: PositionScale,
  row?: ExternalRow,
): number =>
  input !== undefined && 'edge' in input
    ? scale.range()[input.edge === 'start' ? 0 : 1]
    : scale.coordinate(positionValue(input, row));

/** 按几何结构枚举实际消费的位置，不扫描任意属性中的 field */
export const markPositionInputs = (mark: IRPlotMark): Array<Partial<Record<string, IRPlotPositionInput>>> => {
  if (mark.type === BuiltinPlotMark.Relation) {
    const refs = [mark.encodings?.source, mark.encodings?.target];
    if (mark.properties.geometry.kind === 'path') {
      refs.push(...(mark.encodings?.geometry?.via ?? []));
      for (const step of mark.encodings?.geometry?.route ?? []) refs.push(step.to);
    }
    return refs.flatMap(ref => (ref?.position === undefined ? [] : [ref.position]));
  }
  const encodings = mark.encodings as
    | {
        position?: Partial<Record<string, IRPlotPositionInput>>;
        from?: Partial<Record<string, IRPlotPositionInput>>;
        to?: Partial<Record<string, IRPlotPositionInput>>;
        bounds?: Partial<Record<string, { from?: IRPlotPositionInput; to?: IRPlotPositionInput }>>;
      }
    | undefined;
  if (mark.type === 'path' && encodings?.from !== undefined) return [encodings.from, encodings.to ?? {}];
  if (mark.type === 'interval') {
    const positions = [encodings?.position ?? {}];
    for (const endpoint of ['from', 'to'] as const) {
      const position: Partial<Record<string, IRPlotPositionInput>> = {};
      for (const [role, bound] of Object.entries(encodings?.bounds ?? {}))
        if (bound?.[endpoint] !== undefined) position[role] = bound[endpoint];
      positions.push(position);
    }
    return positions;
  }
  return encodings?.position === undefined ? [] : [encodings.position];
};
