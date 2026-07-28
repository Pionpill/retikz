import type { CompileArtifact, CoreProgramOptions, IRScene, Scene } from '@retikz/core';
import type { AnimationControls, AnimationPropertyRegistry, EasingRegistry } from '@retikz/render/animation';
import type { HydrationHandlers } from '@retikz/render/hydration';
import type {
  RenderRuntimeConfigInput,
  RetainedRendererFactory,
  RetainedRenderParticipantHandle,
} from '@retikz/render/runtime';
import type { RuntimeDiagnostic, RuntimeSession } from '@retikz/runtime';
import type { CSSProperties, FC, MutableRefObject, Ref } from 'react';

import { CoreOwnerDefinition, createCoreProgram } from '@retikz/core';
import {
  builtinRetainedRendererFactory,
  createRetainedRenderParticipant,
  RenderRuntimeOwnerDefinition,
} from '@retikz/render/runtime';
import { renderToSvgString } from '@retikz/render/svg';
import {
  createRuntimeOwnerInput,
  createRuntimeOwnerRegistry,
  createRuntimeOwnerUpdate,
  createRuntimeProgramRegistry,
  createRuntimeSession,
  RuntimeError,
} from '@retikz/runtime';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

/** React retained host 的公开输入 */
export type RetainedHostProps = Readonly<{
  /** 要接管的 renderer 后端 */
  backend: 'svg' | 'canvas';
  /** 提交给 Core Program 的完整 IR Snapshot */
  source: IRScene;
  /** React render 阶段生成的 SSR-safe Scene seed */
  scene: Scene;
  /** Core Program 的 session-lifetime 编译配置 */
  coreOptions: CoreProgramOptions;
  /** 当前 revision 的 hydration handler 注册表 */
  handlers: HydrationHandlers;
  /** SVG CSS 宽度或 Canvas CSS user-space 宽度 */
  width?: number | string;
  /** SVG CSS 高度或 Canvas CSS user-space 高度 */
  height?: number | string;
  /** 透传到宿主根元素的类名 */
  className?: string;
  /** 透传到宿主根元素的样式 */
  style?: CSSProperties;
  /** 当前动画播放开关 */
  animate: boolean;
  /** 可选静态动画采样时刻 */
  snapshotAt?: number;
  /** 自定义 easing registry */
  easings?: EasingRegistry;
  /** 自定义 animation property registry */
  animationProperties?: AnimationPropertyRegistry;
  /** 当前 committed 动画控制器出口 */
  animationRef?: Ref<AnimationControls | null>;
  /** SSR 与资源引用共用的稳定 id 前缀 */
  idPrefix: string;
  /** 可选第三方 retained renderer factory */
  rendererFactory?: RetainedRendererFactory;
  /** 成功提交或失败 transaction 的 Runtime diagnostic 出口 */
  onDiagnostic?: (diagnostic: RuntimeDiagnostic) => void;
  /** committed compile artifacts 通知出口 */
  onArtifacts?: (artifacts: ReadonlyArray<CompileArtifact>) => void;
}>;

type ActiveRuntime = {
  /** 当前 React host 拥有的 Runtime Session */
  session: RuntimeSession;
  /** 注册到 Session 的 Core Program */
  coreProgram: ReturnType<typeof createCoreProgram>;
  /** 注册到 Session 的 retained Render participant */
  participant: RetainedRenderParticipantHandle;
  /** 最近成功提交的 IR source */
  source: IRScene;
  /** 最近成功提交的 renderer config */
  config: RenderRuntimeConfigInput;
  /** 最近通知给调用方的 artifacts */
  artifacts: ReadonlyArray<CompileArtifact>;
};

/** 写入 callback ref 或 RefObject */
const assignRef = <T,>(ref: Ref<T> | undefined, value: T): void => {
  if (typeof ref === 'function') ref(value);
  else if (ref !== undefined && ref !== null) (ref as MutableRefObject<T>).current = value;
};

/** callback 失败只进入 React 开发期 warning，不改变已提交 Runtime state */
const warnCallbackFailure = (name: string, cause: unknown): void => {
  if (process.env.NODE_ENV === 'production') return;
  console.warn(`[retikz] <Layout> ${name} callback failed`, cause);
};

/** SSR 使用 passive effect，浏览器 commit 使用同步 layout effect */
const useHostLayoutEffect = typeof document === 'undefined' ? useEffect : useLayoutEffect;

