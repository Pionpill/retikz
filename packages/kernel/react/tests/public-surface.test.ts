import { describe, expect, it } from 'vitest';

import * as react from '../src';

describe('React 公开入口', () => {
  it('提供组件与作者协议，内部执行助手留在模块内', () => {
    for (const name of ['Layout', 'Node', 'createInputScene', 'EVENT_PROP_TO_NAME']) expect(react).toHaveProperty(name);
    for (const name of ['pickScopeStyle', 'getDisplayName', 'collectHydrationHandlers'])
      expect(react).not.toHaveProperty(name);
  });
});
