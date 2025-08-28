import React, { useState } from 'react';
import { View, ScrollView, Alert, Pressable } from 'react-native';
import UTText from '../../components/UTText';
import UTButton from '../../components/UTButton';
import UTInput from '../../components/UTInput';
import { ScheduleAPI } from '../../api/sdk';
import { colors, spacing } from '../../styles/theme';

export default function UploadScheduleScreen({ navigation }) {
	const [parsed, setParsed] = useState([]);
	const [loading, setLoading] = useState(false);

	const dayTokens = ['M','T','W','Th','F'];

	const updateField = (idx, key, value) => {
		setParsed((prev) => {
			const arr = [...prev];
			arr[idx] = { ...arr[idx], [key]: value };
			return arr;
		});
	};

	const toggleDay = (idx, day) => {
		setParsed((prev) => {
			const arr = [...prev];
			const set = new Set(arr[idx]?.days || []);
			if (set.has(day)) set.delete(day); else set.add(day);
			arr[idx] = { ...arr[idx], days: Array.from(set) };
			return arr;
		});
	};

	const addClassRow = () => {
		setParsed((prev) => ([...prev, { course: '', building: '', room: '', days: [], start_time: '', end_time: '' }]));
	};

	const removeClassRow = (idx) => {
		setParsed((prev) => prev.filter((_, i) => i !== idx));
	};

	function to24h(timeStr) {
		try {
			const trimmed = String(timeStr || '').trim();
			const m24 = /^(\d{2}):(\d{2})$/.exec(trimmed);
			if (m24) return `${m24[1]}:${m24[2]}`;
			const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(trimmed);
			if (!m) return null;
			let h = parseInt(m[1], 10); const min = parseInt(m[2], 10); const mer = m[3].toUpperCase();
			if (mer === 'AM') { if (h === 12) h = 0; }
			if (mer === 'PM') { if (h !== 12) h += 12; }
			return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
		} catch (_) { return null; }
	}

	const saveAll = async () => {
		try {
			setLoading(true);
			const cleaned = parsed
				.map((c) => ({
					course: String(c.course || '').trim(),
					building: String(c.building || '').trim().toUpperCase(),
					room: c.room ? String(c.room).trim() : '',
					days: Array.isArray(c.days) ? c.days.filter((d) => ['M','T','W','Th','F'].includes(d)) : [],
					start_time: to24h(c.start_time),
					end_time: to24h(c.end_time),
				}))
				.filter((c) => c.course && c.building && c.days.length && c.start_time && c.end_time);
			if (cleaned.length === 0) { Alert.alert('Validation', 'Add at least one complete class entry.'); return; }
			await ScheduleAPI.saveAll(cleaned);
			Alert.alert('Saved', 'Schedule saved');
			navigation.goBack();
		} catch (e) {
			Alert.alert('Save failed', e.message || 'Try again');
		} finally { setLoading(false); }
	};

	return (
		<ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}>
			<UTText variant="title">Enter Class Schedule</UTText>
			<UTText variant="body" style={{ marginTop: 8 }}>Add each class below. Include the course (e.g., C S 311), building code (e.g., WEL), optional room, days, and time.</UTText>
			{parsed?.length ? (
				<View style={{ marginTop: spacing.lg }}>
												<UTText variant="subtitle">Classes</UTText>
						{parsed.map((c, idx) => (
							<View key={idx} style={{ paddingVertical: spacing.md, borderBottomColor: colors.border, borderBottomWidth: 3, marginBottom: spacing.sm }}>
															<UTText variant="label" color={colors.burntOrange} style={{ marginBottom: spacing.xs, fontFamily: 'Poppins_600SemiBold', fontSize: 14 }}>Course</UTText>
								<UTInput value={c.course || ''} onChangeText={(t) => updateField(idx, 'course', t)} style={{ marginBottom: spacing.sm }} inputStyle={{ fontFamily: 'Poppins_600SemiBold' }} />
								<UTInput label="Building" value={c.building || ''} onChangeText={(t) => updateField(idx, 'building', t)} style={{ marginBottom: spacing.sm }} />
								<UTInput label="Room" value={c.room || ''} onChangeText={(t) => updateField(idx, 'room', t)} style={{ marginBottom: spacing.sm }} />
								<View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: spacing.sm }}>
									{dayTokens.map((d) => {
										const active = (c.days || []).includes(d);
										return (
											<Pressable key={d} onPress={() => toggleDay(idx, d)} style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, borderColor: active ? colors.burntOrange : '#DDD', backgroundColor: active ? 'rgba(191,87,0,0.1)' : 'transparent', marginRight: 6, marginBottom: 6 }}>
											<UTText variant="meta" style={{ color: active ? colors.burntOrange : colors.deepCharcoal }}>{d}</UTText>
										</Pressable>
									);
								})}
							</View>
							<UTInput label="Start (HH:MM or 9:30 AM)" value={c.start_time || ''} onChangeText={(t) => updateField(idx, 'start_time', t)} style={{ marginBottom: spacing.sm }} />
							<UTInput label="End (HH:MM or 11:00 AM)" value={c.end_time || ''} onChangeText={(t) => updateField(idx, 'end_time', t)} style={{ marginBottom: spacing.sm }} />
							<View style={{ alignItems: 'flex-end' }}>
								<Pressable onPress={() => removeClassRow(idx)}>
									<UTText variant="meta" style={{ color: '#B00020' }}>Remove</UTText>
								</Pressable>
							</View>
						</View>
					))}
					<View style={{ marginTop: spacing.md }}>
						<UTButton title="Add Class" onPress={addClassRow} style={{ marginBottom: spacing.sm }} />
						<UTButton title="Save" onPress={saveAll} loading={loading} />
					</View>
				</View>
			) : (
				<View style={{ marginTop: spacing.lg }}>
					<UTButton title="Add First Class" onPress={addClassRow} />
				</View>
			)}
		</ScrollView>
	);
} 