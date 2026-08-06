import type {
  InspectionPlane,
  IRAnimationTrack,
  RuntimeScenePrimitive,
  Scene,
  ScenePatch,
  ScenePatchOperation,
  SceneRuntimeSnapshot,
  SceneRuntimeSubtree,
} from '@retikz/core';
import type { RuntimeIdentity } from '@retikz/runtime';
import type { RuntimePreparedCommit } from '@retikz/runtime';

import type { AnimationControls } from '../animation';
import type { HydrationController, HydrationTarget } from '../hydration';
import type { SvgNode } from '../svg';
import type { RenderRuntimeConfig } from './config';
import type { RenderFrameSnapshot } from './frame';
import type { RetainedSvgRenderer, RetainedSvgRendererImmutableOptions } from './renderer';
import type { SceneAnimationDescriptorDiff } from './runtime-options';
import type { RuntimeIdentityMap } from './shared';

import { classifyProperty, evaluateTrack, isAutoplayTrigger, sceneHasAnimations } from '../animation';
import {
  bindWaapiDescriptorElements,
  isWaapiAnimationStyleOwned,
  recoverWaapiBindingSetupFailure,
} from '../animation/retained';
import {
  createContextBuilder,
  createHydrationController,
  createSvgAnimationControls,
  resolvePointViaLayout,
} from '../hydration';
import { buildSvgDocument, buildSvgFragment } from '../svg';
import { buildSvgInspectionGroup } from '../svg/builders/inspection';
import { mergeRenderHandlers } from './handlers';
import { defineRetainedRenderer } from './renderer';
import {
  diffSceneAnimationDescriptors,
  materializeEasingRegistry,
  SceneAnimationOccurrenceChangeKind,
} from './runtime-options';
import {
  createHydrationCleanupQueue,
  createPublicIdPrimitivePathMap,
  createRuntimeIdentityMap,
  createSemanticOwnerPublicIdMap,
  recoverHydrationSetupFailure,
  runBestEffortCleanup,
  runtimeStructuralEquals,
} from './shared';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

/** 可在 renderer commit / rollback 间失活并恢复的 WAAPI ownership */
type SvgAnimationControl = Readonly<{
  /** 对外稳定控制器 */
  controls: AnimationControls;
  /** renderer transaction 绕过公开 gate 执行的内部暂停 */
  suspend: () => void;
  /** 本 binding 当前对应的实际 descriptor elements */
  elements: ReadonlyArray<Element>;
  /** commit 原子切换使用的内部可见性门 */
  gate: { enabled: boolean };
}>;

/** 单个 animated occurrence 的 WAAPI ownership */
type SvgAnimationBinding = SvgAnimationControl &
  Readonly<{
    /** occurrence 的稳定 Runtime identity */
    identity: RuntimeIdentity;
  }>;

/** 一次 committed SVG 动画的分 identity controls 集合 */
type SvgAnimationState = Readonly<{
  /** 聚合 root 与 occurrence controls 的公开控制器 */
  controls: AnimationControls;
  /** Scene root camera descriptor controls */
  root?: SvgAnimationControl;
  /** 各 animated occurrence 的独立 controls */
  bindings: ReadonlyArray<SvgAnimationBinding>;
}>;

/** 把 root 与 occurrence controls 聚合为稳定的公开动画控制器 */
const combineSvgAnimationControls = (children: ReadonlyArray<SvgAnimationControl>): AnimationControls => {
  const controls = children.map(child => child.controls);
  let cleanupStarted = false;
  let cleanupInProgress = false;
  let cleanupComplete = false;
  return Object.freeze({
    play: () => {
      if (!cleanupStarted) controls.forEach(control => control.play());
    },
    pause: () => {
      if (!cleanupStarted) controls.forEach(control => control.pause());
    },
    seek: (timeMs: number) => {
      if (!cleanupStarted) controls.forEach(control => control.seek(timeMs));
    },
    dispose: () => {
      if (cleanupComplete || cleanupInProgress) return;
      cleanupStarted = true;
      cleanupInProgress = true;
      try {
        children.forEach(child => (child.gate.enabled = false));
        runBestEffortCleanup(controls.map(control => () => control.dispose()));
        cleanupComplete = true;
      } finally {
        cleanupInProgress = false;
      }
    },
    get time() {
      return controls[0]?.time ?? 0;
    },
    get running() {
      return !cleanupStarted && controls.some(control => control.running);
    },
  });
};

/** 跨 prepared token 保留失败 WAAPI controls 的 renderer 级清理队列 */
type SvgAnimationCleanupQueue = Readonly<{
  /** 尝试清理 controls；失败时保留到 pending 队列 */
  dispose: (controls: AnimationControls) => void;
  /** 直接保留已确认初次清理失败的 controls */
  retain: (controls: AnimationControls) => void;
  /** best-effort 重试全部 pending controls */
  disposePending: () => void;
}>;

/** 创建 renderer 生命周期内的 WAAPI controls 清理队列 */
const createSvgAnimationCleanupQueue = (): SvgAnimationCleanupQueue => {
  const pending = new Set<AnimationControls>();
  const dispose = (controls: AnimationControls): void => {
    try {
      controls.dispose();
      pending.delete(controls);
    } catch (cause) {
      pending.add(controls);
      throw cause;
    }
  };
  const retain = (controls: AnimationControls): void => {
    pending.add(controls);
  };
  const disposePending = (): void => {
    runBestEffortCleanup([...pending].map(controls => () => dispose(controls)));
  };
  return Object.freeze({ dispose, retain, disposePending });
};

/** 创建受内部 gate 保护、可在 rollback 恢复的 WAAPI control */
const createSvgAnimationControl = (
  elements: ReadonlyArray<Element>,
  cleanupQueue: SvgAnimationCleanupQueue,
): SvgAnimationControl => {
  const gate = { enabled: true };
  let raw: AnimationControls;
  try {
    raw = bindWaapiDescriptorElements(elements, () => gate.enabled);
  } catch (cause) {
    const setupFailure = recoverWaapiBindingSetupFailure(cause);
    if (setupFailure !== undefined) {
      cleanupQueue.retain(setupFailure.controls);
      throw setupFailure.cause;
    }
    throw cause;
  }
  const controls: AnimationControls = Object.freeze({
    play: () => {
      if (gate.enabled) raw.play();
    },
    pause: () => {
      if (gate.enabled) raw.pause();
    },
    seek: timeMs => {
      if (gate.enabled) raw.seek(timeMs);
    },
    dispose: () => {
      gate.enabled = false;
      cleanupQueue.dispose(raw);
    },
    get time() {
      return raw.time;
    },
    get running() {
      return gate.enabled && raw.running;
    },
  });
  return Object.freeze({ controls, suspend: () => raw.pause(), elements: Object.freeze([...elements]), gate });
};

/** 判断新 binding 是否仍指向完全相同的 materialized descriptor elements */
const sameAnimationElements = (left: ReadonlyArray<Element>, right: ReadonlyArray<Element>): boolean =>
  left.length === right.length && left.every((element, index) => element === right[index]);

/** SVG 原地 commit 的可逆 mutation journal */
type MutationJournal = Readonly<{
  mutate: (apply: () => void, undo: () => void) => void;
  rollback: () => void;
}>;

/** 创建按执行逆序恢复 DOM mutation 的 journal */
const createMutationJournal = (): MutationJournal => {
  const undoActions: Array<() => void> = [];
  return Object.freeze({
    mutate: (apply, undo) => {
      undoActions.push(undo);
      apply();
    },
    rollback: () => {
      for (let index = undoActions.length - 1; index >= 0; index -= 1) undoActions[index]();
      undoActions.length = 0;
    },
  });
};

