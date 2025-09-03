const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

// Configure resolver for web compatibility
if (!config.resolver) config.resolver = {};
config.resolver.alias = Object.assign({}, config.resolver.alias || {}, {
  'react-native-maps': path.resolve(projectRoot, 'src/components/MapShim.js'),
  'expo-location': path.resolve(projectRoot, 'src/components/LocationShim.js'),
  'expo-notifications': path.resolve(projectRoot, 'src/components/NotificationsShim.js'),
});

// Add platform extensions for better web support
config.resolver.platforms = ['web', 'ios', 'android', 'native'];

module.exports = config;
