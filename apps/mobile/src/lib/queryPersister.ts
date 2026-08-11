import { createQueryPersister } from '@agenda/core';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const persister = createQueryPersister(AsyncStorage);