/** 从 SvgNode descriptor 创建尚未接入 retained identity index 的 SVG subtree */
const createSvgElement = (document: Document, node: SvgNode): SVGElement => {
  const element = document.createElementNS(SVG_NAMESPACE, node.tag);
  for (const [key, value] of Object.entries(node.attrs)) {
    if (value !== undefined) element.setAttribute(key, String(value));
  }
  for (const [key, value] of Object.entries(node.style ?? {})) {
    if (value !== undefined && value !== null) element.style.setProperty(key, String(value));
  }
  for (const child of node.children ?? []) {
    element.appendChild(typeof child === 'string' ? document.createTextNode(child) : createSvgElement(document, child));
  }
  return element;
};

/** 对单个 renderer-owned attribute 记录可逆更新 */
const reconcileAttribute = (
  element: SVGElement,
  key: string,
  value: string | undefined,
  journal: MutationJournal,
): void => {
  const previous = element.getAttribute(key);
  if (previous === value || (previous === null && value === undefined)) return;
  journal.mutate(
    () => (value === undefined ? element.removeAttribute(key) : element.setAttribute(key, value)),
    () => (previous === null ? element.removeAttribute(key) : element.setAttribute(key, previous)),
  );
};

/** 对单个 renderer-owned inline style 记录可逆更新 */
const reconcileStyle = (
  element: SVGElement,
  key: string,
  value: string | undefined,
  journal: MutationJournal,
): void => {
  const previous = element.style.getPropertyValue(key);
  if (previous === (value ?? '')) return;
  journal.mutate(
    () => (value === undefined ? element.style.removeProperty(key) : element.style.setProperty(key, value)),
    () => (previous.length === 0 ? element.style.removeProperty(key) : element.style.setProperty(key, previous)),
  );
};

/** 提取 descriptor 在非 identity reconcile 路径使用的稳定候选 key */
const descriptorKey = (node: SvgNode): string | undefined => {
  const publicId = node.attrs['data-retikz-id'];
  if (publicId !== undefined) return `public:${String(publicId)}`;
  return node.attrs.id === undefined ? undefined : `id:${node.attrs.id}`;
};

/** 提取既有 SVG element 在非 identity reconcile 路径使用的稳定候选 key */
const elementKey = (element: Element): string | undefined => {
  const publicId = element.getAttribute('data-retikz-id');
  if (publicId !== null) return `public:${publicId}`;
  const id = element.getAttribute('id');
  return id === null ? undefined : `id:${id}`;
};

/** 在 parent 后缀 children 中定位与 descriptor tag/key 匹配的复用候选 */
const findElementCandidate = (parent: SVGElement, start: number, node: SvgNode): SVGElement | undefined => {
  const key = descriptorKey(node);
  const children = Array.from(parent.childNodes);
  for (let index = start; index < children.length; index += 1) {
    const candidate = children[index];
    if (!(candidate instanceof parent.ownerDocument.defaultView!.SVGElement) || candidate.localName !== node.tag)
      continue;
    if (key === undefined ? index === start : elementKey(candidate) === key) return candidate;
  }
  return undefined;
};

/** 把 descriptor 原地 reconcile 到既有元素并记录所有可逆变更 */
const reconcileElement = (
  element: SVGElement,
  node: SvgNode,
  journal: MutationJournal,
  preserveExternalAttributes: boolean,
  previouslyOwnedAttributes: ReadonlySet<string> = new Set(),
  previouslyOwnedStyles: ReadonlySet<string> = new Set(),
  reconcileChildren = true,
): void => {
  const nextAttributes = new Map(
    Object.entries(node.attrs)
      .filter((entry): entry is [string, string | number] => entry[1] !== undefined)
      .map(([key, value]) => [key, String(value)]),
  );
  if (preserveExternalAttributes) {
    for (const key of previouslyOwnedAttributes) {
      if (!nextAttributes.has(key)) reconcileAttribute(element, key, undefined, journal);
    }
  } else {
    for (const key of element.getAttributeNames()) {
      if (!nextAttributes.has(key) && key !== 'style') reconcileAttribute(element, key, undefined, journal);
    }
  }
  for (const [key, value] of nextAttributes) reconcileAttribute(element, key, value, journal);

  const nextStyle = new Map(
    Object.entries(node.style ?? {})
      .filter((entry): entry is [string, string | number] => entry[1] !== undefined && entry[1] !== null)
      .map(([key, value]) => [key, String(value)]),
  );
  if (preserveExternalAttributes) {
    for (const key of previouslyOwnedStyles) {
      if (!nextStyle.has(key) && !isWaapiAnimationStyleOwned(element, key)) {
        reconcileStyle(element, key, undefined, journal);
      }
    }
  } else {
    for (let index = element.style.length - 1; index >= 0; index -= 1) {
      const key = element.style.item(index);
      if (!nextStyle.has(key) && !isWaapiAnimationStyleOwned(element, key)) {
        reconcileStyle(element, key, undefined, journal);
      }
    }
  }
  for (const [key, value] of nextStyle) reconcileStyle(element, key, value, journal);

  if (!reconcileChildren) return;

  const desiredChildren = node.children ?? [];
  for (let index = 0; index < desiredChildren.length; index += 1) {
    const desired = desiredChildren[index];
    const current: Node | null = index < element.childNodes.length ? element.childNodes[index] : null;
    if (typeof desired === 'string') {
      if (current instanceof element.ownerDocument.defaultView!.Text) {
        if (current.data !== desired) {
          const previous = current.data;
          journal.mutate(
            () => {
              current.data = desired;
            },
            () => {
              current.data = previous;
            },
          );
        }
        continue;
      }
      const text = element.ownerDocument.createTextNode(desired);
      journal.mutate(
        () => element.insertBefore(text, current ?? null),
        () => text.remove(),
      );
      continue;
    }
    const existing = findElementCandidate(element, index, desired);
    const candidate = existing ?? createSvgElement(element.ownerDocument, desired);
    if (existing === undefined) {
      journal.mutate(
        () => element.insertBefore(candidate, current ?? null),
        () => candidate.remove(),
      );
    } else if (candidate !== current) {
      const previousNext = candidate.nextSibling;
      journal.mutate(
        () => element.insertBefore(candidate, current ?? null),
        () => element.insertBefore(candidate, previousNext),
      );
    }
    reconcileElement(candidate, desired, journal, false);
  }
  while (element.childNodes.length > desiredChildren.length) {
    const child = element.childNodes[desiredChildren.length];
    const next = child.nextSibling;
    journal.mutate(
      () => child.remove(),
      () => element.insertBefore(child, next),
    );
  }
};

const descriptorMatchesElement = (element: SVGElement, node: SvgNode, root: boolean): boolean => {
  if (element.localName !== node.tag) return false;
  for (const [key, value] of Object.entries(node.attrs)) {
    if (value !== undefined && element.getAttribute(key) !== String(value)) return false;
  }
  if (!root) {
    const expectedAttributes = Object.entries(node.attrs).filter(([, value]) => value !== undefined).length;
    const actualAttributes = element.getAttributeNames().filter(key => key !== 'style').length;
    if (expectedAttributes !== actualAttributes) return false;
  }
  const expectedStyles = Object.entries(node.style ?? {}).filter(([, value]) => value !== undefined && value !== null);
  if (expectedStyles.some(([key, value]) => element.style.getPropertyValue(key) !== String(value))) return false;
  if (!root && element.style.length !== expectedStyles.length) return false;
  const children = node.children ?? [];
  const actualChildren = root
    ? Array.from(element.childNodes).filter(
        child =>
          !(child instanceof element.ownerDocument.defaultView!.SVGElement) ||
          child.getAttribute('data-retikz-inspection') !== 'layout',
      )
    : Array.from(element.childNodes);
  if (actualChildren.length !== children.length) return false;
  return children.every((child, index) => {
    const actual = actualChildren[index];
    if (typeof child === 'string') return actual.nodeType === actual.TEXT_NODE && actual.textContent === child;
    return (
      actual instanceof element.ownerDocument.defaultView!.SVGElement && descriptorMatchesElement(actual, child, false)
    );
  });
};

