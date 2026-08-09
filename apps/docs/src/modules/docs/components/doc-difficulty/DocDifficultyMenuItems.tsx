import type { FC } from 'react';

import { useTranslation } from 'react-i18next';

import { DropdownMenuRadioGroup, DropdownMenuRadioItem } from '@/components/ui/dropdown-menu';
import { DocDifficultyList, isDocDifficultyValue } from '@/modules/docs/data';
import { useDocDifficultyStore } from '@/modules/docs/store';

import { DocDifficultyVisuals } from './doc-difficulty-config';

/** 全站阅读难度的三档单选菜单。 */
export const DocDifficultyMenuItems: FC = () => {
  const { t } = useTranslation();
  const maximumDifficulty = useDocDifficultyStore(state => state.maximumDifficulty);
  const setMaximumDifficulty = useDocDifficultyStore(state => state.setMaximumDifficulty);

  return (
    <DropdownMenuRadioGroup
      value={maximumDifficulty}
      onValueChange={value => {
        if (isDocDifficultyValue(value)) setMaximumDifficulty(value);
      }}
    >
      {DocDifficultyList.map(difficulty => {
        const { Icon, iconClassName, label } = DocDifficultyVisuals[difficulty];
        return (
          <DropdownMenuRadioItem key={difficulty} value={difficulty}>
            <Icon aria-hidden className={`size-4 ${iconClassName}`} />
            {t(label)}
          </DropdownMenuRadioItem>
        );
      })}
    </DropdownMenuRadioGroup>
  );
};
