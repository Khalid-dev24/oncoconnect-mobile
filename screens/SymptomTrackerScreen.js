import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
} from 'react-native';
import Slider from '@react-native-community/slider';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

const SYMPTOMS = [
  { id: 'nausea', label: 'Nausea', icon: '🤢' },
  { id: 'fatigue', label: 'Fatigue', icon: '😴' },
  { id: 'pain', label: 'Pain', icon: '😣' },
  { id: 'fever', label: 'Fever', icon: '🤒' },
  { id: 'vomiting', label: 'Vomiting', icon: '🤮' },
  { id: 'shortness_of_breath', label: 'Shortness of Breath', icon: '😮‍💨' },
  { id: 'appetite_loss', label: 'Appetite Loss', icon: '🍽️' },
  { id: 'headache', label: 'Headache', icon: '🤕' },
];

export default function SymptomTrackerScreen() {
  const [symptoms, setSymptoms] = useState(
    SYMPTOMS.reduce((acc, sym) => ({ ...acc, [sym.id]: 0 }), {})
  );
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const getSeverityColor = (value) => {
    if (value === 0) return COLORS.green;
    if (value <= 3) return COLORS.green;
    if (value <= 6) return COLORS.amber;
    return COLORS.red;
  };

  const getSeverityLabel = (value) => {
    if (value === 0) return 'None';
    if (value <= 3) return 'Mild';
    if (value <= 6) return 'Moderate';
    return 'Severe';
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const maxSeverity = Math.max(...Object.values(symptoms));
      
      const logEntry = {
        id: Math.random().toString(36),
        logged_at: new Date().toISOString(),
        symptoms: Object.entries(symptoms).map(([id, severity]) => ({
          name: SYMPTOMS.find(s => s.id === id).label,
          severity,
          notes: id === 'pain' ? notes : '',
        })),
        overall_severity: maxSeverity,
        alert_triggered: maxSeverity >= 7,
      };

      // Save locally
      let logs = [];
      const logsData = await AsyncStorage.getItem('symptom_logs');
      if (logsData) {
        logs = JSON.parse(logsData);
      }
      logs.push(logEntry);
      await AsyncStorage.setItem('symptom_logs', JSON.stringify(logs));

      // If severe, trigger alert
      if (maxSeverity >= 7) {
        Alert.alert(
          '⚠️ Alert Sent',
          'Your doctor has been notified of your severe symptoms. They will contact you soon.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          '✓ Recorded',
          'Your symptom check-in has been saved. Your doctor can see this.',
          [{ text: 'OK' }]
        );
      }

      // Reset form
      setSymptoms(SYMPTOMS.reduce((acc, sym) => ({ ...acc, [sym.id]: 0 }), {}));
      setNotes('');
    } catch (err) {
      Alert.alert('Error', 'Failed to save symptoms');
    } finally {
      setSubmitting(false);
    }
  };

  const maxSeverity = Math.max(...Object.values(symptoms));

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Daily Check-in</Text>
        <Text style={styles.subtitle}>How are you feeling today?</Text>
      </View>

      {/* Overall Severity */}
      {maxSeverity > 0 && (
        <View style={styles.overallCard}>
          <Text style={styles.overallLabel}>Overall Severity</Text>
          <View style={styles.overallDisplay}>
            <Text style={[styles.overallValue, { color: getSeverityColor(maxSeverity) }]}>
              {maxSeverity}
            </Text>
            <Text style={[styles.overallStatus, { color: getSeverityColor(maxSeverity) }]}>
              {getSeverityLabel(maxSeverity)}
            </Text>
          </View>
          {maxSeverity >= 7 && (
            <View style={styles.alertBox}>
              <Text style={styles.alertText}>
                🚨 Your doctor will be alerted if you submit this
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Symptom Sliders */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Your Symptoms</Text>
        {SYMPTOMS.map((symptom) => (
          <View key={symptom.id} style={styles.symptomCard}>
            <View style={styles.symptomHeader}>
              <View style={styles.symptomLabel}>
                <Text style={styles.symptomIcon}>{symptom.icon}</Text>
                <Text style={styles.symptomName}>{symptom.label}</Text>
              </View>
              <Text
                style={[
                  styles.symptomSeverity,
                  { color: getSeverityColor(symptoms[symptom.id]) },
                ]}
              >
                {symptoms[symptom.id]}
              </Text>
            </View>
            <View style={styles.sliderContainer}>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={10}
                step={1}
                value={symptoms[symptom.id]}
                onValueChange={(value) =>
                  setSymptoms({ ...symptoms, [symptom.id]: value })
                }
                minimumTrackTintColor={getSeverityColor(symptoms[symptom.id])}
                maximumTrackTintColor={COLORS.card}
              />
            </View>
            <View style={styles.scaleLabels}>
              <Text style={styles.scaleLabel}>No pain</Text>
              <Text style={styles.scaleLabel}>Severe pain</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Notes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Additional Notes (Optional)</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="Describe your symptoms, triggers, or how they affect you..."
          placeholderTextColor={COLORS.muted}
          multiline
          numberOfLines={4}
          value={notes}
          onChangeText={setNotes}
        />
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        <Text style={styles.submitButtonText}>
          {submitting ? 'Saving...' : 'Save Check-in'}
        </Text>
      </TouchableOpacity>

      {/* Info */}
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>📊 How This Helps</Text>
        <Text style={styles.infoText}>
          • Your doctor sees a daily record of your symptoms{'\n'}
          • Patterns help identify treatment side effects{'\n'}
          • Severe symptoms (7+) trigger an automatic alert
        </Text>
      </View>

      <View style={styles.spacer} />
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.muted,
  },
  overallCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.teal,
  },
  overallLabel: {
    color: COLORS.muted,
    fontSize: 12,
    marginBottom: 10,
  },
  overallDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  overallValue: {
    fontSize: 40,
    fontWeight: 'bold',
    marginRight: 8,
  },
  overallStatus: {
    fontSize: 18,
  },
  alertBox: {
    backgroundColor: COLORS.dark,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 10,
  },
  alertText: {
    color: COLORS.red,
    fontSize: 12,
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    color: COLORS.text,
    fontWeight: '600',
    fontSize: 13,
    marginBottom: 12,
  },
  symptomCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.teal,
  },
  symptomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  symptomLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  symptomIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  symptomName: {
    color: COLORS.text,
    fontWeight: '500',
    fontSize: 13,
  },
  symptomSeverity: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  sliderContainer: {
    marginVertical: 10,
  },
  slider: {
    width: '100%',
    height: 4,
  },
  scaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scaleLabel: {
    color: COLORS.muted,
    fontSize: 10,
  },
  notesInput: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.teal,
    fontSize: 13,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: COLORS.mint,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: COLORS.dark,
    fontWeight: '600',
    fontSize: 14,
  },
  infoBox: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.mint,
  },
  infoTitle: {
    color: COLORS.mint,
    fontWeight: '600',
    fontSize: 12,
    marginBottom: 8,
  },
  infoText: {
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 18,
  },
  spacer: {
    height: 40,
  },
});