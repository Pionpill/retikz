import type { LayoutProps, PathProps, ScopeProps } from '@retikz/react';
import type { FC } from 'react';

import { Layout, Path, Scope } from '@retikz/react';
import { useMemo } from 'react';

import type { InspectionCompileResult, InspectionDiagnostic, InspectionSelection } from '../compile';
import type { InspectorRegistry } from '../providers';
import type { InspectionReactAuthoringInput } from './authoring';

import { createInspectionReactAuthoring } from './authoring';
import { createInspectionLayoutDriver } from './driver';

/** 可选 Inspect Path wrapper props */
export type InspectPathProps = Omit<PathProps, 'authoring'> &
  Readonly<{
    /** 当前 authored Path 的 Inspector request */
    request: Exclude<InspectionReactAuthoringInput, false>;
  }>;

/** 复用基础 Path lowering、只附加 runtime-only Inspector authoring 标记 */
export const InspectPath: FC<InspectPathProps> = props => {
  const { request, ...pathProps } = props;
  return <Path {...pathProps} authoring={createInspectionReactAuthoring(request)} />;
};

/** 可选 Inspect Scope wrapper props */
export type InspectScopeProps = Omit<ScopeProps, 'authoring'> &
  Readonly<{
    /** 当前 subtree 的 requests，false 表示不可重开的 barrier */
    request: InspectionReactAuthoringInput;
  }>;

/** 复用基础 Scope lowering、只附加 runtime-only Inspector authoring 标记 */
export const InspectScope: FC<InspectScopeProps> = props => {
  const { request, ...scopeProps } = props;
  return <Scope {...scopeProps} authoring={createInspectionReactAuthoring(request)} />;
};

/** 绑定 Inspect registry/selection/callback 的可选 Layout wrapper props */
export type InspectLayoutProps = Omit<LayoutProps, 'authoring' | 'compileDriver'> &
  Readonly<{
    /** 当前 Layout 使用的 Inspector registry */
    registry: InspectorRegistry;
    /** 与 authored wrapper rules 合并的显式 selection */
    selection?: InspectionSelection;
    /** 可选 scene requests，false 表示全图 barrier */
    request?: InspectionReactAuthoringInput;
    /** committed diagnostics 逐条通知 */
    onDiagnostic?: (diagnostic: InspectionDiagnostic) => void;
    /** 同 revision Inspect compile result 通知 */
    onCommit?: (result: InspectionCompileResult) => void;
  }>;

/** 复用基础 Layout/static/retained runtime 的 Inspect 可选宿主 */
export const InspectLayout: FC<InspectLayoutProps> = props => {
  const { registry, selection, request, onDiagnostic, onCommit, ...layoutProps } = props;
  const driver = useMemo(
    () => createInspectionLayoutDriver({ registry, selection, onDiagnostic, onCommit }),
    [registry, selection, onDiagnostic, onCommit],
  );
  return (
    <Layout
      {...layoutProps}
      authoring={request === undefined ? undefined : createInspectionReactAuthoring(request)}
      compileDriver={driver}
    />
  );
};
