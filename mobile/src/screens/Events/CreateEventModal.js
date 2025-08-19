import React, { useEffect, useState } from 'react';
import { Modal, View, StyleSheet, Pressable, ScrollView, KeyboardAvoidingView, Platform, useColorScheme, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import UTText from '../../components/UTText';
import UTInput from '../../components/UTInput';
import UTButton from '../../components/UTButton';
import { spacing } from '../../styles/theme';

export default function CreateEventModal({ visible, onClose, onCreate, initialEvent }) {
	const [title, setTitle] = useState('');
	const [startDate, setStartDate] = useState(null);
	const [endDate, setEndDate] = useState(null);
	const [locationText, setLocationText] = useState('');
	const [showPicker, setShowPicker] = useState(null); // 'start' | 'end' | null
	const [currentMonth, setCurrentMonth] = useState(new Date());
	const [nameError, setNameError] = useState('');
	const [timed, setTimed] = useState(false);
	// time parts (12h with hour increments)
	const [startHour, setStartHour] = useState(4);
	const [startMinute, setStartMinute] = useState(0);
	const [startPm, setStartPm] = useState(true);
	const [endHour, setEndHour] = useState(5);
	const [endMinute, setEndMinute] = useState(0);
	const [endPm, setEndPm] = useState(true);

	const colorScheme = useColorScheme();
	const insets = useSafeAreaInsets();
	const isDark = colorScheme === 'dark';
	const screenHeight = Dimensions.get('window').height;

	const UT = {
		primary: '#C75100',
		primaryAlt: '#E26A1A',
		tint: '#FFF3EC',
		danger: '#EF4444',
		textMuted: isDark ? 'rgba(255,255,255,.7)' : 'rgba(0,0,0,.65)',
		cardBg: isDark ? 'rgba(20,20,20,.78)' : 'rgba(255,255,255,.92)'
	};

	useEffect(() => {
		if (initialEvent) {
			setTitle(initialEvent.title || '');
			const s = initialEvent.startAt ? new Date(initialEvent.startAt) : null;
			const e = initialEvent.endAt ? new Date(initialEvent.endAt) : null;
			setStartDate(s);
			setEndDate(e);
			setLocationText(initialEvent.locationText || '');
			if (s) setCurrentMonth(new Date(s.getFullYear(), s.getMonth(), 1));
			if (s && e) {
				const allDay = s.getHours() === 0 && s.getMinutes() === 0 && e.getHours() === 23 && e.getMinutes() >= 55;
				setTimed(!allDay);
				if (!allDay) {
					const toParts = (d) => ({ h: ((d.getHours() + 11) % 12) + 1, m: 0, pm: d.getHours() >= 12 });
					const sp = toParts(s); const ep = toParts(e);
					setStartHour(sp.h); setStartMinute(0); setStartPm(sp.pm);
					setEndHour(ep.h); setEndMinute(0); setEndPm(ep.pm);
				}
			}
		}
	}, [initialEvent]);

	const reset = () => {
		setTitle(''); setStartDate(null); setEndDate(null); setLocationText(''); setShowPicker(null); setNameError(''); setTimed(false);
	};

	const toDateWithTime = (date, h12, min, pm) => {
		if (!date) return null;
		const h24 = ((h12 % 12) + (pm ? 12 : 0));
		const d = new Date(date); d.setHours(h24, 0, 0, 0); return d;
	};

	const submit = async () => {
		if (!title.trim()) { setNameError('Please enter a title'); return; }
		if (!startDate || !endDate) return;
		await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		let startAt; let endAt;
		if (timed) {
			startAt = toDateWithTime(startDate, startHour, startMinute, startPm);
			endAt = toDateWithTime(endDate, endHour, endMinute, endPm);
		} else {
			startAt = new Date(startDate); startAt.setHours(0,0,0,0);
			endAt = new Date(endDate); endAt.setHours(23,59,59,999);
		}
		const payload = { title: title.trim(), startAt: startAt.toISOString(), endAt: endAt.toISOString(), locationText: locationText || undefined };
		if (onCreate) await onCreate(payload);
		reset();
		onClose && onClose();
	};

	// Calendar helpers
	const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
	const startWeekday = startOfMonth.getDay();
	const grid = [];
	for (let i = 0; i < 42; i++) {
		const dayNumber = i - startWeekday + 1;
		const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dayNumber);
		const inCurrent = date.getMonth() === currentMonth.getMonth();
		grid.push({ date, inCurrent });
	}
	const isSameDay = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
	const monthTitle = currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

	const formatDate = (d) => {
		if (!d) return 'Select date';
		return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
	};

	const hours = [1,2,3,4,5,6,7,8,9,10,11,12];

	return (
		<Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
			<View style={styles.backdrop}>
				<BlurView intensity={30} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
				<View style={[styles.card, { maxHeight: screenHeight * 0.74, paddingBottom: Math.max(insets.bottom, 16) + 84, backgroundColor: UT.cardBg }]}> 
					<View style={styles.handleContainer}><View style={styles.handle} /></View>

					<View style={[styles.headerRow, { paddingTop: 6 + insets.top * 0.2 }]}> 
						<UTText variant="subtitle" style={{ fontSize: 20, fontFamily: 'Poppins_600SemiBold' }}>{initialEvent ? 'Edit Event' : 'New Event'}</UTText>
						<Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={10}>
							<Ionicons name="close" size={26} color={UT.primary} />
						</Pressable>
					</View>

					<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
						<ScrollView contentContainerStyle={{ paddingBottom: 200 }} showsVerticalScrollIndicator={false}>
							{/* Title */}
							<View style={styles.section}>
								<UTText variant="label" style={{ color: 'black', marginBottom: spacing.xs }}>TITLE</UTText>
								<View style={styles.iconInputRow}>
									<Ionicons name="calendar-outline" size={20} color={UT.primary} style={{ marginRight: 8 }} />
									<UTInput placeholder="e.g., Group Dinner" value={title} onChangeText={(t) => { setTitle(t); if (t) setNameError(''); }} style={{ flex: 1 }} />
								</View>
								{nameError ? <UTText style={{ color: UT.danger, marginTop: 6 }}>{nameError}</UTText> : null}
							</View>

							{/* All‑day / Timed */}
							<View style={[styles.section, { flexDirection: 'row', gap: 8 }]}>
								<Pressable onPress={async () => { setTimed(false); await Haptics.selectionAsync(); }} style={[styles.segmentPill, { backgroundColor: timed ? '#FFFFFF' : UT.primary }]} accessibilityRole="button" accessibilityLabel="All Day">
									<UTText style={{ color: timed ? UT.primary : '#fff', fontFamily: 'Poppins_600SemiBold' }}>All‑Day</UTText>
								</Pressable>
								<Pressable onPress={async () => { setTimed(true); await Haptics.selectionAsync(); }} style={[styles.segmentPill, { backgroundColor: timed ? UT.primary : '#FFFFFF' }]} accessibilityRole="button" accessibilityLabel="Timed">
									<UTText style={{ color: timed ? '#fff' : UT.primary, fontFamily: 'Poppins_600SemiBold' }}>Timed</UTText>
								</Pressable>
							</View>

							{/* Start */}
							<View style={styles.section}>
								<UTText variant="label" style={{ color: 'black', marginBottom: spacing.xs }}>START</UTText>
								<Pressable onPress={async () => { setShowPicker('start'); await Haptics.selectionAsync(); }} style={[styles.segmentPill, { backgroundColor: '#FFFFFF', alignSelf: 'flex-start' }]}>
									<UTText>{formatDate(startDate)}{timed && startDate ? ` • ${String(startHour).padStart(2,'0')}:00 ${startPm ? 'PM' : 'AM'}` : ''}</UTText>
								</Pressable>
							</View>

							{/* End */}
							<View style={styles.section}>
								<UTText variant="label" style={{ color: 'black', marginBottom: spacing.xs }}>END</UTText>
								<Pressable onPress={async () => { setShowPicker('end'); await Haptics.selectionAsync(); }} style={[styles.segmentPill, { backgroundColor: '#FFFFFF', alignSelf: 'flex-start' }]}>
									<UTText>{formatDate(endDate)}{timed && endDate ? ` • ${String(endHour).padStart(2,'0')}:00 ${endPm ? 'PM' : 'AM'}` : ''}</UTText>
								</Pressable>
							</View>

							{/* Location */}
							<View style={styles.section}>
								<UTText variant="label" style={{ color: 'black', marginBottom: spacing.xs }}>LOCATION</UTText>
								<UTInput placeholder="Optional" value={locationText} onChangeText={setLocationText} />
							</View>

							{/* Picker */}
							{showPicker ? (
								<View style={[styles.pickerCard, { marginTop: spacing.xxl, backgroundColor: isDark ? 'rgba(20,20,20,0.92)' : '#FFFFFF' }]}> 
									<View style={styles.pickerHeader}>
										<Pressable onPress={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} accessibilityRole="button" accessibilityLabel="Previous month" hitSlop={8}>
											<Ionicons name="chevron-back" size={22} color={UT.primary} />
										</Pressable>
										<UTText style={{ color: UT.primary, fontFamily: 'Poppins_600SemiBold' }}>{monthTitle}</UTText>
										<Pressable onPress={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} accessibilityRole="button" accessibilityLabel="Next month" hitSlop={8}>
											<Ionicons name="chevron-forward" size={22} color={UT.primary} />
										</Pressable>
									</View>
									<View style={styles.weekHeader}>
										{['Su','Mo','Tu','We','Th','Fr','Sa'].map((w) => (
											<UTText key={w} style={{ flex: 1, textAlign: 'center', color: isDark ? '#FFFFFF' : '#1E1E1E' }}>{w}</UTText>
										))}
									</View>
									<View style={styles.grid}>
										{grid.map(({ date, inCurrent }, idx) => {
											const selected = (showPicker === 'start' && startDate && isSameDay(date, startDate)) || (showPicker === 'end' && endDate && isSameDay(date, endDate));
											return (
												<Pressable key={idx} onPress={async () => { if (showPicker === 'start') { setStartDate(date); if (!endDate) setEndDate(date); } else { setEndDate(date); } await Haptics.selectionAsync(); }} style={[styles.dayCell, selected ? { backgroundColor: UT.primary } : { backgroundColor: '#FFFFFF', opacity: inCurrent ? 1 : 0.5 }]} accessibilityRole="button" accessibilityLabel={`Select ${date.toDateString()}`}>
												<UTText style={{ color: selected ? '#fff' : (isDark ? '#FFFFFF' : '#1E1E1E') }}>{date.getDate()}</UTText>
											</Pressable>
											);
										})}
									</View>

									{timed ? (
										<View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
											<UTText variant="label" style={{ marginBottom: spacing.xs }}>TIME</UTText>
											<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
												<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
													{hours.map((h) => (
														<Pressable key={`h-${h}`} onPress={() => (showPicker === 'start' ? setStartHour(h) : setEndHour(h))} style={[styles.timeChip, (showPicker === 'start' ? startHour === h : endHour === h) ? { backgroundColor: UT.primary } : { backgroundColor: '#FFFFFF' }]}>
															<UTText style={{ color: (showPicker === 'start' ? startHour === h : endHour === h) ? '#fff' : UT.primary }}>{String(h).padStart(2,'0')}</UTText>
														</Pressable>
													))}
												</ScrollView>
												<View style={{ flexDirection: 'row', gap: 6 }}>
													{['AM','PM'].map((ap) => {
														const active = (showPicker === 'start' ? (startPm ? 'PM' : 'AM') : (endPm ? 'PM' : 'AM')) === ap;
														return (
															<Pressable key={ap} onPress={() => (showPicker === 'start' ? setStartPm(ap === 'PM') : setEndPm(ap === 'PM'))} style={[styles.timeChip, active ? { backgroundColor: UT.primary } : { backgroundColor: '#FFFFFF' }]}>
																<UTText style={{ color: active ? '#fff' : UT.primary }}>{ap}</UTText>
															</Pressable>
														);
													})}
												</View>
											</View>
										</View>
									) : null}

									<View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, paddingTop: spacing.sm }}>
										<Pressable onPress={() => setShowPicker(null)} style={[styles.segmentPill, { backgroundColor: '#FFFFFF', marginLeft: 'auto' }]} accessibilityRole="button" accessibilityLabel="Close date picker">
											<UTText style={{ color: UT.primary }}>Done</UTText>
										</Pressable>
									</View>
								</View>
							) : null}
						</ScrollView> 
					</KeyboardAvoidingView>

					<View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}> 
						<UTButton title="Cancel" variant="secondary" onPress={() => { reset(); onClose && onClose(); }} style={{ flex: 1, marginRight: spacing.sm }} />
						<UTButton title={initialEvent ? 'Save' : 'Create'} onPress={submit} style={{ flex: 1, marginLeft: spacing.sm }} disabled={!title.trim() || !startDate || !endDate} />
					</View>
				</View>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'flex-end' },
	card: { borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
	handleContainer: { alignItems: 'center', paddingTop: 8 },
	handle: { width: 42, height: 5, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.15)' },
	headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, marginTop: 6 },
	section: { paddingHorizontal: spacing.lg, marginTop: spacing.md },
	iconInputRow: { flexDirection: 'row', alignItems: 'center' },
	segmentPill: { height: 44, paddingHorizontal: 16, borderRadius: 999, borderWidth: 0, alignItems: 'center', justifyContent: 'center' },
	footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, backgroundColor: 'transparent', flexDirection: 'row' },
	pickerCard: { borderWidth: 0, borderRadius: 16, overflow: 'hidden', marginTop: spacing.sm },
	pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
	weekHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingBottom: spacing.xs },
	grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.md, rowGap: 6, columnGap: 6 },
	dayCell: { width: (300 - (spacing.md * 2) - (6 * 6)) / 7, height: 28, borderRadius: 8, borderWidth: 0, alignItems: 'center', justifyContent: 'center', position: 'relative' },
	timeChip: { height: 34, paddingHorizontal: 12, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginVertical: 6 },
}); 