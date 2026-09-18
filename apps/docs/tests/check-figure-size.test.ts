import { describe, expect, it } from 'vitest';

type ControlMeasurement = {
  panelSize: number;
  remainingOverflow: number;
  columnCount: number;
};

type SizeMeasurement = {
  size: string;
  workspaceHeight: number;
  figureWidth: number;
  workspaceWidth: number;
  controls: Array<ControlMeasurement>;
};

type FigureSizeUtils = {
  recommendPreviewLayout: (input: { measuredSize: string | null; measurements: Array<SizeMeasurement> }) => {
    size: string | null;
    controlPanelDefaultSize: number | null;
    heightGapRatio: number | null;
    remainingOverflow: number | null;
    rule: string;
  };
};

const loadFigureSizeUtils = async (): Promise<FigureSizeUtils> => {
  const moduleUrl = new URL('../scripts/figure-size-utils.mjs', import.meta.url).href;

  return (await import(moduleUrl)) as FigureSizeUtils;
};

const measurement = (
  size: string,
  workspaceHeight: number,
  defaultOverflow: number,
  expandedOverflow: number,
  figureWidth = 320,
  workspaceWidth = 800,
  expandedColumnCount = 2,
): SizeMeasurement => ({
  size,
  workspaceHeight,
  figureWidth,
  workspaceWidth,
  controls: [
    { panelSize: 25, remainingOverflow: defaultOverflow, columnCount: 1 },
    { panelSize: 50, remainingOverflow: expandedOverflow, columnCount: expandedColumnCount },
  ],
});

describe('Figure size recommendation', () => {
  it('raises a small preview by no more than two sizes when the control height gap is within 50%', async () => {
    const { recommendPreviewLayout } = await loadFigureSizeUtils();

    expect(
      recommendPreviewLayout({
        measuredSize: 'sm',
        measurements: [
          measurement('xs', 120, 70, 10),
          measurement('sm', 180, 70, 10),
          measurement('md', 248, 0, 0),
          measurement('lg', 344, 0, 0),
        ],
      }),
    ).toEqual({
      size: 'md',
      controlPanelDefaultSize: null,
      heightGapRatio: 70 / 180,
      remainingOverflow: 0,
      rule: 'size-only',
    });
  });

  it('widens a narrow figure control panel when the large height gap fits at 50% width', async () => {
    const { recommendPreviewLayout } = await loadFigureSizeUtils();

    expect(
      recommendPreviewLayout({
        measuredSize: 'md',
        measurements: [measurement('sm', 180, 160, 0), measurement('md', 248, 160, 0), measurement('lg', 344, 90, 0)],
      }),
    ).toEqual({
      size: 'md',
      controlPanelDefaultSize: 50,
      heightGapRatio: 160 / 248,
      remainingOverflow: 0,
      rule: 'panel-width-only',
    });
  });

  it('combines the bounded size increase with a wider panel when neither option alone fits', async () => {
    const { recommendPreviewLayout } = await loadFigureSizeUtils();

    expect(
      recommendPreviewLayout({
        measuredSize: 'md',
        measurements: [measurement('md', 248, 120, 60), measurement('lg', 344, 80, 0), measurement('xl', 408, 24, 0)],
      }),
    ).toEqual({
      size: 'lg',
      controlPanelDefaultSize: 50,
      heightGapRatio: 120 / 248,
      remainingOverflow: 0,
      rule: 'size-and-panel-width',
    });
  });

  it('returns the maximum permitted control space and observable overflow when controls still cannot fit', async () => {
    const { recommendPreviewLayout } = await loadFigureSizeUtils();

    expect(
      recommendPreviewLayout({
        measuredSize: 'sm',
        measurements: [
          measurement('sm', 180, 180, 150),
          measurement('md', 248, 120, 80),
          measurement('lg', 344, 80, 32),
          measurement('xl', 408, 0, 0),
        ],
      }),
    ).toEqual({
      size: 'lg',
      controlPanelDefaultSize: 50,
      heightGapRatio: 1,
      remainingOverflow: 32,
      rule: 'maximum-control-space',
    });
  });

  it('does not widen a figure that would exceed half of its workspace', async () => {
    const { recommendPreviewLayout } = await loadFigureSizeUtils();

    expect(
      recommendPreviewLayout({
        measuredSize: 'md',
        measurements: [measurement('md', 248, 160, 0, 401), measurement('lg', 344, 80, 0, 401)],
      }),
    ).toEqual({
      size: 'lg',
      controlPanelDefaultSize: null,
      heightGapRatio: 160 / 248,
      remainingOverflow: 80,
      rule: 'maximum-control-space',
    });
  });

  it('does not widen the control panel when double width still renders one column', async () => {
    const { recommendPreviewLayout } = await loadFigureSizeUtils();

    expect(
      recommendPreviewLayout({
        measuredSize: 'md',
        measurements: [measurement('md', 248, 160, 0, 320, 800, 1), measurement('lg', 344, 80, 0, 320, 800, 1)],
      }),
    ).toEqual({
      size: 'lg',
      controlPanelDefaultSize: null,
      heightGapRatio: 160 / 248,
      remainingOverflow: 80,
      rule: 'maximum-control-space',
    });
  });
});
