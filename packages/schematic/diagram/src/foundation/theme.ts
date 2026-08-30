import type { ResolvedTheme } from '@retikz/core';

import { ThemeMode } from '@retikz/core';

import type {
  DiagramFrameInput,
  DiagramThemeInput,
  DiagramThemeStyleDefinition,
  IRDiagramTheme,
  ResolvedDiagramAppearance,
  ResolvedDiagramFrame,
  ResolvedDiagramTextAppearance,
} from './types';

import { RetikzDiagramError, RetikzDiagramErrorCode } from './errors';
import { assertValidDiagramStyleName, DiagramFrameSchema, DiagramThemeSchema } from './schema';

const hasOwn = (value: object, key: PropertyKey): boolean => Object.prototype.hasOwnProperty.call(value, key);

const mergeFont = <T extends Record<string, unknown>>(base: T | undefined, override: T | undefined): T | undefined => {
  if (base === undefined && override === undefined) return undefined;
  return { ...base, ...override } as T;
};

const mergeSlice = <T extends object>(base: T, override: Partial<T> | undefined): T => {
  if (override === undefined) return base;
  return { ...base, ...override };
};

const mergeTextSlice = (
  base: NonNullable<IRDiagramTheme['title']>,
  override: Partial<NonNullable<IRDiagramTheme['title']>> | undefined,
): NonNullable<IRDiagramTheme['title']> => {
  if (override === undefined) return base;
  const font = mergeFont(base.font, override.font);
  return { ...base, ...override, ...(font === undefined ? {} : { font }) };
};

const createNeutralTheme = (theme: ResolvedTheme): IRDiagramTheme => ({
  frame: {
    padding: 16,
    titleDescriptionGap: 6,
    headingMainGap: 16,
    drawingLegendGap: 16,
    cornerRadius: 0,
  },
  title: {
    textColor: theme.mode === ThemeMode.Dark ? '#ffffff' : '#000000',
    opacity: 1,
    font: { size: 18, weight: 600 },
    align: 'start',
    lineHeight: 22,
  },
  description: {
    textColor: theme.colors.semantic.guide,
    opacity: 1,
    font: { size: 14, weight: 400 },
    align: 'start',
    lineHeight: 20,
  },
});

/** 定义一个 Diagram Theme style，并检查其稳定名称 */
export const defineDiagramThemeStyle = (definition: DiagramThemeStyleDefinition): DiagramThemeStyleDefinition => {
  const name = assertValidDiagramStyleName(definition.name);
  if (typeof definition.resolve !== 'function') {
    throw new RetikzDiagramError(
      RetikzDiagramErrorCode.DefinitionCallbackFailed,
      `Diagram Theme style '${name}' must provide a resolve callback.`,
      { name, reason: 'resolve is not a function' },
    );
  }
  return Object.freeze({ name, resolve: definition.resolve });
};

/** 创建一次性 Diagram Theme style registry，并拒绝重名 Definition */
export const createDiagramThemeStyleRegistry = (
  definitions: ReadonlyArray<DiagramThemeStyleDefinition>,
): ReadonlyMap<string, DiagramThemeStyleDefinition> => {
  const registry = new Map<string, DiagramThemeStyleDefinition>();
  for (const definition of definitions) {
    const normalized = defineDiagramThemeStyle(definition);
    if (registry.has(normalized.name)) {
      throw new RetikzDiagramError(
        RetikzDiagramErrorCode.DefinitionDuplicate,
        `Diagram Theme style '${normalized.name}' has a duplicate registration.`,
        { name: normalized.name, reason: 'duplicate definition name' },
      );
    }
    registry.set(normalized.name, normalized);
  }
  return registry;
};

const resolveRegisteredTheme = (
  theme: ResolvedTheme,
  registry: ReadonlyMap<string, DiagramThemeStyleDefinition>,
): IRDiagramTheme | undefined => {
  if (theme.style === undefined) return undefined;
  const definition = registry.get(theme.style);
  if (definition === undefined) {
    throw new RetikzDiagramError(
      RetikzDiagramErrorCode.DefinitionNotRegistered,
      `Diagram Theme style '${theme.style}' is not registered.`,
      { name: theme.style, reason: 'style lookup failed' },
    );
  }
  try {
    return DiagramThemeSchema.parse(definition.resolve(theme));
  } catch (cause) {
    throw new RetikzDiagramError(
      RetikzDiagramErrorCode.DefinitionCallbackFailed,
      `Diagram Theme style '${theme.style}' resolution failed.`,
      { name: theme.style, reason: 'callback or output validation failed' },
      cause,
    );
  }
};

