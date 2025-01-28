import type { StorageProvider } from '@filo/interfaces';
import { STORAGE_PROVIDER_DETAILS } from '@filo/libs/constants';
import { cn } from '@filo/ui/lib/utils';
import Image from 'next/image';

interface ProviderDisplayProps {
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
  isActive?: boolean;
}

export const ProviderDisplay = ({
  provider,
  image,
  classNames,
  isActive
}: ProviderDisplayProps) => {
  const providerDetails = STORAGE_PROVIDER_DETAILS[provider];
  return (
    <div
      className={cn('group flex w-max items-center gap-3', classNames?.root)}
      data-active={isActive}
    >
      <Image
        src={`/${provider}.svg`}
        alt={providerDetails.name}
        width={image?.width || 30}
        height={image?.height || 30}
        className={classNames?.image || 'size-[30px]'}
        objectFit={image?.objectFit || 'fill'}
      />
      <p
        className={cn(
          'group-data-[active=true]:hidden group-data-[active=true]:sm:block',
          classNames?.name
        )}
      >
        {providerDetails.name}
      </p>
    </div>
  );
};
