import { z } from 'zod';

/** Layout Inspector bounds 的 sparse authoring schema */
export const LayoutInspectBoundsOptionsInputSchema = z.strictObject({
  container: z.boolean().optional().describe('Whether to draw the outer container bounds.'),
  content: z.boolean().optional().describe('Whether to draw the content bounds inside container padding.'),
  slot: z.boolean().optional().describe('Whether to draw each parent-assigned child slot.'),
  allocation: z.boolean().optional().describe("Whether to draw each child's actual allocation bounds."),
  visual: z.boolean().optional().describe("Whether to draw each child's final visual bounds."),
});

/** 通用 Layout Inspector 的 sparse authoring schema */
export const BaseLayoutInspectOptionsInputSchema = z.strictObject({
  bounds: z
    .union([z.boolean(), LayoutInspectBoundsOptionsInputSchema])
    .optional()
    .describe(
      'Bounds guide selection. true restores the canonical profile, false disables every bounds guide, and an object overrides individual guides.',
    ),
  overflow: z.boolean().optional().describe('Whether to shade content that overflows its assigned slot.'),
  alignmentGuides: z.boolean().optional().describe('Whether to draw alignment reference guides.'),
  labels: z.boolean().optional().describe('Whether to draw textual inspection labels.'),
});

/** Layout / Scope inspection 策略的 sparse authoring schema */
export const InspectOptionsInputSchema = z.strictObject({
  enabled: z
    .boolean()
    .optional()
    .describe('Whether inspection remains enabled for this authored subtree. false creates a hard descendant barrier.'),
  layout: z
    .union([z.boolean(), BaseLayoutInspectOptionsInputSchema])
    .optional()
    .describe(
      'Layout inspector policy. true enables the canonical profile, false disables the current cascaded value but descendants may re-enable it, and an object overrides shared options. Only enabled: false creates a hard descendant barrier.',
    ),
});

/** Layout Inspector bounds authoring值 */
export type LayoutInspectBoundsOptions = z.input<typeof LayoutInspectBoundsOptionsInputSchema>;

/** 完整求值后的 Layout Inspector bounds 开关 */
export type ResolvedLayoutInspectBoundsOptions = Readonly<{
  container: boolean;
  content: boolean;
  slot: boolean;
  allocation: boolean;
  visual: boolean;
}>;

/** 通用 Layout Inspector authoring值 */
export type BaseLayoutInspectOptions = z.input<typeof BaseLayoutInspectOptionsInputSchema>;

/** 完整求值后的通用 Layout Inspector 选项 */
export type ResolvedBaseLayoutInspectOptions = Readonly<{
  bounds: ResolvedLayoutInspectBoundsOptions;
  overflow: boolean;
  alignmentGuides: boolean;
  labels: boolean;
}>;

/** Layout / Scope inspection authoring值 */
export type InspectOptions = z.input<typeof InspectOptionsInputSchema>;

/** 完整求值后的 Layout / Scope inspection 策略 */
export type ResolvedInspectOptions = Readonly<{
  enabled: boolean;
  layout: false | ResolvedBaseLayoutInspectOptions;
}>;

/** 合并 nested bounds sparse 字段，不提前填充 canonical defaults */
const mergeBaseLayoutInspectOptions = (
  current: BaseLayoutInspectOptions,
  next: BaseLayoutInspectOptions,
): BaseLayoutInspectOptions => ({
  ...current,
  ...next,
  ...(next.bounds === undefined
    ? {}
    : {
        bounds:
          typeof next.bounds === 'object' && typeof current.bounds === 'object'
            ? { ...current.bounds, ...next.bounds }
            : next.bounds,
      }),
});

/** 按 Layout/Scope 级联语义合并两份 sparse inspection 策略 */
export const mergeInspectOptions = (
  current: InspectOptions | undefined,
  next: InspectOptions | undefined,
): InspectOptions | undefined => {
  if (next === undefined || current?.enabled === false) return current;
  const parsed = InspectOptionsInputSchema.parse(next);
  if (parsed.enabled === false) return Object.freeze({ enabled: false });

  let layout = current?.layout;
  if (parsed.layout === false) layout = false;
  else if (parsed.layout === true) {
    if (layout === undefined || layout === false) layout = true;
  } else if (parsed.layout !== undefined) {
    layout = mergeBaseLayoutInspectOptions(typeof layout === 'object' ? layout : {}, parsed.layout);
  }

  return Object.freeze({
    ...(current?.enabled === undefined && parsed.enabled === undefined
      ? {}
      : { enabled: parsed.enabled ?? current?.enabled }),
    ...(layout === undefined ? {} : { layout }),
  });
};

const DefaultBounds: ResolvedLayoutInspectBoundsOptions = Object.freeze({
  container: true,
  content: true,
  slot: true,
  allocation: true,
  visual: false,
});

/** 把 sparse Base Layout Inspector 选项求值为唯一 canonical profile */
export const resolveBaseLayoutInspectOptions = (
  options: BaseLayoutInspectOptions,
): ResolvedBaseLayoutInspectOptions => {
  const bounds =
    typeof options.bounds === 'boolean'
      ? options.bounds
        ? DefaultBounds
        : { container: false, content: false, slot: false, allocation: false, visual: false }
      : { ...DefaultBounds, ...options.bounds };
  return Object.freeze({
    bounds: Object.freeze(bounds),
    overflow: options.overflow ?? true,
    alignmentGuides: options.alignmentGuides ?? true,
    labels: options.labels ?? false,
  });
};

/** 通用 Layout Inspector 的 canonical resolved schema */
export const BaseLayoutInspectOptionsSchema = BaseLayoutInspectOptionsInputSchema.transform(
  resolveBaseLayoutInspectOptions,
);

/** 把 sparse Layout / Scope 策略求值为 canonical profile */
export const resolveInspectOptions = (options: InspectOptions): ResolvedInspectOptions =>
  Object.freeze({
    enabled: options.enabled ?? true,
    layout:
      options.layout === undefined || options.layout === false
        ? false
        : resolveBaseLayoutInspectOptions(options.layout === true ? {} : options.layout),
  });

/** Layout / Scope inspection 的 canonical resolved schema */
export const InspectOptionsSchema = InspectOptionsInputSchema.transform(resolveInspectOptions);