const completeFrame = (
  frame: IRDiagramTheme['frame'],
): Omit<ResolvedDiagramFrame, 'legendPosition' | 'legendAlign' | 'overflow'> => ({
  padding: frame?.padding ?? 16,
  titleDescriptionGap: frame?.titleDescriptionGap ?? 6,
  headingMainGap: frame?.headingMainGap ?? 16,
  drawingLegendGap: frame?.drawingLegendGap ?? 16,
  ...(frame?.background === undefined ? {} : { background: frame.background }),
  ...(frame?.border === undefined ? {} : { border: frame.border }),
  cornerRadius: frame?.cornerRadius ?? 0,
});

const completeText = (slice: NonNullable<IRDiagramTheme['title']>): ResolvedDiagramTextAppearance => ({
  textColor: slice.textColor ?? '#000000',
  opacity: slice.opacity ?? 1,
  font: slice.font ?? {},
  align: slice.align ?? 'start',
  lineHeight: slice.lineHeight ?? 20,
  ...(slice.maxTextWidth === undefined ? {} : { maxTextWidth: slice.maxTextWidth }),
});

/** 按 Core effective Theme、Diagram Theme 与实例 Frame 解析 Foundation appearance */
export const resolveDiagramAppearance = (
  coreTheme: ResolvedTheme,
  diagramTheme: DiagramThemeInput | undefined,
  frame: DiagramFrameInput | undefined,
  styles: ReadonlyMap<string, DiagramThemeStyleDefinition>,
): ResolvedDiagramAppearance => {
  const neutral = DiagramThemeSchema.parse(createNeutralTheme(coreTheme));
  const registered = resolveRegisteredTheme(coreTheme, styles);
  const inline = diagramTheme === undefined ? undefined : DiagramThemeSchema.parse(diagramTheme);
  const parsedFrame = frame === undefined ? undefined : DiagramFrameSchema.parse(frame);
  const theme = mergeSlice(mergeSlice(neutral, registered), inline);
  const resolvedFrame = completeFrame(mergeSlice(theme.frame ?? {}, parsedFrame));
  const resolvedTitle = completeText(
    mergeTextSlice(neutral.title ?? {}, mergeTextSlice(registered?.title ?? {}, inline?.title)),
  );
  const resolvedDescription = completeText(
    mergeTextSlice(neutral.description ?? {}, mergeTextSlice(registered?.description ?? {}, inline?.description)),
  );

  return Object.freeze({ frame: resolvedFrame, title: resolvedTitle, description: resolvedDescription });
};

/** 解析实例 Frame 的方位、overflow 与最终 Surface 字段 */
export const resolveDiagramFrame = (
  presentation: { legend?: unknown },
  frame: DiagramFrameInput | undefined,
  appearance: ResolvedDiagramAppearance,
): ResolvedDiagramFrame => {
  const parsed = frame === undefined ? undefined : DiagramFrameSchema.parse(frame);
  const hasLegend = presentation.legend !== undefined;
  if (!hasLegend && parsed !== undefined) {
    const invalidWithoutLegend = ['legendPosition', 'legendAlign', 'drawingLegendGap'].find(key => hasOwn(parsed, key));
    if (invalidWithoutLegend !== undefined) {
      throw new RetikzDiagramError(
        RetikzDiagramErrorCode.FrameInvalid,
        `Diagram Frame field '${invalidWithoutLegend}' requires a Legend.`,
        { reason: 'Legend-specific Frame field used without a Legend' },
      );
    }
  }

  const merged = { ...appearance.frame, ...parsed };
  return {
    ...merged,
    legendPosition: parsed?.legendPosition ?? 'right',
    legendAlign: parsed?.legendAlign ?? 'start',
    overflow: parsed?.overflow ?? 'visible',
  };
};
