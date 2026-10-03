import { Image as ExpoImage } from 'expo-image';
import type React from 'react';

import { useStyledElement } from './useStyledElement';

export type ImageProps = React.ComponentProps<typeof ExpoImage> & {
  className?: string;
};

export const Image = (props: ImageProps): React.ReactElement => {
  return useStyledElement(ExpoImage, props, { className: 'style' });
};
Image.displayName = 'CSS(Image)';
