import React from 'react';
import { Platform, View } from 'react-native';

const isWeb = Platform.OS === 'web';

let RNMaps;
if (!isWeb) {
  // Lazy require to avoid bundling on web
  // eslint-disable-next-line global-require
  RNMaps = require('react-native-maps');
}

export const MapView = (props) => {
  if (isWeb) {
    return <View {...props} style={[{ backgroundColor: '#EDEDED' }, props.style]}>{props.children}</View>;
  }
  const C = RNMaps.default || RNMaps;
  return <C {...props} />;
};

export const Marker = (props) => {
  if (isWeb) return <View {...props}>{props.children}</View>;
  const C = RNMaps.Marker;
  return <C {...props} />;
};

export const Callout = (props) => {
  if (isWeb) return <View {...props}>{props.children}</View>;
  const C = RNMaps.Callout;
  return <C {...props} />;
};

export const Polyline = (props) => {
  if (isWeb) return <View {...props} />;
  const C = RNMaps.Polyline;
  return <C {...props} />;
}; 