const descriptorOwnedAttributes = (node: SvgNode): Set<string> =>
  new Set(Object.entries(node.attrs).flatMap(([key, value]) => (value === undefined ? [] : [key])));

const descriptorOwnedStyles = (node: SvgNode): Set<string> =>
  new Set(
    Object.entries(node.style ?? {}).flatMap(([key, value]) => (value === undefined || value === null ? [] : [key])),
  );

const primitiveHasAnimation = (primitive: RuntimeScenePrimitive): boolean =>
  (primitive.animations?.length ?? 0) > 0 ||
  (primitive.type === 'group' && primitive.children.some(child => primitiveHasAnimation(child)));

const primitiveNeedsDerivedResource = (primitive: RuntimeScenePrimitive): boolean => {
  const candidate = primitive as RuntimeScenePrimitive & Readonly<Record<string, unknown>>;
  if (
    Reflect.get(candidate, 'shadow') !== undefined ||
    Reflect.get(candidate, 'clipRef') !== undefined ||
    Reflect.get(candidate, 'arrowStart') !== undefined ||
    Reflect.get(candidate, 'arrowEnd') !== undefined
  ) {
    return true;
  }
  if (primitive.type === 'group') return primitive.children.some(child => primitiveNeedsDerivedResource(child));
  return false;
};

/** 判断 snapshot 是否可安全执行 entity 级 DOM patch */
const supportsEntityPatch = (snapshot: SceneRuntimeSnapshot): boolean =>
  snapshot.scene.resources.length === 0 &&
  !snapshot.scene.primitives.some(
    primitive => primitiveHasAnimation(primitive) || primitiveNeedsDerivedResource(primitive),
  );

const canApplyEntityPatch = (
  current: SceneRuntimeSnapshot | undefined,
  patch: ScenePatch | undefined,
  next: SceneRuntimeSnapshot,
): patch is ScenePatch =>
  current !== undefined &&
  patch !== undefined &&
  supportsEntityPatch(current) &&
  supportsEntityPatch(next) &&
  patch.operations.every(
    operation =>
      operation.kind === 'insert' ||
      operation.kind === 'update' ||
      operation.kind === 'remove' ||
      operation.kind === 'move',
  );

const topologyPathKey = (path: ReadonlyArray<number>): string => path.join('.');

/** 统计当前播放或截帧配置下实际会物化的动画 wrapper */
const animationWrapperCount = (
  tracks: RuntimeScenePrimitive['animations'] | Scene['animations'],
  config: RenderRuntimeConfig,
  matches: (track: IRAnimationTrack) => boolean,
): number => {
  // Runtime snapshot 只把同一 JSON track 深度只读化；求值器不改写输入
  const candidates = tracks?.map(track => track as unknown as IRAnimationTrack).filter(matches) ?? [];
  const snapshotAt = config.animation?.snapshotAt;
  if (snapshotAt !== undefined) {
    const easings = materializeEasingRegistry(config);
    return candidates.filter(
      track => isAutoplayTrigger(track) && evaluateTrack(track, snapshotAt, { easings }) !== null,
    ).length;
  }
  return config.animation?.enabled === false ? 0 : candidates.length;
};

/** 定位 transform 动画 wrapper 内真正承载 primitive children 的 descriptor 与元素 */
const unwrapPrimitiveContent = (
  primitive: RuntimeScenePrimitive,
  descriptor: SvgNode,
  element: SVGElement,
  config: RenderRuntimeConfig,
): Readonly<{ descriptor: SvgNode; element: SVGElement }> => {
  const wrapperCount = animationWrapperCount(
    primitive.animations,
    config,
    track => classifyProperty(track.property) === 'transform',
  );
  let contentDescriptor = descriptor;
  let contentElement = element;
  for (let index = 0; index < wrapperCount; index += 1) {
    const childDescriptor: unknown = Reflect.get(contentDescriptor.children ?? [], 0);
    const childElement = contentElement.firstElementChild;
    if (
      typeof childDescriptor !== 'object' ||
      childDescriptor === null ||
      !(childElement instanceof element.ownerDocument.defaultView!.SVGElement)
    ) {
      break;
    }
    contentDescriptor = childDescriptor as SvgNode;
    contentElement = childElement;
  }
  return Object.freeze({ descriptor: contentDescriptor, element: contentElement });
};

type SvgRootDescriptorPlan = Readonly<{
  /** defs/style 等 renderer-owned 资源头 */
  head: ReadonlyArray<SvgNode>;
  /** Scene root viewBox 动画产生的 camera wrapper 链 */
  wrappers: ReadonlyArray<SvgNode>;
  /** 与 snapshot 顶层 primitives 同序的 descriptors */
  primitives: ReadonlyArray<SvgNode>;
}>;

/** 拆分 SVG document 的资源头、camera wrapper 链与顶层 primitive descriptors */
const buildRootDescriptorPlan = (
  snapshot: SceneRuntimeSnapshot,
  descriptor: SvgNode,
  config: RenderRuntimeConfig,
): SvgRootDescriptorPlan => {
  const children = (descriptor.children ?? []).filter((child): child is SvgNode => typeof child !== 'string');
  const wrapperCount = animationWrapperCount(snapshot.scene.animations, config, track => track.property === 'viewBox');
  if (wrapperCount === 0) {
    const headCount = children.length - snapshot.scene.primitives.length;
    if (headCount < 0) throw new Error('SVG root descriptor primitive count is invalid');
    return Object.freeze({
      head: Object.freeze(children.slice(0, headCount)),
      wrappers: Object.freeze([]),
      primitives: Object.freeze(children.slice(headCount)),
    });
  }
  const head = children.slice(0, -1);
  let cursor = children.at(-1);
  const wrappers: Array<SvgNode> = [];
  for (let index = 0; index < wrapperCount; index += 1) {
    if (cursor === undefined) throw new Error('SVG camera wrapper descriptor is missing');
    wrappers.push(cursor);
    if (index < wrapperCount - 1) {
      const child: unknown = Reflect.get(cursor.children ?? [], 0);
      if (typeof child !== 'object' || child === null) throw new Error('SVG camera wrapper chain is invalid');
      cursor = child as SvgNode;
    }
  }
  const primitives = (cursor?.children ?? []).filter((child): child is SvgNode => typeof child !== 'string');
  if (primitives.length !== snapshot.scene.primitives.length) {
    throw new Error('SVG camera wrapper primitive count is invalid');
  }
  return Object.freeze({
    head: Object.freeze(head),
    wrappers: Object.freeze(wrappers),
    primitives: Object.freeze(primitives),
  });
};

const buildSubtreeDescriptor = (
  snapshot: SceneRuntimeSnapshot,
  subtree: SceneRuntimeSubtree,
  config: RenderRuntimeConfig,
  options: RetainedSvgRendererImmutableOptions,
): SvgNode => {
  const descriptor = buildSvgDocument(
    {
      ...(snapshot.scene as unknown as Scene),
      primitives: [subtree.primitive as unknown as Scene['primitives'][number]],
      resources: [],
      animations: [],
    },
    {
      idPrefix: options.idPrefix,
      animate: config.animation?.enabled,
      snapshotAt: config.animation?.snapshotAt,
      easings: materializeEasingRegistry(config),
    },
  );
  const child = descriptor.children?.at(-1);
  if (child === undefined || typeof child === 'string') throw new Error('SVG subtree descriptor is missing');
  return child;
};

