import React from 'react';
import { render, act } from '@testing-library/react-native';
import MapGuideScreen from '../src/screens/Map/MapGuideScreen';
import * as Location from 'expo-location';
import { NavAPI } from '../src/api/sdk';

jest.mock('expo-location');

jest.mock('../src/api/sdk', () => ({
  NavAPI: { getRoute: jest.fn(async () => { throw new Error('offline'); }) },
}));

describe('MapGuide offline', () => {
  test('shows retry message when route fails', async () => {
    Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
    Location.getCurrentPositionAsync.mockResolvedValue({ coords: { latitude: 30.28, longitude: -97.74 } });
    const { getByText } = render(<MapGuideScreen route={{ params: { dest: { lat: 30.29, lng: -97.73, title: 'Test' } } }} />);
    await act(async () => {});
    expect(getByText('Unable to fetch directions. Check connection and try again.')).toBeTruthy();
  });
}); 