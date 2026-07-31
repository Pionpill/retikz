import type { TableCellAppearanceTracePathValue, TableCellPlanSource } from '../../contract';
import type { IRTableCellAppearance } from '../../schemas';
import type { TableCellAppearanceTrace } from './types';

import { TableCellAppearanceTracePathSchema } from '../../contract';
import { TableCellAppearanceSchema, TableCellContentStyleSchema } from '../../schemas';
import { deepFreeze } from '../../shared';

const CONTENT_ATOMIC_FIELDS = [
  'color',
  'fill',
  'fillOpacity',
  'stroke',
  'strokeWidth',
  'strokeOpacity',
  'opacity',
  'resetStyle',
] as const;

const DEFAULT_FIELDS = ['nodeDefault', 'pathDefault', 'labelDefault', 'arrowDefault'] as const;
const FONT_FIELDS = ['family', 'size', 'weight', 'style'] as const;
const BORDER_SIDES = ['top', 'right', 'bottom', 'left'] as const;

type MutableAppearanceTrace = Partial<Record<TableCellAppearanceTracePathValue, TableCellPlanSource>>;

/** 把 trace path 收窄到公开闭合枚举 */
const tracePathOf = (path: string): TableCellAppearanceTracePathValue => TableCellAppearanceTracePathSchema.parse(path);

/** 删除被整体 replacement 覆盖的旧 winner 路径 */
const removeTraceSubtree = (trace: MutableAppearanceTrace, path: string): void => {
  Object.keys(trace).forEach(key => {
    if (key === path || key.startsWith(`${path}/`)) delete trace[key as TableCellAppearanceTracePathValue];
  });
};

/** 写入单个 appearance winner */
const setTrace = (trace: MutableAppearanceTrace, path: string, source: TableCellPlanSource): void => {
  trace[tracePathOf(path)] = structuredClone(source);
};

/** 按 Cell appearance 的闭合字段规则合并一次 patch */
export const cascadeTableCellAppearance = (
  appearance: IRTableCellAppearance,
  currentTrace: TableCellAppearanceTrace,
  patch: IRTableCellAppearance,
  source: TableCellPlanSource,
): Readonly<{ appearance: IRTableCellAppearance; trace: TableCellAppearanceTrace }> => {
  const next = structuredClone(appearance);
  const trace: MutableAppearanceTrace = structuredClone(currentTrace);

  if (patch.background !== undefined) {
    next.background = structuredClone(patch.background);
    removeTraceSubtree(trace, '/background');
    setTrace(trace, '/background/fill', source);
    if (patch.background.fillOpacity !== undefined) setTrace(trace, '/background/fillOpacity', source);
  }

  if (patch.content !== undefined) {
    const content = structuredClone(next.content ?? {}) as Record<string, unknown>;
    const patchContent = patch.content as Record<string, unknown>;
    CONTENT_ATOMIC_FIELDS.forEach(field => {
      if (!Object.hasOwn(patchContent, field) || patchContent[field] === undefined) return;
      content[field] = structuredClone(patchContent[field]);
      setTrace(trace, `/content/${field}`, source);
    });
    DEFAULT_FIELDS.forEach(defaultField => {
      const defaultPatch = patchContent[defaultField];
      if (defaultPatch === undefined) return;
      const target = structuredClone(content[defaultField] ?? {}) as Record<string, unknown>;
      Object.entries(defaultPatch as Record<string, unknown>).forEach(([field, value]) => {
        if (value === undefined) return;
        const fieldPath = `/content/${defaultField}/${field}`;
        if (field === 'font' && (defaultField === 'nodeDefault' || defaultField === 'labelDefault')) {
          const font = structuredClone(target.font ?? {}) as Record<string, unknown>;
          FONT_FIELDS.forEach(fontField => {
            const fontValue = (value as Record<string, unknown>)[fontField];
            if (fontValue === undefined) return;
            font[fontField] = structuredClone(fontValue);
            setTrace(trace, `${fieldPath}/${fontField}`, source);
          });
          target.font = font;
          return;
        }
        removeTraceSubtree(trace, fieldPath);
        target[field] = structuredClone(value);
        setTrace(trace, fieldPath, source);
      });
      content[defaultField] = target;
    });
    next.content = TableCellContentStyleSchema.parse(content);
  }

  if (patch.borders !== undefined) {
    const borders = structuredClone(next.borders ?? {});
    BORDER_SIDES.forEach(side => {
      if (patch.borders?.[side] === undefined) return;
      borders[side] = structuredClone(patch.borders[side]);
      setTrace(trace, `/borders/${side}`, source);
    });
    next.borders = borders;
  }

  return deepFreeze({ appearance: TableCellAppearanceSchema.parse(next), trace });
};
