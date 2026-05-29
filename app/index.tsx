import { StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';

const DATA = [
  { id: '1', title: 'Bar do Zé' },
  { id: '2', title: 'Boteco do João' },
  { id: '3', title: 'Cervejaria da Esquina' },
];

export default function Home() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bem-vindo à Agenda de Boteco!</Text>
      <View style={styles.listContainer}>
        <FlashList
          data={DATA}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <Text style={styles.itemText}>{item.title}</Text>
            </View>
          )}
          estimatedItemSize={50}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  listContainer: {
    flex: 1,
    width: '100%',
  },
  item: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemText: {
    fontSize: 16,
  },
});
