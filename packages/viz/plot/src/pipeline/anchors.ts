import type { IRCoordinate } from '@retikz/core';
import { resolveFieldPath } from '@retikz/data';

import type { MarkInstance, AnchorIdGenerator, AnchorOwner, AnchorRegistry, MarkAnchorIdentity } from '../contract';
import { slug } from '../contract';
import { RetikzPlotError } from '../error';
import type { IRPlotAnchorId } from '../schemas';

const ownerText = (owner: AnchorOwner): string => {
  const id = owner.markId === undefined ? '' : ` id="${owner.markId}"`;
  const role = owner.role === undefined ? '' : ` ${owner.role}`;
  return `${owner.markType}${role} mark${id} at markIndex=${owner.markIndex}, rowIndex=${owner.kind === 'row' ? owner.transformedIndex : 'single'}`;
};

const renderTemplate = (
  template: string,
  instance: MarkInstance,
  owner: AnchorOwner,
  plotId: string | undefined,
): string =>
  template.replace(/\{(plotId|markId|markIndex|index|field:[^}]+)\}/g, (match, token: string) => {
    if (token === 'plotId') return plotId ?? '';
    if (token === 'markId') return owner.markId ?? '';
    if (token === 'markIndex') return String(owner.markIndex);
    if (token === 'index') {
      if (instance.kind === 'single') throw new RetikzPlotError('Anchor index template requires a row instance');
      return String(instance.transformedIndex);
    }
    if (instance.kind === 'single') throw new RetikzPlotError('Anchor field template requires a row instance');

    const field = token.slice('field:'.length);
    const value = resolveFieldPath(instance.row, field);
    if (value === undefined) {
      throw new RetikzPlotError(
        `lowerPlots: anchorId template references missing field "${field}" for ${ownerText(owner)}`,
      );
    }

    return slug(value);
  });

const defaultPrefix = (owner: AnchorOwner): string => owner.markId ?? `mark.${owner.markIndex}`;

/** 创建一次 plot lowering 使用的锚点注册表 */
export const createAnchorRegistry = (options: {
  plotId?: string;
  generators?: Record<string, AnchorIdGenerator>;
}): AnchorRegistry => {
  const registered = new Map<string, AnchorOwner>();

  const formatScopedId = (prefix: string, raw: unknown): string => {
    const scoped = `${prefix}.${slug(raw)}`;
    return options.plotId === undefined ? scoped : `${options.plotId}.${scoped}`;
  };

  const identify = (
    spec: IRPlotAnchorId,
    instance: MarkInstance,
    owner: AnchorOwner,
    field?: string,
  ): MarkAnchorIdentity => {
    const prefix = spec.prefix ?? defaultPrefix(owner);
    if (field !== undefined) {
      if (instance.kind === 'single') throw new RetikzPlotError('Anchor field requires a row instance');
      const raw = resolveFieldPath(instance.row, field);
      if (raw === undefined) {
        throw new RetikzPlotError(`lowerPlots: anchorId field "${field}" missing for ${ownerText(owner)}`);
      }

      return { id: formatScopedId(prefix, raw), key: raw };
    }

    if (spec.template !== undefined) {
      const rendered = renderTemplate(spec.template, instance, owner, options.plotId);
      if (rendered.length === 0) {
        throw new RetikzPlotError(`lowerPlots: anchorId template produced an empty id for ${ownerText(owner)}`);
      }

      return {
        id: rendered.includes('.') || options.plotId === undefined ? rendered : `${options.plotId}.${rendered}`,
        key: rendered,
      };
    }

    if (spec.generator !== undefined) {
      const generator = options.generators?.[spec.generator];
      if (generator === undefined) {
        throw new RetikzPlotError(
          `lowerPlots: anchorId generator "${spec.generator}" is not registered for ${ownerText(owner)}`,
        );
      }

      let generated: string;
      try {
        generated = generator(instance, {
          plotId: options.plotId,
          markId: owner.markId,
          markIndex: owner.markIndex,
          prefix,
          role: owner.role,
        });
      } catch (cause) {
        throw new RetikzPlotError(`Anchor generator "${spec.generator}" failed for ${ownerText(owner)}`, { cause });
      }
      if (generated.length === 0) {
        throw new RetikzPlotError(
          `lowerPlots: anchorId generator "${spec.generator}" produced an empty id for ${ownerText(owner)}`,
        );
      }

      return {
        id: generated.includes('.') || options.plotId === undefined ? generated : `${options.plotId}.${generated}`,
        key: generated,
      };
    }

    throw new RetikzPlotError(`lowerPlots: anchorId requires field, template, or generator for ${ownerText(owner)}`);
  };

  const register = (id: string, owner: AnchorOwner): void => {
    const prior = registered.get(id);
    if (prior !== undefined) {
      throw new RetikzPlotError(
        `lowerPlots: duplicate anchor id "${id}" from ${ownerText(owner)}; already registered by ${ownerText(prior)}`,
      );
    }

    registered.set(id, owner);
  };

  return {
    identify,
    register,
    coordinate: (id, position, owner): IRCoordinate => {
      register(id, owner);
      return { type: 'coordinate', id, position };
    },
  };
};
