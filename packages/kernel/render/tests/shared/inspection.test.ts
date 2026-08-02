import { describe, expect, it } from 'vitest';

import {
  createInspectionHatchSegments,
  InspectionPalette,
  InspectionWarningColor,
  resolveInspectionColor,
  resolveInspectionFillAlphas,
} from '../../src/shared';

const rect = { x: 0, y: 0, width: 12, height: 12 } as const;

describe('shared inspection theme and hatch geometry', () => {
  it('cycles one palette by colorScope while warnings stay independent', () => {
    expect(resolveInspectionColor(0, 'scope')).toBe(InspectionPalette[0]);
    expect(resolveInspectionColor(InspectionPalette.length, 'scope')).toBe(InspectionPalette[0]);
    expect(resolveInspectionColor(InspectionPalette.length + 1, 'scope')).toBe(InspectionPalette[1]);
    expect(resolveInspectionColor(4, 'warning')).toBe(InspectionWarningColor);
  });

  it('applies the same opacity multiplier to every fill channel', () => {
    expect(resolveInspectionFillAlphas('solid', 0.5)).toEqual({ fill: 0.07, hatch: 0 });
    expect(resolveInspectionFillAlphas('forward-diagonal', 0.5)).toEqual({ fill: 0, hatch: 0.275 });
    expect(resolveInspectionFillAlphas('crosshatch')).toEqual({ fill: 0, hatch: 0.55 });
  });

  it('generates screen-directional diagonals whose strokes of width 1 user unit stay inside the rectangle', () => {
    const forward = createInspectionHatchSegments(rect, 'forward-diagonal');
    const backward = createInspectionHatchSegments(rect, 'backward-diagonal');
    const crosshatch = createInspectionHatchSegments(rect, 'crosshatch');
    const spacedForward = createInspectionHatchSegments({ ...rect, width: 24, height: 24 }, 'forward-diagonal');

    expect(forward.length).toBeGreaterThan(0);
    expect(backward.length).toBeGreaterThan(0);
    expect(spacedForward.map(segment => segment.x1 + segment.y1)).toEqual([12, 24, 36]);
    expect(forward.every(segment => segment.x2 > segment.x1 && segment.y2 < segment.y1)).toBe(true);
    expect(backward.every(segment => segment.x2 > segment.x1 && segment.y2 > segment.y1)).toBe(true);
    expect(crosshatch).toEqual([...forward, ...backward]);
    expect(
      crosshatch.every(segment =>
        [segment.x1, segment.x2, segment.y1, segment.y2].every(value => value >= 0.5 && value <= 11.5),
      ),
    ).toBe(true);
  });

  it('does not generate hatch segments for solid or rectangles too thin to contain a stroke of width 1 user unit', () => {
    expect(createInspectionHatchSegments(rect, 'solid')).toEqual([]);
    expect(createInspectionHatchSegments({ ...rect, width: 0 }, 'crosshatch')).toEqual([]);
    expect(createInspectionHatchSegments({ ...rect, height: 0 }, 'crosshatch')).toEqual([]);
    expect(createInspectionHatchSegments({ ...rect, width: 1 }, 'crosshatch')).toEqual([]);
    expect(createInspectionHatchSegments({ ...rect, height: 1 }, 'crosshatch')).toEqual([]);
  });
});
