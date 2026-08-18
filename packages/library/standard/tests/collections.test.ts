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
  CircleClipDefinition,
  CircleClipProvider,
  CompoundClipDefinition,
  CompoundClipProvider,
  EllipseClipDefinition,
  EllipseClipProvider,
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
    expect(StandardClipDefinitions).toEqual([
      CircleClipDefinition,
      EllipseClipDefinition,
      PolygonClipDefinition,
      PathClipDefinition,
      CompoundClipDefinition,
    ]);
    expect(StandardClipProviders).toEqual([
      CircleClipProvider,
      EllipseClipProvider,
      PolygonClipProvider,
      PathClipProvider,
      CompoundClipProvider,
    ]);
  });

  it('keeps every provider paired with its Definition', () => {
    const pairs = [
      [StandardShapeProviders, StandardShapeDefinitions],
      [StandardArrowProviders, StandardArrowDefinitions],
    ] as const;

    for (const [providers, definitions] of pairs) {
      expect(providers).toHaveLength(definitions.length);
      providers.forEach((provider, index) => {
        expect(provider.makeDefinition({})).toBe(definitions[index]);
      });
    }

    expect(StandardClipProviders).toHaveLength(StandardClipDefinitions.length);
    StandardClipProviders.forEach((provider, index) => {
      expect(provider.makeDefinition({})).toBe(StandardClipDefinitions[index]);
    });
  });
});
