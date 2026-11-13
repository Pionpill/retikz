import { LineChart } from '@retikz/chart-react/line';

import type { PreviewDimensions } from '@/modules/docs/components/component-preview/context';

import { lineData } from './line-basic.data';
import type { LineFacetValues } from './line-facet.controls';

/** 折线示例交互 */
export const renderLineFacet = (values: LineFacetValues, dimensions?: PreviewDimensions) => (
  <LineChart
    rows={lineData}
    layout={{ ...(dimensions ?? { width: 640, height: 360 }), padding: 24 }}
    recipe={{
      encodings: {
        x: 'x',
        y: 'y',
        series: 'series',
        ...(values.facet
          ? dimensions && dimensions.width < 520
            ? { row: 'series', facet: { header: { row: values.header } } }
            : { column: 'series', facet: { header: { column: values.header } } }
          : {}),
      },
    }}
  />
);
