import { Draw, Layout, Node, Scope } from '@retikz/react';

const RECTANGLE_BOUNDARY = [
  'cluster.top-left',
  'cluster.top-right',
  'cluster.bottom-right',
  'cluster.bottom-left',
  'cluster.top-left',
];

const CIRCLE_BOUNDARY = [...Array.from({ length: 36 }, (_, index) => `cluster.${index * 10}`), 'cluster.0'];

/** 图形参数 */
export type ScopeIdReferencePreviewValues = {
  boundingShape: 'circle' | 'rectangle';
  anchor:
    | 'left'
    | 'center'
    | 'top'
    | 'top-right'
    | 'right'
    | 'bottom-right'
    | 'bottom'
    | 'bottom-left'
    | 'top-left'
    | 'angle';
  angleDegrees: number;
};

/** 绘制示例图形 */
export const ScopeIdReferencePreview = (values: ScopeIdReferencePreviewValues) => {
  const boundary = values.boundingShape === 'circle' ? CIRCLE_BOUNDARY : RECTANGLE_BOUNDARY;
  const anchor = values.anchor === 'angle' ? values.angleDegrees : values.anchor;

  return (
    <Layout>
      <Node id="source" position={[-150, 0]}>
        source
      </Node>
      <Scope id="cluster" boundingShape={values.boundingShape} position={[80, 0]}>
        <Node id="A" position={[-45, -35]}>
          A
        </Node>
        <Node id="B" position={[45, -35]}>
          B
        </Node>
        <Node id="C" position={[0, 45]}>
          C
        </Node>
      </Scope>
      <Draw way={boundary} style={{ stroke: 'gray', dashPattern: [1, 4], lineCap: 'round' }} />
      <Draw way={['source', `cluster.${anchor}`]} arrow="->" />
    </Layout>
  );
};
