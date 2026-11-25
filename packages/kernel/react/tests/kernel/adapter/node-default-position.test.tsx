import { describe, expect, it } from 'vitest';

import { Node } from '../../../src/components/kernel';
import { normalizeReactInput } from '../../helpers/normalize-input';

describe('Node 可选位置', () => {
  it('省略位置的 JSX 节点不写入 position', () => {
    const ir = normalizeReactInput(<Node id="origin">Hello</Node>);

    expect(ir.children).toStrictEqual([{ type: 'node', id: 'origin', text: 'Hello' }]);
  });

  it('保留显式的非零坐标', () => {
    expect(normalizeReactInput(<Node position={[8, -3]} />).children).toStrictEqual([
      { type: 'node', position: [8, -3] },
    ]);
  });
});
