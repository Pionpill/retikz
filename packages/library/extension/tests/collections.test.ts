import { describe, expect, it } from 'vitest';

import {
  barArrowDefinition,
  barArrowProvider,
  crowFootArrowDefinition,
  crowFootArrowProvider,
  diamondArrowDefinition,
  diamondArrowProvider,
  kiteArrowDefinition,
  kiteArrowProvider,
  openDiamondArrowDefinition,
  openDiamondArrowProvider,
  openKiteArrowDefinition,
  openKiteArrowProvider,
  openSquareArrowDefinition,
  openSquareArrowProvider,
  squareArrowDefinition,
  squareArrowProvider,
  extensionArrowDefinitions,
  extensionArrowProviders,
  straightBarbArrowDefinition,
  straightBarbArrowProvider,
} from '../src/arrow';
import {
  circleClipDefinition,
  circleClipProvider,
  compoundClipDefinition,
  compoundClipProvider,
  ellipseClipDefinition,
  ellipseClipProvider,
  pathClipDefinition,
  pathClipProvider,
  polygonClipDefinition,
  polygonClipProvider,
  extensionClipDefinitions,
  extensionClipProviders,
} from '../src/clip';
import {
  contourShapeDefinition,
  contourShapeProvider,
  crossShapeDefinition,
  crossShapeProvider,
  cylinderShapeDefinition,
  cylinderShapeProvider,
  ellipticCapsuleShapeDefinition,
  ellipticCapsuleShapeProvider,
  hexagonShapeDefinition,
  hexagonShapeProvider,
  parallelogramShapeDefinition,
  parallelogramShapeProvider,
  sectorShapeDefinition,
  sectorShapeProvider,
  extensionShapeDefinitions,
  extensionShapeProviders,
  starShapeDefinition,
  starShapeProvider,
  trapezoidShapeDefinition,
  trapezoidShapeProvider,
} from '../src/node-shape';

describe('扩展扩展集合', () => {
  it('对所有扩展形状定义和提供者进行分组', () => {
    expect(extensionShapeDefinitions).toEqual([
      contourShapeDefinition,
      crossShapeDefinition,
      sectorShapeDefinition,
      starShapeDefinition,
      trapezoidShapeDefinition,
      parallelogramShapeDefinition,
      hexagonShapeDefinition,
      cylinderShapeDefinition,
      ellipticCapsuleShapeDefinition,
    ]);
    expect(extensionShapeProviders).toEqual([
      contourShapeProvider,
      crossShapeProvider,
      sectorShapeProvider,
      starShapeProvider,
      trapezoidShapeProvider,
      parallelogramShapeProvider,
      hexagonShapeProvider,
      cylinderShapeProvider,
      ellipticCapsuleShapeProvider,
    ]);
  });

  it('对所有扩展箭头定义和提供者进行分组', () => {
    expect(extensionArrowDefinitions).toEqual([
      diamondArrowDefinition,
      openDiamondArrowDefinition,
      barArrowDefinition,
      crowFootArrowDefinition,
      straightBarbArrowDefinition,
      kiteArrowDefinition,
      openKiteArrowDefinition,
      squareArrowDefinition,
      openSquareArrowDefinition,
    ]);
    expect(extensionArrowProviders).toEqual([
      diamondArrowProvider,
      openDiamondArrowProvider,
      barArrowProvider,
      crowFootArrowProvider,
      straightBarbArrowProvider,
      kiteArrowProvider,
      openKiteArrowProvider,
      squareArrowProvider,
      openSquareArrowProvider,
    ]);
  });

  it('对所有扩展裁剪定义和提供者进行分组', () => {
    expect(extensionClipDefinitions).toEqual([
      circleClipDefinition,
      ellipseClipDefinition,
      polygonClipDefinition,
      pathClipDefinition,
      compoundClipDefinition,
    ]);
    expect(extensionClipProviders).toEqual([
      circleClipProvider,
      ellipseClipProvider,
      polygonClipProvider,
      pathClipProvider,
      compoundClipProvider,
    ]);
  });

  it('使每个提供者与其 Definition 配对', () => {
    const pairs = [
      [extensionShapeProviders, extensionShapeDefinitions],
      [extensionArrowProviders, extensionArrowDefinitions],
    ] as const;

    for (const [providers, definitions] of pairs) {
      expect(providers).toHaveLength(definitions.length);

      providers.forEach((provider, index) => {
        expect(provider.makeDefinition([])).toBe(definitions[index]);
      });
    }

    expect(extensionClipProviders).toHaveLength(extensionClipDefinitions.length);

    extensionClipProviders.forEach((provider, index) => {
      expect(provider.makeDefinition([])).toBe(extensionClipDefinitions[index]);
    });
  });
});
