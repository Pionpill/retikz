import type { GroupPrim, PathPrim, ScenePrimitive, TextPrim } from '../../contract';
import type { IRFont, IRLineSpec } from '../../schemas';
import type { CompileWarningCodeValue } from '../warning';
import type { IRInlineRun } from './inline';
import type { FontSpec, TextMeasurer } from './metrics';
import type { LoweredTexPaint, LoweredTexPath, LowerTex } from './tex';

import { CompileWarningCode, DEFAULT_FONT_SIZE } from '../constants';
import { ASCENT_FACTOR, DESCENT_FACTOR } from './baseline';
import { resolveFontSize } from './font-size';
import { isMathRun, parseInlineRuns } from './inline';
import { normalizeTextMetrics } from './metrics';
import { snapshotLoweredTex } from './tex';

/** 行高近似系数 */
const LINE_HEIGHT_FACTOR = 1.2;

type Round = (n: number) => number;

/** 混排行布局上下文：注入的度量 / 降解 + 块级字体 / 色 + warn 发射器 */
export type LineLayoutContext = {
  measureText: TextMeasurer;
  /** TeX 降解能力 */
  lowerTex?: LowerTex;
  /** 块级字体 */
  font: FontSpec;
  /** preset 与 rem 字号解析的根字号 */
  rootFontSize?: number;
  /**
   * 块级文字色
   * @default 'currentColor'
   */
  color?: string;
  /**
   * 宿主整体不透明度
   * @default 1
   */
  opacity?: number;
  warn: (code: CompileWarningCodeValue, message: string) => void;
};

/** run 自身 opacity 与宿主 opacity 相乘（任一缺省取另一个） */
export const combineOpacity = (run?: number, host?: number): number | undefined =>
  run !== undefined ? (host !== undefined ? run * host : run) : host;

/** 一行混排的布局结果 */
export type LaidLine = {
  /** 行宽 = Σ run 宽 */
  width: number;
  /** 基线之上最大上伸（文字 ascent / 公式 height-depth） */
  ascent: number;
  /** 基线之下最大下伸（文字 descent / 公式 depth） */
  descent: number;
  /** 无 math run（纯文本，可与既有 TextPrim 路径等价） */
  isPlain: boolean;
  /** 把本行子图元放到行起点 */
  emit: (originX: number, baselineY: number, round: Round) => Array<ScenePrimitive>;
};

const mergeFont = (base: FontSpec, override: IRFont | undefined, rootFontSize: number): FontSpec => ({
  size: resolveFontSize(override?.size, { rootFontSize, inheritedFontSize: base.size }),
  family: override?.family ?? base.family,
  weight: override?.weight ?? base.weight,
  style: override?.style ?? base.style,
});

/** 解析一个 LineSpec 为 run 序列：line-object 把行级样式折进各 run；字符串 / MixedLine 直解析 */
export const resolveLineRuns = (
  spec: IRLineSpec,
  gatingOn: boolean,
): { runs: Array<IRInlineRun>; hasMath: boolean; warn: boolean } => {
  if (typeof spec === 'string') return parseInlineRuns(spec, gatingOn);
  if ('runs' in spec) {
    return { runs: spec.runs, hasMath: spec.runs.some(isMathRun), warn: false };
  }
  const parsed = parseInlineRuns(spec.text, gatingOn);
  const runs = parsed.runs.map(
    (r): IRInlineRun =>
      isMathRun(r)
        ? { ...r, fill: r.fill ?? spec.fill, opacity: r.opacity ?? spec.opacity }
        : {
            ...r,
            fill: r.fill ?? spec.fill,
            opacity: r.opacity ?? spec.opacity,
            font: r.font ?? spec.font,
          },
  );
  return { runs, hasMath: parsed.hasMath, warn: parsed.warn };
};

/** resolveLineRuns 的诊断包装：保留各个宿主自定义的 warning 文案 */
export const resolveLineRunsWithWarning = (
  spec: IRLineSpec,
  context: {
    gatingOn: boolean;
    warn: (code: CompileWarningCodeValue, message: string) => void;
    warningMessage: string;
  },
): { runs: Array<IRInlineRun>; hasMath: boolean; warn: boolean } => {
  const resolved = resolveLineRuns(spec, context.gatingOn);
  if (resolved.warn) {
    context.warn(CompileWarningCode.TextTexParseError, context.warningMessage);
  }
  return resolved;
};

