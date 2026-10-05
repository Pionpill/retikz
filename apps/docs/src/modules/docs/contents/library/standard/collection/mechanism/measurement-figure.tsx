import { Draw, Layout, Node } from '@retikz/react';
import { Array, ArrayItem } from '@retikz/standard-react/collection';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { measurementFigureI18n } from './measurement-figure.i18n';

/** 自然测量图属性 */
export type MeasurementFigureProps = { lang?: Lang };

/** 以确定尺寸的内容几何比较自然需求和显式宽度 */
const MeasurementFigure: FC<MeasurementFigureProps> = props => {
  const { lang = 'zh' } = props;
  const t = measurementFigureI18n[lang];
  const samples = [
    { name: 'A', width: 40, height: 24, color: 'dodgerblue' },
    { name: 'Bbbb', width: 80, height: 36, color: 'darkorange' },
  ];
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      <Node position={[45, -35]} text={t.natural} style={{ fill: 'none', stroke: 'none', font: { size: 12 } }} />
      <Node position={[300, -35]} text={t.needed} style={{ fill: 'none', stroke: 'none', font: { size: 12 } }} />
      {samples.map((sample, i) => (
        <Array
          key={sample.name}
          transforms={[{ kind: 'translate', x: 250, y: i * 110 }]}
          layout={{ padding: 8 }}
          label={{
            text: `${sample.width + 16} × ${sample.height + 16}`,
            position: 'bottom',
            font: { size: 12 },
            opacity: 0.8,
          }}
        >
          <ArrayItem>
            <Node
              position={[0, 0]}
              text={sample.name}
              shape="rectangle"
              layout={{ minimumSize: { width: sample.width, height: sample.height }, padding: 0, margin: 0 }}
              style={{ fill: sample.color, fillOpacity: 0.4, stroke: 'none', font: { size: 14 } }}
            />
          </ArrayItem>
        </Array>
      ))}
      {samples.map((sample, i) => (
        <Node
          key={sample.name}
          position={[45, i * 110 + (sample.height + 16) / 2]}
          text={sample.name}
          shape="rectangle"
          layout={{ minimumSize: { width: sample.width, height: sample.height }, padding: 0, margin: 0 }}
          style={{ fill: sample.color, fillOpacity: 0.4, stroke: 'none', font: { size: 14 } }}
          label={{ text: `${sample.width} × ${sample.height}`, position: 'bottom', font: { size: 12 }, opacity: 0.8 }}
        />
      ))}
      {[0, 1].map(i => (
        <Draw
          key={i}
          way={[
            [105, i * 110 + 24],
            { label: { text: t.padding, font: { size: 12 }, textColor: 'gray' } },
            [225, i * 110 + 24],
          ]}
          arrow="->"
        />
      ))}
      <Array
        transforms={[{ kind: 'translate', x: 480, y: 110 }]}
        layout={{ width: 60, padding: 8 }}
        label={{ text: '60 × 52', position: 'bottom', font: { size: 12 }, opacity: 0.8 }}
      >
        <ArrayItem>
          <Node
            position={[0, 0]}
            text="Bbbb"
            shape="rectangle"
            layout={{ minimumSize: { width: 80, height: 36 }, padding: 0, margin: 0 }}
            style={{ fill: 'darkorange', fillOpacity: 0.4, stroke: 'none', font: { size: 14 } }}
          />
        </ArrayItem>
      </Array>
      <Node position={[510, 70]} text={t.fixed} style={{ fill: 'none', stroke: 'none', font: { size: 12 } }} />
      <Draw
        way={[[365, 136], { label: { text: t.override, font: { size: 12 }, textColor: 'gray' } }, [460, 136]]}
        arrow="->"
      />
    </Layout>
  );
};

export default MeasurementFigure;
