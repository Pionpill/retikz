import type { GroupPrimitive, PathPrimitive, ScenePrimitive, TextPrimitive } from '../../contract';
import type { CanonicalInlineSegment } from '../../resolve';
import { BuiltinCompileWarningCode } from '../constants';
import type { CompileWarningCode } from '../constants';
import { ASCENT_FACTOR, DESCENT_FACTOR } from './baseline';
import type { TextFont, TextMeasurer } from './metrics';
import { resolveTextMetrics } from './metrics';
import type { LoweredTexPaint, LoweredTexPath, TexLowerer } from './tex';
import { snapshotLoweredTex } from './tex';

/** 行高近似系数 */
const LINE_HEIGHT_FACTOR = 1.2;

type Round = (n: number) => number;

/** 布局阶段消费的文字或公式输入，不含宿主外观 */
type InputInlineSegmentLayout =
  | Omit<Extract<CanonicalInlineSegment, { text: string }>, 'fill' | 'opacity'>
  | Omit<Extract<CanonicalInlineSegment, { tex: string }>, 'fill' | 'opacity'>;

/** 按原始 segment 顺序保存的外观覆盖 */
type InlineSegmentPaint = {
  /** 显式文字或公式宿主颜色 */
  fill?: string;
  /** 与块透明度相乘的 segment 透明度 */
  opacity?: number;
};

/** 混排行当前外观，独立于测量结果 */
type InlineLinePaint = {
  /** 块继承色 */
  color?: string;
  /** 块透明度 */
  opacity?: number;
  /** 原始 segment 顺序，包含未能降解的公式 */
  segments: Array<InlineSegmentPaint>;
};

/** 从已解析的行提取独立外观，不复制文字和字体 */
export const inlineSegmentPaintsOf = (segments: Array<CanonicalInlineSegment>): Array<InlineSegmentPaint> =>
  segments.map(segment => ({ fill: segment.fill, opacity: segment.opacity }));

/** 混排行布局服务与块级字体，不接收宿主外观 */
export type LineLayoutContext = {
  /** 测量每个文本片段在指定字体下的尺寸 */
  measureText: TextMeasurer;
  /** TeX 降解能力 */
  lowerTex?: TexLowerer;
  /** 块级字体 */
  font: TextFont;
  /** 接收混排行布局与公式降解产生的诊断 */
  warn: (code: CompileWarningCode, message: string) => void;
};

/** segment 自身 opacity 与宿主 opacity 相乘（任一缺省取另一个） */
export const combineOpacity = (segment?: number, host?: number): number | undefined =>
  segment !== undefined ? (host !== undefined ? segment * host : segment) : host;

/** 一行混排的布局结果 */
export type InlineLineLayout = {
  /** 行宽 = Σ segment 宽 */
  width: number;
  /** 基线之上最大上伸（文字 ascent / 公式 height-depth） */
  ascent: number;
  /** 基线之下最大下伸（文字 descent / 公式 depth） */
  descent: number;
  /** 无 math segment（纯文本，可与既有 TextPrimitive 路径等价） */
  isPlain: boolean;
  /** 按原始 segment 索引定位外观的纯数据片段 */
  pieces: Array<Piece>;
};

type TextPiece = {
  kind: 'text';
  segmentIndex: number;
  x: number;
  text: string;
  font: TextFont;
  width: number;
  measuredHeight: number;
};

type MathPiece = {
  kind: 'math';
  segmentIndex: number;
  x: number;
  paths: Array<LoweredTexPath>;
  width: number;
  height: number;
  depth: number;
};

type Piece = TextPiece | MathPiece;

/** 把 TeX paint 三态解析为 Scene paint */
const resolveTexPaint = (paint: LoweredTexPaint, hostColor: string | undefined): string | undefined => {
  if (paint.kind === 'none') return undefined;
  if (paint.kind === 'color') return paint.value;
  return hostColor ?? 'currentColor';
};

