import { appJsonStorage, configureAppStorage } from '@agenda/core';
import AsyncStorage from '@react-native-async-storage/async-storage';

configureAppStorage(AsyncStorage);

/** Re-export para compat com imports existentes de `./storage`. */
export { appJsonStorage };
