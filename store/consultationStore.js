import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useConsultationStore = create((set) => ({
  isOpen: false,
  expiresAt: null,
  isPaymentVerified: false,
  
  load: async () => {
    try {
      const window = await AsyncStorage.getItem('consultation_window');
      if (window) {
        const data = JSON.parse(window);
        const expiresAt = new Date(data.expires_at).getTime();
        // Only consider window open if payment is verified AND not expired
        const isPaymentVerified = data.payment_verified === true;
        const isOpen = isPaymentVerified && expiresAt > Date.now();
        set({
          isOpen,
          expiresAt: data.expires_at,
          isPaymentVerified,
        });
      }
    } catch (err) {
      console.error('Consultation load error:', err);
    }
  },
}));