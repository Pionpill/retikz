import { describe, expect, it } from 'vitest';

type FigureSizeUtils = {
  recommendPreviewLayout: (input: {
    measuredSize: string | null;
    controlFieldCount: number;
    controlPanelOverflows: boolean;
    expandedPanelHasTwoColumns: boolean;
    expandedPanelOverflows: boolean;
    figureWidth: number;
    workspaceWidth: number;
  }) => { size: string | null; controlPanelDefaultSize: number | null };
};

const loadFigureSizeUtils = async (): Promise<FigureSizeUtils> => {
  const moduleUrl = new URL('../scripts/figure-size-utils.mjs', import.meta.url).href;

  return (await import(moduleUrl)) as FigureSizeUtils;
};

describe('Figure size recommendation', () => {
  it('raises a small size and widens the control panel when two columns resolve overflow without shrinking a narrow figure', async () => {
    const { recommendPreviewLayout } = await loadFigureSizeUtils();

    expect(
      recommendPreviewLayout({
        measuredSize: 'sm',
        controlFieldCount: 5,
        controlPanelOverflows: true,
        expandedPanelHasTwoColumns: true,
        expandedPanelOverflows: false,
        figureWidth: 360,
        workspaceWidth: 800,
      }),
    ).toEqual({ size: 'md', controlPanelDefaultSize: 50 });
  });

  it('does not widen the panel when two columns cannot resolve overflow or the figure is too wide', async () => {
    const { recommendPreviewLayout } = await loadFigureSizeUtils();

    expect(
      recommendPreviewLayout({
        measuredSize: 'md',
        controlFieldCount: 5,
        controlPanelOverflows: true,
        expandedPanelHasTwoColumns: false,
        expandedPanelOverflows: false,
        figureWidth: 360,
        workspaceWidth: 800,
      }),
    ).toEqual({ size: 'lg', controlPanelDefaultSize: null });
    expect(
      recommendPreviewLayout({
        measuredSize: 'md',
        controlFieldCount: 5,
        controlPanelOverflows: true,
        expandedPanelHasTwoColumns: true,
        expandedPanelOverflows: false,
        figureWidth: 401,
        workspaceWidth: 800,
      }),
    ).toEqual({ size: 'lg', controlPanelDefaultSize: null });
  });
});
