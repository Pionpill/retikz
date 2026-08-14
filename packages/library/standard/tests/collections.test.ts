import { describe, expect, it } from 'vitest';

import {
  DiamondArrowDefinition,
  DiamondArrowProvider,
  OpenDiamondArrowDefinition,
  OpenDiamondArrowProvider,
  StandardArrowDefinitions,
  StandardArrowProviders,
} from '../src/arrow';
import {
  CompoundClipDefinition,
  CompoundClipProvider,
  PathClipDefinition,
  PathClipProvider,
  PolygonClipDefinition,
  PolygonClipProvider,
  StandardClipDefinitions,
  StandardClipProviders,
} from '../src/clip';
import {
  ContourShapeDefinition,
  ContourShapeProvider,
  CrossShapeDefinition,
  CrossShapeProvider,
  SectorShapeDefinition,
  SectorShapeProvider,
  StandardShapeDefinitions,
  StandardShapeProviders,
  StarShapeDefinition,
  StarShapeProvider,
} from '../src/shape';

describe('Standard extension collections', () => {
  it('groups all Standard shape definitions and providers', () => {
    expect(StandardShapeDefinitions).toEqual([
      ContourShapeDefinition,
      CrossShapeDefinition,
      SectorShapeDefinition,
      StarShapeDefinition,
    ]);
    expect(StandardShapeProviders).toEqual([
      ContourShapeProvider,
      CrossShapeProvider,
      SectorShapeProvider,
      StarShapeProvider,
    ]);
  });

  it('groups all Standard arrow definitions and providers', () => {
    expect(StandardArrowDefinitions).toEqual([DiamondArrowDefinition, OpenDiamondArrowDefinition]);
    expect(StandardArrowProviders).toEqual([DiamondArrowProvider, OpenDiamondArrowProvider]);
  });

  it('groups all Standard clip definitions and providers', () => {
    expect(StandardClipDefinitions).toEqual([CompoundClipDefinition, PolygonClipDefinition, PathClipDefinition]);
    expect(StandardClipProviders).toEqual([CompoundClipProvider, PolygonClipProvider, PathClipProvider]);
  });

  it('keeps every provider paired with its Definition', () => {
    const pairs = [
      [StandardShapeProviders, StandardShapeDefinitions],
      [StandardArrowProviders, StandardArrowDefinitions],
      [StandardClipProviders, StandardClipDefinitions],
    ] as const;

    for (const [providers, definitions] of pairs) {
      expect(providers).toHaveLength(definitions.length);
      providers.forEach((provider, index) => {
        expect(provider.makeDefinition({})).toBe(definitions[index]);
      });
    }
  });
});