/** 隔离公开 ref callback 失败，避免破坏已提交 Runtime 或 cleanup 注册 */
const assignRefSafely = <T,>(name: string, ref: Ref<T> | undefined, value: T): void => {
  try {
    assignRef(ref, value);
  } catch (cause) {
    warnCallbackFailure(name, cause);
  }
};

/** 逐条隔离投递 Runtime diagnostics */
const deliverDiagnostics = (
  diagnostics: ReadonlyArray<RuntimeDiagnostic>,
  callback: ((diagnostic: RuntimeDiagnostic) => void) | undefined,
): void => {
  if (callback === undefined) return;
  for (const diagnostic of diagnostics) {
    try {
      callback(diagnostic);
    } catch (cause) {
      warnCallbackFailure('onDiagnostic', cause);
    }
  }
};

/** 从完整 SVG seed 中截取 Render-owned descendants */
const svgSeedInnerHtml = (scene: Scene, options: RetainedHostProps): string => {
  const document = renderToSvgString(scene, {
    idPrefix: options.idPrefix,
    animate: options.animate,
    snapshotAt: options.snapshotAt,
    easings: options.easings,
  });
  const start = document.indexOf('>');
  const end = document.lastIndexOf('</svg>');
  return start < 0 || end < start ? '' : document.slice(start + 1, end);
};

/** 读取浏览器 DPR，非法值回退 1 */
const resolveDevicePixelRatio = (): number => {
  const ratio = globalThis.devicePixelRatio;
  return typeof ratio === 'number' && Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
};

