import type { ReactNode } from 'react';

import { expectTypeOf, test } from 'vitest';

import type {
  PreviewActionSlot,
  PreviewControlRuntime,
} from '../../src/modules/docs/components/component-preview/types';

test('定义无状态的预览动作插槽契约', () => {
  expectTypeOf<PreviewActionSlot>().toEqualTypeOf<{
    id: string;
    render: (runtime: PreviewControlRuntime) => ReactNode;
  }>();
});
