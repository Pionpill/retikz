import { Draw, Layout, Node } from '@retikz/react';
import { Map, MapEntry, MapKey, MapValue } from '@retikz/standard-react/collection';
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
        style={{ fill: 'dodgerblue', stroke: 'none', font: { size: 13 }, opacity: { fill: 0.12 } }}
      />
      <Node
        id="custom-role-source"
        position={[90, 111]}
        text={t.customRole}
        cornerRadius={4}
        style={{ fill: 'darkorange', stroke: 'none', font: { size: 13 }, opacity: { fill: 0.12 } }}
      />
      <Node
        id="custom-kind-source"
        position={[90, 142]}
        text={t.customKind}
        cornerRadius={4}
        style={{ fill: 'darkorange', stroke: 'none', font: { size: 13 }, opacity: { fill: 0.12 } }}
      />
      <Map
        id="definition-options"
        position={[215, 55]}
        label={label(t.options)}
        defaultCell={{
          style: { font: { size: 13 } },
          layout: { padding: 0 },
          key: { layout: { width: 90 } },
          value: { layout: { width: 320 } },
        }}
      >
        <MapEntry>
          <MapKey text="entityRoles" />
          <MapValue>
            <Map
              id="roles"
              entries={[
                {
                  key: {
                    id: 'activity-key',
                    content: 'activity',
                    style: { fill: 'dodgerblue', opacity: { fill: 0.32 } },
                  },
                  value: { content: t.activityDefinition, style: { fill: 'dodgerblue', opacity: { fill: 0.12 } } },
                },
                {
                  key: {
                    id: 'service-key',
                    content: 'service',
                    style: { fill: 'darkorange', opacity: { fill: 0.32 } },
                  },
                  value: { content: t.serviceDefinition, style: { fill: 'darkorange', opacity: { fill: 0.12 } } },
                },
              ]}
              defaultCell={{
                layout: { height: 32, padding: 0 },
                key: { layout: { width: 76 } },
                value: { layout: { width: 205 } },
              }}
            />
          </MapValue>
        </MapEntry>
        <MapEntry>
          <MapKey text="entityKinds" />
          <MapValue>
            <Map
              id="kinds"
              defaultCell={{
                layout: { padding: 0 },
                key: { layout: { width: 68 } },
                value: { layout: { width: 250 } },
              }}
            >
              <MapEntry>
                <MapKey text="service" />
                <MapValue>
                  <Map
                    id="service-kinds"
                    entries={[
                      {
                        key: {
                          id: 'gateway-key',
                          content: 'service.gateway',
                          style: { fill: 'darkorange', opacity: { fill: 0.32 } },
                        },
                        value: { content: t.gatewayDefinition, style: { fill: 'darkorange', opacity: { fill: 0.12 } } },
                      },
                    ]}
                    defaultCell={{
                      layout: { height: 32, padding: 0 },
                      key: { layout: { width: 122 } },
                      value: { layout: { width: 125 } },
                    }}
                  />
                </MapValue>
              </MapEntry>
            </Map>
          </MapValue>
        </MapEntry>
      </Map>
      <Map
        id="builtin-canonical"
        position={[135, 205]}
        label={label(t.builtinResult)}
        entries={[
          {
            key: { content: t.roleDefinition },
            value: { content: 'ActivityRoleDefinition', style: { fill: 'dodgerblue', opacity: { fill: 0.12 } } },
          },
          { key: { content: t.kindDefinition }, value: { content: t.noKind } },
        ]}
        defaultCell={{
          style: { font: { size: 12 } },
          layout: { height: 30, padding: 0 },
          key: { layout: { width: 108 } },
          value: { layout: { width: 166 } },
        }}
      />
      <Map
        id="custom-canonical"
        position={[445, 205]}
        label={label(t.customResult)}
        entries={[
          {
            key: { content: t.roleDefinition },
            value: { content: 'serviceRole', style: { fill: 'darkorange', opacity: { fill: 0.12 } } },
          },
          {
            key: { content: t.kindDefinition },
            value: { content: 'gatewayKind', style: { fill: 'darkorange', opacity: { fill: 0.12 } } },
          },
        ]}
        defaultCell={{
          style: { font: { size: 12 } },
          layout: { height: 30, padding: 0 },
          key: { layout: { width: 108 } },
          value: { layout: { width: 166 } },
        }}
      />
      <Node
        id="custom-node"
        position={[582, 320]}
        text={t.customNode}
        cornerRadius={4}
        style={{ fill: 'darkorange', stroke: 'none', font: { size: 12 }, opacity: { fill: 0.12 } }}
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
