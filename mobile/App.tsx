import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, SafeAreaView, Text } from 'react-native';
import axios, { AxiosInstance } from 'axios';
import { FeedScreen } from './src/screens/FeedScreen';

const API_BASE_URL = 'http://localhost:8000';
const TEST_EMAIL = 'user1@guised.up';
const TEST_PASSWORD = 'password';

const App: React.FC = () => {
  const [apiClient, setApiClient] = useState<AxiosInstance | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Create axios instance
        const client = axios.create({
          baseURL: API_BASE_URL,
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        });

        setApiClient(client);

        // Try to login with test credentials
        const loginResponse = await client.post('/api/auth/login', {
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
        });

        const token = loginResponse.data.token;
        setAuthToken(token);
        setError(null);
      } catch (err: any) {
        console.error('Initialization error:', err);
        setError(
          err.response?.data?.message ||
          err.message ||
          'Failed to connect to backend. Make sure the server is running on http://localhost:8000'
        );
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Initializing app...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !apiClient || !authToken) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorTitle}>Connection Error</Text>
          <Text style={styles.errorText}>{error || 'Failed to authenticate'}</Text>
          <Text style={styles.setupInstructions}>
            Please ensure:
            {'\n'}• Backend server running on http://localhost:8000
            {'\n'}• Database migrations executed
            {'\n'}• Test users seeded
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <FeedScreen apiClient={apiClient} authToken={authToken} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#333',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#E74C3C',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
  },
  setupInstructions: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default App;
