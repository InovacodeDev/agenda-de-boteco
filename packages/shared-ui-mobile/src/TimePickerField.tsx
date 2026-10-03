import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform } from 'react-native';

import { cn } from './cn';
import { Icon } from './Icon';
import { Pressable, Text } from './tw';

export interface TimePickerFieldProps {
  /** Valor no formato HH:MM */
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function TimePickerField({
  value,
  onValueChange,
  placeholder = '00:00',
  disabled = false,
  className,
}: TimePickerFieldProps) {
  const [showPicker, setShowPicker] = useState(false);

  const timeObject = (() => {
    const d = new Date();
    if (value) {
      const [h, m] = value.split(':').map(Number);
      d.setHours(h ?? 0, m ?? 0, 0, 0);
    }
    return d;
  })();

  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (event.type === 'set' && selectedDate) {
      const hours = String(selectedDate.getHours()).padStart(2, '0');
      const minutes = String(selectedDate.getMinutes()).padStart(2, '0');
      onValueChange(`${hours}:${minutes}`);
    }
  };

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
            value ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          {value || placeholder}
        </Text>
        <Icon name="clock" size={18} color="#a6a6a6" />
      </Pressable>

      {showPicker ? (
        <DateTimePicker
          value={timeObject}
          mode="time"
          is24Hour
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleChange}
        />
      ) : null}
    </>
  );
}
