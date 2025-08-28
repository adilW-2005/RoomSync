import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { NavAPI } from '../../api/sdk';
import UTText from '../../components/UTText';
import { colors, spacing } from '../../styles/theme';

export default function MapGuideScreen({ route }) {
	const { dest } = route.params || {}; // { lat, lng, title }
	const [region, setRegion] = useState({ latitude: dest?.lat || 30.285, longitude: dest?.lng || -97.739, latitudeDelta: 0.01, longitudeDelta: 0.01 });
	const [coords, setCoords] = useState([]);
	const [eta, setEta] = useState(null);
	const [distance, setDistance] = useState(null);
	const [origin, setOrigin] = useState(null);
	const [error, setError] = useState(null);
	const mapRef = useRef(null);

	useEffect(() => {
		(async () => {
			const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
			if (status !== 'granted') { setError('Location permission denied. Enable it in Settings to get directions.'); return; }
			const pos = await Location.getCurrentPositionAsync({});
			const o = { lat: pos.coords.latitude, lng: pos.coords.longitude };
			setOrigin(o);
			await refreshRoute(o);
		})();
	}, [dest?.lat, dest?.lng]);

	async function refreshRoute(o) {
		if (!o || !dest) return;
		try {
			setError(null);
			const r = await NavAPI.getRoute({ originLat: o.lat, originLng: o.lng, destLat: dest.lat, destLng: dest.lng });
			setEta(r.etaMinutes ?? null);
			setDistance(r.distanceMeters ?? null);
			// Decode polyline
			const points = decodePolyline(r.polyline || '');
			setCoords(points.map(([lat, lng]) => ({ latitude: lat, longitude: lng })));
			if (mapRef.current && points.length) {
				mapRef.current.fitToCoordinates(points.map(([lat, lng]) => ({ latitude: lat, longitude: lng })), { edgePadding: { top: 60, bottom: 60, left: 40, right: 40 }, animated: true });
			}
		} catch (e) { setError('Unable to fetch directions. Check connection and try again.'); }
	}

	useEffect(() => {
		const t = setInterval(() => { if (origin) refreshRoute(origin); }, 60000);
		return () => clearInterval(t);
	}, [origin]);

	return (
		<View style={styles.container}>
			<MapView ref={mapRef} style={styles.map} initialRegion={region}>
				{origin ? <Marker coordinate={{ latitude: origin.lat, longitude: origin.lng }} title="You" /> : null}
				{dest ? <Marker coordinate={{ latitude: dest.lat, longitude: dest.lng }} title={dest.title || 'Destination'} /> : null}
				{coords?.length ? <Polyline coordinates={coords} strokeColor={colors.burntOrange} strokeWidth={4} /> : null}
			</MapView>
			<View style={styles.pill}>
				<UTText variant="body">{eta != null ? `${eta} min` : 'ETA N/A'}{distance != null ? ` · ${(distance/1609.34).toFixed(2)} mi` : ''}</UTText>
				{error ? <UTText variant="meta" style={{ color: '#B00020', marginTop: 4 }}>{error}</UTText> : null}
			</View>
		</View>
	);
}

function decodePolyline(encoded) {
	if (!encoded) return [];
	let points = [];
	let index = 0, lat = 0, lng = 0;
	while (index < encoded.length) {
		let b, shift = 0, result = 0;
		do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
		const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1)); lat += dlat;
		shift = 0; result = 0;
		do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
		const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1)); lng += dlng;
		points.push([lat / 1e5, lng / 1e5]);
	}
	return points;
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	map: { flex: 1 },
	pill: { position: 'absolute', top: 20, alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }
}); 