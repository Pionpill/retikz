import { expect } from 'vitest';

import { defineBenchmark } from '../../../../../scripts/benchmarks/scenario';
import { emitTextBlock, layoutTextBlock, measureMaxTextTokenWidth } from '../../src/compile/text';
import type { CompiledTextBlockLayout } from '../../src/compile/text';
import type { TextContentLine } from '../../src/contract';
import {
  createTextEmitWorkload,
  createTextLineWorkload,
  createTextWrapWorkload,
  textBenchmarkContext,
  textBenchmarkFont,
  textBenchmarkFormula,
} from '../_text-workloads';
import type { TextWrapMode } from '../_text-workloads';

// 单行片段场景改为完整块布局计时，包含分词与行槽，不与旧 layoutTextLine 基准直接比较

/** 断言固定行槽、来源索引及基线；不在计时内消费布局 */
const verifyTextBlockGeometry = (block: CompiledTextBlockLayout, lineCount: number, width: number) => {
  expect(block.width).toBe(width);
  expect(block.height).toBe(lineCount * 14);
  expect(block.lines).toHaveLength(lineCount);
  for (const [index, line] of block.lines.entries()) {
    expect(line.sourceLineIndex).toBe(0);
    expect(line.baselineOffset).toBe(10 + index * 14);
    expect(line.lineLayout.width).toBeLessThanOrEqual(width);
  }
};

for (const count of [8, 128]) {
  for (const mixed of [false, true]) {
    defineBenchmark(
      {
        id: `compile/text/block-segments-${mixed ? 'mixed' : 'plain'}/${count}`,
        dimensions: ['单行文本块布局', mixed ? '文字/公式交替（每公式2路径）' : '纯文字片段', `${count}片段`],
      },
      () => {
        const segments = createTextLineWorkload(count, mixed);
        const lines: Array<TextContentLine> = [{ segments }];
        const options = { lineHeight: 14 };
        const before = structuredClone(segments);
        const formulaBefore = structuredClone(textBenchmarkFormula);
        return {
          run: () => layoutTextBlock(lines, options, textBenchmarkContext),
          verify: block => {
            const result = block.lines[0].lineLayout;
            expect(result).toMatchObject({ width: count * 10, ascent: mixed ? 9 : 8, descent: mixed ? 3 : 2 });
            expect(result.pieces).toHaveLength(count);
            for (const [index, piece] of result.pieces.entries()) {
              expect(piece.segmentIndex).toBe(index);
              expect(piece.x).toBe(index * 10);
              expect(piece.kind).toBe(mixed && index % 2 === 1 ? 'math' : 'text');
              if (piece.kind === 'math') expect(piece.paths).toEqual(textBenchmarkFormula.paths);
              else expect(piece.text).toBe('ab');
            }
            expect(segments).toEqual(before);
            expect(textBenchmarkFormula).toEqual(formulaBefore);
          },
        };
      },
    );
  }
}

for (const count of [32, 1024]) {
  defineBenchmark(
    {
      id: `compile/text/block-nowrap/${count}`,
      dimensions: ['文本块布局', '无自动折行', `${count}字符`],
    },
    () => {
      const text = 'x'.repeat(count);
      const lines: Array<TextContentLine> = [{ segments: [{ text, font: textBenchmarkFont }] }];
      const before = structuredClone(lines);
      const options = { lineHeight: 14 };
      return {
        run: () => layoutTextBlock(lines, options, textBenchmarkContext),
        verify: result => {
          verifyTextBlockGeometry(result, 1, count * 5);
          expect(result.lines[0].lineLayout.pieces).toMatchObject([{ kind: 'text', segmentIndex: 0, text }]);
          expect(lines).toEqual(before);
        },
      };
    },
  );
}

const wrapLabels = { english: '英文按词折行', chinese: '中文折行', longword: '组合字素长词', styled: '跨词切换字重' };
for (const count of [128, 2048]) {
  for (const mode of ['english', 'chinese', 'longword', 'styled'] satisfies Array<TextWrapMode>) {
    defineBenchmark(
      {
        id: `compile/text/block-${mode}/${count}`,
        dimensions: ['文本块布局', `${wrapLabels[mode]} · 宽80`, `${count}${mode === 'longword' ? '字素' : '字符'}`],
      },
      () => {
        const workload = createTextWrapWorkload(count, mode);
        const before = structuredClone(workload.lines);
        const options = { lineHeight: 14, maxTextWidth: 80 };
        return {
          run: () => layoutTextBlock(workload.lines, options, textBenchmarkContext),
          verify: result => {
            verifyTextBlockGeometry(result, workload.lineCount, 80);
            const texts: Array<string> = [];
            for (const line of result.lines) {
              const parts: Array<string> = [];
              for (const piece of line.lineLayout.pieces) {
                expect(piece.kind).toBe('text');
                if (piece.kind !== 'text') continue;
                parts.push(piece.text);
                const sourceSegment = workload.lines[0].segments[piece.segmentIndex];
                expect('text' in sourceSegment).toBe(true);
                if ('text' in sourceSegment) expect(piece.font).toEqual(sourceSegment.font);
                if (mode === 'longword') expect(piece.text).toMatch(/^(?:a\u0301)+$/u);
              }
              const text = parts.join('');
              if (mode === 'english' || mode === 'styled') expect(text.trimEnd()).toBe('abcdefg abcdefg');
              texts.push(text);
            }
            expect(texts.join('').replace(/\s/gu, '')).toBe(workload.text.replace(/\s/gu, ''));
            expect(workload.lines).toEqual(before);
          },
        };
      },
    );
  }
}

