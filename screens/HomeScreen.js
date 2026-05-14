import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const { width } = Dimensions.get('window');

const COLORS = {
  dark: '#0A1628',
  card: '#0F1E35',
  teal: '#0B8F8F',
  mint: '#0DD6C8',
  text: '#FFFFFF',
  muted: '#7A9EAE',
  red: '#EF4444',
  green: '#22C55E',
  amber: '#F59E0B',
};

const API_BASE_URL = 'https://oncoconnect-backend.onrender.com'; 

export default function HomeScreen({ navigation }) {
  const [patientData, setPatientData] = useState(null);
  const [consultationStatus, setConsultationStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(null);

  // Load initial data
  useEffect(() => {
    loadHomeData();
  }, []);

  // Set up countdown timer - runs every second
  useEffect(() => {
    const interval = setInterval(() => {
      if (consultationStatus?.expires_at) {
        const expiresAt = new Date(consultationStatus.expires_at).getTime();
        const now = Date.now();
        const remaining = expiresAt - now;

        if (remaining > 0) {
          const hours = Math.floor(remaining / (1000 * 60 * 60));
          const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
          setTimeRemaining({ hours, minutes, seconds });
        } else {
          // Window has expired
          setConsultationStatus(null);
          setTimeRemaining(null);
          AsyncStorage.removeItem('consultation_window');
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [consultationStatus]); // Re-run when consultationStatus changes

  const loadHomeData = async () => {
    try {
      setLoading(true);
      const patientId = await AsyncStorage.getItem('patient_id');
      const patientName = await AsyncStorage.getItem('patient_name');
      const doctorName = await AsyncStorage.getItem('doctor_name');

      // In a real app, this would call your backend to get actual data
      // For now, we're using mock data
      setPatientData({
        id: patientId,
        name: patientName,
        doctor: doctorName,
        cancerType: 'Breast Cancer',
      });

      // Check if there's an active PAID consultation window
      const windowData = await AsyncStorage.getItem('consultation_window');
      if (windowData) {
        try {
          const window = JSON.parse(windowData);
          // Only show consultation if payment has been verified
          if (window.expires_at && window.payment_verified === true) {
            const expiresAt = new Date(window.expires_at).getTime();
            // Verify it hasn't expired
            if (expiresAt > Date.now()) {
              setConsultationStatus(window);
            } else {
              // Window expired, clear it
              await AsyncStorage.removeItem('consultation_window');
              await useAuthStore.getState().clearExpiredConsultation();
            }
          } else {
            // Payment not verified, don't show consultation
            console.warn('Consultation window found but payment not verified - ignoring');
            await AsyncStorage.removeItem('consultation_window');
          }
        } catch (e) {
          console.error('Error parsing window data:', e);
        }
      }
    } catch (err) {
      console.error('Error loading home data:', err);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleEmergencyAlert = async () => {
    Alert.alert(
      'Emergency Alert',
      'Send an emergency alert to your doctor?',
      [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Send Alert',
          onPress: async () => {
            try {
              // In production, this would call the backend to send an SMS alert
              Alert.alert('Alert Sent', 'Your doctor has been notified. They will contact you shortly.');
            } catch (err) {
              Alert.alert('Error', 'Failed to send alert');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleOpenConsultation = () => {
    navigation.navigate('PaymentGate');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.mint} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header with Patient Info */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome</Text>
          <Text style={styles.patientName}>{patientData?.name}</Text>
          <Text style={styles.doctorInfo}>👨‍⚕️ {patientData?.doctor}</Text>
        </View>
      </View>

      {/* Emergency Alert Button - Always Visible */}
      <TouchableOpacity
        style={styles.emergencyButton}
        onPress={handleEmergencyAlert}
      >
        <Text style={styles.emergencyIcon}>🚨</Text>
        <View style={styles.emergencyContent}>
          <Text style={styles.emergencyTitle}>Emergency Alert</Text>
          <Text style={styles.emergencySubtitle}>
            Tap here if you need immediate help from your doctor (FREE)
          </Text>
        </View>
      </TouchableOpacity>

      {/* Consultation Window Card */}
      <View style={styles.consultationCard}>
        {consultationStatus && timeRemaining ? (
          // Window is OPEN
          <View>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Consultation Window OPEN</Text>
            </View>

            {/* Countdown Timer */}
            <View style={styles.timerContainer}>
              <Text style={styles.timerLabel}>Time Remaining</Text>
              <View style={styles.timerDisplay}>
                <View style={styles.timerUnit}>
                  <Text style={styles.timerValue}>{String(timeRemaining.hours).padStart(2, '0')}</Text>
                  <Text style={styles.timerLabel}>Hours</Text>
                </View>
                <Text style={styles.timerSeparator}>:</Text>
                <View style={styles.timerUnit}>
                  <Text style={styles.timerValue}>{String(timeRemaining.minutes).padStart(2, '0')}</Text>
                  <Text style={styles.timerLabel}>Minutes</Text>
                </View>
                <Text style={styles.timerSeparator}>:</Text>
                <View style={styles.timerUnit}>
                  <Text style={styles.timerValue}>{String(timeRemaining.seconds).padStart(2, '0')}</Text>
                  <Text style={styles.timerLabel}>Seconds</Text>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={[styles.actionButton, styles.messagingButton]}
                onPress={() => navigation.navigate('Messaging')}
              >
                <Text style={styles.buttonIcon}>💬</Text>
                <Text style={styles.buttonLabel}>Send Message</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.extendButton]}
                onPress={() => navigation.navigate('PaymentGate', { type: 'extend' })}
              >
                <Text style={styles.buttonIcon}>⏱️</Text>
                <Text style={styles.buttonLabel}>Extend Window</Text>
                <Text style={styles.buttonPrice}>₦15,000</Text>
              </TouchableOpacity>
            </View>

            {/* Info */}
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                ✓ Your doctor will see your messages immediately
              </Text>
            </View>
          </View>
        ) : (
          // Window is CLOSED
          <View>
            <View style={styles.statusBadgeInactive}>
              <View style={styles.statusDotInactive} />
              <Text style={styles.statusTextInactive}>No Active Consultation</Text>
            </View>

            <Text style={styles.consultationDescription}>
              Open a consultation to send messages and updates to your doctor
            </Text>

            <View style={styles.priceCard}>
              <Text style={styles.price}>₦40,000</Text>
              <Text style={styles.priceDuration}>for 48-hour access</Text>
            </View>

            <TouchableOpacity
              style={styles.paymentButton}
              onPress={handleOpenConsultation}
            >
              <Text style={styles.paymentButtonText}>Open Consultation</Text>
              <Text style={styles.paymentButtonSubtext}>Secure Payment via Paystack</Text>
            </TouchableOpacity>

            <View style={styles.benefitsBox}>
              <Text style={styles.benefitsTitle}>What You Get:</Text>
              <Text style={styles.benefit}>✓ 48-hour messaging window with doctor</Text>
              <Text style={styles.benefit}>✓ Log symptoms & receive updates</Text>
              <Text style={styles.benefit}>✓ Ask questions anytime</Text>
              <Text style={styles.benefit}>✓ Request prescriptions & referrals</Text>
            </View>
          </View>
        )}
      </View>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>💊</Text>
          <Text style={styles.statValue}>3</Text>
          <Text style={styles.statLabel}>Medications</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>❤️</Text>
          <Text style={styles.statValue}>Good</Text>
          <Text style={styles.statLabel}>Adherence</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>📊</Text>
          <Text style={styles.statValue}>7d</Text>
          <Text style={styles.statLabel}>Log Trend</Text>
        </View>
      </View>

      {/* Recent Activity Placeholder */}
      <View style={styles.activityCard}>
        <Text style={styles.activityTitle}>Recent Activity</Text>
        <View style={styles.activityItem}>
          <Text style={styles.activityTime}>Today, 09:00 AM</Text>
          <Text style={styles.activityText}>Took morning medications</Text>
        </View>
        <View style={styles.activityItem}>
          <Text style={styles.activityTime}>Yesterday, 02:30 PM</Text>
          <Text style={styles.activityText}>Logged symptom check-in</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.dark,
    paddingTop: 20,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  greeting: {
    fontSize: 14,
    color: COLORS.muted,
    marginBottom: 4,
  },
  patientName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  doctorInfo: {
    fontSize: 14,
    color: COLORS.mint,
  },
  emergencyButton: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: COLORS.red,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  emergencyIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  emergencyContent: {
    flex: 1,
  },
  emergencyTitle: {
    color: COLORS.text,
    fontWeight: '600',
    fontSize: 13,
    marginBottom: 2,
  },
  emergencySubtitle: {
    color: COLORS.text,
    fontSize: 11,
    opacity: 0.9,
  },
  consultationCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.teal,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.green,
    marginRight: 8,
  },
  statusText: {
    color: COLORS.green,
    fontWeight: '600',
    fontSize: 13,
  },
  statusBadgeInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusDotInactive: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.muted,
    marginRight: 8,
  },
  statusTextInactive: {
    color: COLORS.muted,
    fontWeight: '600',
    fontSize: 13,
  },
  timerContainer: {
    backgroundColor: COLORS.dark,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  timerLabel: {
    color: COLORS.muted,
    fontSize: 12,
    marginBottom: 8,
  },
  timerDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  timerUnit: {
    alignItems: 'center',
  },
  timerValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.mint,
  },
  timerSeparator: {
    color: COLORS.mint,
    fontSize: 20,
    fontWeight: 'bold',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  messagingButton: {
    backgroundColor: COLORS.teal,
  },
  extendButton: {
    backgroundColor: COLORS.amber,
  },
  buttonIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  buttonLabel: {
    color: COLORS.dark,
    fontSize: 12,
    fontWeight: '600',
  },
  buttonPrice: {
    color: COLORS.dark,
    fontSize: 11,
    opacity: 0.8,
    marginTop: 2,
  },
  infoBox: {
    backgroundColor: COLORS.dark,
    borderRadius: 8,
    padding: 10,
  },
  infoText: {
    color: COLORS.mint,
    fontSize: 12,
  },
  consultationDescription: {
    color: COLORS.muted,
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  priceCard: {
    backgroundColor: COLORS.dark,
    borderRadius: 10,
    padding: 16,
    marginBottom: 14,
    alignItems: 'center',
  },
  price: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.mint,
    marginBottom: 4,
  },
  priceDuration: {
    color: COLORS.muted,
    fontSize: 12,
  },
  paymentButton: {
    backgroundColor: COLORS.mint,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 14,
  },
  paymentButtonText: {
    color: COLORS.dark,
    fontSize: 16,
    fontWeight: '600',
  },
  paymentButtonSubtext: {
    color: COLORS.dark,
    fontSize: 11,
    opacity: 0.7,
    marginTop: 2,
  },
  benefitsBox: {
    backgroundColor: COLORS.dark,
    borderRadius: 10,
    padding: 12,
  },
  benefitsTitle: {
    color: COLORS.mint,
    fontWeight: '600',
    fontSize: 12,
    marginBottom: 8,
  },
  benefit: {
    color: COLORS.muted,
    fontSize: 11,
    marginBottom: 6,
    lineHeight: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.teal,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.mint,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 4,
  },
  activityCard: {
    marginHorizontal: 20,
    marginBottom: 40,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.teal,
  },
  activityTitle: {
    color: COLORS.text,
    fontWeight: '600',
    fontSize: 13,
    marginBottom: 12,
  },
  activityItem: {
    borderTopWidth: 1,
    borderTopColor: COLORS.dark,
    paddingVertical: 10,
  },
  activityTime: {
    color: COLORS.muted,
    fontSize: 11,
    marginBottom: 3,
  },
  activityText: {
    color: COLORS.text,
    fontSize: 12,
  },
});