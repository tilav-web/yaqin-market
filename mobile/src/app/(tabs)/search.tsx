import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

export default function SearchScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Qidiruv</Text>
        <Text style={styles.subtitle}>Qidiruv sahifasi</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: '#6b7280',
  },
});