/** 度量一行 inline segment，并返回可 emit 的行布局 */
export const layoutInlineLine = (
  segments: Array<InputInlineSegmentLayout>,
  ctx: LineLayoutContext,
): InlineLineLayout => {
  let x = 0;
  let ascent = 0;
  let descent = 0;
  const pieces: Array<Piece> = [];

  for (const [segmentIndex, segment] of segments.entries()) {
    if ('tex' in segment) {
      if (!ctx.lowerTex) {
        ctx.warn(
          BuiltinCompileWarningCode.TexLowererMissing,
          `Inline math "${segment.tex}" has no lowerTex injected; provide CompileOptions.lowerTex (from @retikz/tex). Segment skipped.`,
        );
        continue;
      }

      const rawLowered = ctx.lowerTex(
        { tex: segment.tex, displayMode: segment.displayMode },
        { fontSize: segment.fontSize },
      );
      if (rawLowered === null) {
        ctx.warn(BuiltinCompileWarningCode.TexInvalid, `Failed to render inline tex: ${segment.tex}`);
        continue;
      }

      const lowered = snapshotLoweredTex(rawLowered);
      const above = lowered.height - lowered.depth;
      ascent = Math.max(ascent, above);
      descent = Math.max(descent, lowered.depth);
      pieces.push({
        kind: 'math',
        segmentIndex,
        x,
        paths: lowered.paths,
        width: lowered.width,
        height: lowered.height,
        depth: lowered.depth,
      });
      x += lowered.width;
    } else {
      const font = segment.font;
      const m = resolveTextMetrics(ctx.measureText(segment.text, font));
      ascent = Math.max(ascent, m.ascent);
      descent = Math.max(descent, m.descent);
      pieces.push({
        kind: 'text',
        segmentIndex,
        x,
        text: segment.text,
        font,
        width: m.width,
        measuredHeight: m.height,
      });
      x += m.width;
    }
  }

  // 全部 segment 被跳过 / 空行：给一个 fontSize 高度的空盒，避免 0 高行
  if (ascent === 0 && descent === 0) {
    ascent = ctx.font.size * ASCENT_FACTOR;
    descent = ctx.font.size * DESCENT_FACTOR;
  }

  const isPlain = pieces.every((p): p is TextPiece => p.kind === 'text');

  return {
    width: x,
    ascent,
    descent,
    isPlain,
    pieces,
  };
};

/** 用当前外观绘制既有布局，不调用测量或公式降解服务 */
export const emitInlineLine = (
  layout: InlineLineLayout,
  paint: InlineLinePaint,
  originX: number,
  baselineY: number,
  round: Round,
): Array<ScenePrimitive> => {
  const out: Array<ScenePrimitive> = [];

  for (const p of layout.pieces) {
    const segmentPaint = paint.segments[p.segmentIndex];
    if (p.kind === 'text') {
      const tp: TextPrimitive = {
        type: 'text',
        x: round(originX + p.x),
        y: round(baselineY),
        lines: [{ text: p.text }],
        fontSize: p.font.size,
        align: 'start',
        baseline: 'alphabetic',
        lineHeight: round(p.font.size * LINE_HEIGHT_FACTOR),
        measuredWidth: round(p.width),
        measuredHeight: round(p.measuredHeight),
        fill: segmentPaint.fill ?? paint.color ?? 'currentColor',
      };
      if (p.font.family !== undefined) tp.fontFamily = p.font.family;
      if (p.font.weight !== undefined) tp.fontWeight = p.font.weight;
      if (p.font.style !== undefined) tp.fontStyle = p.font.style;
      const op = combineOpacity(segmentPaint.opacity, paint.opacity);
      if (op !== undefined) tp.opacity = op;
      out.push(tp);
    } else {
      const hostColor = segmentPaint.fill ?? paint.color;
      const children = p.paths.map((path): PathPrimitive => {
        const glyph: PathPrimitive = {
          type: 'path',
          commands: path.commands,
          fillRule: path.fillRule ?? 'evenodd',
        };
        const fill = resolveTexPaint(path.fill, hostColor);
        if (fill !== undefined) {
          glyph.fill = fill;
          if (path.fillOpacity !== undefined) glyph.fillOpacity = path.fillOpacity;
        }

        const stroke = resolveTexPaint(path.stroke, hostColor);
        if (stroke !== undefined) {
          glyph.stroke = stroke;
          if (path.strokeWidth !== undefined) glyph.strokeWidth = path.strokeWidth;
          if (path.strokeOpacity !== undefined) glyph.strokeOpacity = path.strokeOpacity;
        }

        const hostOpacity = combineOpacity(segmentPaint.opacity, paint.opacity);
        const opacity = combineOpacity(path.opacity, hostOpacity);
        if (opacity !== undefined) glyph.opacity = opacity;

        return glyph;
      });

      const group: GroupPrimitive = {
        type: 'group',
        transforms: [{ kind: 'translate', x: round(originX + p.x), y: round(baselineY - (p.height - p.depth)) }],
        children,
      };
      out.push(group);
    }
  }

  return out;
};
