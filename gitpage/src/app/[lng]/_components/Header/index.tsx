'use client';

import { Button } from '@/components/ui/button';
import { Typography } from '@/components/ui/typography';
import useThemeStore from '@/hooks/store/useThemeStore';
import useClientTranslation from '@/hooks/useClientTranslation';
import useLang from '@/hooks/useLang';
import { Moon, Star, Sun } from 'lucide-react';
import { FC } from 'react';
import { BsGithub } from 'react-icons/bs';
import { LuLanguages } from 'react-icons/lu';
import { RiEnglishInput } from 'react-icons/ri';
import ContactDialog from './ContactDialog';
import Link from 'next/link';

const Header: FC = () => {
  const { t } = useClientTranslation();
  const { theme, switchTheme } = useThemeStore();
  const { lng, switchLang } = useLang();

  return (
    <header className="flex justify-between items-center w-full bg-secondary p-4">
      <Typography className="font-semibold">{t('docTitle')}</Typography>
      <div className="flex gap-2 items-center">
        <Button icon size="sm" variant="ghost" title={t('switchTheme')} onClick={() => switchTheme()}>
          {theme === 'light' ? <Sun className="text-blue-500" /> : <Moon className="text-blue-500" />}
        </Button>
        <Button icon size="sm" variant="ghost" title={t('switchLang')} onClick={() => switchLang()}>
          {lng === 'zh' ? <LuLanguages className="text-blue-500" /> : <RiEnglishInput className="text-blue-500" />}
        </Button>
        <Button
          icon
          size="sm"
          variant="ghost"
          title={t('starRetikZ')}
          onClick={() => window.open('https://github.com/Pionpill/retikz', '_blank')}
        >
          <Star className="text-primary text-purple-500" />
        </Button>
        {lng === 'zh' ? (
          <ContactDialog />
        ) : (
          <Button
            variant="ghost"
            icon
            size="sm"
            title={t('contactMe')}
            onClick={() => window.open('https://github.com/Pionpill', '_blank')}
          >
            <BsGithub className="text-purple-500" />
          </Button>
        )}
      </div>
    </header>
  );
};

export default Header;
