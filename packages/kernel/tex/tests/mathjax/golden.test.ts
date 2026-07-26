import { describe, expect, it } from 'vitest';

import type { TexLoweringDiagnostic } from '../../src';

import { createMathJaxLowerTex } from '../../src';

const TIMEOUT = 20_000;

describe('[mathjax-golden] math profile lowering', () => {
  it(
    '九个 extension 的代表输入完整降解为受支持 drawable',
    async () => {
      const lower = await createMathJaxLowerTex({ profile: 'math' });
      const fixtures = [
        String.raw`\dfrac{a}{b}`,
        String.raw`\newcommand{\foo}{x}\foo`,
        String.raw`\boldsymbol{x}`,
        String.raw`\braket{\psi\|\phi}`,
        String.raw`\cancel{x}`,
        String.raw`\begin{numcases}{f(x)=}x&x>0\\-x&x\le0\end{numcases}`,
        String.raw`a\centernot=b`,
        String.raw`a\coloneqq b`,
        String.raw`\color{crimson}{x}`,
      ];

      for (const tex of fixtures) {
        const result = lower({ tex, displayMode: true }, { fontSize: 16 });
        expect(result, tex).not.toBeNull();
        expect(result?.paths.length, tex).toBeGreaterThan(0);
      }
    },
    TIMEOUT,
  );

  it(
    '保留 cancel 与 color 宏产生的独立 paint',
    async () => {
      const lower = await createMathJaxLowerTex({ profile: 'math' });
      const cancel = lower({ tex: String.raw`\cancel{x}` }, { fontSize: 16 });
      expect(cancel?.paths.some(path => path.fill.kind === 'none' && path.stroke.kind !== 'none')).toBe(true);

      const colored = lower(
        { tex: String.raw`\color{crimson}{x}\colorbox{yellow}{y}\fcolorbox{red}{yellow}{z}` },
        { fontSize: 16 },
      );
      expect(colored).not.toBeNull();
      expect(colored?.paths.some(path => path.fill.kind === 'color' && path.fill.value === 'crimson')).toBe(true);
      expect(colored?.paths.some(path => path.fill.kind === 'color' && path.fill.value === 'yellow')).toBe(true);
      expect(
        colored?.paths.some(
          path =>
            (path.fill.kind === 'color' && path.fill.value === 'red') ||
            (path.stroke.kind === 'color' && path.stroke.value === 'red'),
        ),
      ).toBe(true);
    },
    TIMEOUT,
  );

  it(
    '一步工厂把 MathJax 失败转发为细分诊断',
    async () => {
      const diagnostics: Array<TexLoweringDiagnostic> = [];
      const lower = await createMathJaxLowerTex({
        onDiagnostic: diagnostic => diagnostics.push(diagnostic),
      });

      expect(lower({ tex: String.raw`\notARealMacro` }, { fontSize: 16 })).toBeNull();
      expect(diagnostics).toMatchObject([
        {
          kind: 'mathjax-error',
          source: String.raw`\notARealMacro`,
        },
      ]);
    },
    TIMEOUT,
  );
});
