import { describe, expect, it } from 'vitest';

import * as DataApi from '../src';

describe('data public API', () => {
  it('does not expose readonly collection constructors', () => {
    expect(DataApi).not.toHaveProperty('createReadonlyMap');
    expect(DataApi).not.toHaveProperty('createReadonlySet');
  });
});
