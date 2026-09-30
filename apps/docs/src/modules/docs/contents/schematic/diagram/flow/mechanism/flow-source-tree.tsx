import { FlowEntities, FlowGroup, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import { Layout, Node, Path, Scope } from '@retikz/react';
import { List, Map, MapEntry, MapKey, MapValue } from '@retikz/standard-react/container';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';

import { flowSourceTreeI18n } from './flow-source-tree.i18n';

/** Flow Source 结构图的语言 */
export type FlowSourceTreeProps = Readonly<{ lang?: Lang }>;

/** 展示同一批元素从平级引用到嵌套元素树与最终绘图的变化 */
const FlowSourceTree: FC<FlowSourceTreeProps> = props => {
  const { lang = 'zh' } = props;
  const t = flowSourceTreeI18n[lang];
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      <Map
        id="source"
        transforms={[{ kind: 'translate', x: 106, y: 0 }]}
        label={{ text: t.source, position: 'left', opacity: 0.8, font: { size: 12 } }}
        style={{ font: { size: 13 } }}
        layout={{ key: { width: 150 } }}
      >
        <MapEntry>
          <MapKey text="children" />
          <MapValue>
            <List data={['pipeline']} />
          </MapValue>
        </MapEntry>
        <MapEntry>
          <MapKey text="groups[0].children" />
          <MapValue>
            <List data={['steps']} />
          </MapValue>
        </MapEntry>
        <MapEntry>
          <MapKey text="layouts[0].children" />
          <MapValue>
            <List data={['receive', 'verify']} />
          </MapValue>
        </MapEntry>
      </Map>
      <Map
        id="tree"
        transforms={[{ kind: 'translate', x: 0, y: 180 }]}
        label={{ text: t.tree, opacity: 0.8, font: { size: 12 } }}
        style={{ font: { size: 13 } }}
        data={{
          elements: [
            {
              id: 'pipeline',
              elements: [
                {
                  id: 'steps',
                  elements: [{ id: 'receive' }, { id: 'verify' }],
                },
              ],
            },
          ],
        }}
      />
      <Path
        way={['source.bottom', 'tree.top']}
        arrow="->"
        label={{ text: t.resolve, font: { size: 12 }, textColor: 'gray', sloped: false, side: 'right', distance: 90 }}
      />
      <Node id="output" position={[257, 410]} text={t.output} style={{ stroke: 'none', font: { size: 12 } }} />
      <Path
        way={['tree.bottom', 'output.top']}
        arrow="->"
        label={{ text: t.render, font: { size: 12 }, textColor: 'gray', sloped: false, side: 'right', distance: 90 }}
      />
      <Scope transforms={[{ kind: 'translate', x: 153, y: 440 }]}>
        <PreviewFlowDiagram>
          <FlowGroup id="pipeline">
            <FlowLayout id="steps" kind="linear" direction="right">
              <FlowEntities
                items={[
                  { id: 'receive', text: t.receive, role: 'activity' },
                  { id: 'verify', text: t.verify, role: 'activity' },
                ]}
              />
            </FlowLayout>
          </FlowGroup>
          <FlowRelations items={[['receive', 'verify']]} />
        </PreviewFlowDiagram>
      </Scope>
    </Layout>
  );
};

export default FlowSourceTree;
