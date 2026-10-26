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

describe('扩展扩展集合', () => {
  it('对所有扩展形状定义和提供者进行分组', () => {
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

  it('对所有扩展箭头定义和提供者进行分组', () => {
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

  it('对所有扩展裁剪定义和提供者进行分组', () => {
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

  it('使每个提供者与其 Definition 配对', () => {
    const pairs = [
      [ExtensionShapeProviders, ExtensionShapeDefinitions],
      [ExtensionArrowProviders, ExtensionArrowDefinitions],
    ] as const;

    for (const [providers, definitions] of pairs) {
      expect(providers).toHaveLength(definitions.length);

      providers.forEach((provider, index) => {
        expect(provider.makeDefinition([])).toBe(definitions[index]);
      });
    }

    expect(ExtensionClipProviders).toHaveLength(ExtensionClipDefinitions.length);

    ExtensionClipProviders.forEach((provider, index) => {
      expect(provider.makeDefinition([])).toBe(ExtensionClipDefinitions[index]);
    });
  });
});
