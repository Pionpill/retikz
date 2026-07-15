import { describe, expect, it } from 'vitest';

import * as DataApi from '../src';

describe('data public API', () => {
  it('keeps readonly collection constructors inside their private shared sub-owner', () => {
    expect(DataApi).not.toHaveProperty('createReadonlyMap');
    expect(DataApi).not.toHaveProperty('createReadonlySet');
  });
});
