import type React from 'react';
import {
  KeyboardAvoidingView as RNKeyboardAvoidingView,
  Pressable as RNPressable,
  ScrollView as RNScrollView,
  Text as RNText,
  TextInput as RNTextInput,
  View as RNView,
} from 'react-native';

import { useStyledElement } from './useStyledElement';

export { Image, type ImageProps } from './image';

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
