import getStealthPath from './stealth';
import { ArrowAttributes, ArrowPathConfig } from './types';

export type { ArrowAttributes as ArrowPositionAttributes, ArrowPathConfig };

export type ArrowType = 'Stealth';

const getArrowPath = (type: ArrowType, attributes: ArrowAttributes) => {
  switch (type) {
    case 'Stealth':
      return getStealthPath(attributes);
  }
};

export default getArrowPath;
