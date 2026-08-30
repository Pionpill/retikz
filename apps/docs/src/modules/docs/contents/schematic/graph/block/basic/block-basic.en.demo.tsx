import type { FC } from 'react';

import { Block, BlockCell, BlockHeader, BlockRow, BlockSection, Graph } from '@retikz/graph-react';
import { Node } from '@retikz/react';

import { createGraphPreviewSource } from '@/modules/docs/preview';

const CellText: FC<{ children: string }> = ({ children }) => (
  <Node position={[0, 0]} padding={0} margin={0} fill="none" stroke="none" textColor="currentColor">
    {children}
  </Node>
);

/** Open Block content combined with common structure composites */
const Demo: FC = () => (
  <Graph width={420} height={250} viewBox={{ x: -130, y: -28, width: 420, height: 250 }}>
    <Block id="user">
      <BlockHeader
        icon={<CellText>U</CellText>}
        title={{ text: 'User' }}
        description={{ text: 'Domain entity' }}
        trailing={<CellText>public</CellText>}
      />
      <CellText>Serializable object</CellText>
      <BlockSection id="user.fields" title={{ text: 'Fields' }}>
        <BlockRow id="user.name">
          <BlockCell itemKey="name" grow={1}>
            <CellText>name</CellText>
          </BlockCell>
          <BlockCell itemKey="name-type">
            <CellText>string</CellText>
          </BlockCell>
        </BlockRow>
        <BlockRow id="user.email">
          <BlockCell itemKey="email" grow={1}>
            <CellText>email</CellText>
          </BlockCell>
          <BlockCell itemKey="email-type">
            <CellText>string?</CellText>
          </BlockCell>
        </BlockRow>
      </BlockSection>
    </Block>
  </Graph>
);

export const previewSource = createGraphPreviewSource(() => Demo({}));

export default Demo;
