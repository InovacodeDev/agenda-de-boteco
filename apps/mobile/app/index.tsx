import { FlashList } from '@shopify/flash-list';

import { Text, View } from '../src/tw';

const DATA = [
  { id: '1', title: 'Bar do Zé' },
  { id: '2', title: 'Boteco do João' },
  { id: '3', title: 'Cervejaria da Esquina' },
];

export default function Home() {
  return (
    <View className="flex-1 bg-white p-5">
      <Text className="mb-5 text-center text-2xl font-bold">
        Bem-vindo à Agenda de Boteco!
      </Text>
      <View className="w-full flex-1">
        <FlashList
          data={DATA}
          renderItem={({ item }) => (
            <View className="border-b border-gray-200 p-4">
              <Text className="text-base">{item.title}</Text>
            </View>
          )}
        />
      </View>
    </View>
  );
}
