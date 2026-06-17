import { describe, expect, it } from 'vitest';
import { compileToScene } from '@retikz/core';
import type { IR } from '@retikz/core';
import { createLowerMath } from '../src/lower/lower-math';
import { createMathJaxEngine } from '../src/mathjax/engine';
import type { MathJaxSvgEngine } from '../src/mathjax/engine';

/**
 * alpha.5 ADR-01：createLowerMath（缓存 / 降级）+ 真实 mathjax-full 集成。
 */

const fakeSvg = (tex: string): string =>
  `<svg viewBox="0 -100 ${tex.length * 100} 110"><g transform="scale(1,-1)">` +
  `<path d="M0 100 L${tex.length * 100} 100 L${tex.length * 100} -10 Z"></path></g></svg>`;

describe('[lower-math] createLowerMath（fake engine）', () => {
  it('产字形 + bbox', () => {
    const lower = createLowerMath({ convert: tex => fakeSvg(tex) });
    const r = lower({ tex: 'ab' }, { fontSize: 1000 });
    expect(r).not.toBeNull();
    expect(r!.width).toBe(200);
    expect(r!.commands.length).toBeGreaterThan(0);
  });

  it('缓存：同 key 只调引擎一次', () => {
    let calls = 0;
    const engine: MathJaxSvgEngine = {
      convert: tex => {
        calls++;
        return fakeSvg(tex);
      },
    };
    const lower = createLowerMath(engine);
    lower({ tex: 'x' }, { fontSize: 14 });
    lower({ tex: 'x' }, { fontSize: 14 });
    expect(calls).toBe(1);
  });

  it('缓存按 fontSize 区分', () => {
    let calls = 0;
    const lower = createLowerMath({
      convert: tex => {
        calls++;
        return fakeSvg(tex);
      },
    });
    lower({ tex: 'x' }, { fontSize: 14 });
    lower({ tex: 'x' }, { fontSize: 28 });
    expect(calls).toBe(2);
  });

  it('引擎抛错 → null（降级）', () => {
    const lower = createLowerMath({
      convert: () => {
        throw new Error('boom');
      },
    });
    expect(lower({ tex: 'x' }, { fontSize: 14 })).toBeNull();
  });

  it('SVG 无 viewBox（解析失败）→ null', () => {
    const lower = createLowerMath({ convert: () => '<svg><path d="M0 0"/></svg>' });
    expect(lower({ tex: 'x' }, { fontSize: 14 })).toBeNull();
  });

  it('MathJax merror（语法错误标记）→ null（让 compile 发 MATH_TEX_INVALID）', () => {
    const lower = createLowerMath({
      convert: () => '<svg viewBox="0 0 100 100"><g data-mml-node="merror"><path d="M0 0 L1 1"/></g></svg>',
    });
    expect(lower({ tex: '{', displayMode: false }, { fontSize: 14 })).toBeNull();
  });
});

describe('[lower-math] 真实 mathjax-full 集成', () => {
  it('createMathJaxEngine → lowerMath 产真实字形（结构断言）', async () => {
    const engine = await createMathJaxEngine();
    const lower = createLowerMath(engine);
    const x = lower({ tex: 'x' }, { fontSize: 14 });
    expect(x).not.toBeNull();
    expect(x!.commands.length).toBeGreaterThan(0);
    expect(x!.width).toBeGreaterThan(0);
    expect(x!.height).toBeGreaterThan(0);
    // 分数：含分数线 rect + 上下两字形 → 命令数明显多于单字形
    const frac = lower({ tex: '\\frac{a}{b}', displayMode: true }, { fontSize: 14 });
    expect(frac).not.toBeNull();
    expect(frac!.commands.length).toBeGreaterThan(x!.commands.length);
  });

  it('真实语法错误（括号不配对）→ merror → null', async () => {
    const engine = await createMathJaxEngine();
    const lower = createLowerMath(engine);
    // 不配对的 `{` → MathJax 产 merror 节点 → lowerMath 返回 null（core 据此发 MATH_TEX_INVALID）
    expect(lower({ tex: '{', displayMode: false }, { fontSize: 14 })).toBeNull();
  });

  it('未定义命令 → merror（undefined control sequence）→ null', async () => {
    const engine = await createMathJaxEngine();
    const lower = createLowerMath(engine);
    // MathJax 对未定义 \cmd 产「Undefined control sequence」merror → lowerMath 返回 null（core 发 MATH_TEX_INVALID）
    expect(lower({ tex: '\\nonexistentcmd', displayMode: false }, { fontSize: 14 })).toBeNull();
  });

  it('e2e：node.math + 真实 lowerMath → compileToScene 产字形 path（端到端）', async () => {
    const lowerMath = createLowerMath(await createMathJaxEngine());
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'eq', position: [0, 0], math: { tex: '\\frac{a}{b}', displayMode: true } },
      ],
    };
    const scene = compileToScene(ir, { lowerMath });
    expect(JSON.stringify(scene.primitives)).toContain('"fillRule":"evenodd"');
  });
});
