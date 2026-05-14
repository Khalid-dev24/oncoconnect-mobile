import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const COLORS = {
  dark: '#0A1628',
  card: '#0F1E35',
  mint: '#0DD6C8',
  text: '#FFFFFF',
  muted: '#7A9EAE',
};

export default function SettingsScreen({ navigation }) {
  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel' },
      {
        text: 'Logout',
        onPress: async () => {
          await AsyncStorage.removeItem('is_authenticated');
          await AsyncStorage.removeItem('patient_id');
          navigation.reset({
            index: 0,
            routes: [{ name: 'Onboarding' }],
          });
        },
        style: 'destructive',
      },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>OncoConnect v1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.dark },
  header: { paddingHorizontal: 20, paddingVertical: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: COLORS.text },
  logoutButton: {
    marginHorizontal: 20,
    marginVertical: 20,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  logoutText: { color: COLORS.text, fontWeight: '600', fontSize: 14 },
  infoBox: {
    marginHorizontal: 20,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
  },
  infoText: { color: COLORS.muted, fontSize: 12 },
});