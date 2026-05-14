import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance from '../api/axiosConfig';

const { width, height } = Dimensions.get('window');

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

const PAYSTACK_PUBLIC_KEY = 'pk_test_your_paystack_public_key'; // Replace with your key

export default function PaymentGateScreen({ navigation, route }) {
  const [paymentMethod, setPaymentMethod] = useState('paystack');
  const [loading, setLoading] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [amount] = useState(40000); // ₦40,000
  const [paymentId, setPaymentId] = useState(null);

  const paymentType = route.params?.type === 'extend' ? 'window_extension' : 'consultation_open';
  const displayAmount = paymentType === 'window_extension' ? 15000 : 40000;

  // Initialize payment on backend
  const initializePayment = async () => {
    try {
      setLoading(true);
      const patientId = await AsyncStorage.getItem('patient_id');
      const authToken = await AsyncStorage.getItem('auth_token');

      if (!patientId) {
        Alert.alert('Error', 'Patient ID not found. Please log in again.');
        return;
      }

      console.log('Payment init - Patient ID:', patientId);
      console.log('Payment init - Auth token exists:', !!authToken);
      if (!authToken) {
        console.warn('⚠️ WARNING: No auth token found! The backend will reject this request.');
      }

      const response = await axiosInstance.post(
        '/api/consultations/open-window',
        {
          patient_id: patientId,
          amount_naira: displayAmount,
        }
      );

      console.log('Open window response:', JSON.stringify(response.data, null, 2));

      // Handle different possible response structures
      const paymentId = response.data.payment_id || response.data.id || response.data.window_id;
      
      if (!paymentId) {
        console.warn('No payment_id in response. Using response data:', response.data);
        Alert.alert('Error', 'Failed to get payment ID from server. Please try again.');
        return;
      }

      setPaymentId(paymentId);
      setPaymentModalVisible(true);
    } catch (err) {
      console.error('Payment initialization error:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
        code: err.code,
      });

      let errorMessage = 'Failed to initialize payment. Please try again.';
      
      if (err.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout. Please check your internet connection.';
      } else if (err.response?.status === 401) {
        errorMessage = 'Authentication failed. Make sure you are logged in. Error: ' + (err.response.data?.error || 'No token provided');
      } else if (err.response?.status === 404) {
        errorMessage = 'Patient record not found.';
      } else if (err.response?.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Process Paystack payment
  const processPaystackPayment = async () => {
    try {
      setProcessingPayment(true);

      // In a real app, you would use Paystack SDK/WebView here
      // For now, we'll simulate the payment flow
      const testCardNumber = '4111111111111111';
      const testExpiry = '12/25';
      const testCVC = '123';

      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // For testing, we'll generate a mock reference
      const mockReference = `mock_${Date.now()}`;

      // Get patient ID for authentication
      const patientId = await AsyncStorage.getItem('patient_id');
      
      if (!patientId) {
        Alert.alert('Error', 'Session expired. Please log in again.');
        return;
      }

      console.log('Verifying payment with:', {
        reference: mockReference,
        payment_id: paymentId,
        patient_id: patientId,
      });

      // Verify payment with backend
      const verifyResponse = await axiosInstance.post(
        '/api/consultations/verify-payment',
        {
          reference: mockReference,
          payment_id: paymentId,
          patient_id: patientId,
        }
      );

      if (verifyResponse.data.success) {
        // Save consultation window data locally
        await AsyncStorage.setItem(
          'consultation_window',
          JSON.stringify({
            id: verifyResponse.data.window.id,
            expires_at: verifyResponse.data.window.expires_at,
            status: 'active',
          })
        );

        setPaymentModalVisible(false);
        Alert.alert(
          'Payment Successful! 🎉',
          'Your consultation window is now open. You can message your doctor for the next 48 hours.',
          [
            {
              text: 'Go to Home',
              onPress: () => {
                // Navigate back to home screen within the HomeStack
                navigation.navigate('HomeTab');
              },
            },
          ]
        );
      }
    } catch (err) {
      console.error('Payment verification error:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
        code: err.code,
      });

      let errorMessage = 'An error occurred. Please try again.';
      
      if (err.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout. Please check your internet connection.';
      } else if (err.response?.status === 401) {
        errorMessage = 'Authentication failed. The payment verification failed. Please try again.';
      } else if (err.response?.status === 400) {
        errorMessage = err.response.data?.message || 'Invalid payment reference.';
      } else if (err.response?.status === 404) {
        errorMessage = 'Payment record not found. Please try again.';
      } else if (err.response?.status === 500) {
        errorMessage = 'Server error. Please contact support.';
      }
      
      Alert.alert('Payment Failed', errorMessage);
    } finally {
      setProcessingPayment(false);
    }
  };

  // Test payment with mock card
  const handleTestPayment = async () => {
    Alert.alert(
      'Test Payment',
      'Using test card:\n\n4111 1111 1111 1111\nExpiry: 12/25\nCVC: 123\n\nContinue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', onPress: processPaystackPayment },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Payment Gateway</Text>
      </View>

      {/* Amount Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>
          {paymentType === 'window_extension' ? 'Extend Consultation' : 'Open Consultation'}
        </Text>
        <View style={styles.amountContainer}>
          <Text style={styles.amountCurrency}>₦</Text>
          <Text style={styles.amount}>{displayAmount.toLocaleString()}</Text>
        </View>
        <Text style={styles.summaryDuration}>
          {paymentType === 'window_extension' ? '24-hour extension' : '48-hour window'}
        </Text>
      </View>

      {/* What You Get */}
      <View style={styles.benefitCard}>
        <Text style={styles.benefitTitle}>What's Included:</Text>
        <View style={styles.benefitList}>
          <Text style={styles.benefit}>✓ Direct messaging with your doctor</Text>
          <Text style={styles.benefit}>✓ Submit symptom updates</Text>
          <Text style={styles.benefit}>✓ Request prescriptions</Text>
          <Text style={styles.benefit}>✓ Ask medical questions</Text>
          <Text style={styles.benefit}>✓ Receive treatment updates</Text>
        </View>
      </View>

      {/* Payment Methods */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Method</Text>

        {/* Paystack */}
        <TouchableOpacity
          style={[
            styles.paymentMethodCard,
            paymentMethod === 'paystack' && styles.paymentMethodSelected,
          ]}
          onPress={() => setPaymentMethod('paystack')}
        >
          <View style={styles.methodRadio}>
            {paymentMethod === 'paystack' && <View style={styles.methodRadioDot} />}
          </View>
          <View style={styles.methodInfo}>
            <Text style={styles.methodName}>Paystack</Text>
            <Text style={styles.methodDesc}>Debit card, USSD, Bank Transfer</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Security Info */}
      <View style={styles.securityBox}>
        <Text style={styles.securityIcon}>🔒</Text>
        <Text style={styles.securityText}>
          Your payment is secure. We use Paystack's industry-standard encryption.
        </Text>
      </View>

      {/* Pay Button */}
      <TouchableOpacity
        style={[styles.payButton, loading && styles.buttonDisabled]}
        onPress={initializePayment}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.dark} />
        ) : (
          <>
            <Text style={styles.payButtonText}>
              Proceed to Payment
            </Text>
            <Text style={styles.payButtonSubtext}>Secure Checkout</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Test Payment Button (for development only) */}
      <TouchableOpacity
        style={styles.testButton}
        onPress={handleTestPayment}
        disabled={loading}
      >
        <Text style={styles.testButtonText}>Test Payment (Demo)</Text>
      </TouchableOpacity>

      {/* FAQ */}
      <View style={styles.faqCard}>
        <Text style={styles.faqTitle}>Frequently Asked Questions</Text>

        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>💳 What payment methods do you accept?</Text>
          <Text style={styles.faqAnswer}>
            We accept all major debit cards, USSD, and bank transfers via Paystack.
          </Text>
        </View>

        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>🔄 Can I get a refund?</Text>
          <Text style={styles.faqAnswer}>
            Refunds are issued within 5-7 business days to your original payment method.
          </Text>
        </View>

        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>⏰ When does my window start?</Text>
          <Text style={styles.faqAnswer}>
            Immediately after successful payment. You'll see the countdown timer on your home screen.
          </Text>
        </View>

        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>❓ What if payment fails?</Text>
          <Text style={styles.faqAnswer}>
            Your money won't be charged. Check your internet and try again, or contact support.
          </Text>
        </View>
      </View>

      {/* Contact Support */}
      <View style={styles.supportCard}>
        <Text style={styles.supportText}>
          Need help? Contact our support team at support@oncoconnect.ng
        </Text>
      </View>

      {/* Mock Payment Modal (for testing) */}
      <Modal
        visible={paymentModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !processingPayment && setPaymentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {processingPayment ? 'Processing Payment...' : 'Enter Card Details'}
            </Text>

            {processingPayment ? (
              <View style={styles.processingContainer}>
                <ActivityIndicator size="large" color={COLORS.mint} />
                <Text style={styles.processingText}>
                  Processing your payment...
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.cardInput}>
                  <Text style={styles.label}>Card Number</Text>
                  <Text style={styles.mockCardNumber}>
                    4111 1111 1111 1111
                  </Text>
                </View>

                <View style={styles.cardRow}>
                  <View style={[styles.cardInput, { flex: 1, marginRight: 10 }]}>
                    <Text style={styles.label}>Expiry</Text>
                    <Text style={styles.mockCardNumber}>12/25</Text>
                  </View>
                  <View style={[styles.cardInput, { flex: 1 }]}>
                    <Text style={styles.label}>CVC</Text>
                    <Text style={styles.mockCardNumber}>123</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={processPaystackPayment}
                >
                  <Text style={styles.confirmButtonText}>
                    Confirm Payment (₦{displayAmount.toLocaleString()})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setPaymentModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.dark,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  backButton: {
    color: COLORS.mint,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  summaryCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.teal,
  },
  summaryLabel: {
    color: COLORS.muted,
    fontSize: 12,
    marginBottom: 12,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  amountCurrency: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.mint,
    marginRight: 4,
  },
  amount: {
    fontSize: 44,
    fontWeight: 'bold',
    color: COLORS.mint,
  },
  summaryDuration: {
    color: COLORS.muted,
    fontSize: 12,
  },
  benefitCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.mint,
  },
  benefitTitle: {
    color: COLORS.mint,
    fontWeight: '600',
    fontSize: 12,
    marginBottom: 10,
  },
  benefitList: {
    gap: 6,
  },
  benefit: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    color: COLORS.text,
    fontWeight: '600',
    fontSize: 13,
    marginBottom: 10,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.teal,
    alignItems: 'center',
  },
  paymentMethodSelected: {
    borderColor: COLORS.mint,
    backgroundColor: COLORS.dark,
  },
  methodRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.teal,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.mint,
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    color: COLORS.text,
    fontWeight: '600',
    fontSize: 13,
  },
  methodDesc: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 2,
  },
  securityBox: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  securityIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  securityText: {
    flex: 1,
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  payButton: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: COLORS.mint,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  payButtonText: {
    color: COLORS.dark,
    fontSize: 16,
    fontWeight: '600',
  },
  payButtonSubtext: {
    color: COLORS.dark,
    fontSize: 11,
    marginTop: 2,
    opacity: 0.7,
  },
  testButton: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.teal,
  },
  testButtonText: {
    color: COLORS.mint,
    fontSize: 13,
    fontWeight: '500',
  },
  faqCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
  },
  faqTitle: {
    color: COLORS.text,
    fontWeight: '600',
    fontSize: 13,
    marginBottom: 12,
  },
  faqItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.dark,
  },
  faqQuestion: {
    color: COLORS.mint,
    fontWeight: '500',
    fontSize: 12,
    marginBottom: 4,
  },
  faqAnswer: {
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 16,
  },
  supportCard: {
    marginHorizontal: 20,
    marginBottom: 40,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  supportText: {
    color: COLORS.muted,
    fontSize: 11,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    width: width - 40,
    borderWidth: 1,
    borderColor: COLORS.teal,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  processingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  processingText: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 12,
  },
  cardInput: {
    marginBottom: 14,
  },
  label: {
    color: COLORS.muted,
    fontSize: 11,
    marginBottom: 6,
  },
  mockCardNumber: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '500',
    padding: 10,
    backgroundColor: COLORS.dark,
    borderRadius: 8,
  },
  cardRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  confirmButton: {
    backgroundColor: COLORS.mint,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  confirmButtonText: {
    color: COLORS.dark,
    fontWeight: '600',
    fontSize: 13,
  },
  cancelButton: {
    paddingVertical: 10,
  },
  cancelButtonText: {
    color: COLORS.mint,
    textAlign: 'center',
    fontSize: 13,
  },
});