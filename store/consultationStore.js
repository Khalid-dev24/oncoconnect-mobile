import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useConsultationStore = create((set) => ({
  isOpen: false,
  expiresAt: null,
  
  load: async () => {
    try {
      const window = await AsyncStorage.getItem('consultation_window');
      if (window) {
        const data = JSON.parse(window);
        const expiresAt = new Date(data.expires_at).getTime();
        set({
          isOpen: expiresAt > Date.now(),
          expiresAt: data.expires_at,
        });
      }
    } catch (err) {
      console.error('Consultation load error:', err);
    }
  },
}));