/** 从完整 descriptor、DOM 与 topology 建立 RuntimeIdentity 元素索引 */
const buildFullElementIndex = (
  host: SVGSVGElement,
  descriptor: SvgNode,
  snapshot: SceneRuntimeSnapshot,
  config: RenderRuntimeConfig,
): RuntimeIdentityMap<SVGElement> => {
  const entries: Array<readonly [RuntimeIdentity, SVGElement]> = [[snapshot.root, host]];
  const topologyByPath = new Map(snapshot.topology.map(node => [topologyPathKey(node.primitivePath), node]));
  const plan = buildRootDescriptorPlan(snapshot, descriptor, config);
  let contentElement: SVGElement = host;
  if (plan.wrappers.length > 0) {
    const outer = host.children[plan.head.length];
    if (!(outer instanceof host.ownerDocument.defaultView!.SVGElement)) {
      throw new Error('SVG camera wrapper element is missing');
    }
    contentElement = outer;
    for (let index = 1; index < plan.wrappers.length; index += 1) {
      const child = contentElement.firstElementChild;
      if (!(child instanceof host.ownerDocument.defaultView!.SVGElement)) {
        throw new Error('SVG camera wrapper element chain is invalid');
      }
      contentElement = child;
    }
  }
  const visit = (
    primitive: RuntimeScenePrimitive,
    primitiveDescriptor: SvgNode,
    element: SVGElement,
    path: ReadonlyArray<number>,
  ): void => {
    const topology = topologyByPath.get(topologyPathKey(path));
    if (topology === undefined) throw new Error('SVG topology element is missing');
    entries.push([topology.identity, element]);
    if (primitive.type !== 'group') return;
    const content = unwrapPrimitiveContent(primitive, primitiveDescriptor, element, config);
    const children = content.descriptor.children ?? [];
    primitive.children.forEach((child, index) => {
      const childDescriptor: unknown = Reflect.get(children, index);
      const childElement = content.element.childNodes[index];
      if (
        typeof childDescriptor !== 'object' ||
        childDescriptor === null ||
        !(childElement instanceof host.ownerDocument.defaultView!.SVGElement)
      ) {
        throw new Error('SVG group topology element is missing');
      }
      visit(child, childDescriptor as SvgNode, childElement, [...path, index]);
    });
  };
  snapshot.scene.primitives.forEach((primitive, index) => {
    const primitiveDescriptor: unknown = Reflect.get(plan.primitives, index);
    const element = contentElement.childNodes[index + (plan.wrappers.length === 0 ? plan.head.length : 0)];
    if (
      typeof primitiveDescriptor !== 'object' ||
      primitiveDescriptor === null ||
      !(element instanceof host.ownerDocument.defaultView!.SVGElement)
    ) {
      throw new Error('SVG root topology element is missing');
    }
    visit(primitive, primitiveDescriptor as SvgNode, element, [index]);
  });
  return createRuntimeIdentityMap(entries);
};

/** 按 subtree identity 复用 occurrence 元素并递归 reconcile group descendants */
const reconcilePrimitiveSubtree = (
  element: SVGElement,
  descriptor: SvgNode,
  primitive: RuntimeScenePrimitive,
  subtree: SceneRuntimeSubtree,
  config: RenderRuntimeConfig,
  currentElements: RuntimeIdentityMap<SVGElement>,
  journal: MutationJournal,
  path: ReadonlyArray<number> = [],
): void => {
  if (primitive.type !== 'group') {
    reconcileElement(element, descriptor, journal, false);
    return;
  }
  reconcileElement(element, descriptor, journal, false, new Set(), new Set(), false);
  const topologyByPath = new Map(subtree.topology.map(node => [topologyPathKey(node.primitivePath), node]));
  const content = unwrapPrimitiveContent(primitive, descriptor, element, config);
  const desiredChildren = content.descriptor.children ?? [];
  primitive.children.forEach((child, index) => {
    const childDescriptor: unknown = Reflect.get(desiredChildren, index);
    const topology = topologyByPath.get(topologyPathKey([...path, index]));
    if (typeof childDescriptor !== 'object' || childDescriptor === null || topology === undefined) {
      throw new Error('SVG subtree topology is incomplete');
    }
    const descriptorNode = childDescriptor as SvgNode;
    const current = content.element.childNodes[index] ?? null;
    const indexed = currentElements.get(topology.identity);
    const candidate =
      indexed !== undefined && indexed.localName === descriptorNode.tag
        ? indexed
        : createSvgElement(element.ownerDocument, descriptorNode);
    if (candidate !== current) {
      const previousNext = candidate.parentNode === content.element ? candidate.nextSibling : null;
      const previousParent = candidate.parentNode;
      journal.mutate(
        () => content.element.insertBefore(candidate, current),
        () => {
          if (previousParent === null) candidate.remove();
          else previousParent.insertBefore(candidate, previousNext);
        },
      );
    }
    reconcilePrimitiveSubtree(candidate, descriptorNode, child, subtree, config, currentElements, journal, [
      ...path,
      index,
    ]);
  });
  while (content.element.childNodes.length > primitive.children.length) {
    const child = content.element.childNodes[primitive.children.length];
    const next = child.nextSibling;
    journal.mutate(
      () => child.remove(),
      () => content.element.insertBefore(child, next),
    );
  }
};

/** 把已 materialize 的无动画 subtree 写入候选 RuntimeIdentity 索引 */
const indexSubtreeElements = (
  root: SVGElement,
  subtree: SceneRuntimeSubtree,
  target: RuntimeIdentityMap<SVGElement>,
): void => {
  const topologyByPath = new Map(subtree.topology.map(node => [topologyPathKey(node.primitivePath), node]));
  const visit = (primitive: RuntimeScenePrimitive, element: SVGElement, path: ReadonlyArray<number>): void => {
    const topology = topologyByPath.get(topologyPathKey(path));
    if (topology === undefined || !target.set(topology.identity, element)) {
      throw new Error('SVG candidate topology index is invalid');
    }
    if (primitive.type !== 'group') return;
    primitive.children.forEach((child, index) => {
      const childElement = element.childNodes[index];
      if (!(childElement instanceof element.ownerDocument.defaultView!.SVGElement)) {
        throw new Error('SVG candidate group element is missing');
      }
      visit(child, childElement, [...path, index]);
    });
  };
  visit(subtree.primitive, root, []);
};

/** 从完整 snapshot 提取一个顶层 occurrence 的相对 subtree */
const subtreeAtRootIndex = (snapshot: SceneRuntimeSnapshot, index: number): SceneRuntimeSubtree => {
  const topology = snapshot.topology
    .filter(node => node.primitivePath[0] === index)
    .map(node =>
      Object.freeze({
        identity: node.identity,
        semanticOwner: node.semanticOwner,
        ...(node.primitivePath.length === 1 ? {} : { parent: node.parent }),
        order: node.order,
        primitivePath: Object.freeze(node.primitivePath.slice(1)),
        ...(node.publicId === undefined ? {} : { publicId: node.publicId }),
      }),
    );
  const root = topology.find(node => node.primitivePath.length === 0);
  const primitive: unknown = Reflect.get(snapshot.scene.primitives, index);
  if (root === undefined || primitive === undefined) throw new Error('SVG root subtree topology is missing');
  return Object.freeze({
    root: root.identity,
    primitive: primitive as RuntimeScenePrimitive,
    topology: Object.freeze(topology),
  });
};

/**
 * 在 resource/layout/full reconcile 中按 RuntimeIdentity 保留稳定 primitive occurrence
 * @description resource head 先按 canonical descriptor key 创建或更新，随后切换 primitive consumer，最后才移除多余旧 head；
 *   稳定 key 原地更新时没有 handle 释放，任一后续失败由同一 journal 逆序恢复 resource 与 consumer
 */
