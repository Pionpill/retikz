import { Draw, Layout, Node } from '@retikz/react';
import { Map, MapEntry, MapKey, MapValue } from '@retikz/standard-react/container';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { entityDefinitionLookupI18n } from './entity-definition-lookup.i18n';

/** Entity 定义查找结构图的语言 */
export type EntityDefinitionLookupProps = { lang?: Lang };

/** 展示 role / kind 注册表、具体查询及其到 Core Node 的引用关系 */
const EntityDefinitionLookup: FC<EntityDefinitionLookupProps> = props => {
  const { lang = 'zh' } = props;
  const t = entityDefinitionLookupI18n[lang];
  const label = (text: string) => ({ text, opacity: 0.8, font: { size: 12 } });
  return (
    <Layout style={{ height: 'auto' }}>
      <Node
        id="builtin-source"
        position={[90, 77]}
        text={t.builtinSource}
        cornerRadius={4}
        style={{ fill: 'dodgerblue', fillOpacity: 0.12, stroke: 'none', font: { size: 13 } }}
      />
      <Node
        id="custom-role-source"
        position={[90, 111]}
        text={t.customRole}
        cornerRadius={4}
        style={{ fill: 'darkorange', fillOpacity: 0.12, stroke: 'none', font: { size: 13 } }}
      />
      <Node
        id="custom-kind-source"
        position={[90, 142]}
        text={t.customKind}
        cornerRadius={4}
        style={{ fill: 'darkorange', fillOpacity: 0.12, stroke: 'none', font: { size: 13 } }}
      />
      <Map
        id="definition-options"
        transforms={[{ kind: 'translate', x: 215, y: 55 }]}
        label={label(t.options)}
        layout={{ padding: 0, key: { width: 90 }, value: { width: 320 } }}
        style={{ font: { size: 13 } }}
      >
        <MapEntry>
          <MapKey text="entityRoles" />
          <MapValue>
            <Map
              id="roles"
              layout={{ height: 32, padding: 0, key: { width: 76 }, value: { width: 205 } }}
              entries={[
                {
                  key: { id: 'activity-key', content: 'activity', style: { fill: 'dodgerblue', fillOpacity: 0.32 } },
                  value: { content: t.activityDefinition, style: { fill: 'dodgerblue', fillOpacity: 0.12 } },
                },
                {
                  key: { id: 'service-key', content: 'service', style: { fill: 'darkorange', fillOpacity: 0.32 } },
                  value: { content: t.serviceDefinition, style: { fill: 'darkorange', fillOpacity: 0.12 } },
                },
              ]}
            />
          </MapValue>
        </MapEntry>
        <MapEntry>
          <MapKey text="entityKinds" />
          <MapValue>
            <Map id="kinds" layout={{ padding: 0, key: { width: 68 }, value: { width: 250 } }}>
              <MapEntry>
                <MapKey text="service" />
                <MapValue>
                  <Map
                    id="service-kinds"
                    layout={{ height: 32, padding: 0, key: { width: 122 }, value: { width: 125 } }}
                    entries={[
                      {
                        key: {
                          id: 'gateway-key',
                          content: 'service.gateway',
                          style: { fill: 'darkorange', fillOpacity: 0.32 },
                        },
                        value: { content: t.gatewayDefinition, style: { fill: 'darkorange', fillOpacity: 0.12 } },
                      },
                    ]}
                  />
                </MapValue>
              </MapEntry>
            </Map>
          </MapValue>
        </MapEntry>
      </Map>
      <Map
        id="builtin-canonical"
        transforms={[{ kind: 'translate', x: 135, y: 205 }]}
        label={label(t.builtinResult)}
        layout={{ height: 30, padding: 0, key: { width: 108 }, value: { width: 166 } }}
        style={{ font: { size: 12 } }}
        entries={[
          {
            key: { content: t.roleDefinition },
            value: { content: 'ActivityRoleDefinition', style: { fill: 'dodgerblue', fillOpacity: 0.12 } },
          },
          { key: { content: t.kindDefinition }, value: { content: t.noKind } },
        ]}
      />
      <Map
        id="custom-canonical"
        transforms={[{ kind: 'translate', x: 445, y: 205 }]}
        label={label(t.customResult)}
        layout={{ height: 30, padding: 0, key: { width: 108 }, value: { width: 166 } }}
        style={{ font: { size: 12 } }}
        entries={[
          {
            key: { content: t.roleDefinition },
            value: { content: 'serviceRole', style: { fill: 'darkorange', fillOpacity: 0.12 } },
          },
          {
            key: { content: t.kindDefinition },
            value: { content: 'gatewayKind', style: { fill: 'darkorange', fillOpacity: 0.12 } },
          },
        ]}
      />
      <Node
        id="custom-node"
        position={[582, 320]}
        text={t.customNode}
        cornerRadius={4}
        style={{ fill: 'darkorange', fillOpacity: 0.12, stroke: 'none', font: { size: 12 } }}
      />
      <Node
        id="scene"
        position={[340, 320]}
        text={t.scene}
        cornerRadius={4}
        style={{ fill: 'none', stroke: 'none', font: { size: 12 } }}
      />
      <Node
        id="renderer"
        position={[190, 320]}
        text={t.renderer}
        cornerRadius={4}
        style={{ fill: 'none', stroke: 'none', font: { size: 12 } }}
      />
      <Draw way={['builtin-source.right', [215, 77]]} arrow="->" />
      <Draw way={['custom-role-source.right', [215, 111]]} arrow="->" />
      <Draw way={['custom-kind-source.right', [215, 142]]} arrow="->" />
      <Draw way={['custom-canonical.bottom', { verticalTo: 'custom-node.top' }]} arrow="->" />
      <Draw way={['custom-node.left', { horizontalTo: 'scene.right' }]} arrow="->" />
      <Draw way={['scene.left', { horizontalTo: 'renderer.right' }]} arrow="->" />
    </Layout>
  );
};

export default EntityDefinitionLookup;
