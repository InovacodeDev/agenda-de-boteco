import { appJsonStorage, configureAppStorage } from '@agenda/core';
import AsyncStorage from '@react-native-async-storage/async-storage';

configureAppStorage(AsyncStorage);

export { appJsonStorage };
