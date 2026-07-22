import type { FC } from 'react';

import { Axis, CaptionLabel, PathMark, Plot, TitleLabel } from '@retikz/plot-react';
import { Text } from '@retikz/react';

import { conversionRows } from './axis-plot-labels.data';

/** 整图文案：标题和说明由 Plot labels 管理，轴标题仍放在 Axis 内。 */
const Demo: FC = () => (
  <Plot
    data={conversionRows}
    width={420}
    height={260}
    style={{ maxWidth: '100%', height: 'auto' }}
    layout={{ autoPadding: true }}
    theme={{ labelText: { textColor: '#0f172a' } }}
  >
    <TitleLabel
      placement={{ kind: 'side', side: 'top', placement: 'midway', padding: 10 }}
      font={{ size: 18, weight: 700 }}
    >
      季度转化率
      <Text opacity={0.62} font={{ size: 12, weight: 500 }}>
        内部漏斗数据
      </Text>
    </TitleLabel>
    <CaptionLabel
      text="来源：内部漏斗数据"
      placement={{ kind: 'side', side: 'bottom', placement: 'at-end', padding: 6 }}
      font={{ size: 10 }}
      opacity={0.7}
    />
    <PathMark x="quarter" y="rate" order="quarter" />
    <Axis dimension="x" title="季度" ticks={{ values: [1, 2, 3, 4] }} />
    <Axis dimension="y" title="转化率" tickLabels={{ format: '.0%' }} grid />
  </Plot>
);

export default Demo;
