import { Draw, Layout, Node, Text } from '@retikz/react';
import type { FC } from 'react';

/**
 * "core + graphic grammar" diagram for the introduction page
 * @description Graphic grammar forms Plot IR, data resolves into channels before lowering, and @retikz/plot owns schema / builder / lowering logic before returning to the core foundation.
 */
const Demo: FC = () => (
  <Layout width={560} height={240} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node id="grammar" position={[-210, -74]} stroke="none" align="center" lineHeight={16}>
      <Text font={{ size: 16, weight: 'bold' }}>graphic grammar</Text>
      <Text fill="gray" font={{ size: 12 }}>marks · encoding</Text>
      <Text fill="gray" font={{ size: 12 }}>scales · coordinate</Text>
    </Node>
    <Node id="data" position={[0, -76]} stroke="none" align="center" lineHeight={16}>
      <Text font={{ size: 16, weight: 'bold' }}>data</Text>
      <Text fill="gray" font={{ size: 12 }}>rows + model</Text>
      <Text fill="gray" font={{ size: 12 }}>external dataset</Text>
    </Node>
    <Node id="logic" position={[210, -74]} stroke="none" align="center" lineHeight={16}>
      <Text font={{ size: 16, weight: 'bold' }}>@retikz/plot</Text>
      <Text fill="gray" font={{ size: 12 }}>schema · builder</Text>
      <Text fill="gray" font={{ size: 12 }}>lowering logic</Text>
    </Node>

    <Node id="plotIr" position={[-120, 16]} stroke="none" align="center" lineHeight={16}>
      <Text font={{ size: 16, weight: 'bold' }}>Plot IR</Text>
      <Text fill="gray" font={{ size: 12 }}>serializable chart semantics</Text>
    </Node>
    <Node id="channels" position={[0, 22]} stroke="none" align="center" lineHeight={16}>
      <Text font={{ size: 16, weight: 'bold' }}>data channels</Text>
      <Text fill="gray" font={{ size: 12 }}>field / value → x / y</Text>
    </Node>

    <Node id="lower" position={[0, 102]} stroke="none" align="center" lineHeight={16}>
      <Text font={{ size: 16, weight: 'bold' }}>lowerPlots</Text>
      <Text fill="gray" font={{ size: 12 }}>spec + rows</Text>
    </Node>

    <Node id="core" position={[0, 174]} stroke="none" align="center" lineHeight={16}>
      <Text font={{ size: 16, weight: 'bold' }}>@retikz/core</Text>
      <Text fill="gray" font={{ size: 12 }}>Scope · Node · Path · Scene</Text>
    </Node>

    <Draw way={['grammar', 'plotIr']} arrow="->" />
    <Draw way={['data', 'channels']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
    <Draw way={['logic', 'lower']} arrow="->" />
    <Draw way={['plotIr', 'lower']} arrow="->" />
    <Draw way={['channels', 'lower']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
    <Draw way={['lower', 'core']} arrow="->" />
  </Layout>
);

export default Demo;
