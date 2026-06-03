import { compileToScene } from '@retikz/core';
import { type ExternalDatasets, type LowerPlotsOptions, type PlotSpec, PlotSpecSchema, lowerPlots } from '@retikz/plot';
import { renderToSvgString } from '@retikz/vanilla';

/**
 * 把 Plot IR + 外部数据渲染成 SVG 字符串（SSR / 构建期）
 * @description 包成 scene、经 lowerPlots 注入数据 compileToScene 得 Scene → renderToSvgString 序列化；
 *   零 DOM、只转发、不引入额外语义。options 的 width/height 是绘图区尺寸（user units），不进 IR。
 *   入口先 PlotSpecSchema 校验 spec：非法 spec（缺判别字段等）抛清晰 ZodError，而非落到 core 内部崩
 */
export const renderPlot = (spec: PlotSpec, data: ExternalDatasets, options: LowerPlotsOptions = {}): string => {
  const validated = PlotSpecSchema.parse(spec);
  const scene = compileToScene(
    { version: 1, type: 'scene', children: [validated] },
    { composites: lowerPlots(data, options) },
  );
  return renderToSvgString(scene);
};
