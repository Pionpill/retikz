import { describe, expect, it } from 'vitest';

import { convertIRToReactNode } from '../../../src/kernel/adapter';
import { Node } from '../../../src/kernel/components';
import { normalizeReactInput } from '../../helpers/normalize-input';

describe('Node optional position', () => {
  it('JSX 与 IR 往返保留省略位置', () => {
    const ir = normalizeReactInput(<Node id="origin">Hello</Node>);
    expect(ir.children).toStrictEqual([{ type: 'node', id: 'origin', text: 'Hello' }]);
    expect(normalizeReactInput(convertIRToReactNode(ir))).toStrictEqual(ir);
  });

  it('保留显式的非零坐标', () => {
    expect(normalizeReactInput(<Node position={[8, -3]} />).children).toStrictEqual([
      { type: 'node', position: [8, -3] },
    ]);
  });
});
