import getCirclePath from './circle';
import getStealthPath from './stealth';
import type { ArrowAttributes, ArrowPathConfig } from './types';

export type { ArrowAttributes as ArrowPositionAttributes, ArrowPathConfig };

export type ArrowType = 'Stealth' | 'Circle';

const getArrowPath = (type: ArrowType, attributes: ArrowAttributes) => {
  switch (type) {
    case 'Stealth':
      return getStealthPath(attributes);
    case 'Circle':
      return getCirclePath(attributes);
  }
};

export default getArrowPath;
