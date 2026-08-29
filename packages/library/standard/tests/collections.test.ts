import { describe, expect, it } from 'vitest';

import {
  BarArrowDefinition,
  BarArrowProvider,
  CrowFootArrowDefinition,
  CrowFootArrowProvider,
  DiamondArrowDefinition,
  DiamondArrowProvider,
  KiteArrowDefinition,
  KiteArrowProvider,
  OpenDiamondArrowDefinition,
  OpenDiamondArrowProvider,
  OpenKiteArrowDefinition,
  OpenKiteArrowProvider,
  OpenSquareArrowDefinition,
  OpenSquareArrowProvider,
  SquareArrowDefinition,
  SquareArrowProvider,
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
  CylinderShapeDefinition,
  CylinderShapeProvider,
  EllipticCapsuleShapeDefinition,
  EllipticCapsuleShapeProvider,
  HexagonShapeDefinition,
  HexagonShapeProvider,
  ParallelogramShapeDefinition,
  ParallelogramShapeProvider,
  SectorShapeDefinition,
  SectorShapeProvider,
  StandardShapeDefinitions,
  StandardShapeProviders,
  StarShapeDefinition,
  StarShapeProvider,
  TrapezoidShapeDefinition,
  TrapezoidShapeProvider,
} from '../src/shape';

describe('Standard extension collections', () => {
  it('groups all Standard shape definitions and providers', () => {
    expect(StandardShapeDefinitions).toEqual([
      ContourShapeDefinition,
      CrossShapeDefinition,
      SectorShapeDefinition,
      StarShapeDefinition,
      TrapezoidShapeDefinition,
      ParallelogramShapeDefinition,
      HexagonShapeDefinition,
      CylinderShapeDefinition,
      EllipticCapsuleShapeDefinition,
    ]);
    expect(StandardShapeProviders).toEqual([
      ContourShapeProvider,
      CrossShapeProvider,
      SectorShapeProvider,
      StarShapeProvider,
      TrapezoidShapeProvider,
      ParallelogramShapeProvider,
      HexagonShapeProvider,
      CylinderShapeProvider,
      EllipticCapsuleShapeProvider,
    ]);
  });

  it('groups all Standard arrow definitions and providers', () => {
    expect(StandardArrowDefinitions).toEqual([
      DiamondArrowDefinition,
      OpenDiamondArrowDefinition,
      BarArrowDefinition,
      CrowFootArrowDefinition,
      KiteArrowDefinition,
      OpenKiteArrowDefinition,
      SquareArrowDefinition,
      OpenSquareArrowDefinition,
    ]);
    expect(StandardArrowProviders).toEqual([
      DiamondArrowProvider,
      OpenDiamondArrowProvider,
      BarArrowProvider,
      CrowFootArrowProvider,
      KiteArrowProvider,
      OpenKiteArrowProvider,
      SquareArrowProvider,
      OpenSquareArrowProvider,
    ]);
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
