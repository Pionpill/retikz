import type { IRGraphicStyle, IRNodeLabelDefault } from '@retikz/core';
import { mergeGraphicStyle, mergeArrowDefaults, mergeNodeLabelDefaults } from '@retikz/core';

import type { TableCellAppearanceTracePath, TableCellPlanSource } from '../../contract';
import { TableCellAppearanceTracePathSchema } from '../../contract';
import type { IRTableCellAppearance } from '../../schemas';
import { TableCellAppearanceSchema, TableCellContentStyleSchema } from '../../schemas';
import { deepFreeze } from '../../shared';
import type { TableCellAppearanceTrace } from './types';

const CONTENT_ATOMIC_FIELDS = [
  'color',
  'fill',
  'stroke',
  'strokeWidth',
  'dashPattern',
  'dashOffset',
  'lineCap',
  'lineJoin',
  'shadow',
  'blendMode',
] as const;

const DEFAULT_FIELDS = ['node', 'path'] as const;

const FONT_FIELDS = ['family', 'size', 'weight', 'style'] as const;

const BORDER_SIDES = ['top', 'right', 'bottom', 'left'] as const;

type MutableAppearanceTrace = Partial<Record<TableCellAppearanceTracePath, TableCellPlanSource>>;

/** 把 trace path 收窄到公开闭合枚举 */
const tracePathOf = (path: string): TableCellAppearanceTracePath => TableCellAppearanceTracePathSchema.parse(path);

/** 删除被整体 replacement 覆盖的旧 winner 路径 */
const removeTraceSubtree = (trace: MutableAppearanceTrace, path: string): void => {
  Object.keys(trace).forEach(key => {
    if (key === path || key.startsWith(`${path}/`)) delete trace[key as TableCellAppearanceTracePath];
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

  const applyOpacity = (
    destination: { opacity?: IRGraphicStyle['opacity'] },
    value: IRGraphicStyle['opacity'],
    prefix: string,
  ): void => {
    if (value === undefined) return;
    destination.opacity = mergeGraphicStyle(destination, { opacity: value }).opacity;
    const factors = typeof value === 'number' ? { overall: value } : value;
    for (const name of ['overall', 'fill', 'stroke'] as const) {
      if (factors[name] !== undefined) setTrace(trace, `${prefix}/opacity/${name}`, source);
    }
  };

  if (patch.background !== undefined) {
    const background = structuredClone(next.background ?? {}) as Record<string, unknown>;
    background.fill = structuredClone(patch.background.fill);
    setTrace(trace, '/background/fill', source);
    if (Object.hasOwn(patch.background, 'fillOpacity')) {
      if (patch.background.fillOpacity === undefined) {
        delete background.fillOpacity;
        removeTraceSubtree(trace, '/background/fillOpacity');
      } else {
        background.fillOpacity = structuredClone(patch.background.fillOpacity);
        setTrace(trace, '/background/fillOpacity', source);
      }
    }

    next.background = background as IRTableCellAppearance['background'];
  }

  if (patch.content !== undefined) {
    const content = structuredClone(next.content ?? {}) as Record<string, unknown>;
    if (patch.content.defaults !== undefined) {
      const defaults = structuredClone(next.content?.defaults ?? {}) as Record<string, unknown>;
      const defaultPatches = patch.content.defaults;
      if (patch.content.defaults.style !== undefined) {
        const style = { ...next.content?.defaults?.style };
        CONTENT_ATOMIC_FIELDS.forEach(field => {
          const value = patch.content?.defaults?.style?.[field];
          if (value === undefined) return;

          Object.assign(style, { [field]: structuredClone(value) });
          setTrace(trace, `/content/defaults/style/${field}`, source);
        });
        applyOpacity(style, patch.content.defaults.style.opacity, '/content/defaults/style');
        defaults.style = style;
      }

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
            if (field === 'opacity' && prefix.endsWith('/style')) {
              applyOpacity(destination, value as IRGraphicStyle['opacity'], prefix);
              return;
            }
            if (field === 'font') {
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

            if (field === 'pin') {
              const merged = mergeNodeLabelDefaults(
                { pin: destination.pin as IRNodeLabelDefault['pin'] },
                { pin: value as IRNodeLabelDefault['pin'] },
              );
              destination.pin = structuredClone(merged.pin);
              setTrace(trace, fieldPath, source);
              return;
            }
            if ((field === 'start' || field === 'end') && prefix.endsWith('/arrow')) {
              const merged = mergeArrowDefaults({ [field]: destination[field] }, { [field]: value });
              destination[field] = structuredClone(merged[field]);
              setTrace(trace, fieldPath, source);
              return;
            }
            removeTraceSubtree(trace, fieldPath);
            destination[field] = structuredClone(value);
            setTrace(trace, fieldPath, source);
          });
        };

        const { style, layout, label, arrow, ...root } = defaultPatch as Record<string, unknown>;
        applyFields(target, root, `/content/defaults/${channel}`);

        for (const [group, fields] of [
          ['style', style],
          ['layout', layout],
          ['label', label],
          ['arrow', arrow],
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
