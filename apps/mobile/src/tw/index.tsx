import type React from 'react';
import {
  KeyboardAvoidingView as RNKeyboardAvoidingView,
  Pressable as RNPressable,
  ScrollView as RNScrollView,
  Text as RNText,
  TextInput as RNTextInput,
  View as RNView,
} from 'react-native';
import { useCssElement } from 'react-native-css';

export { Image, type ImageProps } from './image';

/**
 * O genérico de useCssElement produz uniões grandes demais para o TS em
 * componentes de props complexas (Pressable, ScrollView). Alias com
 * assinatura estreita, mesmo contrato de runtime.
 */
const useStyledElement = useCssElement as unknown as (
  component: unknown,
  props: object,
  mapping: Record<string, 'style' | 'contentContainerStyle'>,
) => React.ReactElement;

export type ViewProps = React.ComponentProps<typeof RNView> & {
  className?: string;
};

export const View = (props: ViewProps): React.ReactElement => {
  return useCssElement(RNView, props, { className: 'style' });
};
View.displayName = 'CSS(View)';

export type TextProps = React.ComponentProps<typeof RNText> & {
  className?: string;
};

export const Text = (props: TextProps): React.ReactElement => {
  return useCssElement(RNText, props, { className: 'style' });
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
};

export const TextInput = (props: TextInputProps): React.ReactElement => {
  return useCssElement(RNTextInput, props, { className: 'style' });
};
TextInput.displayName = 'CSS(TextInput)';

export type KeyboardAvoidingViewProps = React.ComponentProps<typeof RNKeyboardAvoidingView> & {
  className?: string;
};

export const KeyboardAvoidingView = (props: KeyboardAvoidingViewProps): React.ReactElement => {
  return useCssElement(RNKeyboardAvoidingView, props, { className: 'style' });
};
KeyboardAvoidingView.displayName = 'CSS(KeyboardAvoidingView)';
