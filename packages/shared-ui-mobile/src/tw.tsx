import { Image as ExpoImage } from 'expo-image';
import type React from 'react';
import {
  KeyboardAvoidingView as RNKeyboardAvoidingView,
  Modal as RNModal,
  Pressable as RNPressable,
  ScrollView as RNScrollView,
  Text as RNText,
  TextInput as RNTextInput,
  View as RNView,
} from 'react-native';
import { useCssElement } from 'react-native-css';

const useCssElementLoose = useCssElement as unknown as (
  component: unknown,
  props: object,
  mapping: Record<string, 'style' | 'contentContainerStyle'>,
) => React.ReactElement;

/**
 * NOTE: react-native-css descarta os estilos da className quando a prop de
 * destino chega como chave presente com valor `undefined` (ex.: `style={style}`
 * repassado por Button/Screen) — a tela inteira fica sem cor nem layout.
 * Removemos essas chaves antes de delegar.
 */
function withoutUndefinedTargets(props: object): object {
  const record = props as Record<string, unknown>;
  if (record.style !== undefined && record.contentContainerStyle !== undefined) {
    return props;
  }
  const { style, contentContainerStyle, ...rest } = record;
  return {
    ...rest,
    ...(style === undefined ? {} : { style }),
    ...(contentContainerStyle === undefined ? {} : { contentContainerStyle }),
  };
}

const useStyledElement = (
  component: unknown,
  props: object,
  mapping: Record<string, 'style' | 'contentContainerStyle'>,
): React.ReactElement => useCssElementLoose(component, withoutUndefinedTargets(props), mapping);

export type ViewProps = React.ComponentProps<typeof RNView> & {
  className?: string;
};

export const View = (props: ViewProps): React.ReactElement => {
  return useStyledElement(RNView, props, { className: 'style' });
};
View.displayName = 'CSS(View)';

export type TextProps = React.ComponentProps<typeof RNText> & {
  className?: string;
};

export const Text = (props: TextProps): React.ReactElement => {
  return useStyledElement(RNText, props, { className: 'style' });
};
Text.displayName = 'CSS(Text)';

export type PressableProps = React.ComponentProps<typeof RNPressable> & {
  className?: string;
};

export const Pressable = (props: PressableProps): React.ReactElement => {
  return useStyledElement(RNPressable, props, { className: 'style' });
};
Pressable.displayName = 'CSS(Pressable)';

export type ScrollViewProps = React.ComponentProps<typeof RNScrollView> & {
  className?: string;
  contentContainerClassName?: string;
};

export const ScrollView = (props: ScrollViewProps): React.ReactElement => {
  return useStyledElement(RNScrollView, props, {
    className: 'style',
    contentContainerClassName: 'contentContainerStyle',
  });
};
ScrollView.displayName = 'CSS(ScrollView)';

export type TextInputProps = React.ComponentProps<typeof RNTextInput> & {
  className?: string;
  ref?: React.Ref<RNTextInput>;
};

export const TextInput = (props: TextInputProps): React.ReactElement => {
  return useStyledElement(RNTextInput, props, { className: 'style' });
};
TextInput.displayName = 'CSS(TextInput)';

export type KeyboardAvoidingViewProps = React.ComponentProps<typeof RNKeyboardAvoidingView> & {
  className?: string;
};

export const KeyboardAvoidingView = (props: KeyboardAvoidingViewProps): React.ReactElement => {
  return useStyledElement(RNKeyboardAvoidingView, props, { className: 'style' });
};
KeyboardAvoidingView.displayName = 'CSS(KeyboardAvoidingView)';

export type ImageProps = React.ComponentProps<typeof ExpoImage> & {
  className?: string;
};

export const Image = (props: ImageProps): React.ReactElement => {
  return useStyledElement(ExpoImage, props, { className: 'style' });
};
Image.displayName = 'CSS(Image)';

export type ModalProps = React.ComponentProps<typeof RNModal>;
export const Modal = RNModal;
