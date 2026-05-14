import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useAuthStore = create((set) => ({
  isAuthenticated: false,
  isLoading: true,
  patientId: null,
  hasActivePaidConsultation: false,
  
  init: async () => {
    try {
      const auth = await AsyncStorage.getItem('is_authenticated');
      const id = await AsyncStorage.getItem('patient_id');
      
      // Check if patient has active paid consultation
      const windowData = await AsyncStorage.getItem('consultation_window');
      let hasActivePaidConsultation = false;
      
      if (windowData) {
        try {
          const window = JSON.parse(windowData);
          // Verify the window has a valid payment status and hasn't expired
          const expiresAt = new Date(window.expires_at).getTime();
          hasActivePaidConsultation = window.payment_verified === true && expiresAt > Date.now();
        } catch (e) {
          console.error('Error parsing window data:', e);
        }
      }
      
      set({
        isAuthenticated: auth === 'true',
        patientId: id,
        hasActivePaidConsultation,
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
        hasActivePaidConsultation: false, // New patients don't have paid consultations
      });
      return true;
    } catch (err) {
      console.error('Error setting authenticated state:', err);
      return false;
    }
  },

  // Update consultation status after successful payment
  setConsultationPaid: async (consultationData) => {
    try {
      // Store with payment_verified flag
      await AsyncStorage.setItem(
        'consultation_window',
        JSON.stringify({
          ...consultationData,
          payment_verified: true,
        })
      );
      set({ hasActivePaidConsultation: true });
      return true;
    } catch (err) {
      console.error('Error setting consultation paid:', err);
      return false;
    }
  },

  // Clear consultation when window expires
  clearExpiredConsultation: async () => {
    try {
      await AsyncStorage.removeItem('consultation_window');
      set({ hasActivePaidConsultation: false });
    } catch (err) {
      console.error('Error clearing consultation:', err);
    }
  },
  
  logout: async () => {
    try {
      await AsyncStorage.removeItem('is_authenticated');
      await AsyncStorage.removeItem('patient_id');
      await AsyncStorage.removeItem('consultation_window');
      set({ 
        isAuthenticated: false, 
        patientId: null,
        hasActivePaidConsultation: false,
      });
    } catch (err) {
      console.error('Logout error:', err);
    }
  },
}));