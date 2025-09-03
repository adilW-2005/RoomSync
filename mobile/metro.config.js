const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

if (!config.resolver) config.resolver = {};
config.resolver.alias = Object.assign({}, config.resolver.alias || {}, {
  'react-native-maps': path.resolve(projectRoot, 'src/components/MapShim.js'),
});

module.exports = config;
