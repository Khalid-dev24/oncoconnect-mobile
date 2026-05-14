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

export default function InviteCodeScreen({ navigation, route }) {
  const { phoneNumber } = route.params;
  const [inviteCode, setInviteCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [cancerType, setCancerType] = useState('');
  const [cancerStage, setCancerStage] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuthenticated } = useAuthStore();

  const handleRegister = async () => {
    // Validate inputs
    if (!inviteCode || inviteCode.length < 5) {
      Alert.alert('Invalid Code', 'Please enter a valid invite code (e.g., SAL-442)');
      return;
    }
    if (!fullName) {
      Alert.alert('Name Required', 'Please enter your full name');
      return;
    }
    if (!cancerType) {
      Alert.alert('Cancer Type Required', 'Please select your cancer type');
      return;
    }
    if (!cancerStage) {
      Alert.alert('Stage Required', 'Please select your cancer stage');
      return;
    }

    setLoading(true);
    try {
      // Try snake_case first (most common in Node.js/Python backends)
      const payload = {
        phone_number: phoneNumber,
        full_name: fullName,
        invite_code: inviteCode.toUpperCase().trim(),
        cancer_type: cancerType,
        cancer_stage: cancerStage,
      };

      console.log('Sending registration request with payload:', JSON.stringify(payload, null, 2));

      // Call backend to register patient with invite code
      let response;
      try {
        response = await axiosInstance.post(
          '/api/patients/register-with-code',
          payload
        );
      } catch (err) {
        // If snake_case fails with 400, try camelCase
        if (err.response?.status === 400 && err.response?.data?.message?.includes('invite')) {
          console.log('Trying camelCase fields...');
          const camelCasePayload = {
            phoneNumber: phoneNumber,
            fullName: fullName,
            inviteCode: inviteCode.toUpperCase().trim(),
            cancerType: cancerType,
            cancerStage: cancerStage,
          };
          console.log('Retrying with camelCase payload:', JSON.stringify(camelCasePayload, null, 2));
          response = await axiosInstance.post(
            '/api/patients/register-with-code',
            camelCasePayload
          );
        } else {
          throw err;
        }
      }

      console.log('Registration response:', JSON.stringify(response.data, null, 2));

      if (response.status === 201 || response.status === 200) {
        // Save patient data locally using auth store
        const patientId = response.data.patient.id;
        const token = response.data.token;
        
        // Store the auth token for future API requests
        if (token) {
          await AsyncStorage.setItem('auth_token', token);
          console.log('✓ Auth token saved successfully');
        } else {
          console.warn('⚠️ No token in registration response - payments may fail');
        }
        
        // This updates both AsyncStorage and the Zustand store
        await setAuthenticated(patientId);
        
        // Also save additional patient info
        await AsyncStorage.setItem('patient_name', response.data.patient.name || fullName);
        await AsyncStorage.setItem('cancer_type', cancerType);
        await AsyncStorage.setItem('cancer_stage', cancerStage);

        Alert.alert('Success', 'You have been registered successfully!', [
          {
            text: 'Continue',
            onPress: () => {
              // Auth store update will trigger app re-render automatically
            },
          },
        ]);
      }
    } catch (err) {
      console.error('Registration error details:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
        code: err.code,
      });

      let errorMessage = 'An error occurred during registration';
      
      if (err.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout. Please check your internet connection and try again.';
      } else if (err.response?.status === 400) {
        // Show backend's specific error message if available
        errorMessage = err.response.data?.message || err.response.data?.error || 'The invite code you entered is not valid. Please check and try again.';
        console.log('Backend validation error:', err.response.data);
      } else if (err.response?.status === 409) {
        errorMessage = 'This phone number is already registered.';
      } else if (err.response?.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (err.message === 'Network Error') {
        errorMessage = 'Network error. Please check your internet connection.';
      }
      
      Alert.alert('Registration Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const CancerTypeOption = ({ label, value, isSelected }) => (
    <TouchableOpacity
      style={[
        styles.optionButton,
        isSelected && styles.optionButtonSelected,
      ]}
      onPress={() => setCancerType(value)}
    >
      <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const StageOption = ({ label, value, isSelected }) => (
    <TouchableOpacity
      style={[
        styles.stageButton,
        isSelected && styles.stageButtonSelected,
      ]}
      onPress={() => setCancerStage(value)}
    >
      <Text style={[styles.stageText, isSelected && styles.stageTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Complete Your Profile</Text>
          <Text style={styles.subtitle}>
            Your doctor sent you an invite code. Enter it below.
          </Text>
        </View>

        {/* Invite Code Input */}
        <View style={styles.section}>
          <Text style={styles.label}>Doctor's Invite Code</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., SAL-442"
            placeholderTextColor={COLORS.muted}
            value={inviteCode}
            onChangeText={(text) => setInviteCode(text.toUpperCase())}
            editable={!loading}
            maxLength={7}
            autoCapitalize="characters"
          />
          <Text style={styles.hint}>
            You should have received this code from your oncologist
          </Text>
        </View>

        {/* Full Name Input */}
        <View style={styles.section}>
          <Text style={styles.label}>Your Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Zainab Ahmed"
            placeholderTextColor={COLORS.muted}
            value={fullName}
            onChangeText={setFullName}
            editable={!loading}
          />
        </View>

        {/* Cancer Type Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Cancer Type</Text>
          <View style={styles.optionGrid}>
            <CancerTypeOption
              label="Breast"
              value="Breast Cancer"
              isSelected={cancerType === 'Breast Cancer'}
            />
            <CancerTypeOption
              label="Lung"
              value="Lung Cancer"
              isSelected={cancerType === 'Lung Cancer'}
            />
            <CancerTypeOption
              label="Colorectal"
              value="Colorectal Cancer"
              isSelected={cancerType === 'Colorectal Cancer'}
            />
            <CancerTypeOption
              label="Other"
              value="Other"
              isSelected={cancerType === 'Other'}
            />
          </View>
        </View>

        {/* Cancer Stage Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Cancer Stage</Text>
          <View style={styles.stageGrid}>
            <StageOption
              label="Stage I"
              value="I"
              isSelected={cancerStage === 'I'}
            />
            <StageOption
              label="Stage II"
              value="II"
              isSelected={cancerStage === 'II'}
            />
            <StageOption
              label="Stage III"
              value="III"
              isSelected={cancerStage === 'III'}
            />
            <StageOption
              label="Stage IV"
              value="IV"
              isSelected={cancerStage === 'IV'}
            />
          </View>
        </View>

        {/* Register Button */}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.dark} />
          ) : (
            <Text style={styles.buttonText}>Complete Registration</Text>
          )}
        </TouchableOpacity>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>📋 Your Information</Text>
          <Text style={styles.infoText}>
            • Phone: {phoneNumber}
            {'\n'}• This information helps your doctor track your care journey
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
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.muted,
    lineHeight: 20,
  },
  section: {
    marginBottom: 30,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.mint,
    marginBottom: 10,
  },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.teal,
    fontSize: 16,
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    color: COLORS.muted,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionButton: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: COLORS.card,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.teal,
  },
  optionButtonSelected: {
    backgroundColor: COLORS.teal,
    borderColor: COLORS.mint,
  },
  optionText: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: '500',
  },
  optionTextSelected: {
    color: COLORS.dark,
  },
  stageGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  stageButton: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.teal,
  },
  stageButtonSelected: {
    backgroundColor: COLORS.mint,
    borderColor: COLORS.mint,
  },
  stageText: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: '500',
  },
  stageTextSelected: {
    color: COLORS.dark,
  },
  button: {
    backgroundColor: COLORS.mint,
    borderRadius: 12,
    paddingVertical: 14,
    marginVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
  infoBox: {
    backgroundColor: COLORS.card,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.mint,
    borderRadius: 8,
    padding: 16,
    marginTop: 20,
  },
  infoTitle: {
    color: COLORS.mint,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
  },
});