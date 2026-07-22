import type { IRScene } from '@retikz/core';
import type { FC } from 'react';

import { SceneSchema } from '@retikz/core';
import { Layout } from '@retikz/react';

import type { ComponentPreviewFileConfig, ComponentRenderSource, PreviewSourceConfig, RendererMode } from '../types';
import type { PreviewIR } from '../utils';

import { buildPreviewIR, buildReactSourceFiles, formatIR, irHasComposite } from '../utils';
import { buildVanillaPreview } from '../vanilla-preview';
import { RawSvgFrame } from './RawSvgFrame';

/** 构建组件预览源码视图所需的输入。 */
export type BuildPreviewSourceInput = {
  /** demo 组件。 */
  Component: FC;
  /** demo 模块声明的源码派生能力。 */
  previewSource?: PreviewSourceConfig;
  /** 主 demo id。 */
  name: string;
  /** 已解析的主 demo registry key。 */
  key: string;
  /** 当前文档目录段。 */
  segments: Array<string>;
  /** 主 demo 原始源码。 */
  rawSource: string;
  /** 主 demo 之外的附加源码文件。 */
  sourceFiles: Array<ComponentPreviewFileConfig>;
  /** 主 demo 的 diff baseline。 */
  diffFrom?: string;
  /** 主 demo baseline 的原始源码。 */
  baselineRawSource?: string;
  /** 是否完全隐藏源码区域。 */
  hideCode: boolean;
  /** 同级 IR JSON 文件覆盖。 */
  irJsonOverride?: string;
  /** demo 模块显式导出的 IR。 */
  exportedPreviewIR?: IRScene;
  /** 同级 Vanilla 文件源码覆盖。 */
  vanillaOverride?: string;
  /** Vanilla 模块显式导出的 SVG。 */
  vanillaSvg?: string;
};

/** 组件预览源码视图及宿主可安全消费的 IR。 */
export type BuildPreviewSourceResult = {
  /** 源码面板的可用视图。 */
  source?: ComponentRenderSource;
  /** 已完成结构检查、可供 renderer 与动画检测使用的 IR。 */
  previewIr: PreviewIR | null;
};

const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/** 构造 React、IR 与 Vanilla 源码视图，不参与可见 demo 的 React 渲染。 */
export const buildPreviewSource = (input: BuildPreviewSourceInput): BuildPreviewSourceResult => {
  const {
    Component,
    previewSource,
    name,
    key,
    segments,
    rawSource,
    sourceFiles,
    diffFrom,
    baselineRawSource,
    hideCode,
    irJsonOverride,
    exportedPreviewIR,
    vanillaOverride,
    vanillaSvg,
  } = input;

  if (hideCode) return { source: undefined, previewIr: null };

  const reactFiles = buildReactSourceFiles({
    key,
    name,
    segments,
    rawSource,
    sourceFiles,
    diffFrom,
    baselineRawSource,
    hideCode,
  });
  const extraSourceFiles = reactFiles.filter(file => !file.isMain);

  let resolvedPreviewIr: PreviewIR | null = null;
  let irJson = '';
  if (irJsonOverride !== undefined) {
    irJson = irJsonOverride.replace(/\n$/, '');
    try {
      const ir = JSON.parse(irJson) as IRScene;
      resolvedPreviewIr = { ir, contributions: [], width: undefined, height: undefined };
    } catch (error) {
      irJson = `// Failed to parse IR override: ${errorMessage(error)}`;
    }
  } else if (exportedPreviewIR !== undefined) {
    resolvedPreviewIr = { ir: exportedPreviewIR, contributions: [], width: undefined, height: undefined };
    irJson = formatIR(exportedPreviewIR);
  } else if (previewSource?.canonicalRender !== undefined) {
    try {
      resolvedPreviewIr = buildPreviewIR(previewSource.canonicalRender);
      irJson = formatIR(resolvedPreviewIr.ir);
    } catch (error) {
      irJson = `// Failed to compute IR: ${errorMessage(error)}`;
    }
  } else if (previewSource?.deriveIR !== false) {
    try {
      resolvedPreviewIr = buildPreviewIR(Component);
      irJson = formatIR(resolvedPreviewIr.ir);
    } catch (error) {
      irJson = `// Failed to compute IR: ${errorMessage(error)}`;
    }
  }

  let previewIr = resolvedPreviewIr;
  let hasComposite = false;
  let structureError: unknown;
  if (resolvedPreviewIr !== null) {
    const validated = SceneSchema.safeParse(resolvedPreviewIr.ir);
    if (!validated.success) {
      structureError = validated.error;
      previewIr = null;
    } else {
      try {
        hasComposite = irHasComposite(resolvedPreviewIr.ir);
      } catch (error) {
        structureError = error;
        previewIr = null;
      }
    }
  }

  const automaticVanilla =
    resolvedPreviewIr !== null && structureError === undefined ? buildVanillaPreview(resolvedPreviewIr) : undefined;
  let vanillaCode = '';
  if (vanillaOverride !== undefined) {
    vanillaCode = vanillaOverride.replace(/\n$/, '');
  } else if (structureError !== undefined) {
    vanillaCode = `// Failed to generate vanilla code: ${errorMessage(structureError)}`;
  } else if (automaticVanilla !== undefined) {
    vanillaCode = automaticVanilla.code;
  }
  const resolvedVanillaSvg = vanillaOverride !== undefined ? vanillaSvg : (vanillaSvg ?? automaticVanilla?.svg);

  const source: ComponentRenderSource = {
    react: { files: reactFiles },
    ...(irJson.length > 0
      ? {
          ir: {
            files: [{ filename: `${name}.ir.json`, code: irJson, lang: 'json' as const }],
            render:
              previewIr !== null && !hasComposite
                ? (mode: RendererMode) => (
                    <Layout
                      ir={previewIr.ir}
                      renderer={mode}
                      width={previewIr.width}
                      height={previewIr.height}
                      pathKinds={previewIr.pathKinds}
                    />
                  )
                : undefined,
          },
        }
      : {}),
    ...(vanillaCode.length > 0
      ? {
          vanilla: {
            files: [{ filename: `${name}.vanilla.ts`, code: vanillaCode, lang: 'ts' as const }, ...extraSourceFiles],
            ...(resolvedVanillaSvg !== undefined
              ? {
                  rendererMode: 'svg' as const,
                  render: () => <RawSvgFrame svg={resolvedVanillaSvg} />,
                }
              : {}),
          },
        }
      : {}),
  };

  return { source, previewIr };
};
