import { Fragment } from 'react';

import { Coordinate, Node, Path, Scope, Step, StepLabel } from '../src';

export type Grouping = 'flat' | 'fragment' | 'scope';

/** 三种布局共用相同的叶子序列，每组 16 个图元 */
export const mixedScene = (count: number, grouping: Grouping) => {
  const leaves = Array.from({ length: count }, (_, i) => {
    const id = `leaf-${i}`;
    switch (i % 3) {
      case 0:
        return <Coordinate key={id} id={id} position={[i, 0]} />;
      case 1:
        return (
          <Node key={id} id={id} position={[i, 0]}>
            {id}
          </Node>
        );
      default:
        return (
          <Path key={id} id={id}>
            <Step to={`leaf-${i - 2}`} />
            <Step to={`leaf-${i - 1}`} />
          </Path>
        );
    }
  });
  if (grouping === 'flat') return leaves;
  return Array.from({ length: Math.ceil(count / 16) }, (_, i) => {
    const children = leaves.slice(i * 16, (i + 1) * 16);
    return grouping === 'fragment' ? (
      <Fragment key={i}>{children}</Fragment>
    ) : (
      <Scope key={i} id={`group-${i}`}>
        {children}
      </Scope>
    );
  });
};

/** 单个 Path 的声明复杂度，每八步带一个文本标签 */
export const longPath = (count: number) => (
  <Path id="route">
    {Array.from({ length: count }, (_, i) => (
      <Step key={i} to={[i, 0]}>
        {i % 8 === 7 ? <StepLabel>{`segment-${i}`}</StepLabel> : undefined}
      </Step>
    ))}
  </Path>
);
