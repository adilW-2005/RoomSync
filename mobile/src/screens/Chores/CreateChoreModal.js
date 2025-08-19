import React, { useState, useEffect } from 'react';
import { Modal, View, StyleSheet, Pressable, ScrollView, KeyboardAvoidingView, Platform, useColorScheme, Dimensions } from 'react-native';

import UTText from '../../components/UTText';
import UTInput from '../../components/UTInput';
import UTButton from '../../components/UTButton';
import { spacing } from '../../styles/theme';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import useMemberStore from '../../state/useMemberStore';

export default function CreateChoreModal({ visible, onClose, onCreate, onUpdate, initialChore }) {
	const [title, setTitle] = useState('');
	const [hours, setHours] = useState('0');
	const [repeat, setRepeat] = useState('none');
	const [customDays, setCustomDays] = useState('');
	const [assigneesText, setAssigneesText] = useState('');
	const [selectedDate, setSelectedDate] = useState(null);
	const [showPicker, setShowPicker] = useState(false);
	const [currentMonth, setCurrentMonth] = useState(new Date());

	const colorScheme = useColorScheme();
	const insets = useSafeAreaInsets();
	const isDark = colorScheme === 'dark';
	const screenHeight = Dimensions.get('window').height;

	// UT visual tokens (kept local to avoid breaking global theme)
	const UT = {
		primary: '#C75100',
		primaryAlt: '#E26A1A',
		tint: '#FFF3EC',
		success: '#22C55E',
		warning: '#F59E0B',
		danger: '#EF4444',
		textMuted: isDark ? 'rgba(255,255,255,.7)' : 'rgba(0,0,0,.65)',
		cardBg: isDark ? 'rgba(20,20,20,.78)' : 'rgba(255,255,255,.92)'
	};

	// UI-only helpers
	const [typeSegment, setTypeSegment] = useState('one'); // 'one' | 'rec'
	const [nameError, setNameError] = useState('');

	const { membersById, fetchCurrentGroupMembers } = useMemberStore();

	useEffect(() => {
		if (visible && (!membersById || Object.keys(membersById).length === 0)) {
			fetchCurrentGroupMembers().catch(() => {});
		}
	}, [visible]);

	useEffect(() => {
		if (initialChore) {
			setTitle(initialChore.title || '');
			setRepeat(initialChore.repeat || 'none');
			setCustomDays((initialChore.customDays || []).join(','));
			setAssigneesText((initialChore.assignees || []).join(','));
			setTypeSegment((initialChore.repeat && initialChore.repeat !== 'none') ? 'rec' : 'one');
			if (initialChore.dueAt) {
				const d = new Date(initialChore.dueAt);
				setSelectedDate(d);
				setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1));
			}
		}
	}, [initialChore]);

	const reset = () => {
		setTitle('');
		setHours('0');
		setRepeat('none');
		setCustomDays('');
		setAssigneesText('');
		setTypeSegment('one');
		setSelectedDate(null);
		setShowPicker(false);
		setNameError('');
	};

	const submit = async () => {
		if (!title.trim()) {
			setNameError('Please enter a chore name');
			return;
		}
		if (!selectedDate) return; // guard
		await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		const dueAt = new Date(selectedDate).toISOString();
		const assignees = assigneesText
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);
		const custom = customDays
			.split(',')
			.map((s) => parseInt(s.trim(), 10))
			.filter((n) => !Number.isNaN(n) && n >= 0 && n <= 6);
		const payload = { title: title.trim(), dueAt, assignees, repeat, customDays: custom };
		if (initialChore && onUpdate) {
			await onUpdate(initialChore.id, payload);
		} else if (onCreate) {
			await onCreate(payload);
		}
		reset();
		onClose();
	};

	// helpers
	const selectedAssignees = assigneesText.split(',').map((s) => s.trim()).filter(Boolean);
	const toggleAssignee = (id) => {
		const set = new Set(selectedAssignees);
		if (set.has(id)) set.delete(id); else set.add(id);
		setAssigneesText(Array.from(set).join(','));
	};
	const selectAllAssignees = () => {
		const all = Object.keys(membersById || {});
		setAssigneesText(all.join(','));
	};

	const formatDate = (d) => {
		if (!d) return 'Select date';
		return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
	};

	// map UI segments to existing repeat state
	useEffect(() => {
		if (typeSegment === 'one') {
			setRepeat('none');
			setCustomDays('');
		} else {
			setRepeat('weekly');
			if (selectedDate) setCustomDays(String(selectedDate.getDay()));
		}
	}, [typeSegment, selectedDate]);

	const disabled = !title.trim() || (selectedAssignees.length === 0) || !selectedDate;

	// Custom Calendar helpers
	const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
	const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
	const startWeekday = startOfMonth.getDay(); // 0..6
	const daysInMonth = endOfMonth.getDate();
	const grid = [];
	for (let i = 0; i < 42; i++) {
		const dayNumber = i - startWeekday + 1;
		const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dayNumber);
		const inCurrent = date.getMonth() === currentMonth.getMonth();
		grid.push({ date, inCurrent });
	}
	const isSameDay = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
	const isToday = (d) => isSameDay(d, new Date());
	const monthTitle = currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

	return (
		<Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
			<View style={styles.backdrop}>
				<BlurView intensity={30} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
				<View style={[styles.card, { maxHeight: screenHeight * 0.74, paddingBottom: Math.max(insets.bottom, 16) + 70, backgroundColor: UT.cardBg }]}> 
					{/* Top gradient and drag handle */}
					
					<View style={styles.handleContainer}>
						<View accessibilityLabel="Drag handle" style={styles.handle} />
					</View>

					{/* Header */}
					<View style={[styles.headerRow, { paddingTop: 6 + insets.top * 0.2 }]}> 
						<UTText variant="subtitle" style={{ fontSize: 20, fontFamily: 'Poppins_600SemiBold' }}>{initialChore ? 'Edit Chore' : 'New Chore'}</UTText>
						<Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={10}>
							<Ionicons name="close" size={26} color={UT.primary} />
						</Pressable>
					</View>

					<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
						<ScrollView contentContainerStyle={{ paddingBottom: 200 }} showsVerticalScrollIndicator={false}>
							{/* Assign To */}
							<View style={styles.section}>
								<UTText variant="label" style={{ color: 'black', marginBottom: spacing.xs }}>ASSIGN TO</UTText>
								<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 6 }}>
									{Object.entries(membersById || {}).map(([id, name]) => {
										const selected = selectedAssignees.includes(id);
										const initials = String(name || id).trim()[0]?.toUpperCase() || 'U';
										return (
											<Pressable
												key={id}
												onPress={() => toggleAssignee(id)}
												accessibilityRole="button"
												accessibilityLabel={`Assign ${name}`}
												style={[styles.chip, selected ? { backgroundColor: UT.primary } : { backgroundColor: '#FFFFFF' }]}
											>
												<View style={{ flexDirection: 'row', alignItems: 'center' }}>
													<View style={[styles.avatar, selected ? { backgroundColor: 'rgba(255,255,255,0.25)' } : { backgroundColor: 'rgba(0,0,0,0.04)' }]}>
														<UTText style={{ color: selected ? '#fff' : UT.primary, fontFamily: 'Poppins_600SemiBold' }}>{initials}</UTText>
													</View>
													<UTText style={{ color: selected ? '#fff' : UT.primary, marginLeft: 8 }}>{String(name || id)}</UTText>
												</View>
											</Pressable>
										);
									})}
									{Object.keys(membersById || {}).length > 3 ? (
										<Pressable onPress={selectAllAssignees} accessibilityRole="button" accessibilityLabel="Select all members" style={[styles.chip, { backgroundColor: 'transparent', borderColor: UT.primary }]}> 
											<UTText style={{ color: UT.primary, fontFamily: 'Poppins_600SemiBold' }}>All</UTText>
										</Pressable>
									) : null}
								</ScrollView>
							</View>

							{/* Chore Name */}
							<View style={styles.section}>
								<UTText variant="label" style={{ color: 'black', marginBottom: spacing.xs }}>CHORE NAME</UTText>
								<View style={styles.iconInputRow}>
									<Ionicons name="broom-outline" size={20} color={UT.primary} style={{ marginRight: 8 }} />
									<UTInput
										placeholder="e.g., Take out trash"
										value={title}
										onChangeText={(t) => { setTitle(t); if (t) setNameError(''); }}
										style={{ flex: 1 }}
									/>
								</View>
								{nameError ? <UTText style={{ color: UT.danger, marginTop: 6 }}>{nameError}</UTText> : null}
							</View>

							{/* Type */}
							<View style={styles.section}>
								<UTText variant="label" style={{ color: 'black', marginBottom: spacing.xs }}>TYPE</UTText>
								<View style={styles.segmentRow}>
									<Pressable
										onPress={async () => { setTypeSegment('one'); await Haptics.selectionAsync(); }}
										style={[styles.segmentPill, typeSegment === 'one' ? { backgroundColor: UT.primary } : { backgroundColor: '#FFFFFF' }]}
										accessibilityRole="button"
										accessibilityLabel="Select One-Time"
									>
										<UTText style={{ color: typeSegment === 'one' ? '#fff' : UT.primary, fontFamily: 'Poppins_600SemiBold' }}>One‑Time</UTText>
									</Pressable>
									<Pressable
										onPress={async () => { setTypeSegment('rec'); await Haptics.selectionAsync(); }}
										style={[styles.segmentPill, typeSegment === 'rec' ? { backgroundColor: UT.primary } : { backgroundColor: '#FFFFFF' }]}
										accessibilityRole="button"
										accessibilityLabel="Select Recurring"
									>
										<UTText style={{ color: typeSegment === 'rec' ? '#fff' : UT.primary, fontFamily: 'Poppins_600SemiBold' }}>Recurring</UTText>
									</Pressable>
								</View>
							</View>

							{/* Date selection */}
							<View style={styles.section}>
								<UTText variant="label" style={{ color: 'black', marginBottom: spacing.xs }}>{typeSegment === 'one' ? 'DUE DATE' : 'START DATE'}</UTText>
														<Pressable onPress={() => { setShowPicker(true); setCurrentMonth(new Date((selectedDate || new Date()).getFullYear(), (selectedDate || new Date()).getMonth(), 1)); }} style={[styles.segmentPill, { backgroundColor: '#FFFFFF', alignSelf: 'flex-start' }]} accessibilityRole="button" accessibilityLabel="Open date picker">
														<UTText style={{ color: isDark ? '#FFFFFF' : '#1E1E1E' }}>{formatDate(selectedDate)}</UTText>
								</Pressable>
								{showPicker && (
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
														{/* Weekday header */}
														<View style={styles.weekHeader}>
															{['Su','Mo','Tu','We','Th','Fr','Sa'].map((w) => (
																<UTText key={w} style={{ flex: 1, textAlign: 'center', color: isDark ? '#FFFFFF' : '#1E1E1E' }}>{w}</UTText>
															))}
														</View>
														{/* Grid */}
														<View style={styles.grid}>
															{grid.map(({ date, inCurrent }, idx) => {
																const selected = selectedDate && isSameDay(date, selectedDate);
																const today = isToday(date);
																return (
																	<Pressable
																		key={idx}
																		onPress={() => { setSelectedDate(date); if (typeSegment === 'rec') setCustomDays(String(date.getDay())); }}
																		style={[styles.dayCell, selected ? { backgroundColor: UT.primary } : { backgroundColor: '#FFFFFF', opacity: inCurrent ? 1 : 0.5 }]}
																		accessibilityRole="button"
																		accessibilityLabel={`Select ${date.toDateString()}`}
																	>
																		<UTText style={{ color: selected ? '#fff' : (isDark ? '#FFFFFF' : '#1E1E1E') }}>
																			{date.getDate()}
																		</UTText>
																		{today && !selected ? <View style={[styles.todayDot, { backgroundColor: UT.primary }]} /> : null}
																	</Pressable>
																);
															})}
														</View>
														<View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, paddingTop: spacing.sm }}>
															<Pressable onPress={() => setShowPicker(false)} style={[styles.segmentPill, { backgroundColor: '#FFFFFF', marginLeft: 'auto' }]} accessibilityRole="button" accessibilityLabel="Close date picker">
																<UTText style={{ color: UT.primary }}>Done</UTText>
															</Pressable>
														</View>
													</View>
								)}
							</View>

						</ScrollView>
					</KeyboardAvoidingView>

					{/* Sticky Footer */}
					<View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}> 
						<UTButton title="Cancel" variant="secondary" onPress={() => { reset(); onClose(); }} style={{ flex: 1, marginRight: spacing.sm }} />
						<UTButton title={initialChore ? 'Save' : 'Add Chore'} onPress={submit} style={{ flex: 1, marginLeft: spacing.sm }} disabled={disabled} />
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
	chip: { height: 44, paddingHorizontal: 12, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginRight: 8, borderWidth: 0 },
	segmentRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
	segmentPill: { height: 44, paddingHorizontal: 16, borderRadius: 999, borderWidth: 0, alignItems: 'center', justifyContent: 'center' },
	weekdayRow: { flexDirection: 'row', gap: 8, marginTop: spacing.sm },
	weekdayChip: { height: 44, minWidth: 44, paddingHorizontal: 12, borderRadius: 999, borderWidth: 0, alignItems: 'center', justifyContent: 'center' },
	iconInputRow: { flexDirection: 'row', alignItems: 'center' },
	footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, backgroundColor: 'transparent', flexDirection: 'row' },
	avatar: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
	pickerCard: { borderWidth: 0, borderRadius: 16, overflow: 'hidden', marginTop: spacing.sm },
	pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
	weekHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingBottom: spacing.xs },
	grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.md, rowGap: 6, columnGap: 6 },
	dayCell: { width: (300 - (spacing.md * 2) - (6 * 6)) / 7, height: 28, borderRadius: 8, borderWidth: 0, alignItems: 'center', justifyContent: 'center', position: 'relative' },
	todayDot: { position: 'absolute', bottom: 6, width: 4, height: 4, borderRadius: 2 },
});