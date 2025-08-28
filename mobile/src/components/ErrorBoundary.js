import React from 'react';
import { View, Text, Button } from 'react-native';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // In production, this could log to a remote service
    // Avoid leaking sensitive data
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.error('ErrorBoundary caught error', error, info);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ fontSize: 18, marginBottom: 12 }}>Something went wrong.</Text>
          <Button title="Try again" onPress={this.handleReset} />
        </View>
      );
    }
    return this.props.children;
  }
} 