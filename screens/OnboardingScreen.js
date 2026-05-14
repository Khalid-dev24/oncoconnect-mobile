import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance from '../api/axiosConfig';
import { useAuthStore } from '../store/authStore';

const COLORS = {
  dark: '#0A1628',
  card: '#0F1E35',
  teal: '#0B8F8F',
  mint: '#0DD6C8',
  text: '#FFFFFF',
  muted: '#7A9EAE',
  red: '#EF4444',
  green: '#22C55E',
}; 

export default function OnboardingScreen({ navigation }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('phone'); // 'phone' or 'otp'
  const [loading, setLoading] = useState(false);
  const { setAuthenticated } = useAuthStore();

  // Step 1: Request OTP via SMS
  const handlePhoneSubmit = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      Alert.alert('Invalid Phone', 'Please enter a valid Nigerian phone number');
      return;
    }

    setLoading(true);
    try {
      // For MVP, we're using a simplified flow
      // In production, this would send OTP via Termii SMS
      // For now, we'll generate a test OTP
      const testOTP = '123456'; // In production, backend generates and sends this
      
      // Store phone for next step
      await AsyncStorage.setItem('temp_phone', phoneNumber);
      
      Alert.alert('OTP Sent', `Test OTP: ${testOTP}\n\n(In production, this would be sent via SMS)`);
      setStep('otp');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP and check if user exists
  const handleOTPSubmit = async () => {
    if (!otp || otp.length < 6) {
      Alert.alert('Invalid OTP', 'Please enter a 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const phone = await AsyncStorage.getItem('temp_phone');
      
      // Check if user already exists
      console.log('Checking if user exists with phone:', phone);
      
      try {
        const response = await axiosInstance.post(
          '/api/patients/login',
          { phone_number: phone }
        );

        console.log('Login response:', JSON.stringify(response.data, null, 2));

        // User exists - log them in
        if (response.data.patient && response.data.token) {
          await AsyncStorage.setItem('auth_token', response.data.token);
          await AsyncStorage.setItem('patient_id', response.data.patient.id);
          await AsyncStorage.setItem('patient_name', response.data.patient.name);
          await setAuthenticated(response.data.patient.id);

          Alert.alert('Welcome Back! 👋', `Logged in as ${response.data.patient.name}`);
          // Auth store update will auto-redirect to home
        } else {
          throw new Error('Invalid login response');
        }
      } catch (loginErr) {
        // User doesn't exist or error - check if 404
        if (loginErr.response?.status === 404) {
          console.log('User not found - this is a new user, proceeding to registration');
          
          // New user - proceed to invite code screen
          await AsyncStorage.setItem('patient_phone', phone);
          await AsyncStorage.setItem('is_authenticated', 'false');
          
          navigation.navigate('InviteCode', { phoneNumber: phone });
        } else {
          throw loginErr;
        }
      }
    } catch (err) {
      console.error('OTP verification error:', err);
      Alert.alert('Error', err.message || 'Failed to verify OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>❤️</Text>
          <Text style={styles.title}>OncoConnect</Text>
          <Text style={styles.subtitle}>Your Oncology Care Companion</Text>
        </View>

        {/* Phone Number Step */}
        {step === 'phone' && (
          <View style={styles.formContainer}>
            <Text style={styles.stepTitle}>Enter Your Phone Number</Text>
            <Text style={styles.stepDescription}>
              We'll send you an OTP to verify your phone
            </Text>

            <TextInput
              style={styles.input}
              placeholder="08012345678"
              placeholderTextColor={COLORS.muted}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              editable={!loading}
              keyboardType="phone-pad"
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handlePhoneSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.dark} />
              ) : (
                <Text style={styles.buttonText}>Send OTP</Text>
              )}
            </TouchableOpacity>

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                🔒 Your phone number is secure. We use it only to verify your identity.
              </Text>
            </View>
          </View>
        )}

        {/* OTP Verification Step */}
        {step === 'otp' && (
          <View style={styles.formContainer}>
            <Text style={styles.stepTitle}>Enter Your OTP</Text>
            <Text style={styles.stepDescription}>
              We sent a code to your phone. Enter it below.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="000000"
              placeholderTextColor={COLORS.muted}
              value={otp}
              onChangeText={setOtp}
              editable={!loading}
              keyboardType="number-pad"
              maxLength={6}
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleOTPSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.dark} />
              ) : (
                <Text style={styles.buttonText}>Verify OTP</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setStep('phone')}>
              <Text style={styles.backLink}>← Back to phone number</Text>
            </TouchableOpacity>

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                Didn't receive the code? Check your SMS. If you don't see it, tap "Back" to try again.
              </Text>
            </View>
          </View>
        )}

        {/* Footer Info */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.dark,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 40,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logo: {
    fontSize: 60,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.muted,
    marginBottom: 20,
  },
  formContainer: {
    marginBottom: 40,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 10,
  },
  stepDescription: {
    fontSize: 14,
    color: COLORS.muted,
    marginBottom: 30,
    lineHeight: 20,
  },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: COLORS.text,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.teal,
    fontSize: 16,
  },
  button: {
    backgroundColor: COLORS.mint,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    minHeight: 50,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: COLORS.dark,
    fontSize: 16,
    fontWeight: '600',
  },
  backLink: {
    color: COLORS.mint,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  infoBox: {
    backgroundColor: COLORS.card,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.teal,
    borderRadius: 8,
    padding: 16,
  },
  infoText: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.card,
  },
  footerText: {
    color: COLORS.muted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});