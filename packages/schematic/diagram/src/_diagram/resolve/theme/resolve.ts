import type { CanonicalTheme } from '@retikz/core';
import { resolveBoxSpacing } from '@retikz/core';
import { mergeProperties } from '@retikz/foundation';

import { RetikzDiagramError, RetikzDiagramErrorCode } from '../../../errors';
import type { DiagramThemeDefinition } from '../../contract';
import { getDefaultDiagramTheme } from '../../providers';
import type { IRDiagramDefaults, IRDiagramDefaultsPresentationText, IRDiagramPresentationText } from '../../schemas';
import type { CanonicalDiagramTextAppearance, CanonicalDiagramTheme, CanonicalDiagramThemeFrame } from './types';

type DiagramDefaultsFrame = NonNullable<IRDiagramDefaults['frame']>;

type DiagramDefaultsTextStyle = NonNullable<IRDiagramDefaultsPresentationText['style']>;

type DiagramDefaultsTextLayout = NonNullable<IRDiagramDefaultsPresentationText['layout']>;

const mergeFields = <T extends object>(base: T | undefined, override: T | undefined): T | undefined => {
  const merged = mergeProperties<Partial<T>>([base, override], { shouldOverride: value => value !== undefined });
  return Object.keys(merged).length === 0 ? undefined : (merged as T);
};

/** 合并一个字体覆盖；字体字段在每一层整体替换，空字体不形成覆盖 */
const mergeFont = <T extends object>(base: T | undefined, override: T | undefined): T | undefined => {
  const definedOverride = mergeProperties<Partial<T>>([override], { shouldOverride: value => value !== undefined });
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
const mergeDiagramDefaults = (
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
  theme: CanonicalTheme,
  registry: ReadonlyMap<string, DiagramThemeDefinition>,
): IRDiagramDefaults | undefined => {
  if (theme.name === undefined) return undefined;

  const definition = registry.get(theme.name);
  if (definition === undefined) {
    throw new RetikzDiagramError({
      code: RetikzDiagramErrorCode.DefinitionNotRegistered,
      message: `Diagram theme '${theme.name}' is not registered.`,
      details: { capability: 'diagram-theme', key: theme.name, availableKeys: [...registry.keys()] },
    });
  }

  try {
    return structuredClone(definition.resolve(theme));
  } catch (cause) {
    throw new RetikzDiagramError({
      code: RetikzDiagramErrorCode.DefinitionCallbackFailed,
      message: `Diagram theme '${theme.name}' resolution failed.`,
      details: { capability: 'diagram-theme', key: theme.name },
      cause,
    });
  }
};

const completeFrame = (frame: DiagramDefaultsFrame | undefined): CanonicalDiagramThemeFrame => ({
  padding: resolveBoxSpacing(frame?.padding ?? 16, 0),
  titleDescriptionGap: frame?.titleDescriptionGap ?? 6,
  headingMainGap: frame?.headingMainGap ?? 16,
  drawingLegendGap: frame?.drawingLegendGap ?? 16,
  cornerRadius: frame?.cornerRadius ?? 0,
  ...(frame?.background === undefined ? {} : { background: frame.background }),
  ...(frame?.border === undefined ? {} : { border: frame.border }),
});

const completeText = (slice: IRDiagramDefaultsPresentationText | undefined): CanonicalDiagramTextAppearance => ({
  textColor: slice?.style?.textColor ?? '#000000',
  opacity: slice?.style?.opacity ?? 1,
  font: slice?.style?.font ?? {},
  align: slice?.layout?.align ?? 'start',
  lineHeight: slice?.layout?.lineHeight ?? 20,
  ...(slice?.layout?.maxTextWidth === undefined ? {} : { maxTextWidth: slice.layout.maxTextWidth }),
});

/** 按 Core effective Theme、注册 Definition 与 Source defaults 解析完整 Diagram appearance */
export const resolveDiagramTheme = (
  theme: CanonicalTheme,
  styles: ReadonlyMap<string, DiagramThemeDefinition>,
  inline?: IRDiagramDefaults,
): CanonicalDiagramTheme => {
  const neutral = getDefaultDiagramTheme(theme);
  const registered = resolveRegisteredDefaults(theme, styles);
  const source = inline;
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
  base: CanonicalDiagramTextAppearance,
  override: IRDiagramPresentationText,
): CanonicalDiagramTextAppearance => {
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
  appearance: CanonicalDiagramTextAppearance,
): CanonicalDiagramTextAppearance => mergePresentationTextOverride(appearance, text);
