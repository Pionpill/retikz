import { describe, expect, it } from 'vitest';

import { parseMathJaxSvg, parseMathJaxSvgResult } from '../../src/svg';

describe('[parse-svg] drawable paint contract', () => {
  it('按文档顺序输出 path / rect / line / polygon，并物化 paint 三态', () => {
    const result = parseMathJaxSvg(
      '<svg viewBox="0 0 100 100" color="purple">' +
        '<path d="M0 0 L10 0" fill="currentColor" stroke="none"/>' +
        '<rect x="10" y="10" width="20" height="5" style="fill:gold;fill-opacity:.5"/>' +
        '<line x1="0" y1="20" x2="20" y2="20" stroke="currentColor" stroke-width="2"/>' +
        '<polygon points="0,30 10,30 5,40" fill="none" stroke="teal"/>' +
        '</svg>',
      1000,
    );

    expect(result?.paths).toHaveLength(4);
    expect(result?.paths.map(path => [path.fill, path.stroke])).toEqual([
      [{ kind: 'color', value: 'purple' }, { kind: 'none' }],
      [{ kind: 'color', value: 'gold' }, { kind: 'none' }],
      [{ kind: 'none' }, { kind: 'color', value: 'purple' }],
      [{ kind: 'none' }, { kind: 'color', value: 'teal' }],
    ]);
    expect(result?.paths[1].fillOpacity).toBe(0.5);
    expect(result?.paths[2].strokeWidth).toBe(2);
  });

  it('宿主哨兵只在未设置内部 color 时保留 currentColor', () => {
    const result = parseMathJaxSvg('<svg viewBox="0 0 10 10"><path d="M0 0 L1 1" fill="currentColor"/></svg>', 1000);
    expect(result?.paths[0].fill).toEqual({ kind: 'currentColor' });
  });

  it('<use> 合成引用模板与实例自身的 opacity', () => {
    const result = parseMathJaxSvg(
      '<svg viewBox="0 0 10 10">' +
        '<defs><path id="glyph" d="M0 0 L1 1" opacity=".5"/></defs>' +
        '<use href="#glyph" opacity=".5"/>' +
        '</svg>',
      1000,
    );

    expect(result?.paths[0].opacity).toBe(0.25);
  });

  it.each([
    ['nested svg', '<svg viewBox="0 0 10 10"><svg viewBox="0 0 1 1"><path d="M0 0"/></svg></svg>'],
    ['text', '<svg viewBox="0 0 10 10"><text>x</text></svg>'],
    [
      'multi-child group opacity',
      '<svg viewBox="0 0 10 10"><g opacity=".5"><path d="M0 0"/><path d="M1 1"/></g></svg>',
    ],
  ])('%s 令整次 lowering 返回 unsupported-svg', (_name, svg) => {
    const result = parseMathJaxSvgResult(svg, 1000);
    expect(result).toMatchObject({ ok: false, diagnostic: { kind: 'unsupported-svg' } });
    expect(parseMathJaxSvg(svg, 1000)).toBeNull();
  });

  it('可见描边只接受 similarity transform，并按统一缩放调整 strokeWidth', () => {
    const accepted = parseMathJaxSvg(
      '<svg viewBox="0 0 20 20"><g transform="scale(2)"><path d="M0 0 L1 1" fill="none" stroke="red" stroke-width="3"/></g></svg>',
      1000,
    );
    expect(accepted?.paths[0].strokeWidth).toBe(6);

    const rejected = parseMathJaxSvgResult(
      '<svg viewBox="0 0 20 20"><g transform="scale(2,1)"><path d="M0 0 L1 1" fill="none" stroke="red" stroke-width="3"/></g></svg>',
      1000,
    );
    expect(rejected).toMatchObject({ ok: false, diagnostic: { kind: 'unsupported-svg' } });
  });
});
