import type { StorageProvider } from '@filo/interfaces';
import { STORAGE_PROVIDER_DETAILS } from '@filo/libs/constants';
import { cn } from '@filo/ui/lib/utils';
import Image from 'next/image';

interface ProviderButtonProps {
  provider: StorageProvider;
  image?: {
    width?: number;
    height?: number;
    objectFit?: 'fill' | 'contain' | 'cover' | 'none' | 'scale-down';
  };
  classNames?: {
    root?: string;
    image?: string;
    name?: string;
  };
}

export const ProviderButton = ({ provider, image, classNames }: ProviderButtonProps) => {
  const providerDetails = STORAGE_PROVIDER_DETAILS[provider];
  return (
    <div className={cn('flex items-center gap-3', classNames?.root)}>
      <Image
        src={`/${provider}.svg`}
        alt={providerDetails.name}
        width={image?.width || 30}
        height={image?.height || 30}
        className={classNames?.image || 'size-[30px]'}
        objectFit={image?.objectFit || 'fill'}
      />
      <p className={classNames?.name}>{providerDetails.name}</p>
    </div>
  );
};
