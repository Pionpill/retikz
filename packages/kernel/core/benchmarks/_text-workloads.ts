import type {
  CompiledTextBlockLayout,
  CompiledTextLineLayout,
  LoweredTex,
  TextLayoutContext,
} from '../src/compile/text';
import type { TextContentLine, TextFont, TextInlineSegment } from '../src/contract';

/** 固定字号与字重，单个 UTF-16 code unit 宽度为五个 user units */
export const textBenchmarkFont: TextFont = { size: 10, weight: 400 };

/** 固定公式的两个绘制路径；不调用真实 TeX 引擎 */
export const textBenchmarkFormula: LoweredTex = {
  width: 10,
  height: 12,
  depth: 3,
  paths: [
    {
      commands: [
        { kind: 'move', to: [0, 0] },
        { kind: 'line', to: [10, 0] },
      ],
      fill: { kind: 'currentColor' },
      stroke: { kind: 'none' },
    },
    {
      commands: [
        { kind: 'move', to: [0, 2] },
        { kind: 'line', to: [10, 2] },
      ],
      fill: { kind: 'color', value: '#ff0000' },
      stroke: { kind: 'none' },
    },
  ],
};

/** 常量时间的确定性度量器；公式结果的真实快照仍由被测 Core 入口完成 */
export const textBenchmarkContext: TextLayoutContext = {
  font: textBenchmarkFont,
  measureText: (text, font) => ({
    width: (text.length * font.size) / 2,
    height: font.size,
    ascent: font.size * 0.8,
    descent: font.size * 0.2,
  }),
  lowerTex: () => textBenchmarkFormula,
  warn: (code, message) => {
    throw new Error(`Unexpected text benchmark warning ${code}: ${message}`);
  },
};

/** 构造每片段宽十个单位的文字或文字/公式交替输入 */
export const createTextLineWorkload = (count: number, mixed: boolean): Array<TextInlineSegment> =>
  Array.from({ length: count }, (_, index) =>
    mixed && index % 2 === 1 ? { tex: 'x', fontSize: 10 } : { text: 'ab', font: textBenchmarkFont },
  );

/** 折行输入的独立执行路径 */
export type TextWrapMode = 'english' | 'chinese' | 'longword' | 'styled';

/** 构造已知行宽与行数的折行输入；长词规模为组合字素数，其余为 UTF-16 字符数 */
export const createTextWrapWorkload = (count: number, mode: TextWrapMode) => {
  const text =
    mode === 'chinese'
      ? '中文'.repeat(count / 2)
      : mode === 'longword'
        ? 'a\u0301'.repeat(count)
        : 'abcdefg '.repeat(count / 8);
  const segments: Array<TextInlineSegment> =
    mode === 'styled'
      ? Array.from({ length: Math.ceil(text.length / 5) }, (_, index) => ({
          text: text.slice(index * 5, index * 5 + 5),
          font: { ...textBenchmarkFont, weight: index % 2 === 0 ? 400 : 700 },
        }))
      : [{ text, font: textBenchmarkFont }];
  const lines: Array<TextContentLine> = [{ segments }];
  return { text, lines, lineCount: mode === 'longword' ? count / 8 : count / 16 };
};

/** 在计时前手工构造已知布局；绘制场景完全不执行布局或公式降解 */
export const createTextEmitWorkload = (count: number, mixed: boolean) => {
  const lines: Array<TextContentLine> = Array.from({ length: count }, () => ({
    segments: [
      { text: 'ab', font: textBenchmarkFont, fill: '#abcdef', opacity: 0.5 },
      ...(mixed ? [{ tex: 'x', fontSize: 10, opacity: 0.5 }] : []),
    ],
  }));
  const layout: CompiledTextBlockLayout = {
    width: mixed ? 20 : 10,
    height: count * 14,
    lines: Array.from({ length: count }, (_, index) => {
      const pieces: CompiledTextLineLayout['pieces'] = [
        {
          kind: 'text',
          segmentIndex: 0,
          x: 0,
          text: 'ab',
          font: textBenchmarkFont,
          width: 10,
          measuredHeight: 10,
        },
      ];
      if (mixed)
        pieces.push({
          kind: 'math',
          segmentIndex: 1,
          x: 10,
          paths: textBenchmarkFormula.paths,
          width: 10,
          height: 12,
          depth: 3,
        });
      return {
        sourceLineIndex: index,
        baselineOffset: 10 + index * 14,
        lineLayout: { pieces, width: mixed ? 20 : 10, ascent: mixed ? 9 : 8, descent: mixed ? 3 : 2 },
      };
    }),
  };
  const paint = { lines, color: '#123456', opacity: 0.5, textAlign: 'middle' as const };
  return { layout, paint };
};
