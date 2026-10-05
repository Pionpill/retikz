import type {
  BranchDiagramInputEmbedProps,
  InputBranchDiagram,
  InputBranch,
  InputBranchNode,
} from '@retikz/diagram-vanilla/branch';
import type { BranchDiagramDefinitionOptions } from '@retikz/diagram/branch';
import type { LayoutExtensions, LayoutProps, ReactInputEmbedContext } from '@retikz/react';
import type { ReactNode } from 'react';
import { Children, Fragment, isValidElement } from 'react';

import { Branch } from './Branch';
import { BranchNode } from './BranchNode';
import { RetikzDiagramReactBranchError, RetikzDiagramReactBranchErrorCode } from './errors';

export type BranchDiagramLayoutHostProps = Pick<
  LayoutProps & LayoutExtensions,
  | 'authoring'
  | 'compileDriver'
  | 'handlers'
  | 'runtime'
  | 'width'
  | 'height'
  | 'viewBox'
  | 'className'
  | 'style'
  | 'renderer'
  | 'animate'
  | 'snapshotAt'
  | 'animationRef'
  | 'easings'
  | 'animationProperties'
  | 'idPrefix'
  | 'nodeDistance'
  | 'fontSize'
  | 'shapes'
  | 'boundaries'
  | 'clips'
  | 'arrows'
  | 'patterns'
  | 'pathGenerators'
  | 'pathKinds'
  | 'composites'
  | 'themeStyles'
  | 'lowerTex'
  | 'artifacts'
  | 'onArtifacts'
  | 'onCompileResult'
>;

/** Branch standalone-only Layout props 的完整字段表 */
export const branchDiagramLayoutHostPropKeys = [
  'authoring',
  'compileDriver',
  'handlers',
  'runtime',
  'width',
  'height',
  'viewBox',
  'className',
  'style',
  'renderer',
  'animate',
  'snapshotAt',
  'animationRef',
  'easings',
  'animationProperties',
  'idPrefix',
  'nodeDistance',
  'fontSize',
  'shapes',
  'boundaries',
  'clips',
  'arrows',
  'patterns',
  'pathGenerators',
  'pathKinds',
  'composites',
  'themeStyles',
  'lowerTex',
  'artifacts',
  'onArtifacts',
  'onCompileResult',
] as const satisfies ReadonlyArray<keyof BranchDiagramLayoutHostProps>;

type AssertEqual<TLeft, TRight> =
  (<T>() => T extends TLeft ? 1 : 2) extends <T>() => T extends TRight ? 1 : 2 ? true : false;

type BranchDiagramLayoutHostPropKeysCheck = AssertEqual<
  (typeof branchDiagramLayoutHostPropKeys)[number],
  keyof BranchDiagramLayoutHostProps
>;

const branchDiagramLayoutHostPropKeysCheck: BranchDiagramLayoutHostPropKeysCheck = true;
void branchDiagramLayoutHostPropKeysCheck;

/** 按 own-property 语义提取 Branch standalone Layout 宿主属性 */
export const branchDiagramLayoutHostPropsOf = (props: BranchDiagramLayoutHostProps): BranchDiagramLayoutHostProps => {
  const output: BranchDiagramLayoutHostProps = {};

  for (const key of branchDiagramLayoutHostPropKeys) {
    if (Object.hasOwn(props, key)) Object.assign(output, { [key]: props[key] });
  }

  return output;
};

/** Branch JSX 作者属性 */
export type BranchDiagramProps = Omit<InputBranchDiagram, 'nodes' | 'branches'> &
  BranchDiagramDefinitionOptions &
  BranchDiagramLayoutHostProps & {
    /** 平级节点与有序分支声明 */
    children?: ReactNode;
  };

/** 收集平级 Branch 声明并交给同一 Vanilla 输入 */
export const collectBranchDiagramInput = (
  props: BranchDiagramProps,
  rejectHostProps: boolean,
): BranchDiagramInputEmbedProps => {
  if (rejectHostProps && branchDiagramLayoutHostPropKeys.some(key => Object.hasOwn(props, key)))
    throw new RetikzDiagramReactBranchError({
      code: RetikzDiagramReactBranchErrorCode.ChildInvalid,
      message: 'Embedded BranchDiagram host properties belong on the outer Layout.',
      details: { label: 'BranchDiagram', reason: 'invalid-authoring' },
    });

  const {
    children,
    authoring: _authoring,
    compileDriver: _compileDriver,
    handlers: _handlers,
    runtime: _runtime,
    width: _width,
    height: _height,
    viewBox: _viewBox,
    className: _className,
    style: _style,
    renderer: _renderer,
    animate: _animate,
    snapshotAt: _snapshotAt,
    animationRef: _animationRef,
    easings: _easings,
    animationProperties: _animationProperties,
    idPrefix: _idPrefix,
    nodeDistance: _nodeDistance,
    fontSize: _fontSize,
    shapes: _shapes,
    boundaries: _boundaries,
    clips: _clips,
    arrows: _arrows,
    patterns: _patterns,
    pathGenerators: _pathGenerators,
    pathKinds: _pathKinds,
    composites: _composites,
    themeStyles: _themeStyles,
    lowerTex: _lowerTex,
    artifacts: _artifacts,
    onArtifacts: _onArtifacts,
    onCompileResult: _onCompileResult,
    ...input
  } = props;
  void _authoring;
  void _compileDriver;
  void _handlers;
  void _runtime;
  void _width;
  void _height;
  void _viewBox;
  void _className;
  void _style;
  void _renderer;
  void _animate;
  void _snapshotAt;
  void _animationRef;
  void _easings;
  void _animationProperties;
  void _idPrefix;
  void _nodeDistance;
  void _fontSize;
  void _shapes;
  void _boundaries;
  void _clips;
  void _arrows;
  void _patterns;
  void _pathGenerators;
  void _pathKinds;
  void _composites;
  void _themeStyles;
  void _lowerTex;
  void _artifacts;
  void _onArtifacts;
  void _onCompileResult;

  const nodes: Array<InputBranchNode> = [];
  const branches: Array<InputBranch> = [];
  const collect = (declarations: ReactNode): void =>
    Children.forEach(declarations, child => {
      if (child === null || child === undefined || typeof child === 'boolean') return;
      if (isValidElement<{ children?: ReactNode }>(child) && child.type === Fragment)
        return collect(child.props.children);
      if (isValidElement<InputBranchNode>(child) && child.type === BranchNode) {
        nodes.push({ ...child.props });
        return;
      }

      if (isValidElement<InputBranch>(child) && child.type === Branch) {
        branches.push({ ...child.props });
        return;
      }

      throw new RetikzDiagramReactBranchError({
        code: RetikzDiagramReactBranchErrorCode.ChildInvalid,
        message: 'BranchDiagram only accepts flat BranchNode and Branch declarations.',
        details: { label: 'BranchDiagram', reason: 'invalid-authoring' },
      });
    });
  collect(children);

  return { ...input, nodes, branches };
};

/** 通过同一 Vanilla adapter 调度嵌入式声明 */
export const createBranchDiagramInput = (
  props: Readonly<Record<string, unknown>>,
  _context: ReactInputEmbedContext,
): BranchDiagramInputEmbedProps => {
  void _context;
  return collectBranchDiagramInput(props, true);
};