const reconcileFullIdentityDocument = (
  host: SVGSVGElement,
  descriptor: SvgNode,
  snapshot: SceneRuntimeSnapshot,
  config: RenderRuntimeConfig,
  currentElements: RuntimeIdentityMap<SVGElement>,
  journal: MutationJournal,
  previouslyOwnedAttributes: ReadonlySet<string>,
  previouslyOwnedStyles: ReadonlySet<string>,
): void => {
  reconcileElement(host, descriptor, journal, true, previouslyOwnedAttributes, previouslyOwnedStyles, false);
  const plan = buildRootDescriptorPlan(snapshot, descriptor, config);
  const indexedElements = new Set(
    snapshot.topology.flatMap(node => {
      const element = currentElements.get(node.identity);
      return element === undefined ? [] : [element];
    }),
  );
  for (let index = 0; index < plan.head.length; index += 1) {
    const descriptorNode = plan.head[index];
    const current = host.childNodes[index] ?? null;
    const existing = findElementCandidate(host, index, descriptorNode);
    const candidate = existing ?? createSvgElement(host.ownerDocument, descriptorNode);
    if (candidate !== current) {
      const previousParent = candidate.parentNode;
      const previousNext = candidate.nextSibling;
      journal.mutate(
        () => host.insertBefore(candidate, current),
        () => {
          if (previousParent === null) candidate.remove();
          else previousParent.insertBefore(candidate, previousNext);
        },
      );
    }
    reconcileElement(candidate, descriptorNode, journal, false);
  }
  let contentElement: SVGElement = host;
  const wrapperParents: Array<Readonly<{ parent: SVGElement; child: SVGElement }>> = [];
  for (let index = 0; index < plan.wrappers.length; index += 1) {
    const wrapperDescriptor = plan.wrappers[index];
    const childIndex = index === 0 ? plan.head.length : 0;
    const parentElement = contentElement;
    const current = parentElement.childNodes[childIndex] ?? null;
    const candidate =
      current instanceof host.ownerDocument.defaultView!.SVGElement &&
      !indexedElements.has(current) &&
      current.localName === wrapperDescriptor.tag
        ? current
        : createSvgElement(host.ownerDocument, { ...wrapperDescriptor, children: [] });
    if (candidate !== current) {
      const previousParent = candidate.parentNode;
      const previousNext = candidate.nextSibling;
      journal.mutate(
        () => parentElement.insertBefore(candidate, current),
        () => {
          if (previousParent === null) candidate.remove();
          else previousParent.insertBefore(candidate, previousNext);
        },
      );
    }
    reconcileElement(candidate, { ...wrapperDescriptor, children: [] }, journal, false);
    wrapperParents.push(Object.freeze({ parent: parentElement, child: candidate }));
    contentElement = candidate;
  }
  snapshot.scene.primitives.forEach((primitive, index) => {
    const descriptorNode: unknown = Reflect.get(plan.primitives, index);
    const subtree = subtreeAtRootIndex(snapshot, index);
    if (typeof descriptorNode !== 'object' || descriptorNode === null) {
      throw new Error('SVG primitive descriptor is invalid');
    }
    const primitiveDescriptor = descriptorNode as SvgNode;
    const childIndex = plan.wrappers.length === 0 ? plan.head.length + index : index;
    const current = contentElement.childNodes[childIndex] ?? null;
    const indexed = currentElements.get(subtree.root);
    const candidate =
      indexed !== undefined && indexed.localName === primitiveDescriptor.tag
        ? indexed
        : createSvgElement(host.ownerDocument, primitiveDescriptor);
    if (candidate !== current) {
      const previousParent = candidate.parentNode;
      const previousNext = candidate.nextSibling;
      journal.mutate(
        () => contentElement.insertBefore(candidate, current),
        () => {
          if (previousParent === null) candidate.remove();
          else previousParent.insertBefore(candidate, previousNext);
        },
      );
    }
    reconcilePrimitiveSubtree(candidate, primitiveDescriptor, primitive, subtree, config, currentElements, journal);
  });
  const contentCount = plan.wrappers.length === 0 ? plan.head.length + plan.primitives.length : plan.primitives.length;
  while (contentElement.childNodes.length > contentCount) {
    const child = contentElement.childNodes[contentCount];
    const next = child.nextSibling;
    journal.mutate(
      () => child.remove(),
      () => contentElement.insertBefore(child, next),
    );
  }
  for (const { parent, child: desiredChild } of wrapperParents.toReversed()) {
    if (parent === host) continue;
    for (const child of Array.from(parent.childNodes)) {
      if (child === desiredChild) continue;
      const next = child.nextSibling;
      journal.mutate(
        () => child.remove(),
        () => parent.insertBefore(child, next),
      );
    }
  }
  if (plan.wrappers.length > 0) {
    const desiredTopCount = plan.head.length + 1;
    while (host.childNodes.length > desiredTopCount) {
      const child = host.childNodes[desiredTopCount];
      const next = child.nextSibling;
      journal.mutate(
        () => child.remove(),
        () => host.insertBefore(child, next),
      );
    }
  }
};

/** 按 RuntimeIdentity 归并当前 DOM 中的 WAAPI descriptor elements */
const groupSvgWaapiElements = (
  host: SVGSVGElement,
  snapshot: SceneRuntimeSnapshot,
  elements: RuntimeIdentityMap<SVGElement>,
): Readonly<{
  root: ReadonlyArray<Element>;
  occurrences: ReadonlyArray<Readonly<{ identity: RuntimeIdentity; elements: ReadonlyArray<Element> }>>;
}> => {
  const descriptors = [
    ...(host.matches('[data-retikz-anim]') ? [host] : []),
    ...host.querySelectorAll('[data-retikz-anim]'),
  ];
  const grouped = createRuntimeIdentityMap<Array<Element>>([]);
  const root: Array<Element> = [];
  for (const descriptor of descriptors) {
    let owner: Readonly<{ identity: RuntimeIdentity; element: SVGElement }> | undefined;
    for (const node of snapshot.topology) {
      const occurrence = elements.get(node.identity);
      if (occurrence === undefined || (occurrence !== descriptor && !occurrence.contains(descriptor))) continue;
      if (owner === undefined || owner.element.contains(occurrence))
        owner = { identity: node.identity, element: occurrence };
    }
    if (owner === undefined) {
      root.push(descriptor);
      continue;
    }
    const owned = grouped.get(owner.identity) ?? [];
    owned.push(descriptor);
    grouped.set(owner.identity, owned);
  }
  return Object.freeze({
    root: Object.freeze(root),
    occurrences: Object.freeze(
      snapshot.topology.flatMap(node => {
        const owned = grouped.get(node.identity);
        return owned === undefined ? [] : [Object.freeze({ identity: node.identity, elements: Object.freeze(owned) })];
      }),
    ),
  });
};