for (const count of [8, 64]) {
  defineBenchmark(
    {
      id: `compile/text/block-mixed/${count}`,
      dimensions: ['文本块布局', '文字/公式折行 · 宽80（每公式2路径）', `${count}片段`],
    },
    () => {
      const segments = createTextLineWorkload(count, true);
      const lines: Array<TextContentLine> = [{ segments }];
      const before = structuredClone(lines);
      const formulaBefore = structuredClone(textBenchmarkFormula);
      const options = { lineHeight: 14, maxTextWidth: 80 };
      return {
        run: () => layoutTextBlock(lines, options, textBenchmarkContext),
        verify: result => {
          verifyTextBlockGeometry(result, count / 8, 80);
          const pieces = result.lines.flatMap(line => line.lineLayout.pieces);
          expect(pieces).toHaveLength(count);
          for (const [index, piece] of pieces.entries()) {
            expect(piece.segmentIndex).toBe(index);
            expect(piece.x).toBe((index % 8) * 10);
            if (piece.kind === 'math') expect(piece.paths).toEqual(textBenchmarkFormula.paths);
            else expect(piece.text).toBe('ab');
          }
          expect(pieces.filter(piece => piece.kind === 'math')).toHaveLength(count / 2);
          expect(lines).toEqual(before);
          expect(textBenchmarkFormula).toEqual(formulaBefore);
        },
      };
    },
  );
}

for (const count of [4, 64]) {
  for (const mixed of [false, true]) {
    defineBenchmark(
      {
        id: `compile/text/emit-${mixed ? 'mixed' : 'plain'}/${count}`,
        dimensions: ['文本块输出', mixed ? '文字/公式及颜色透明度' : '纯文字及片段外观', `${count}物理行`],
      },
      () => {
        const workload = createTextEmitWorkload(count, mixed);
        const before = structuredClone(workload);
        const round = (value: number) => value;
        return {
          run: () => emitTextBlock(workload.layout, workload.paint, 20, 30, round),
          verify: result => {
            expect(result).toHaveLength(count * (mixed ? 2 : 1));
            const texts = result.filter(primitive => primitive.type === 'text');
            expect(texts).toHaveLength(count);
            for (const [index, text] of texts.entries()) {
              expect(text).toMatchObject({
                x: mixed ? 20 : 25,
                y: 40 + index * 14,
                fill: '#abcdef',
                opacity: 0.25,
                align: mixed ? 'start' : 'middle',
                baseline: 'alphabetic',
                lines: [{ text: 'ab' }],
                measuredWidth: 10,
                measuredHeight: 10,
              });
            }
            const groups = result.filter(primitive => primitive.type === 'group');
            expect(groups).toHaveLength(mixed ? count : 0);
            for (const [index, group] of groups.entries()) {
              expect(group.transforms).toEqual([{ kind: 'translate', x: 30, y: 31 + index * 14 }]);
              expect(group.children).toMatchObject([
                { type: 'path', fill: '#123456', opacity: 0.25, commands: textBenchmarkFormula.paths[0].commands },
                { type: 'path', fill: '#ff0000', opacity: 0.25, commands: textBenchmarkFormula.paths[1].commands },
              ]);
            }
            expect(workload).toEqual(before);
          },
        };
      },
    );
  }
}

for (const count of [128, 2048]) {
  for (const chinese of [false, true]) {
    defineBenchmark(
      {
        id: `compile/text/token-${chinese ? 'chinese' : 'english'}/${count}`,
        dimensions: ['最宽文本单元', chinese ? '中文单字' : '英文单词', `${count}字符`],
      },
      () => {
        const text = chinese ? '中文'.repeat(count / 2) : 'abcdefg '.repeat(count / 8);
        return {
          run: () => measureMaxTextTokenWidth(text, textBenchmarkContext),
          verify: result => expect(result).toBe(chinese ? 5 : 35),
        };
      },
    );
  }
}
