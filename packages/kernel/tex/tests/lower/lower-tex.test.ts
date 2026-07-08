import type { IRScene } from '@retikz/core';

import { compileToScene } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import type { MathJaxSvgEngine } from '../../src';

import { createLowerTex, createMathJaxEngine } from '../../src';

const MATHJAX_INTEGRATION_TIMEOUT = 15_000;

const fakeSvg = (tex: string): string =>
  `<svg viewBox="0 -100 ${tex.length * 100} 110"><g transform="scale(1,-1)">` +
  `<path d="M0 100 L${tex.length * 100} 100 L${tex.length * 100} -10 Z"></path></g></svg>`;

describe('[lower-tex] createLowerTex with a fake engine', () => {
  it('returns commands and a bbox', () => {
    const lower = createLowerTex({ convert: tex => fakeSvg(tex) });
    const result = lower({ tex: 'ab' }, { fontSize: 1000 });
    expect(result).not.toBeNull();
    expect(result!.width).toBe(200);
    expect(result!.commands.length).toBeGreaterThan(0);
  });

  it('caches by source, display mode, and font size', () => {
    let calls = 0;
    const engine: MathJaxSvgEngine = {
      convert: tex => {
        calls++;
        return fakeSvg(tex);
      },
    };
    const lower = createLowerTex(engine);
    lower({ tex: 'x' }, { fontSize: 14 });
    lower({ tex: 'x' }, { fontSize: 14 });
    lower({ tex: 'x', displayMode: true }, { fontSize: 14 });
    lower({ tex: 'x' }, { fontSize: 28 });
    expect(calls).toBe(3);
  });

  it('returns null when the engine throws', () => {
    const lower = createLowerTex({
      convert: () => {
        throw new Error('boom');
      },
    });
    expect(lower({ tex: 'x' }, { fontSize: 14 })).toBeNull();
  });

  it('returns null when the SVG has no viewBox', () => {
    const lower = createLowerTex({ convert: () => '<svg><path d="M0 0"/></svg>' });
    expect(lower({ tex: 'x' }, { fontSize: 14 })).toBeNull();
  });

  it('returns null for MathJax merror output', () => {
    const lower = createLowerTex({
      convert: () => '<svg viewBox="0 0 100 100"><g data-mml-node="merror"><path d="M0 0 L1 1"/></g></svg>',
    });
    expect(lower({ tex: '{', displayMode: false }, { fontSize: 14 })).toBeNull();
  });
});

describe('[lower-tex] MathJax integration', () => {
  it(
    'renders a simple formula and a fraction',
    async () => {
      const engine = await createMathJaxEngine();
      const lower = createLowerTex(engine);
      const x = lower({ tex: 'x' }, { fontSize: 14 });
      expect(x).not.toBeNull();
      expect(x!.commands.length).toBeGreaterThan(0);
      expect(x!.width).toBeGreaterThan(0);
      expect(x!.height).toBeGreaterThan(0);

      const frac = lower({ tex: '\\frac{a}{b}', displayMode: true }, { fontSize: 14 });
      expect(frac).not.toBeNull();
      expect(frac!.commands.length).toBeGreaterThan(x!.commands.length);
    },
    MATHJAX_INTEGRATION_TIMEOUT,
  );

  it(
    'returns null for syntax errors that MathJax marks as merror',
    async () => {
      const engine = await createMathJaxEngine();
      const lower = createLowerTex(engine);
      expect(lower({ tex: '{', displayMode: false }, { fontSize: 14 })).toBeNull();
    },
    MATHJAX_INTEGRATION_TIMEOUT,
  );

  it(
    'returns null for undefined control sequences',
    async () => {
      const engine = await createMathJaxEngine();
      const lower = createLowerTex(engine);
      expect(lower({ tex: '\\nonexistentcmd', displayMode: false }, { fontSize: 14 })).toBeNull();
    },
    MATHJAX_INTEGRATION_TIMEOUT,
  );

  it(
    'works end to end through compileToScene',
    async () => {
      const lowerTex = createLowerTex(await createMathJaxEngine());
      const ir: IRScene = {
        version: 1,
        type: 'scene',
        children: [{ type: 'node', id: 'eq', position: [0, 0], text: '$$\\frac{a}{b}$$' }],
      };
      const scene = compileToScene(ir, { lowerTex });
      expect(JSON.stringify(scene.primitives)).toContain('"fillRule":"evenodd"');
    },
    MATHJAX_INTEGRATION_TIMEOUT,
  );
});
