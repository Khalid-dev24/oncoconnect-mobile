import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useAuthStore = create((set) => ({
  isAuthenticated: false,
  isLoading: true,
  patientId: null,
  
  init: async () => {
    try {
      const auth = await AsyncStorage.getItem('is_authenticated');
      const id = await AsyncStorage.getItem('patient_id');
      set({
        isAuthenticated: auth === 'true',
        patientId: id,
        isLoading: false,
      });
    } catch (err) {
      console.error('Auth init error:', err);
      set({ isLoading: false });
    }
  },

  // Method to set authenticated state after registration
  setAuthenticated: async (patientId) => {
    try {
      await AsyncStorage.setItem('is_authenticated', 'true');
      await AsyncStorage.setItem('patient_id', patientId.toString());
      set({
        isAuthenticated: true,
        patientId: patientId,
      });
      return true;
    } catch (err) {
      console.error('Error setting authenticated state:', err);
      return false;
    }
  },
  
  logout: async () => {
    try {
      await AsyncStorage.removeItem('is_authenticated');
      await AsyncStorage.removeItem('patient_id');
      set({ isAuthenticated: false, patientId: null });
    } catch (err) {
      console.error('Logout error:', err);
    }
  },
}));