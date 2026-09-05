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
] as const;

const DEFAULT_FIELDS = ['node', 'path', 'label', 'arrow'] as const;
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
    next.background = {
      fill: structuredClone(patch.background.fill),
      ...(patch.background.fillOpacity === undefined
        ? {}
        : { fillOpacity: structuredClone(patch.background.fillOpacity) }),
    };
    removeTraceSubtree(trace, '/background');
    setTrace(trace, '/background/fill', source);
    if (patch.background.fillOpacity !== undefined) setTrace(trace, '/background/fillOpacity', source);
  }

  if (patch.content !== undefined) {
    const content = structuredClone(next.content ?? {}) as Record<string, unknown>;
    if (patch.content.style !== undefined) {
      const style = { ...next.content?.style };
      CONTENT_ATOMIC_FIELDS.forEach(field => {
        const value = patch.content?.style?.[field];
        if (value === undefined) return;
        Object.assign(style, { [field]: structuredClone(value) });
        setTrace(trace, `/content/style/${field}`, source);
      });
      content.style = style;
    }
    if (patch.content.defaults !== undefined) {
      const defaults = structuredClone(next.content?.defaults ?? {}) as Record<string, unknown>;
      const defaultPatches = patch.content.defaults;
      if (defaultPatches.reset !== undefined) {
        defaults.reset = structuredClone(defaultPatches.reset);
        setTrace(trace, '/content/defaults/reset', source);
      }
      DEFAULT_FIELDS.forEach(channel => {
        const defaultPatch = defaultPatches[channel];
        if (defaultPatch === undefined) return;
        const target = structuredClone(defaults[channel] ?? {}) as Record<string, unknown>;
        const applyFields = (destination: Record<string, unknown>, fields: object, prefix: string): void => {
          Object.entries(fields).forEach(([field, value]: [string, unknown]) => {
            if (value === undefined) return;
            const fieldPath = `${prefix}/${field}`;
            if (field === 'font' && (channel === 'node' || channel === 'label')) {
              const font = structuredClone(destination.font ?? {}) as Record<string, unknown>;
              FONT_FIELDS.forEach(fontField => {
                const fontValue = (value as Record<string, unknown>)[fontField];
                if (fontValue === undefined) return;
                font[fontField] = structuredClone(fontValue);
                setTrace(trace, `${fieldPath}/${fontField}`, source);
              });
              destination.font = font;
              return;
            }
            removeTraceSubtree(trace, fieldPath);
            destination[field] = structuredClone(value);
            setTrace(trace, fieldPath, source);
          });
        };
        const { style, layout, ...root } = defaultPatch as Record<string, unknown>;
        applyFields(target, root, `/content/defaults/${channel}`);
        for (const [group, fields] of [
          ['style', style],
          ['layout', layout],
        ] as const) {
          if (fields === undefined) continue;
          const groupTarget = structuredClone(target[group] ?? {}) as Record<string, unknown>;
          applyFields(groupTarget, fields as object, `/content/defaults/${channel}/${group}`);
          target[group] = groupTarget;
        }
        defaults[channel] = target;
      });
      content.defaults = defaults;
    }
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
