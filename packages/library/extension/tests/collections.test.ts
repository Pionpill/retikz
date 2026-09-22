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
  ExtensionArrowDefinitions,
  ExtensionArrowProviders,
  StraightBarbArrowDefinition,
  StraightBarbArrowProvider,
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
  ExtensionClipDefinitions,
  ExtensionClipProviders,
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
  ExtensionShapeDefinitions,
  ExtensionShapeProviders,
  StarShapeDefinition,
  StarShapeProvider,
  TrapezoidShapeDefinition,
  TrapezoidShapeProvider,
} from '../src/node-shape';

describe('Extension extension collections', () => {
  it('groups all Extension shape definitions and providers', () => {
    expect(ExtensionShapeDefinitions).toEqual([
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
    expect(ExtensionShapeProviders).toEqual([
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

  it('groups all Extension arrow definitions and providers', () => {
    expect(ExtensionArrowDefinitions).toEqual([
      DiamondArrowDefinition,
      OpenDiamondArrowDefinition,
      BarArrowDefinition,
      CrowFootArrowDefinition,
      StraightBarbArrowDefinition,
      KiteArrowDefinition,
      OpenKiteArrowDefinition,
      SquareArrowDefinition,
      OpenSquareArrowDefinition,
    ]);
    expect(ExtensionArrowProviders).toEqual([
      DiamondArrowProvider,
      OpenDiamondArrowProvider,
      BarArrowProvider,
      CrowFootArrowProvider,
      StraightBarbArrowProvider,
      KiteArrowProvider,
      OpenKiteArrowProvider,
      SquareArrowProvider,
      OpenSquareArrowProvider,
    ]);
  });

  it('groups all Extension clip definitions and providers', () => {
    expect(ExtensionClipDefinitions).toEqual([
      CircleClipDefinition,
      EllipseClipDefinition,
      PolygonClipDefinition,
      PathClipDefinition,
      CompoundClipDefinition,
    ]);
    expect(ExtensionClipProviders).toEqual([
      CircleClipProvider,
      EllipseClipProvider,
      PolygonClipProvider,
      PathClipProvider,
      CompoundClipProvider,
    ]);
  });

  it('keeps every provider paired with its Definition', () => {
    const pairs = [
      [ExtensionShapeProviders, ExtensionShapeDefinitions],
      [ExtensionArrowProviders, ExtensionArrowDefinitions],
    ] as const;

    for (const [providers, definitions] of pairs) {
      expect(providers).toHaveLength(definitions.length);
      providers.forEach((provider, index) => {
        expect(provider.makeDefinition({})).toBe(definitions[index]);
      });
    }

    expect(ExtensionClipProviders).toHaveLength(ExtensionClipDefinitions.length);
    ExtensionClipProviders.forEach((provider, index) => {
      expect(provider.makeDefinition({})).toBe(ExtensionClipDefinitions[index]);
    });
  });
});
