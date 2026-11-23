import { createInputScene } from '@retikz/react';
import { tree } from '@retikz/standard-vanilla/collection';
import type { InputTree } from '@retikz/standard-vanilla/collection';
import { compileToScene, normalizeScene, renderToSvgString, scene } from '@retikz/vanilla';
import { expect, it } from 'vitest';

import { Tree } from '../src/collection';

it('Tree字符串与对象配置的Source及SVG和Vanilla等价', () => {
  for (const props of [
    { root: { content: '1', children: [null, '2'] } },
    { root: 'A' },
    { root: {} },
    { root: null },
  ] satisfies Array<InputTree>) {
    const jsx = createInputScene(<Tree {...props} />);
    const vanilla = scene({ children: [tree(props)] });

    expect(normalizeScene(jsx).ir).toEqual(normalizeScene(vanilla).ir);
    expect(renderToSvgString(compileToScene(jsx).scene)).toEqual(renderToSvgString(compileToScene(vanilla).scene));
  }
});