type TextPiece = {
  kind: 'text';
  x: number;
  text: string;
  font: FontSpec;
  /**
   * 文本 run 填充色
   * @default LineLayoutContext.color
   */
  fill?: string;
  /**
   * 文本 run 不透明度
   * @default LineLayoutContext.opacity
   */
  opacity?: number;
  width: number;
  measuredHeight: number;
};

type MathPiece = {
  kind: 'math';
  x: number;
  paths: Array<LoweredTexPath>;
  width: number;
  height: number;
  depth: number;
  /**
   * 公式 run 填充色
   * @default LineLayoutContext.color
   */
  fill?: string;
  /**
   * 公式 run 不透明度
   * @default LineLayoutContext.opacity
   */
  opacity?: number;
};
type Piece = TextPiece | MathPiece;

/** 把 TeX paint 三态解析为 Scene paint */
const resolveTexPaint = (paint: LoweredTexPaint, hostColor: string | undefined): string | undefined => {
  if (paint.kind === 'none') return undefined;
  if (paint.kind === 'color') return paint.value;
  return hostColor ?? 'currentColor';
};

/** 度量一行 inline run，并返回可 emit 的行布局 */
export const layoutInlineLine = (runs: Array<IRInlineRun>, ctx: LineLayoutContext): LaidLine => {
  const rootFontSize = ctx.rootFontSize ?? DEFAULT_FONT_SIZE;
  let x = 0;
  let ascent = 0;
  let descent = 0;
  const pieces: Array<Piece> = [];
  for (const run of runs) {
    if (isMathRun(run)) {
      if (!ctx.lowerTex) {
        ctx.warn(
          CompileWarningCode.TexLowererMissing,
          `Inline math "${run.tex}" has no lowerTex injected; provide CompileOptions.lowerTex (from @retikz/tex). Segment skipped.`,
        );
        continue;
      }
      const rawLowered = ctx.lowerTex(
        { tex: run.tex, displayMode: run.displayMode },
        { fontSize: ctx.font.size, color: run.fill ?? ctx.color },
      );
      if (rawLowered === null) {
        ctx.warn(CompileWarningCode.TexInvalid, `Failed to render inline tex: ${run.tex}`);
        continue;
      }
      const lowered = snapshotLoweredTex(rawLowered);
      const above = lowered.height - lowered.depth;
      ascent = Math.max(ascent, above);
      descent = Math.max(descent, lowered.depth);
      pieces.push({
        kind: 'math',
        x,
        paths: lowered.paths,
        width: lowered.width,
        height: lowered.height,
        depth: lowered.depth,
        fill: run.fill ?? ctx.color,
        opacity: run.opacity,
      });
      x += lowered.width;
    } else {
      const font = mergeFont(ctx.font, run.font, rootFontSize);
      const m = normalizeTextMetrics(ctx.measureText(run.text, font));
      ascent = Math.max(ascent, m.ascent);
      descent = Math.max(descent, m.descent);
      pieces.push({
        kind: 'text',
        x,
        text: run.text,
        font,
        fill: run.fill,
        opacity: run.opacity,
        width: m.width,
        measuredHeight: m.height,
      });
      x += m.width;
    }
  }
  // 全部 run 被跳过 / 空行：给一个 fontSize 高度的空盒，避免 0 高行
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
    emit: (originX, baselineY, round) => {
      const out: Array<ScenePrimitive> = [];
      for (const p of pieces) {
        if (p.kind === 'text') {
          const tp: TextPrim = {
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
            fill: p.fill ?? ctx.color ?? 'currentColor',
          };
          if (p.font.family !== undefined) tp.fontFamily = p.font.family;
          if (p.font.weight !== undefined) tp.fontWeight = p.font.weight;
          if (p.font.style !== undefined) tp.fontStyle = p.font.style;
          const op = combineOpacity(p.opacity, ctx.opacity);
          if (op !== undefined) tp.opacity = op;
          out.push(tp);
        } else {
          const hostColor = p.fill ?? ctx.color;
          const children = p.paths.map((path): PathPrim => {
            const glyph: PathPrim = {
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
            const hostOpacity = combineOpacity(p.opacity, ctx.opacity);
            const opacity = combineOpacity(path.opacity, hostOpacity);
            if (opacity !== undefined) glyph.opacity = opacity;
            return glyph;
          });
          const group: GroupPrim = {
            type: 'group',
            transforms: [{ kind: 'translate', x: round(originX + p.x), y: round(baselineY - (p.height - p.depth)) }],
            children,
          };
          out.push(group);
        }
      }
      return out;
    },
  };
};
