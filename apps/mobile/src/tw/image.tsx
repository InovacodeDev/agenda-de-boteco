import { Image as ExpoImage } from 'expo-image';
import type React from 'react';
import { useCssElement } from 'react-native-css';

export type ImageProps = React.ComponentProps<typeof ExpoImage> & {
  className?: string;
};

export const Image = (props: ImageProps): React.ReactElement => {
  return useCssElement(ExpoImage, props, { className: 'style' });
};
Image.displayName = 'CSS(Image)';
