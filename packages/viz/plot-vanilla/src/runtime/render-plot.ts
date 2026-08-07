import type { ExternalDatasets } from '@retikz/data';
import type {
  IRPlotSpec,
  LowerPlotsOptions,
  PlotHostLineageMetadata,
  PlotLineageOptions,
  PlotLineageRun,
} from '@retikz/plot';

import { compileToScene } from '@retikz/core';
import { lowerPlots, lowerPlotWithLineage, PlotSpecSchema, PlotThemeTokenDefinition } from '@retikz/plot';
import { renderToSvgString } from '@retikz/vanilla';

/** renderPlot 的默认选项；不启用图元链路时保持 SVG 字符串返回值 */
export type RenderPlotOptions = LowerPlotsOptions & {
  /** 图元链路开关；默认关闭，显式 false 时仍返回 SVG 字符串 */
  lineage?: false;
  /** 宿主 metadata 只在链路模式下消费 */
  hostLineageMetadata?: never;
};

/** renderPlot 的图元链路模式选项 */
export type RenderPlotLineageOptions = LowerPlotsOptions & {
  /** 图元链路记录配置；传对象时返回 SVG 与 runtime-only 链路产物 */
  lineage: PlotLineageOptions;
  /** 宿主侧查询、AI 与权限 metadata；由 lineage.hostMetadata 独立控制透传 */
  hostLineageMetadata?: PlotHostLineageMetadata;
};

/** renderPlot 图元链路模式返回值 */
export type RenderPlotLineageResult = {
  /** SSR 渲染得到的 SVG 字符串 */
  svg: string;
  /** runtime-only 图元链路产物，不写入 IRPlotSpec 或 Scene meta */
  lineage: PlotLineageRun;
};

/** renderPlot 调用签名 */
type RenderPlot = {
  (spec: IRPlotSpec, data: ExternalDatasets, options: RenderPlotLineageOptions): RenderPlotLineageResult;
  (spec: IRPlotSpec, data: ExternalDatasets, options?: RenderPlotOptions): string;
};

const isLineageOptions = (options: RenderPlotOptions | RenderPlotLineageOptions): options is RenderPlotLineageOptions =>
  options.lineage !== undefined && options.lineage !== false;

const renderPlotImpl = (
  spec: IRPlotSpec,
  data: ExternalDatasets,
  options: RenderPlotOptions | RenderPlotLineageOptions = {},
): string | RenderPlotLineageResult => {
  const validated = PlotSpecSchema.parse(spec);
  const scene = compileToScene(
    { version: 1, type: 'scene', children: [validated] },
    { composites: lowerPlots(data, options), themeTokenDefinitions: [PlotThemeTokenDefinition] },
  ).scene;
  const svg = renderToSvgString(scene, { output: { width: options.width, height: options.height } });
  if (!isLineageOptions(options)) return svg;
  const { lineage } = lowerPlotWithLineage(validated, data, options);
  return { svg, lineage };
};

/**
 * 把 PlotSpec 与外部数据渲染为 SVG 字符串或带 lineage 的 runtime 结果
 * @description 该入口不依赖 DOM；先校验 PlotSpec，再用外部 datasets 下沉并渲染。`width` / `height` 同时控制 Plot 绘图区与 SVG 输出尺寸；传入 lineage 配置时返回 `{ svg, lineage }`，否则返回 SVG 字符串
 * @throws PlotSpec 不合法时抛出 ZodError；缺少引用的数据集或 lowering 失败时透传对应错误
 */
export const renderPlot = renderPlotImpl as RenderPlot;
