'use client';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/ui/sidebar';
import useClientTrans from '@/hooks/useClientTrans';
import useLang from '@/hooks/useLang';
import useTheme from '@/hooks/useTheme';
import { Moon, Sun } from 'lucide-react';
import { FC } from 'react';
import { LuLanguages } from 'react-icons/lu';
import { RiEnglishInput } from 'react-icons/ri';

const FooterActions: FC = () => {
  const { t } = useClientTrans();
  const { theme, switchTheme } = useTheme();
  const { lng, switchLang } = useLang();
  const { open } = useSidebar();

  return (
    <div className="flex flex-wrap">
      <Button icon size="sm" variant="ghost" className="p-2" title={t('switchTheme')} onClick={() => switchTheme()}>
        {theme === 'light' ? <Sun className="text-blue-500" /> : <Moon className="text-blue-500" />}
        {open ? t('switchTheme') : null}
      </Button>
      <Button icon size="sm" variant="ghost" className="p-2" title={t('switchLang')} onClick={() => switchLang()}>
        {lng === 'zh' ? <LuLanguages className="text-blue-500" /> : <RiEnglishInput className="text-blue-500" />}
        {open ? t('switchLang') : null}
      </Button>
    </div>
  );
};

export default FooterActions;
