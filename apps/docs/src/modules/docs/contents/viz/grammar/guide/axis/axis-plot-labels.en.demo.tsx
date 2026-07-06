import type { FC } from 'react';

import { Axis, CaptionLabel, PathMark, Plot, TitleLabel } from '@retikz/plot-react';
import { Text } from '@retikz/react';

import { conversionRows } from './axis-plot-labels.data';

/** Plot-level text: title and caption live in Plot labels; axis titles stay on Axis. */
const Demo: FC = () => (
  <Plot
    data={conversionRows}
    width={420}
    height={260}
    style={{ maxWidth: '100%', height: 'auto' }}
    layout={{ autoPadding: true }}
    theme={{ labelText: { textColor: '#0f172a' } }}
  >
    <TitleLabel placement={{ kind: 'side', side: 'top', placement: 'midway', padding: 10 }} font={{ size: 18, weight: 700 }}>
      Quarterly Conversion Rate
      <Text opacity={0.62} font={{ size: 12, weight: 500 }}>Internal funnel data</Text>
    </TitleLabel>
    <CaptionLabel
      text="Source: internal funnel data"
      placement={{ kind: 'side', side: 'bottom', placement: 'at-end', padding: 6 }}
      font={{ size: 10 }}
      opacity={0.7}
    />
    <PathMark x="quarter" y="rate" order="quarter" />
    <Axis dimension="x" title="Quarter" ticks={{ values: [1, 2, 3, 4] }} />
    <Axis dimension="y" title="Conversion" tickLabels={{ format: '.0%' }} grid />
  </Plot>
);

export default Demo;
