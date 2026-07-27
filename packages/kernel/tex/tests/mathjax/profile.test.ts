import { describe, expect, it } from 'vitest';

import { createMathJaxEngine, MathJaxExtension, MathJaxProfile } from '../../src';
import { resolveMathJaxEngineOptions } from '../../src/mathjax/profiles';

const TIMEOUT = 20_000;

describe('[mathjax-profile] public profile', () => {
  it('公开闭合的 profile 与九个 extension', () => {
    expect(MathJaxProfile).toEqual({ Base: 'base', Math: 'math' });
    expect(Object.values(MathJaxExtension)).toEqual([
      'ams',
      'newcommand',
      'boldsymbol',
      'braket',
      'cancel',
      'cases',
      'centernot',
      'mathtools',
      'color',
    ]);
  });

  it('extension 按公开顺序稳定去重，cases 仅在 packages 中展开 empheq', () => {
    const first = resolveMathJaxEngineOptions({
      profile: 'base',
      extensions: ['color', 'cases', 'ams', 'color'],
    });
    const second = resolveMathJaxEngineOptions({
      profile: 'base',
      extensions: ['ams', 'color', 'cases'],
    });

    expect(first.extensions).toEqual(['ams', 'cases', 'color']);
    expect(first.packages).toEqual(['base', 'ams', 'empheq', 'cases', 'color']);
    expect(first.key).toBe(second.key);
    expect(first.key).not.toContain('empheq');
  });

  it(
    'math profile 的九组代表输入均由真实 MathJax 3.2.2 成功转换',
    async () => {
      const engine = await createMathJaxEngine({ profile: 'math' });
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
        const svg = engine.convert(tex, { display: true });
        expect(svg, tex).not.toContain('data-mml-node="merror"');
        expect(svg, tex).not.toMatch(/<(?:text|foreignObject|svg)\b[^>]*>.*<(?:svg)\b/s);
      }
    },
    TIMEOUT,
  );

  it(
    '单独请求 extension 会加载 configuration，未知 runtime 值会 fail loud',
    async () => {
      const engine = await createMathJaxEngine({ extensions: ['cancel'] });
      expect(engine.convert(String.raw`\cancel{x}`, { display: false })).not.toContain('data-mml-node="merror"');

      await expect(createMathJaxEngine({ extensions: ['extpfeil' as never] })).rejects.toThrow(
        /Unknown MathJax extension: extpfeil/,
      );
    },
    TIMEOUT,
  );
});
