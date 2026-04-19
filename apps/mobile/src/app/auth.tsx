import { View, Text, StyleSheet } from 'react-native';
import React from 'react';

export default function AuthScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Authentication</Text>
      <Text>This is the authentication screen.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
});