/** 创建按 RuntimeIdentity 增量复用的 SVG WAAPI state，并返回事务清理集合 */
const createSvgAnimationState = (
  host: SVGSVGElement,
  snapshot: SceneRuntimeSnapshot,
  elements: RuntimeIdentityMap<SVGElement>,
  diff: SceneAnimationDescriptorDiff,
  previous: SvgAnimationState | undefined,
  preserve: boolean,
  cleanupQueue: SvgAnimationCleanupQueue,
): Readonly<{
  state: SvgAnimationState;
  created: ReadonlyArray<SvgAnimationControl>;
  retired: ReadonlyArray<SvgAnimationControl>;
}> => {
  const grouped = groupSvgWaapiElements(host, snapshot, elements);
  const previousByIdentity = createRuntimeIdentityMap(
    previous?.bindings.map(binding => [binding.identity, binding]) ?? [],
  );
  const changeByIdentity = createRuntimeIdentityMap(
    diff.occurrences.map(change => [change.identity, change.kind] as const),
  );
  const created: Array<SvgAnimationControl> = [];
  try {
    const retained = new Set<SvgAnimationControl>();
    const bindings = grouped.occurrences.map(group => {
      const existing = previousByIdentity.get(group.identity);
      if (
        preserve &&
        existing !== undefined &&
        changeByIdentity.get(group.identity) === SceneAnimationOccurrenceChangeKind.Unchanged &&
        sameAnimationElements(existing.elements, group.elements)
      ) {
        retained.add(existing);
        return existing;
      }
      const control = createSvgAnimationControl(group.elements, cleanupQueue);
      created.push(control);
      return Object.freeze({ identity: group.identity, ...control });
    });
    const root =
      preserve &&
      !diff.rootChanged &&
      previous?.root !== undefined &&
      sameAnimationElements(previous.root.elements, grouped.root)
        ? previous.root
        : grouped.root.length === 0
          ? undefined
          : createSvgAnimationControl(grouped.root, cleanupQueue);
    if (root !== undefined) {
      if (root === previous?.root) retained.add(root);
      else created.push(root);
    }
    const retired = [
      ...(previous?.root === undefined || retained.has(previous.root) ? [] : [previous.root]),
      ...(previous?.bindings.flatMap(binding => (retained.has(binding) ? [] : [binding])) ?? []),
    ];
    const all = [...(root === undefined ? [] : [root]), ...bindings];
    const reuseAggregate =
      previous !== undefined &&
      root === previous.root &&
      bindings.length === previous.bindings.length &&
      bindings.every((binding, index) => binding.controls === previous.bindings[index]?.controls);
    return Object.freeze({
      state: Object.freeze({
        controls: reuseAggregate ? previous.controls : combineSvgAnimationControls(all),
        ...(root === undefined ? {} : { root }),
        bindings,
      }),
      created: Object.freeze(created),
      retired: Object.freeze(retired),
    });
  } catch (cause) {
    try {
      runBestEffortCleanup([...created].reverse().map(control => () => control.controls.dispose()));
    } catch {
      // 失败 controls 已进入 renderer 级队列；setup cause 保持 primary
    }
    throw cause;
  }
};

type EntityScenePatchOperation = Extract<
  ScenePatchOperation,
  Readonly<{ kind: 'insert' | 'update' | 'remove' | 'move' }>
>;

/** 按 kind 提取单类 entity patch operation */
type EntityScenePatchOperationOfKind<TKind extends EntityScenePatchOperation['kind']> = Extract<
  EntityScenePatchOperation,
  Readonly<{ kind: TKind }>
>;

/** prepare 已解析完成、commit 无需再判断字段是否存在的 entity mutation plan */
type PreparedEntityOperation =
  | Readonly<{
      kind: 'remove';
      operation: EntityScenePatchOperationOfKind<'remove'>;
      element: SVGElement;
      parent: Node;
      before: Node | null;
    }>
  | Readonly<{
      kind: 'move';
      operation: EntityScenePatchOperationOfKind<'move'>;
      element: SVGElement;
      parent: Node;
      before: Node | null;
    }>
  | Readonly<{
      kind: 'insert';
      operation: EntityScenePatchOperationOfKind<'insert'>;
      descriptor: SvgNode;
      element: SVGElement;
      parent: Node;
      before: Node | null;
    }>
  | Readonly<{
      kind: 'update';
      operation: EntityScenePatchOperationOfKind<'update'>;
      descriptor: SvgNode;
      element: SVGElement;
      existing: SVGElement;
      parent: Node;
      indexed: boolean;
    }>;

/** 创建与当前 SVG DOM、handlers 和动画控制器对应的 hydration */
const createSvgHydration = (
  host: SVGSVGElement,
  snapshot: SceneRuntimeSnapshot,
  config: RenderRuntimeConfig,
  elements: RuntimeIdentityMap<SVGElement>,
): HydrationController | undefined => {
  const handlers = mergeRenderHandlers(config);
  if (Object.keys(handlers).length === 0) return undefined;
  const scene = snapshot.scene as unknown as Scene;
  const targets = new WeakMap<Element, HydrationTarget>();
  const publicIdByOwner = createSemanticOwnerPublicIdMap(snapshot.topology);
  const primitivePathsByPublicId = createPublicIdPrimitivePathMap(snapshot.topology);
  const animationElementsByIdentity = createRuntimeIdentityMap(
    groupSvgWaapiElements(host, snapshot, elements).occurrences.map(group => [group.identity, group.elements] as const),
  );
  const animationElementsByPublicId = new Map<string, Set<Element>>();
  for (const node of snapshot.topology) {
    const element = elements.get(node.identity);
    if (element === undefined) continue;
    const publicId = node.publicId ?? publicIdByOwner.get(node.semanticOwner);
    targets.set(
      element,
      Object.freeze({
        identity: node.identity,
        semanticOwner: node.semanticOwner,
        ...(publicId === undefined ? {} : { publicId }),
      }),
    );
    if (publicId !== undefined) {
      const owned = animationElementsByPublicId.get(publicId) ?? new Set<Element>();
      owned.add(element);
      for (const descriptor of animationElementsByIdentity.get(node.identity) ?? []) owned.add(descriptor);
      animationElementsByPublicId.set(publicId, owned);
    }
  }
  /** 从事件 target 上溯到 retained topology 已索引的 occurrence 元素 */
  const locateElement = (event: Event): Element | null => {
    let element = event.target instanceof Element ? event.target : null;
    while (element !== null) {
      if (targets.has(element)) return element;
      if (element === host) return null;
      element = element.parentElement;
    }
    return null;
  };
  return createHydrationController(
    host,
    handlers,
    event => {
      const element = locateElement(event);
      return element === null ? null : (targets.get(element) ?? null);
    },
    createContextBuilder({
      renderer: 'svg',
      root: host,
      scene,
      resolvePrimitivePaths: id => primitivePathsByPublicId.get(id),
      resolveElement: locateElement,
      resolvePoint: resolvePointViaLayout(host, scene.layout),
      makeAnimation: id =>
        createSvgAnimationControls(host, id, publicId => [...(animationElementsByPublicId.get(publicId) ?? [])]),
    }),
  );
};

/** 生成一次完整 retained SVG 候选 descriptor */
const buildDescriptor = (
  snapshot: SceneRuntimeSnapshot,
  config: RenderRuntimeConfig,
  options: RetainedSvgRendererImmutableOptions,
): SvgNode =>
  buildSvgDocument(snapshot.scene as unknown as Scene, {
    idPrefix: options.idPrefix,
    animate: config.animation?.enabled,
    snapshotAt: config.animation?.snapshotAt,
    easings: materializeEasingRegistry(config),
  });

