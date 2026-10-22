import { describe, expect, it } from 'vitest';

import type { TexLoweringDiagnostic } from '../../src';
import { createLowerTex } from '../../src';

const validSvg = '<svg viewBox="0 0 10 10"><path d="M0 0 L10 10"/></svg>';

describe('[lower-tex] diagnostics and cache', () => {
  it('缓存确定失败并在每次公开调用向 callback 重放诊断', () => {
    let calls = 0;
    const diagnostics: Array<TexLoweringDiagnostic> = [];
    const lower = createLowerTex(
      {
        convert: () => {
          calls++;
          return '<svg viewBox="0 0 10 10"><text>x</text></svg>';
        },
      },
      { onDiagnostic: diagnostic => diagnostics.push(diagnostic) },
    );

    expect(lower({ tex: 'x' }, { fontSize: 16 })).toBeNull();
    expect(lower({ tex: 'x' }, { fontSize: 16 })).toBeNull();
    expect(calls).toBe(1);
    expect(diagnostics.map(diagnostic => diagnostic.kind)).toEqual(['unsupported-svg', 'unsupported-svg']);
    expect(diagnostics.every(diagnostic => diagnostic.source === 'x')).toBe(true);
  });

  it('区分 MathJax merror 与 malformed SVG，并缓存两类确定失败', () => {
    const diagnostics: Array<TexLoweringDiagnostic> = [];
    let calls = 0;
    const lower = createLowerTex(
      {
        convert: source => {
          calls++;
          return source === 'macro'
            ? '<svg data-mml-node="merror" data-mjx-error="Undefined control sequence"></svg>'
            : '<svg><path d="M0 0"/></svg>';
        },
      },
      { onDiagnostic: diagnostic => diagnostics.push(diagnostic) },
    );

    expect(lower({ tex: 'macro' }, { fontSize: 16 })).toBeNull();
    expect(lower({ tex: 'macro' }, { fontSize: 16 })).toBeNull();
    expect(lower({ tex: 'svg' }, { fontSize: 16 })).toBeNull();
    expect(lower({ tex: 'svg' }, { fontSize: 16 })).toBeNull();
    expect(calls).toBe(2);
    expect(diagnostics.map(diagnostic => diagnostic.kind)).toEqual([
      'mathjax-error',
      'mathjax-error',
      'malformed-svg',
      'malformed-svg',
    ]);
  });

  it('engine-error 不缓存，后续调用可以重试', () => {
    let calls = 0;
    const diagnostics: Array<TexLoweringDiagnostic> = [];
    const lower = createLowerTex(
      {
        convert: () => {
          calls++;
          if (calls === 1) throw new Error('temporary');
          return validSvg;
        },
      },
      { onDiagnostic: diagnostic => diagnostics.push(diagnostic) },
    );

    expect(lower({ tex: 'x' }, { fontSize: 16 })).toBeNull();
    expect(lower({ tex: 'x' }, { fontSize: 16 })).not.toBeNull();
    expect(calls).toBe(2);
    expect(diagnostics).toMatchObject([{ kind: 'engine-error', source: 'x' }]);
  });

  it('同一公式与字号复用字形，字号和显示模式变化重新降解', () => {
    let calls = 0;
    const lower = createLowerTex({
      convert: () => {
        calls++;
        return validSvg;
      },
    });

    const first = lower({ tex: 'x' }, { fontSize: 16 });
    expect(lower({ tex: 'x' }, { fontSize: 16 })).toBe(first);
    expect(calls).toBe(1);
    lower({ tex: 'x' }, { fontSize: 20 });
    lower({ tex: 'x', displayMode: true }, { fontSize: 20 });

    expect(calls).toBe(3);
  });
});
