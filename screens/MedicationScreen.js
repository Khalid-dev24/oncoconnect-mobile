import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
// import * as Notifications from 'expo-notifications';

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

export default function MedicationScreen() {
  const [medications, setMedications] = useState([]);
  const [medicationLogs, setMedicationLogs] = useState([]);
  const [adherenceRate, setAdherenceRate] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMedications();
    scheduleNotifications();
  }, []);

  const loadMedications = async () => {
    try {
      setLoading(true);
      // In production, fetch from backend
      // For MVP, use mock data
      const mockMeds = [
        {
          id: '1',
          drug_name: 'Tamoxifen',
          dosage: '20mg',
          frequency: 'once_daily',
          times_of_day: ['08:00'],
          start_date: '2026-01-15',
          is_active: true,
        },
        {
          id: '2',
          drug_name: 'Letrozole',
          dosage: '2.5mg',
          frequency: 'once_daily',
          times_of_day: ['18:00'],
          start_date: '2026-01-20',
          is_active: true,
        },
        {
          id: '3',
          drug_name: 'Vitamin D3',
          dosage: '1000IU',
          frequency: 'daily',
          times_of_day: ['12:00'],
          start_date: '2026-02-01',
          is_active: true,
        },
      ];
      setMedications(mockMeds);
      calculateAdherence(mockMeds);
    } catch (err) {
      console.error('Error loading medications:', err);
      Alert.alert('Error', 'Failed to load medications');
    } finally {
      setLoading(false);
    }
  };

  const calculateAdherence = async (meds) => {
    try {
      // Calculate adherence for last 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      
      // Mock calculation
      const logsData = await AsyncStorage.getItem('medication_logs');
      const logs = logsData ? JSON.parse(logsData) : [];
      
      const recentLogs = logs.filter(log => log.logged_at > sevenDaysAgo);
      const takenLogs = recentLogs.filter(log => log.status === 'taken');
      
      const rate = recentLogs.length > 0 
        ? Math.round((takenLogs.length / recentLogs.length) * 100)
        : 0;
      
      setAdherenceRate(rate);
    } catch (err) {
      console.error('Error calculating adherence:', err);
    }
  };

  const scheduleNotifications = async () => {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      
      medications.forEach((med) => {
        med.times_of_day.forEach((time) => {
          const [hours, minutes] = time.split(':').map(Number);
          const trigger = new Date();
          trigger.setHours(hours, minutes, 0);
          
          if (trigger < new Date()) {
            trigger.setDate(trigger.getDate() + 1);
          }

          Notifications.scheduleNotificationAsync({
            content: {
              title: '💊 Time for your medication',
              body: `Take ${med.drug_name} ${med.dosage}`,
              data: { medicationId: med.id },
            },
            trigger,
          });
        });
      });
    } catch (err) {
      console.error('Error scheduling notifications:', err);
    }
  };

  const handleMedicationTaken = async (medId) => {
    try {
      // Log medication as taken
      const log = {
        medication_id: medId,
        status: 'taken',
        logged_at: new Date().toISOString(),
      };
      
      let logs = [];
      const logsData = await AsyncStorage.getItem('medication_logs');
      if (logsData) {
        logs = JSON.parse(logsData);
      }
      
      logs.push(log);
      await AsyncStorage.setItem('medication_logs', JSON.stringify(logs));
      
      Alert.alert('✓ Recorded', 'Medication marked as taken!');
      calculateAdherence(medications);
    } catch (err) {
      Alert.alert('Error', 'Failed to log medication');
    }
  };

  const MedicationCard = ({ med }) => (
    <View style={styles.medCard}>
      <View style={styles.medInfo}>
        <Text style={styles.medName}>{med.drug_name}</Text>
        <Text style={styles.medDosage}>{med.dosage}</Text>
        <View style={styles.timeContainer}>
          {med.times_of_day.map((time, idx) => (
            <View key={idx} style={styles.timeBadge}>
              <Text style={styles.timeText}>🕐 {time}</Text>
            </View>
          ))}
        </View>
      </View>
      <TouchableOpacity
        style={styles.takenButton}
        onPress={() => handleMedicationTaken(med.id)}
      >
        <Text style={styles.takenButtonText}>Taken</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.mint} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Medications</Text>
        <Text style={styles.subtitle}>Manage your daily medications</Text>
      </View>

      {/* Adherence Card */}
      <View style={styles.adherenceCard}>
        <View style={styles.adherenceContent}>
          <Text style={styles.adherenceLabel}>7-Day Adherence</Text>
          <View style={styles.adherenceBar}>
            <View
              style={[
                styles.adherenceBarFill,
                { 
                  width: `${adherenceRate}%`,
                  backgroundColor: adherenceRate >= 80 ? COLORS.green : 
                                   adherenceRate >= 60 ? COLORS.amber : COLORS.red,
                },
              ]}
            />
          </View>
          <Text style={styles.adherencePercent}>{adherenceRate}%</Text>
        </View>
        <View style={styles.adherenceIcon}>
          <Text style={styles.adherenceEmoji}>
            {adherenceRate >= 80 ? '🌟' : adherenceRate >= 60 ? '📈' : '⚠️'}
          </Text>
        </View>
      </View>

      {/* Active Medications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Active Medications ({medications.length})
        </Text>
        <FlatList
          data={medications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MedicationCard med={item} />}
          scrollEnabled={false}
        />
      </View>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Meds</Text>
          <Text style={styles.statValue}>{medications.length}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Today's Doses</Text>
          <Text style={styles.statValue}>
            {medications.reduce((sum, med) => sum + med.times_of_day.length, 0)}
          </Text>
        </View>
      </View>

      {/* Tips */}
      <View style={styles.tipsCard}>
        <Text style={styles.tipsTitle}>💡 Tips for Better Adherence</Text>
        <Text style={styles.tipItem}>
          • Set phone alarms at medication times
        </Text>
        <Text style={styles.tipItem}>
          • Keep medications in a visible place
        </Text>
        <Text style={styles.tipItem}>
          • Use a pill organizer for weekly planning
        </Text>
        <Text style={styles.tipItem}>
          • Mark each dose on a calendar
        </Text>
      </View>

      {/* Contact Doctor */}
      <TouchableOpacity style={styles.contactButton}>
        <Text style={styles.contactButtonText}>
          📞 Report Side Effects to Doctor
        </Text>
      </TouchableOpacity>
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
  adherenceCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.teal,
  },
  adherenceContent: {
    flex: 1,
  },
  adherenceLabel: {
    color: COLORS.muted,
    fontSize: 12,
    marginBottom: 8,
  },
  adherenceBar: {
    height: 8,
    backgroundColor: COLORS.dark,
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  adherenceBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  adherencePercent: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.mint,
  },
  adherenceIcon: {
    marginLeft: 16,
  },
  adherenceEmoji: {
    fontSize: 40,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    color: COLORS.text,
    fontWeight: '600',
    fontSize: 13,
    marginBottom: 12,
  },
  medCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.teal,
  },
  medInfo: {
    flex: 1,
  },
  medName: {
    color: COLORS.text,
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 4,
  },
  medDosage: {
    color: COLORS.muted,
    fontSize: 12,
    marginBottom: 6,
  },
  timeContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  timeBadge: {
    backgroundColor: COLORS.dark,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  timeText: {
    color: COLORS.mint,
    fontSize: 11,
  },
  takenButton: {
    backgroundColor: COLORS.mint,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  takenButtonText: {
    color: COLORS.dark,
    fontWeight: '600',
    fontSize: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.teal,
  },
  statLabel: {
    color: COLORS.muted,
    fontSize: 11,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.mint,
  },
  tipsCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.amber,
  },
  tipsTitle: {
    color: COLORS.amber,
    fontWeight: '600',
    fontSize: 12,
    marginBottom: 10,
  },
  tipItem: {
    color: COLORS.muted,
    fontSize: 11,
    marginBottom: 6,
    lineHeight: 16,
  },
  contactButton: {
    marginHorizontal: 20,
    marginBottom: 40,
    backgroundColor: COLORS.teal,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  contactButtonText: {
    color: COLORS.dark,
    fontWeight: '600',
    fontSize: 13,
  },
});