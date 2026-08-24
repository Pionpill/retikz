import { describe, expect, it } from 'vitest';

import {
  PALMER_PENGUINS_LICENSE,
  PALMER_PENGUINS_SOURCE_URL,
  PALMER_PENGUINS_VALID_COUNT,
  penguinScatterData,
} from '@/modules/docs/contents/viz/chart/points/scatter/scatter-penguins-facet-jitter.data';
import {
  MESSI_WORLD_CUP_RAW_SHOT_COUNT,
  messiWorldCupShots,
  STATSBOMB_OPEN_DATA_LICENSE,
  STATSBOMB_OPEN_DATA_URL,
} from '@/modules/docs/contents/viz/chart/points/scatter/scatter-world-cup-shots.data';

describe('Scatter showcase datasets', () => {
  it('keeps the documented deterministic Palmer Penguins sample', () => {
    expect(PALMER_PENGUINS_SOURCE_URL).toContain('vega-datasets');
    expect(PALMER_PENGUINS_LICENSE).toBe('CC0 1.0');
    expect(PALMER_PENGUINS_VALID_COUNT).toBe(342);
    expect(penguinScatterData).toHaveLength(90);
    expect(
      Object.fromEntries(
        ['Adelie', 'Chinstrap', 'Gentoo'].map(species => [
          species,
          penguinScatterData.filter(row => row.species === species).length,
        ]),
      ),
    ).toEqual({ Adelie: 30, Chinstrap: 30, Gentoo: 30 });
    expect(
      penguinScatterData.every(row => Number.isFinite(row.billLengthMm) && Number.isFinite(row.flipperLengthMm)),
    ).toBe(true);
  });

  it('keeps the documented non-shootout StatsBomb shot selection inside the 120 x 80 pitch', () => {
    expect(STATSBOMB_OPEN_DATA_URL).toContain('statsbomb/open-data');
    expect(STATSBOMB_OPEN_DATA_LICENSE).toContain('Open Data');
    expect(MESSI_WORLD_CUP_RAW_SHOT_COUNT).toBe(34);
    expect(messiWorldCupShots).toHaveLength(32);
    expect(
      messiWorldCupShots.every(
        row =>
          row.x >= 0 &&
          row.x <= 120 &&
          row.endX >= 0 &&
          row.endX <= 120 &&
          row.y >= 0 &&
          row.y <= 80 &&
          row.endY >= 0 &&
          row.endY <= 80,
      ),
    ).toBe(true);
    expect(messiWorldCupShots.filter(row => row.outcome === 'Goal')).toHaveLength(7);
  });
});