/** React 只声明 host shell，Render participant 独占 descendants / bitmap */
export const RetainedHost: FC<RetainedHostProps> = props => {
  const {
    backend,
    source,
    scene,
    coreOptions,
    handlers,
    width,
    height,
    className,
    style,
    animate,
    snapshotAt,
    easings,
    animationProperties,
    animationRef,
    idPrefix,
    rendererFactory,
    onDiagnostic,
    onArtifacts,
  } = props;
  const hostRef = useRef<SVGSVGElement | HTMLCanvasElement | null>(null);
  const runtimeRef = useRef<ActiveRuntime | undefined>(undefined);
  const sourceRef = useRef(source);
  const configRef = useRef<RenderRuntimeConfigInput>({});
  const animationRefTarget = useRef(animationRef);
  const previousAnimationRef = useRef<Ref<AnimationControls | null> | undefined>(undefined);
  const onDiagnosticRef = useRef(onDiagnostic);
  const onArtifactsRef = useRef(onArtifacts);

  const config = useMemo<RenderRuntimeConfigInput>(
    () => ({
      handlerContributions: [{ registration: 0, handlers }],
      animation: {
        enabled: animate,
        ...(snapshotAt === undefined ? {} : { snapshotAt }),
        ...(easings === undefined ? {} : { easings }),
        ...(animationProperties === undefined ? {} : { properties: animationProperties }),
      },
      ...(backend === 'canvas'
        ? {
            canvas: {
              ...(typeof width === 'number' && Number.isFinite(width) && width >= 0 ? { width } : {}),
              ...(typeof height === 'number' && Number.isFinite(height) && height >= 0 ? { height } : {}),
            },
          }
        : {}),
    }),
    [handlers, animate, snapshotAt, easings, animationProperties, backend, width, height],
  );
  const devicePixelRatio = useMemo(() => resolveDevicePixelRatio(), []);
  const [seed] = useState(() =>
    Object.freeze({
      backend,
      scene,
      html: backend === 'svg' ? svgSeedInnerHtml(scene, props) : '',
      canvasBitmapWidth:
        backend === 'canvas' && typeof width === 'number' && Number.isFinite(width) ? width : scene.layout.width,
      canvasBitmapHeight:
        backend === 'canvas' && typeof height === 'number' && Number.isFinite(height) ? height : scene.layout.height,
    }),
  );
  const initial = seed.scene;

  useHostLayoutEffect(() => {
    sourceRef.current = source;
    configRef.current = config;
    animationRefTarget.current = animationRef;
    onDiagnosticRef.current = onDiagnostic;
    onArtifactsRef.current = onArtifacts;
  }, [source, config, animationRef, onDiagnostic, onArtifacts]);

  const publishCommitted = useCallback((active: ActiveRuntime, forceArtifacts: boolean): void => {
    const read = active.participant.read(active.session);
    const nextAnimationRef = animationRefTarget.current;
    if (previousAnimationRef.current !== nextAnimationRef) {
      assignRefSafely('animationRef', previousAnimationRef.current, null);
      previousAnimationRef.current = nextAnimationRef;
    }
    assignRefSafely('animationRef', nextAnimationRef, read.animation ?? null);
    const nextArtifacts = active.session.artifact(active.coreProgram).value.output.result.artifacts;
    if (forceArtifacts || nextArtifacts !== active.artifacts) {
      active.artifacts = nextArtifacts;
      const callback = onArtifactsRef.current;
      if (callback !== undefined) {
        try {
          callback(nextArtifacts);
        } catch (cause) {
          warnCallbackFailure('onArtifacts', cause);
        }
      }
    }
    deliverDiagnostics(active.session.diagnostics(), onDiagnosticRef.current);
  }, []);

  useHostLayoutEffect(() => {
    const host = hostRef.current;
    if (host === null) return undefined;
    const coreProgram = createCoreProgram(coreOptions);
    const owners = createRuntimeOwnerRegistry({ builtins: [CoreOwnerDefinition, RenderRuntimeOwnerDefinition] });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [coreProgram] });
    const factory = rendererFactory ?? builtinRetainedRendererFactory;
    const participant =
      backend === 'svg'
        ? createRetainedRenderParticipant({
            backend: 'svg',
            host: host as SVGSVGElement,
            rendererFactory: factory,
            immutableOptions: { backend: 'svg', idPrefix },
            coreProgram,
            mountMode: 'adopt',
          })
        : createRetainedRenderParticipant({
            backend: 'canvas',
            host: host as HTMLCanvasElement,
            rendererFactory: factory,
            immutableOptions: { backend: 'canvas', idPrefix, devicePixelRatio },
            coreProgram,
          });
    let session: RuntimeSession;
    try {
      session = createRuntimeSession({
        owners,
        programs,
        participants: [participant.participant],
        initialSnapshots: [
          createRuntimeOwnerInput(CoreOwnerDefinition, sourceRef.current),
          createRuntimeOwnerInput(RenderRuntimeOwnerDefinition, configRef.current),
        ],
      });
    } catch (cause) {
      if (cause instanceof RuntimeError) deliverDiagnostics(cause.diagnostics, onDiagnosticRef.current);
      throw cause;
    }
    const active: ActiveRuntime = {
      session,
      coreProgram,
      participant,
      source: sourceRef.current,
      config: configRef.current,
      artifacts: Object.freeze([]),
    };
    runtimeRef.current = active;
    publishCommitted(active, true);
    return () => {
      if (runtimeRef.current === active) runtimeRef.current = undefined;
      try {
        session.dispose();
      } finally {
        assignRefSafely('animationRef', previousAnimationRef.current, null);
        previousAnimationRef.current = undefined;
      }
    };
  }, [backend, coreOptions, rendererFactory, idPrefix, devicePixelRatio, publishCommitted]);

  useHostLayoutEffect(() => {
    const active = runtimeRef.current;
    if (active === undefined || (active.source === source && active.config === config)) return;
    try {
      active.session.update({
        baseRevision: active.session.revision(),
        owners: [
          createRuntimeOwnerUpdate(CoreOwnerDefinition, source),
          createRuntimeOwnerUpdate(RenderRuntimeOwnerDefinition, config),
        ],
      });
    } catch (cause) {
      deliverDiagnostics(active.session.diagnostics(), onDiagnosticRef.current);
      throw cause;
    }
    active.source = source;
    active.config = config;
    publishCommitted(active, false);
  }, [source, config, publishCommitted]);

  useHostLayoutEffect(() => {
    const previous = previousAnimationRef.current;
    if (previous === animationRef) return;
    assignRefSafely('animationRef', previous, null);
    previousAnimationRef.current = animationRef;
    const active = runtimeRef.current;
    if (active !== undefined) {
      assignRefSafely('animationRef', animationRef, active.participant.read(active.session).animation ?? null);
    }
  }, [animationRef]);

  if (backend === 'svg') {
    const viewBox = `${initial.layout.x} ${initial.layout.y} ${initial.layout.width} ${initial.layout.height}`;
    return (
      <svg
        ref={element => {
          hostRef.current = element;
        }}
        viewBox={viewBox}
        width={width}
        height={height}
        className={className}
        style={style}
        dangerouslySetInnerHTML={{ __html: seed.html }}
      />
    );
  }
  return (
    <canvas
      ref={element => {
        hostRef.current = element;
      }}
      width={Math.max(1, Math.round(seed.canvasBitmapWidth * devicePixelRatio))}
      height={Math.max(1, Math.round(seed.canvasBitmapHeight * devicePixelRatio))}
      className={className}
      style={{ width, height, objectFit: 'contain', ...style }}
    />
  );
};