/** 创建内置 SVG retained renderer */
export const createBuiltinSvgRetainedRenderer = (
  host: SVGSVGElement,
  options: RetainedSvgRendererImmutableOptions,
): RetainedSvgRenderer => {
  let currentSnapshot: SceneRuntimeSnapshot | undefined;
  let currentInspection: InspectionPlane | null = null;
  let currentInspectionElement: SVGElement | undefined;
  let currentAnimation: SvgAnimationState | undefined;
  let currentHydration: HydrationController | undefined;
  let currentOwnedAttributes = new Set<string>();
  let currentOwnedStyles = new Set<string>();
  let currentElements = createRuntimeIdentityMap<SVGElement>([]);
  let currentAnimationConfig: RenderRuntimeConfig['animation'];
  let currentConfig: RenderRuntimeConfig | undefined;
  const candidateHydrationCleanup = createHydrationCleanupQueue();
  const candidateAnimationCleanup = createSvgAnimationCleanupQueue();

  const prepare = (
    patch: ScenePatch | undefined,
    snapshot: SceneRuntimeSnapshot,
    config: RenderRuntimeConfig,
    mode: 'create' | 'adopt' = 'create',
  ): RuntimePreparedCommit => {
    const entityPatch = canApplyEntityPatch(currentSnapshot, patch, snapshot) ? patch : undefined;
    const descriptor = entityPatch === undefined ? buildDescriptor(snapshot, config, options) : undefined;
    if (descriptor !== undefined) {
      const stagedHost = createSvgElement(host.ownerDocument, descriptor);
      if (!(stagedHost instanceof host.ownerDocument.defaultView!.SVGSVGElement)) {
        throw new Error('SVG full descriptor root is invalid');
      }
      buildFullElementIndex(stagedHost, descriptor, snapshot, config);
    }
    const entityOperations = entityPatch?.operations as ReadonlyArray<EntityScenePatchOperation> | undefined;
    const canAdopt = mode === 'adopt' && descriptor !== undefined && descriptorMatchesElement(host, descriptor, true);
    const replaceAdoptedSeed = mode === 'adopt' && descriptor !== undefined && !canAdopt;
    const previousSnapshot = currentSnapshot;
    const previousAnimation = currentAnimation;
    const previousHydration = currentHydration;
    const previousOwnedAttributes = currentOwnedAttributes;
    const previousOwnedStyles = currentOwnedStyles;
    const previousElements = currentElements;
    const previousAnimationConfig = currentAnimationConfig;
    const previousConfig = currentConfig;
    const nextOwnedAttributes =
      descriptor === undefined ? currentOwnedAttributes : descriptorOwnedAttributes(descriptor);
    const nextOwnedStyles = descriptor === undefined ? currentOwnedStyles : descriptorOwnedStyles(descriptor);
    const targeted = createRuntimeIdentityMap<true>(
      (entityPatch?.operations ?? []).flatMap(operation =>
        operation.kind === 'insert' || operation.kind === 'update'
          ? operation.subtree.topology.map(node => [node.identity, true] as const)
          : [],
      ),
    );
    const candidateElements = createRuntimeIdentityMap<SVGElement>([
      [snapshot.root, host],
      ...snapshot.topology.flatMap(node => {
        if (targeted.has(node.identity)) return [];
        const element = currentElements.get(node.identity);
        return element === undefined ? [] : ([[node.identity, element]] as const);
      }),
    ]);
    /** 在 prepare 阶段完成 entity target 解析与 detached subtree materialization */
    const preparedOperations: ReadonlyArray<PreparedEntityOperation> =
      entityOperations?.map(operation => {
        if (operation.kind === 'remove') {
          const element = currentElements.get(operation.identity);
          if (element === undefined || element.parentNode === null) throw new Error('SVG remove target is missing');
          return Object.freeze({
            kind: operation.kind,
            operation,
            element,
            parent: element.parentNode,
            before: element.nextSibling,
          });
        }
        if (operation.kind === 'move') {
          const element = currentElements.get(operation.identity);
          const parent = candidateElements.get(operation.parent) ?? currentElements.get(operation.parent);
          const beforeCandidate =
            operation.before === undefined
              ? null
              : (candidateElements.get(operation.before) ?? currentElements.get(operation.before));
          if (
            element === undefined ||
            parent === undefined ||
            (operation.before !== undefined && beforeCandidate === undefined)
          ) {
            throw new Error('SVG move topology is missing');
          }
          const before = beforeCandidate ?? null;
          return Object.freeze({
            kind: operation.kind,
            operation,
            element,
            parent,
            before,
          });
        }
        const subtreeDescriptor = buildSubtreeDescriptor(snapshot, operation.subtree, config, options);
        if (operation.kind === 'insert') {
          const parent = candidateElements.get(operation.parent) ?? currentElements.get(operation.parent);
          const beforeCandidate =
            operation.before === undefined
              ? null
              : (candidateElements.get(operation.before) ?? currentElements.get(operation.before));
          if (parent === undefined || (operation.before !== undefined && beforeCandidate === undefined)) {
            throw new Error('SVG insert parent is missing');
          }
          const before = beforeCandidate ?? null;
          const element = createSvgElement(host.ownerDocument, subtreeDescriptor);
          indexSubtreeElements(element, operation.subtree, candidateElements);
          return Object.freeze({
            kind: operation.kind,
            operation,
            descriptor: subtreeDescriptor,
            element,
            parent,
            before,
          });
        }
        const existing = currentElements.get(operation.identity);
        if (existing === undefined || existing.parentNode === null) throw new Error('SVG update target is missing');
        if (existing.localName !== subtreeDescriptor.tag) {
          const element = createSvgElement(host.ownerDocument, subtreeDescriptor);
          indexSubtreeElements(element, operation.subtree, candidateElements);
          return Object.freeze({
            kind: operation.kind,
            operation,
            descriptor: subtreeDescriptor,
            element,
            existing,
            parent: existing.parentNode,
            indexed: true,
          });
        }
        return Object.freeze({
          kind: operation.kind,
          operation,
          descriptor: subtreeDescriptor,
          element: existing,
          existing,
          parent: existing.parentNode,
          indexed: false,
        });
      }) ?? [];
    let animation: SvgAnimationState | undefined;
    let animationTransition:
      | Readonly<{ created: ReadonlyArray<SvgAnimationControl>; retired: ReadonlyArray<SvgAnimationControl> }>
      | undefined;
    const suspendedAnimation: Array<Readonly<{ control: SvgAnimationControl; running: boolean }>> = [];
    let hydration: HydrationController | undefined;
    const disposeCandidateHydration = (): void => {
      const candidate = hydration;
      if (candidate === undefined) return;
      candidateHydrationCleanup.dispose(candidate);
      hydration = undefined;
    };
    let journal: MutationJournal | undefined;
    let committed = false;
    let rolledBack = false;
    let previousHydrationDisposeAttempted = false;
    const animationDiff = diffSceneAnimationDescriptors(currentSnapshot, snapshot);
    const replaceScene = patch?.operations.some(operation => operation.kind === 'replaceScene') === true;
    const preserveAnimation = !replaceScene && runtimeStructuralEquals(currentAnimationConfig, config.animation);
    return Object.freeze({
      commit: () => {
        journal = createMutationJournal();
        if (entityPatch !== undefined) {
          for (const prepared of preparedOperations) {
            if (prepared.kind === 'remove') {
              const element = prepared.element;
              const parent = prepared.parent;
              const next = prepared.before;
              journal.mutate(
                () => element.remove(),
                () => parent.insertBefore(element, next),
              );
              continue;
            }
            if (prepared.kind === 'move') {
              const element = prepared.element;
              const parent = prepared.parent;
              const before = prepared.before;
              const previousParent = element.parentNode;
              const previousNext = element.nextSibling;
              journal.mutate(
                () => parent.insertBefore(element, before),
                () => {
                  if (previousParent === null) element.remove();
                  else previousParent.insertBefore(element, previousNext);
                },
              );
              continue;
            }
            const operation = prepared.operation;
            const subtree = operation.subtree;
            const subtreeDescriptor = prepared.descriptor;
            if (prepared.kind === 'insert') {
              const parent = prepared.parent;
              const before = prepared.before;
              const element = prepared.element;
              journal.mutate(
                () => parent.insertBefore(element, before),
                () => element.remove(),
              );
              continue;
            }
            const existing = prepared.existing;
            const element = prepared.element;
            if (element !== existing) {
              const parent = prepared.parent;
              journal.mutate(
                () => parent.replaceChild(element, existing),
                () => {
                  if (element.parentNode === parent) parent.replaceChild(existing, element);
                },
              );
            } else {
              reconcilePrimitiveSubtree(
                existing,
                subtreeDescriptor,
                subtree.primitive,
                subtree,
                config,
                currentElements,
                journal,
              );
            }
            if (prepared.indexed !== true) indexSubtreeElements(element, subtree, candidateElements);
          }
          currentElements = candidateElements;
        } else if (!canAdopt && descriptor !== undefined) {
          if (replaceAdoptedSeed) {
            reconcileElement(
              host,
              { ...descriptor, children: [] },
              journal,
              true,
              previousOwnedAttributes,
              previousOwnedStyles,
            );
            for (const child of descriptor.children ?? []) {
              const node =
                typeof child === 'string'
                  ? host.ownerDocument.createTextNode(child)
                  : createSvgElement(host.ownerDocument, child);
              journal.mutate(
                () => host.appendChild(node),
                () => node.remove(),
              );
            }
          } else {
            if (previousSnapshot !== undefined) {
              reconcileFullIdentityDocument(
                host,
                descriptor,
                snapshot,
                config,
                currentElements,
                journal,
                previousOwnedAttributes,
                previousOwnedStyles,
              );
            } else {
              reconcileElement(host, descriptor, journal, true, previousOwnedAttributes, previousOwnedStyles);
            }
          }
          currentElements = buildFullElementIndex(host, descriptor, snapshot, config);
        } else if (descriptor !== undefined) {
          currentElements = buildFullElementIndex(host, descriptor, snapshot, config);
        }
        if (
          config.animation?.enabled !== false &&
          config.animation?.snapshotAt === undefined &&
          sceneHasAnimations(snapshot.scene as unknown as Scene)
        ) {
          const transition = createSvgAnimationState(
            host,
            snapshot,
            currentElements,
            animationDiff,
            previousAnimation,
            preserveAnimation,
            candidateAnimationCleanup,
          );
          animation = transition.state;
          animationTransition = transition;
        } else if (previousAnimation !== undefined) {
          animationTransition = Object.freeze({
            created: Object.freeze([]),
            retired: Object.freeze([
              ...(previousAnimation.root === undefined ? [] : [previousAnimation.root]),
              ...previousAnimation.bindings,
            ]),
          });
        }
        if (previousHydration !== undefined) {
          previousHydrationDisposeAttempted = true;
          previousHydration.dispose();
        }
        try {
          hydration = createSvgHydration(host, snapshot, config, currentElements);
        } catch (cause) {
          const setupFailure = recoverHydrationSetupFailure(cause);
          if (setupFailure !== undefined) {
            hydration = setupFailure.controller;
            throw setupFailure.cause;
          }
          throw cause;
        }
        for (const control of animationTransition?.retired ?? []) {
          const suspended = Object.freeze({ control, running: control.controls.running });
          suspendedAnimation.push(suspended);
          control.gate.enabled = false;
          control.suspend();
        }
        currentSnapshot = snapshot;
        currentHydration = hydration;
        currentAnimation = animation;
        currentOwnedAttributes = nextOwnedAttributes;
        currentOwnedStyles = nextOwnedStyles;
        currentAnimationConfig = config.animation;
        currentConfig = config;
        committed = true;
      },
      rollback: () => {
        rolledBack = true;
        runBestEffortCleanup([
          disposeCandidateHydration,
          ...(animationTransition?.created.map(control => () => control.controls.dispose()) ?? []),
          () => journal?.rollback(),
          ...suspendedAnimation.map(suspended => () => {
            suspended.control.gate.enabled = true;
            if (suspended.running) suspended.control.controls.play();
          }),
          () => {
            currentSnapshot = previousSnapshot;
            currentHydration = previousHydration;
            currentAnimation = previousAnimation;
            currentOwnedAttributes = previousOwnedAttributes;
            currentOwnedStyles = previousOwnedStyles;
            currentElements = previousElements;
            currentAnimationConfig = previousAnimationConfig;
            currentConfig = previousConfig;
          },
          () => {
            if (
              !previousHydrationDisposeAttempted ||
              previousHydration === undefined ||
              previousSnapshot === undefined ||
              previousConfig === undefined
            ) {
              return;
            }
            previousHydration.dispose();
            try {
              currentHydration = createSvgHydration(host, previousSnapshot, previousConfig, previousElements);
            } catch (cause) {
              const setupFailure = recoverHydrationSetupFailure(cause);
              if (setupFailure !== undefined) {
                currentHydration = setupFailure.controller;
                throw setupFailure.cause;
              }
              throw cause;
            }
          },
        ]);
      },
      dispose: () => {
        runBestEffortCleanup([
          ...(rolledBack
            ? [
                () => {
                  disposeCandidateHydration();
                },
              ]
            : []),
          ...(committed && !rolledBack
            ? (animationTransition?.retired.map(control => () => control.controls.dispose()) ?? [])
            : []),
        ]);
      },
    });
  };

  const prepareFrame = (
    scenePatch: ScenePatch | undefined,
    frame: RenderFrameSnapshot,
    config: RenderRuntimeConfig,
    mode: 'create' | 'adopt' = 'create',
  ): RuntimePreparedCommit => {
    const primaryToken = prepare(scenePatch, frame.primary, config, mode);
    const previousInspection = currentInspection;
    const adoptedInspection =
      mode === 'adopt'
        ? Array.from(host.children).find(child => child.getAttribute('data-retikz-inspection') === 'layout')
        : undefined;
    const previousElement =
      currentInspectionElement ??
      (adoptedInspection instanceof host.ownerDocument.defaultView!.SVGElement ? adoptedInspection : undefined);
    let candidateElement: SVGElement | undefined;
    try {
      candidateElement =
        frame.inspection === null
          ? undefined
          : createSvgElement(
              host.ownerDocument,
              buildSvgInspectionGroup(frame.inspection, (entryScene, entryIndex) =>
                buildSvgFragment(entryScene, {
                  idPrefix: `${options.idPrefix}-inspection-${entryIndex}`,
                  animate: false,
                }),
              ),
            );
    } catch (cause) {
      try {
        runBestEffortCleanup([() => primaryToken.rollback(), () => primaryToken.dispose()]);
      } catch {
        // 辅助 Scene 物化错误保持为 prepare 的主因
      }
      throw cause;
    }
    let committed = false;
    return Object.freeze({
      commit: () => {
        primaryToken.commit();
        previousElement?.remove();
        if (candidateElement !== undefined) host.appendChild(candidateElement);
        currentInspection = frame.inspection;
        currentInspectionElement = candidateElement;
        committed = true;
      },
      rollback: () => {
        primaryToken.rollback();
        candidateElement?.remove();
        if (previousElement !== undefined && previousElement.parentNode !== host) host.appendChild(previousElement);
        currentInspection = previousInspection;
        currentInspectionElement = previousElement;
      },
      dispose: () => {
        primaryToken.dispose();
        if (!committed) candidateElement?.remove();
      },
    });
  };

  return defineRetainedRenderer({
    backend: 'svg',
    host,
    capability: 'entity',
    inspectionCapability: 'supported',
    prepareMount: (frame, config, mode) => prepareFrame(undefined, frame, config, mode),
    prepare: (scenePatch, frame, config) => prepareFrame(scenePatch, frame, config),
    read: () => {
      if (currentSnapshot === undefined) throw new Error('SVG retained renderer is not committed');
      return Object.freeze({
        frame: Object.freeze({ primary: currentSnapshot, inspection: currentInspection }),
        ...(currentAnimation === undefined ? {} : { animation: currentAnimation.controls }),
      });
    },
    dispose: () => {
      const hydration = currentHydration;
      const animation = currentAnimation;
      runBestEffortCleanup([
        () => {
          hydration?.dispose();
          if (currentHydration === hydration) currentHydration = undefined;
        },
        () => candidateHydrationCleanup.disposePending(),
        () => {
          animation?.controls.dispose();
          if (currentAnimation === animation) currentAnimation = undefined;
        },
        () => candidateAnimationCleanup.disposePending(),
        () => {
          currentSnapshot = undefined;
          currentInspection = null;
          currentInspectionElement = undefined;
          currentOwnedAttributes = new Set();
          currentOwnedStyles = new Set();
          currentElements = createRuntimeIdentityMap([]);
          currentAnimationConfig = undefined;
          currentConfig = undefined;
        },
      ]);
    },
  });
};
