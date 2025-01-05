import getStealthPath from './stealth';
import { ArrowPositionAttributes, ArrowPathConfig } from './types';

export type { ArrowPositionAttributes, ArrowPathConfig };

export type ArrowType = 'Stealth';

const getArrowPath = (type: ArrowType, attributes: ArrowPositionAttributes) => {
  switch (type) {
    case 'Stealth':
      return getStealthPath(attributes);
  }
};

export default getArrowPath;
