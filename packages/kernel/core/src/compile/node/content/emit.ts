import type { ScenePrimitive, TextLine } from '../../../contract';
import type { CanonicalNode } from '../../../resolve';
import { calculateAlphabeticBaselineY, emitTextLine } from '../../text';
import type { CompiledNodeLayout } from '../types';

/** 节点正文最终外观，物理行通过索引读取，不持有作者正文或解析产物 */
type CompiledNodeTextStyle = {
  /** 正文主色 */
  color?: string;
  /** 正文整体透明度 */
  opacity?: number;
  /** 对应作者行与片段的最终外观 */
  lines: Array<{
    /** 行级外观 */
    style?: Pick<TextLine, 'fill' | 'opacity'>;
    /** 片段级外观 */
    segments: Array<Pick<TextLine, 'fill' | 'opacity'>>;
  }>;
};

type Round = (n: number) => number;

/** 计算 Node 正文绘制所用的物理行 alphabetic baseline y */
const nodeBaselineYsOf = (layout: Pick<CompiledNodeLayout, 'geometry' | 'text'>, round: Round): Array<number> => {
  const text = layout.text;
  if (text === undefined) return [];
  const lineCount = text.lines.length;
  if (lineCount === 0) return [];

  const blockTop = layout.geometry.contentCenter[1] - layout.geometry.contentSize.height / 2;
  if (text.kind === 'inline') {
    const emitted = text.lines.map(line => blockTop + line.baselineOffset);
    return emitted;
  }

  const emittedLineHeight = round(text.lineHeight);
  const baselineOffsets = text.baselineOffsets;
  const firstBaseline =
    baselineOffsets !== undefined && baselineOffsets.length === lineCount
      ? blockTop + baselineOffsets[0]
      : calculateAlphabeticBaselineY({
          y: layout.geometry.contentCenter[1],
          baseline: 'middle',
          lineCount,
          lineHeight: emittedLineHeight,
          fontSize: text.font.size,
        });

  return baselineOffsets?.length === lineCount
    ? baselineOffsets.map(offset => blockTop + offset)
    : text.lines.map((_, index) => firstBaseline + index * emittedLineHeight);
};

/** 发出节点正文图元 */
export const emitCompiledNodeText = (
  layout: Pick<CompiledNodeLayout, 'geometry' | 'text'>,
  style: CompiledNodeTextStyle,
  round: Round,
): Array<ScenePrimitive> => {
  const text = layout.text;
  if (text === undefined) return [];
  if (text.kind === 'inline') {
    const baselineYs = nodeBaselineYsOf(layout, round);
    const halfBlockW = layout.geometry.contentSize.width / 2;

    return text.lines.flatMap(({ lineLayout, sourceLineIndex }, index) => {
      const originX =
        text.align === 'start'
          ? layout.geometry.contentCenter[0] - halfBlockW
          : text.align === 'end'
            ? layout.geometry.contentCenter[0] + halfBlockW - lineLayout.width
            : layout.geometry.contentCenter[0] - lineLayout.width / 2;
      return emitTextLine(
        lineLayout,
        {
          color: style.color,
          opacity: style.opacity,
          segments: style.lines[sourceLineIndex].segments,
        },
        originX,
        baselineYs[index],
        round,
      );
    });
  }

  const halfBlockW = layout.geometry.contentSize.width / 2;
  const xOffset = text.align === 'start' ? -halfBlockW : text.align === 'end' ? halfBlockW : 0;
  const lineHeight = round(text.lineHeight);
  const baselineYs = nodeBaselineYsOf(layout, round);

  /** 用现有 grouped TextPrimitive 合同发出 authoritative physical-line baselines */
  const textPrimitive = (lines: Array<TextLine>, baselineY: number, measuredHeight: number): ScenePrimitive => ({
    type: 'text',
    x: round(layout.geometry.contentCenter[0] + xOffset),
    y: round(baselineY),
    lines,
    fontSize: text.font.size,
    fontFamily: text.font.family,
    fontWeight: text.font.weight,
    fontStyle: text.font.style,
    align: text.align,
    baseline: 'alphabetic',
    lineHeight,
    fill: style.color ?? 'currentColor',
    opacity: style.opacity,
    measuredWidth: round(layout.geometry.contentSize.width),
    measuredHeight: round(measuredHeight),
  });

  const lines = text.lines.map(({ sourceLineIndex, measuredHeight: _measuredHeight, ...line }) => ({
    ...line,
    fill: style.lines[sourceLineIndex].style?.fill,
    opacity: style.lines[sourceLineIndex].style?.opacity,
  }));
  if (baselineYs.every((baseline, index) => Math.abs(baseline - baselineYs[0] - index * text.lineHeight) < 1e-8))
    return [textPrimitive(lines, baselineYs[0], layout.geometry.contentSize.height)];
  return lines.map((line, index) => textPrimitive([line], baselineYs[index], text.lines[index].measuredHeight));
};

/** 从节点确定态投影输出文字所需的样式字段 */
export const buildNodeTextStyle = (canon: CanonicalNode): CompiledNodeTextStyle => ({
  color: canon.text?.color,
  opacity: canon.style.opacity,
  lines: (canon.text?.lines ?? []).map(line => ({
    style: line.style === undefined ? undefined : { fill: line.style.fill, opacity: line.style.opacity },
    segments: line.segments.map(({ fill, opacity }) => ({ fill, opacity })),
  })),
});
