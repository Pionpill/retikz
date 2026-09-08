import type { ResolvedTheme } from '@retikz/core';

import { resolveBoxSpacing } from '@retikz/core';

import type { DiagramThemeStyleDefinition } from '../../contract';
import type { IRDiagramDefaults, IRDiagramDefaultsPresentationText, IRDiagramPresentationText } from '../../schemas';
import type { EffectiveDiagramTextAppearance, EffectiveDiagramTheme, EffectiveDiagramThemeFrame } from './types';

import { RetikzDiagramError, RetikzDiagramErrorCode } from '../../../errors';
import { getDefaultDiagramTheme } from '../../providers';
import { DiagramDefaultsSchema } from '../../schemas';

type DiagramDefaultsFrame = NonNullable<IRDiagramDefaults['frame']>;
type DiagramDefaultsTextStyle = NonNullable<IRDiagramDefaultsPresentationText['style']>;
type DiagramDefaultsTextLayout = NonNullable<IRDiagramDefaultsPresentationText['layout']>;

const definedFields = <T extends object>(value: T | undefined): Partial<T> =>
  value === undefined
    ? {}
    : (Object.fromEntries(Object.entries(value).filter(([, field]) => field !== undefined)) as Partial<T>);

const mergeFields = <T extends object>(base: T | undefined, override: T | undefined): T | undefined => {
  const merged = { ...definedFields(base), ...definedFields(override) };
  return Object.keys(merged).length === 0 ? undefined : (merged as T);
};

/** 合并一个字体覆盖；字体字段在每一层整体替换，空字体不形成覆盖 */
const mergeFont = <T extends object>(base: T | undefined, override: T | undefined): T | undefined => {
  const definedOverride = definedFields(override);
  return Object.keys(definedOverride).length === 0 ? base : (definedOverride as T);
};

const mergeTextStyle = (
  base: DiagramDefaultsTextStyle | undefined,
  override: DiagramDefaultsTextStyle | undefined,
): DiagramDefaultsTextStyle | undefined => {
  const merged = mergeFields(base, override);
  if (merged === undefined) return undefined;
  const font = mergeFont(base?.font, override?.font);
  return { ...merged, ...(font === undefined ? {} : { font }) };
};

const mergeTextLayout = (
  base: DiagramDefaultsTextLayout | undefined,
  override: DiagramDefaultsTextLayout | undefined,
): DiagramDefaultsTextLayout | undefined => mergeFields(base, override);

const mergePresentationText = (
  base: IRDiagramDefaultsPresentationText | undefined,
  override: IRDiagramDefaultsPresentationText | undefined,
): IRDiagramDefaultsPresentationText | undefined => {
  if (base === undefined && override === undefined) return undefined;
  const style = mergeTextStyle(base?.style, override?.style);
  const layout = mergeTextLayout(base?.layout, override?.layout);
  return {
    ...(style === undefined ? {} : { style }),
    ...(layout === undefined ? {} : { layout }),
  };
};

/** 按 Source 同构路径合并 Diagram defaults */
export const mergeDiagramDefaults = (
  base: IRDiagramDefaults | undefined,
  override: IRDiagramDefaults | undefined,
): IRDiagramDefaults => {
  const frame = mergeFields(base?.frame, override?.frame);
  const title = mergePresentationText(base?.presentation?.title, override?.presentation?.title);
  const description = mergePresentationText(base?.presentation?.description, override?.presentation?.description);
  const presentation =
    title === undefined && description === undefined
      ? undefined
      : {
          ...(title === undefined ? {} : { title }),
          ...(description === undefined ? {} : { description }),
        };
  return {
    ...(frame === undefined ? {} : { frame }),
    ...(presentation === undefined ? {} : { presentation }),
  };
};

