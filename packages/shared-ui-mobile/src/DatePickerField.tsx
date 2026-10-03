import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform } from 'react-native';

import { cn } from './cn';
import { Icon } from './Icon';
import { Pressable, Text } from './tw';

export interface DatePickerFieldProps {
  /** Valor no formato YYYY-MM-DD */
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  disabled?: boolean;
  className?: string;
}

export function DatePickerField({
  value,
  onValueChange,
  placeholder = 'Selecione a data',
  minimumDate,
  maximumDate,
  disabled = false,
  className,
}: DatePickerFieldProps) {
  const [showPicker, setShowPicker] = useState(false);

  const dateObject = value ? new Date(`${value}T12:00:00`) : new Date();

  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (event.type === 'set' && selectedDate) {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      onValueChange(`${year}-${month}-${day}`);
    }
  };

  const formattedDisplay = value
    ? (() => {
        const [y, m, d] = value.split('-');
        return `${d}/${m}/${y}`;
      })()
    : null;

  return (
    <>
      <Pressable
        disabled={disabled}
        onPress={() => setShowPicker(true)}
        className={cn(
          'h-12 w-full flex-row items-center justify-between rounded-xl border border-border bg-surface px-3.5 active:opacity-80',
          disabled && 'opacity-50',
          className,
        )}
      >
        <Text
          className={cn(
            'font-body text-[15px]',
            formattedDisplay ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          {formattedDisplay ?? placeholder}
        </Text>
        <Icon name="calendar" size={18} color="#a6a6a6" />
      </Pressable>

      {showPicker ? (
        <DateTimePicker
          value={dateObject}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      ) : null}
    </>
  );
}
