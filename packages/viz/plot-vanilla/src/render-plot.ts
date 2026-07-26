import type { ExternalDatasets } from '@retikz/data';
import type {
  IRPlotSpec,
  LowerPlotsOptions,
  PlotHostLineageMetadata,
  PlotLineageOptions,
  PlotLineageRun,
} from '@retikz/plot';

import { compileToScene } from '@retikz/core';
import { lowerPlots, lowerPlotWithLineage, PlotSpecSchema } from '@retikz/plot';
import { renderToSvgString } from '@retikz/vanilla';

/** renderPlot 的默认选项；不启用图元链路时保持 SVG 字符串返回值 */
export type RenderPlotOptions = LowerPlotsOptions & {
  /** 图元链路开关；默认关闭，显式 `false` 时仍返回 SVG 字符串 */
  lineage?: false;
  /** 宿主 metadata 只在链路模式下消费 */
  hostLineageMetadata?: never;
};

/** renderPlot 的图元链路模式选项 */
export type RenderPlotLineageOptions = LowerPlotsOptions & {
  /** 图元链路记录配置；传对象时返回 SVG 与 runtime-only 链路产物 */
  lineage: PlotLineageOptions;
  /** 宿主侧查询 / AI / 权限 metadata；由 `lineage.hostMetadata` 独立控制透传 */
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
export type RenderPlot = {
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
    { composites: lowerPlots(data, options) },
  ).scene;
  const svg = renderToSvgString(scene, { output: { width: options.width, height: options.height } });
  if (!isLineageOptions(options)) return svg;
  const { lineage } = lowerPlotWithLineage(validated, data, options);
  return { svg, lineage };
};

/**
 * 把 Plot IR + 外部数据渲染成 SVG 字符串（SSR / 构建期）
 * @description 包成 scene、经 lowerPlots 注入数据 compileToScene 得 Scene → renderToSvgString 序列化；
 *   零 DOM、只转发、不引入额外语义。options 的 width/height 既是绘图区尺寸（user units，喂 lowerPlots），
 *   也作 `<svg>` 的 width/height 像素尺寸（与 React `<Plot width height>` 对齐，省得产物无显示尺寸）。
 *   入口先 PlotSpecSchema 校验 spec：非法 spec（缺判别字段等）抛清晰 ZodError，而非落到 core 内部崩；
 *   传入 `lineage: { ... }` 时返回 `{ svg, lineage }`，否则保持 SVG 字符串返回值
 */
export const renderPlot = renderPlotImpl as RenderPlot;