const resolveRegisteredDefaults = (
  theme: ResolvedTheme,
  registry: ReadonlyMap<string, DiagramThemeStyleDefinition>,
): IRDiagramDefaults | undefined => {
  if (theme.style === undefined) return undefined;
  const definition = registry.get(theme.style);
  if (definition === undefined) {
    throw new RetikzDiagramError({
      code: RetikzDiagramErrorCode.DefinitionNotRegistered,
      message: `Diagram theme style '${theme.style}' is not registered.`,
      details: { capability: 'diagram-theme-style', key: theme.style, availableKeys: [...registry.keys()] },
    });
  }
  try {
    return DiagramDefaultsSchema.parse(definition.resolve(theme));
  } catch (cause) {
    throw new RetikzDiagramError({
      code: RetikzDiagramErrorCode.DefinitionCallbackFailed,
      message: `Diagram theme style '${theme.style}' resolution failed.`,
      details: { capability: 'diagram-theme-style', key: theme.style },
      cause,
    });
  }
};

const completeFrame = (frame: DiagramDefaultsFrame | undefined): EffectiveDiagramThemeFrame => ({
  padding: resolveBoxSpacing(frame?.padding ?? 16, 0),
  titleDescriptionGap: frame?.titleDescriptionGap ?? 6,
  headingMainGap: frame?.headingMainGap ?? 16,
  drawingLegendGap: frame?.drawingLegendGap ?? 16,
  cornerRadius: frame?.cornerRadius ?? 0,
  ...(frame?.background === undefined ? {} : { background: frame.background }),
  ...(frame?.border === undefined ? {} : { border: frame.border }),
});

const completeText = (slice: IRDiagramDefaultsPresentationText | undefined): EffectiveDiagramTextAppearance => ({
  textColor: slice?.style?.textColor ?? '#000000',
  opacity: slice?.style?.opacity ?? 1,
  font: slice?.style?.font ?? {},
  align: slice?.layout?.align ?? 'start',
  lineHeight: slice?.layout?.lineHeight ?? 20,
  ...(slice?.layout?.maxTextWidth === undefined ? {} : { maxTextWidth: slice.layout.maxTextWidth }),
});

/** 按 Core effective Theme、注册 Definition 与 Source defaults 解析完整 Diagram appearance */
export const resolveDiagramTheme = (
  theme: ResolvedTheme,
  styles: ReadonlyMap<string, DiagramThemeStyleDefinition>,
  inline?: IRDiagramDefaults,
): EffectiveDiagramTheme => {
  const neutral = getDefaultDiagramTheme(theme);
  const registered = resolveRegisteredDefaults(theme, styles);
  const source = inline === undefined ? undefined : DiagramDefaultsSchema.parse(inline);
  const defaults = mergeDiagramDefaults(mergeDiagramDefaults(neutral, registered), source);
  return Object.freeze({
    frame: completeFrame(defaults.frame),
    presentation: {
      title: completeText(defaults.presentation?.title),
      description: completeText(defaults.presentation?.description),
    },
  });
};

const mergePresentationTextOverride = (
  base: EffectiveDiagramTextAppearance,
  override: IRDiagramPresentationText,
): EffectiveDiagramTextAppearance => {
  const style = override.style;
  const layout = override.layout;
  const font = mergeFont(base.font, style?.font);
  return {
    ...base,
    ...(style?.textColor === undefined ? {} : { textColor: style.textColor }),
    ...(style?.opacity === undefined ? {} : { opacity: style.opacity }),
    ...(font === undefined ? {} : { font }),
    ...(layout?.align === undefined ? {} : { align: layout.align }),
    ...(layout?.lineHeight === undefined ? {} : { lineHeight: layout.lineHeight }),
    ...(layout?.maxTextWidth === undefined ? {} : { maxTextWidth: layout.maxTextWidth }),
  };
};

/** 将一个已存在的 Presentation 文本区域与当前 defaults 合并为消费态 appearance */
export const resolveDiagramPresentationTextAppearance = (
  text: IRDiagramPresentationText,
  appearance: EffectiveDiagramTextAppearance,
): EffectiveDiagramTextAppearance => mergePresentationTextOverride(appearance, text);
