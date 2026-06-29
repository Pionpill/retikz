import type { Guide, MarkOperation, PlotGuide, PlotMark,PlotSpec } from '@retikz/plot';

import { PLOT_NAMESPACE, PlotComposite, PlotSpecSchema } from '@retikz/plot';

export type PlotBuilderConfig = Omit<PlotSpec, 'namespace' | 'type' | 'marks' | 'guides'> & {
  marks?: Array<MarkOperation>;
  guides?: Array<Guide>;
};

export type PlotBuilder = {
  mark: (mark: MarkOperation) => PlotBuilder;
  guide: (guide: Guide) => PlotBuilder;
  path: (mark: Extract<MarkOperation, { type: typeof PlotMark.Path }>) => PlotBuilder;
  point: (mark: Extract<MarkOperation, { type: typeof PlotMark.Point }>) => PlotBuilder;
  interval: (mark: Extract<MarkOperation, { type: typeof PlotMark.Interval }>) => PlotBuilder;
  reference: (mark: Extract<MarkOperation, { type: typeof PlotMark.Reference }>) => PlotBuilder;
  relation: (mark: Extract<MarkOperation, { type: typeof PlotMark.Relation }>) => PlotBuilder;
  axis: (guide: Extract<Guide, { type: typeof PlotGuide.Axis }>) => PlotBuilder;
  legend: (guide: Extract<Guide, { type: typeof PlotGuide.Legend }>) => PlotBuilder;
  build: () => PlotSpec;
};

export const plotBuilder = (config: PlotBuilderConfig): PlotBuilder => {
  const marks: Array<MarkOperation> = [...(config.marks ?? [])];
  const guides: Array<Guide> = [...(config.guides ?? [])];
  const base = { ...config };
  delete base.marks;
  delete base.guides;

  const builder: PlotBuilder = {
    mark: mark => {
      marks.push(mark);
      return builder;
    },
    guide: guide => {
      guides.push(guide);
      return builder;
    },
    path: mark => builder.mark(mark),
    point: mark => builder.mark(mark),
    interval: mark => builder.mark(mark),
    reference: mark => builder.mark(mark),
    relation: mark => builder.mark(mark),
    axis: guide => builder.guide(guide),
    legend: guide => builder.guide(guide),
    build: () =>
      PlotSpecSchema.parse({
        namespace: PLOT_NAMESPACE,
        type: PlotComposite.Plot,
        ...base,
        marks,
        guides,
      }),
  };

  return builder;
};
