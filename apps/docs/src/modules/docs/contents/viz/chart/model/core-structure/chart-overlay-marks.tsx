import { Draw, Layout } from '@retikz/react';
import { Map } from '@retikz/standard-react/collection';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { chartOverlayMarksI18n } from './chart-overlay-marks.i18n';

/** 叠加图元示意图的语言参数 */
export type ChartOverlayMarksProps = Readonly<{ lang?: Lang }>;

/** 概念示意 Scatter 点与采用独立属性的 Line 折线叠加 */
const ChartOverlayMarks: FC<ChartOverlayMarksProps> = props => {
  const { lang = 'zh' } = props;
  const t = chartOverlayMarksI18n[lang];
  const label = (text: string) => ({ text, position: 'top' as const, distance: 18, font: { size: 12 } });
  const markLayout = { height: 28, padding: 0, key: { width: 95 }, value: { width: 110 } } as const;

  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      <Map
        id="mark-source"
        position={[12, 24]}
        label={label(t.source)}
        layout={{ height: 26, padding: 0, key: { width: 145 }, value: { width: 110 } }}
        style={{ font: { size: 13 } }}
        entries={[
          { key: 'namespace', value: 'chart' },
          { key: 'type', value: 'point' },
          { key: 'data.reference', value: 'rows' },
          { key: 'recipe.chartType', value: 'scatter' },
          { key: 'encodings.x', value: 'time' },
          { key: 'encodings.y', value: 'value' },
          { key: 'encodings.color', value: 'group' },
          { key: 'properties.size', value: '5' },
          { key: 'properties.opacity', value: '0.8' },
          { key: 'marks[0].kind', value: 'line' },
          { key: 'marks[0].stroke', value: 'dodgerblue' },
          { key: 'marks[0].strokeWidth', value: '2' },
        ]}
      />
      <Map
        id="mark-default"
        position={[375, 28]}
        label={label(t.builtIn)}
        layout={markLayout}
        style={{ font: { size: 13 } }}
        entries={[
          { key: 'x', value: 'time' },
          { key: 'y', value: 'value' },
          { key: 'color', value: 'group' },
          { key: 'size', value: '5' },
          { key: 'opacity', value: '0.8' },
        ]}
      />
      <Map
        id="mark-overlay"
        position={[375, 230]}
        label={label(t.overlay)}
        layout={markLayout}
        style={{ font: { size: 13 } }}
        entries={[
          { key: 'x', value: 'time' },
          { key: 'y', value: 'value' },
          { key: 'stroke', value: 'dodgerblue' },
          { key: 'strokeWidth', value: '2' },
        ]}
      />
      <Map
        id="mark-result"
        position={[700, 156]}
        label={label(t.result)}
        layout={{ height: 34, padding: 0, key: { width: 32 }, value: { width: 115 } }}
        style={{ font: { size: 13 } }}
        entries={[
          { key: '1', value: t.defaultMark },
          { key: '2', value: t.addedMark },
        ]}
      />
      <Draw way={['mark-source.right', '-|-', 'mark-default.left']} arrow="->" />
      <Draw way={['mark-source.right', '-|-', 'mark-overlay.left']} arrow="->" />
      <Draw way={['mark-default.right', '-|-', 'mark-result.left']} arrow="->" />
      <Draw way={['mark-overlay.right', '-|-', 'mark-result.left']} arrow="->" />
    </Layout>
  );
};

export default ChartOverlayMarks;
