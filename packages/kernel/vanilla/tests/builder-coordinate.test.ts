import { describe, expect, it } from 'vitest';
import { coordinate } from '../src/builder/coordinate';

describe('@retikz/vanilla coordinate()', () => {
  it('coordinate-to-ir：coordinate(id, { position }) → 正确 IRCoordinate', () => {
    const c = coordinate('mid', { position: [60, 40] });
    expect(c).toEqual({ type: 'coordinate', id: 'mid', position: [60, 40] });
  });
});
