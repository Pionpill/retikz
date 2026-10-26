import { PathMark, Plot, PlotPathStep, PlotScale } from '@retikz/plot-react';
import { Layout } from '@retikz/react';
import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract } from './path-ribbon.controls';
import { createRibbonRows } from './path-ribbon.data';

export { createPreviewControlContract } from './path-ribbon.controls';

/** 桑基流带交互参数 */
export type PathRibbonProps = { curvature: number; widthFactor: number; opacity: number; labels: boolean };

/** 从同一份端点数据分别提取流带和节点 */
export const PathRibbonPreview: FC<PathRibbonProps> = props => {
  const { curvature, widthFactor, opacity, labels } = props;
  return (
    <Layout viewBox={{ x: 0, y: 0, width: 620, height: 340 }}>
      <Plot data={createRibbonRows(curvature, widthFactor)} width={600} height={300} position={[10, 20]}>
        <PlotScale dimension="x" type="linear" domain={[0, 600]} domainPadding={0} />
        <PlotScale dimension="y" type="linear" domain={[0, 300]} domainPadding={0} />
        <PathMark
          transforms={[{ operation: { kind: 'select', params: { groupBy: ['flowId'], selector: { kind: 'first' } } } }]}
          encodings={{ ribbon: { width: 'width' }, fill: 'flowColor', ...(labels ? { label: { text: 'label' } } : {}) }}
          properties={{
            kind: 'ribbon',
            stroke: 'none',
            opacity: { fill: opacity },
            label: { placement: 'inside', font: { size: 11 } },
          }}
        >
          <PlotPathStep kind="move" to={{ x: { field: 'sourceX' }, y: { field: 'sourceY' } }} />
          <PlotPathStep
            kind="cubic"
            to={{ x: { field: 'targetX' }, y: { field: 'targetY' } }}
            control1={{ x: { field: 'control1X' }, y: { field: 'sourceY' } }}
            control2={{ x: { field: 'control2X' }, y: { field: 'targetY' } }}
          />
        </PathMark>
        <PathMark
          transforms={[{ operation: { kind: 'select', params: { groupBy: ['nodeId'], selector: { kind: 'first' } } } }]}
          encodings={{
            fill: 'nodeColor',
            label: { text: 'nodeId' },
          }}
          properties={{
            stroke: 'none',
            label: { position: 0.125, side: 'top', distance: 3, font: { size: 11 } },
          }}
        >
          <PlotPathStep kind="move" to={{ x: { field: 'x0' }, y: { field: 'y1' } }} />
          <PlotPathStep
            kind="rectangle"
            from={{ x: { field: 'x0' }, y: { field: 'y1' } }}
            to={{ x: { field: 'x1' }, y: { field: 'y0' } }}
          />
        </PathMark>
      </Plot>
    </Layout>
  );
};

const controlled = defineControlledPreview(previewControlContract, values => PathRibbonPreview(values));
/** 稳定源码基线 */
export const previewSource = controlled.source;
/** 示例控件 */
export const previewControls = previewControlContract.controls;
const PathRibbon: FC = controlled.Component;
export default PathRibbon;
