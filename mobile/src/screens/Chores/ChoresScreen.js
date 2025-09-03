import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, FlatList, SafeAreaView, Dimensions, Animated, Modal, ActionSheetIOS, Alert, ScrollView } from 'react-native';
import { PanGestureHandler, State, Swipeable } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import useChoreStore from '../../state/useChoreStore';
import useGroupStore from '../../state/useGroupStore';
import CreateChoreModal from './CreateChoreModal';
import { scheduleChoreReminder } from '../../lib/notifications';
import useAuthStore from '../../state/useAuthStore';
import EmptyState from '../../components/EmptyState';
import SkeletonList from '../../components/SkeletonList';
import UTText from '../../components/UTText';
import UTCard from '../../components/UTCard';
import UTButton from '../../components/UTButton';
import PressableScale from '../../components/PressableScale';
import { spacing, colors, radii, shadows } from '../../styles/theme';
import { sdk } from '../../api/sdk';

const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];
const SCREEN_WIDTH = Dimensions.get('window').width;
const LEFT_FLEX = 9; // title column
const RIGHT_FLEX = 10; // 7-day grid column

function startOfWeek(d) { const x = new Date(d); const day = x.getDay(); x.setDate(x.getDate() - day); x.setHours(0,0,0,0); return x; }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function formatRange(s) { const e = addDays(s, 6); return `${s.getMonth()+1}/${s.getDate()} – ${e.getMonth()+1}/${e.getDate()}`; }
function isSameDay(a, b) { return new Date(a).toDateString() === new Date(b).toDateString(); }
function keyFor(date) { const d = new Date(date); return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`; }

function buildChorePingBody(chore) {
	try { 
		const dueDate = new Date(chore.dueAt);
		const dateStr = dueDate.toLocaleDateString(undefined, { 
			weekday: 'long', 
			month: 'short', 
			day: 'numeric' 
		});
		return `Reminder: ${chore.title} due ${dateStr}`;
	} catch (_) { 
		return `Reminder: ${chore.title}`; 
	}
}

export default function ChoresScreen() {
	const { openChores, doneChores, fetchOpen, fetchDone, completeChore, createChore, updateChore, loading } = useChoreStore();
	const { currentGroup } = useGroupStore();
	const { user } = useAuthStore();
	const [modal, setModal] = useState(false);
	const [editChore, setEditChore] = useState(null);
	const [weekStart, setWeekStart] = useState(startOfWeek(new Date()));
	const [filterMode, setFilterMode] = useState('group'); // 'group' | 'mine' | 'roommate'
	const [filterOpen, setFilterOpen] = useState(false);
	const [selectedRoommateId, setSelectedRoommateId] = useState(null);
	const [pingModal, setPingModal] = useState({ visible: false, uid: null, name: '', chores: [] });

	useEffect(() => { fetchOpen(); fetchDone(); }, []);

	const members = (currentGroup?.members || []).map((m) => ({ id: m.id || m._id || m, name: m.name || 'Member', avatarUrl: m.avatarUrl }));

	const openByAssignee = useMemo(() => {
		const map = new Map();
		for (const c of openChores || []) {
			const list = Array.isArray(c.assignees) && c.assignees.length ? c.assignees : ['unassigned'];
			for (const uid of list) {
				if (!map.has(String(uid))) map.set(String(uid), []);
				map.get(String(uid)).push(c);
			}
		}
		return map;
	}, [openChores]);

	const doneByAssignee = useMemo(() => {
		const map = new Map();
		for (const c of doneChores || []) {
			const list = Array.isArray(c.assignees) && c.assignees.length ? c.assignees : ['unassigned'];
			for (const uid of list) {
				if (!map.has(String(uid))) map.set(String(uid), []);
				map.get(String(uid)).push(c);
			}
		}
		return map;
	}, [doneChores]);

	const filteredMembers = useMemo(() => {
		const base = members.length ? members : [{ id: 'unassigned', name: 'Unassigned' }];
		if (filterMode === 'mine' && user?.id) return base.filter((m) => String(m.id) === String(user.id));
		if (filterMode === 'roommate' && selectedRoommateId) return base.filter((m) => String(m.id) === String(selectedRoommateId));
		return base; // group
	}, [members, filterMode, selectedRoommateId, user?.id]);

	const onCreate = async (payload) => {
		const created = await createChore(payload);
		await fetchOpen();
		await scheduleChoreReminder({ title: created.title, dueAt: created.dueAt });
	};

	const onUpdate = async (id, updates) => {
		await updateChore(id, updates);
		setEditChore(null);
	};

	const goWeek = (delta) => { setWeekStart((s) => addDays(s, 7 * delta)); };

	const onSwipe = ({ nativeEvent }) => {
		const { translationX, state } = nativeEvent;
		if (state === State.END) {
			if (translationX < -SCREEN_WIDTH * 0.2) goWeek(1);
			else if (translationX > SCREEN_WIDTH * 0.2) goWeek(-1);
		}
	};

	const ProgressBar = ({ total, completed }) => {
		const pct = total > 0 ? Math.min(1, completed / total) : 0;
		return (
			<View style={styles.progressOuter}>
				<View style={[styles.progressInner, { width: `${pct * 100}%` }]} />
			</View>
		);
	};

	const renderRightActions = (onComplete, onDelete) => (progress) => (
		<Animated.View style={[styles.swipeActions, { opacity: progress }]}> 
			<PressableScale onPress={onComplete} style={[styles.actionBtn, { backgroundColor: '#34C759' }]}>
				<Ionicons name="checkmark" size={18} color="#fff" />
			</PressableScale>
			<PressableScale onPress={onDelete} style={[styles.actionBtn, { backgroundColor: '#EF4444' }]}>
				<Ionicons name="trash" size={18} color="#fff" />
			</PressableScale>
		</Animated.View>
	);

	const RoommateSection = ({ roommate }) => {
		const uid = String(roommate.id);
		const openListAll = openByAssignee.get(uid) || [];
		const doneListAll = doneByAssignee.get(uid) || [];
		const end = addDays(weekStart, 6);
		const within = (c) => { const d = new Date(c.dueAt); return d >= weekStart && d <= end; };
		const combined = [...openListAll.filter(within), ...doneListAll.filter(within)];
		combined.sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));
		const completedThisWeek = doneListAll.filter(within).length;
		const totalThisWeek = combined.length || (openListAll.filter(within).length);

		const openPingModal = () => {
			const choices = (openListAll || []).slice().sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));
			setPingModal({ visible: true, uid, name: roommate.name, chores: choices });
		};

		return (
			<View style={{ marginBottom: spacing.lg }}>
				<LinearGradient colors={["#FFF9F2", "#FFFFFF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radii.card }}> 
					<UTCard style={{ backgroundColor: 'transparent' }}>
						<PanGestureHandler onHandlerStateChange={onSwipe}>
							<View>
								<View style={styles.sectionHeader}>
									<View style={styles.avatar}>
										<UTText variant="subtitle" style={{ color: colors.burntOrange }}>{(roommate.name || '?').slice(0,1)}</UTText>
									</View>
									<View style={{ flex: 1 }}>
										<UTText variant="subtitle" style={{ fontSize: 20 }}>{roommate.name}</UTText>
										<View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
											<PressableScale onPress={() => goWeek(-1)} style={[styles.backBtn, { marginRight: 8 }]}>
												<Ionicons name="chevron-back" size={18} color={colors.burntOrange} />
											</PressableScale>
											<UTText variant="meta">{formatRange(weekStart)}</UTText>
											<PressableScale onPress={() => goWeek(1)} style={[styles.backBtn, { marginLeft: 8 }]}>
												<Ionicons name="chevron-forward" size={18} color={colors.burntOrange} />
											</PressableScale>
										</View>
									</View>
									<PressableScale onPress={openPingModal} style={[styles.backBtn, { marginLeft: 8 }]}> 
										<Ionicons name="notifications-outline" size={18} color={colors.burntOrange} />
									</PressableScale>
								</View>
								{combined.length === 0 ? (
									<UTText variant="meta" style={{ paddingVertical: spacing.md, paddingHorizontal: spacing.sm }}>No chores</UTText>
								) : (
									combined.map((c, idx) => {
										const isDone = c.status === 'done';
										const rightActions = renderRightActions(() => !isDone && completeChore(c.id), () => onUpdate(c.id, { status: 'done' }));
										const onLong = () => {
											const options = ['Ping assignee', 'Edit', 'Cancel'];
											const cancel = 2;
											ActionSheetIOS.showActionSheetWithOptions({ options, cancelButtonIndex: cancel }, async (i) => {
												if (i === 0) {
													try {
														const assignees = Array.isArray(c.assignees) && c.assignees.length ? c.assignees : [uid];
														for (const toUserId of assignees) {
															await sdk.notifications.ping({ toUserId: String(toUserId), contextType: 'chore', contextId: c.id, title: 'Chore reminder', body: buildChorePingBody(c) });
														}
														Alert.alert('Ping sent');
													} catch (e) { Alert.alert('Ping failed', e.message || 'Try again'); }
												}
												if (i === 1) { setEditChore(c); setModal(true); }
											});
										};
										return (
											<Swipeable key={c.id} renderRightActions={rightActions} overshootRight={false}>
												<PressableScale onLongPress={onLong}>
													<View style={[styles.choreRow, idx % 2 === 1 && styles.choreRowAlt]}>
														<View style={{ flex: LEFT_FLEX, flexDirection: 'row', alignItems: 'center' }}>
															<Ionicons name={isDone ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={isDone ? '#22C55E' : colors.burntOrange} style={{ marginRight: 8 }} />
															<View>
																<UTText variant="body" style={{ fontFamily: 'Poppins_600SemiBold', textDecorationLine: isDone ? 'line-through' : 'none' }}> {c.title}</UTText>
																<UTText variant="meta" style={{ marginTop: 2 }}>Week • {new Date(c.dueAt).toLocaleDateString(undefined, { weekday: 'short' })}</UTText>
															</View>
														</View>
													<View style={styles.statusWrap}>
														<View style={[styles.statusDot, isDone ? styles.statusDone : styles.statusPending]}>
															{isDone && <Ionicons name="checkmark" size={12} color="#fff" />}
														</View>
														<UTText variant="meta" style={{ marginLeft: 8 }}>{new Date(c.dueAt).toLocaleDateString(undefined, { weekday: 'short' })}</UTText>
													</View>
												</View>
												</PressableScale>
											</Swipeable>
										);
									})
								)}
								<ProgressBar total={totalThisWeek} completed={completedThisWeek} />
							</View>
						</PanGestureHandler>
					</UTCard>
				</LinearGradient>
			</View>
		);
	};

	return (
		<SafeAreaView style={styles.safe}>
			<View style={styles.container}>
				<View style={styles.headerRow}>
					<View style={{ flexDirection: 'row', alignItems: 'center' }}>
						<PressableScale onPress={() => { /* back via header */ }} style={styles.backBtn}>
							<Ionicons name="chevron-back" size={22} color={colors.burntOrange} />
						</PressableScale>
						<UTText variant="title" style={{ color: colors.burntOrange, marginLeft: 4 }}>Group Chores</UTText>
					</View>
					<PressableScale onPress={() => setFilterOpen(true)} style={styles.filterTrigger}>
						<View style={{ flexDirection: 'row', alignItems: 'center' }}>
							<UTText variant="label" color={colors.white}>
								{filterMode === 'group' ? 'Group' : filterMode === 'mine' ? 'My' : 'Roommate'}
							</UTText>
							<Ionicons name="chevron-down" size={14} color="#fff" style={{ marginLeft: 4 }} />
						</View>
					</PressableScale>
				</View>
				{loading ? (
					<SkeletonList />
				) : filteredMembers.length === 0 ? (
					<EmptyState title="No chores yet" subtitle="No chores yet — add one!" />
				) : (
					<FlatList
						data={filteredMembers}
						keyExtractor={(m) => String(m.id)}
						renderItem={({ item }) => <RoommateSection roommate={item} />}
						contentContainerStyle={{ paddingBottom: 120 }}
					/>
				)}

				<Modal visible={filterOpen} animationType="fade" transparent onRequestClose={() => setFilterOpen(false)}>
					<View style={styles.dropdownBackdrop}>
						<View style={styles.dropdownWrapper}>
							<UTCard style={styles.dropdownCard}>
								<PressableScale onPress={() => { setFilterMode('group'); setFilterOpen(false); }} style={styles.memberRow}> 
									<View style={styles.avatarSmall}><UTText variant="subtitle" style={{ color: colors.burntOrange }}>G</UTText></View>
									<UTText variant="body">Group</UTText>
								</PressableScale>
								<PressableScale onPress={() => { setFilterMode('mine'); setFilterOpen(false); }} style={styles.memberRow}> 
									<View style={styles.avatarSmall}><UTText variant="subtitle" style={{ color: colors.burntOrange }}>M</UTText></View>
									<UTText variant="body">Me</UTText>
								</PressableScale>
								<View style={{ height: 1, backgroundColor: '#EEE', marginVertical: 6 }} />
								{members.map((m) => (
									<PressableScale key={String(m.id)} onPress={() => { setSelectedRoommateId(String(m.id)); setFilterMode('roommate'); setFilterOpen(false); }} style={styles.memberRow}>
										<View style={styles.avatarSmall}><UTText variant="subtitle" style={{ color: colors.burntOrange }}>{(m.name||'?').slice(0,1)}</UTText></View>
										<UTText variant="body">{m.name}</UTText>
									</PressableScale>
								))}
							</UTCard>
						</View>
					</View>
				</Modal>

				{/* Ping selection modal */}
				<Modal visible={pingModal.visible} animationType="fade" transparent onRequestClose={() => setPingModal({ visible: false, uid: null, name: '', chores: [] })}>
					<View style={styles.dropdownBackdrop}>
						<View style={[styles.dropdownWrapper, { right: undefined, left: spacing.lg, top: 120 }] }>
							<UTCard style={[styles.dropdownCard, { width: 300 }] }>
								<UTText variant="subtitle" style={{ marginBottom: spacing.sm }}>Ping {pingModal.name}</UTText>
								<ScrollView style={{ maxHeight: 260 }}>
									{(pingModal.chores || []).length ? (
										pingModal.chores.map((c) => (
											<PressableScale key={c.id} onPress={async () => {
												try {
													await sdk.notifications.ping({ toUserId: pingModal.uid, contextType: 'chore', contextId: c.id, title: 'Chore reminder', body: buildChorePingBody(c) });
													Alert.alert('Ping sent');
												} catch (e) { Alert.alert('Ping failed', e.message || 'Try again'); }
												setPingModal({ visible: false, uid: null, name: '', chores: [] });
											}} style={styles.memberRow}>
												<View style={styles.avatarSmall}><UTText variant="subtitle" style={{ color: colors.burntOrange }}>{(c.title || '?').slice(0,1)}</UTText></View>
												<View>
													<UTText variant="body">{c.title}</UTText>
													<UTText variant="meta">Due {new Date(c.dueAt).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</UTText>
												</View>
											</PressableScale>
										))
									) : (
										<UTText variant="meta">No open chores to ping</UTText>
									)}
								</ScrollView>
								<View style={{ alignItems: 'flex-end', marginTop: spacing.sm }}>
									<PressableScale onPress={() => setPingModal({ visible: false, uid: null, name: '', chores: [] })} style={styles.memberRow}>
										<UTText variant="label" style={{ color: colors.burntOrange }}>Close</UTText>
									</PressableScale>
								</View>
							</UTCard>
						</View>
					</View>
				</Modal>

				<PressableScale onPress={() => { setEditChore(null); setModal(true); }} style={styles.fab}>
					<Ionicons name="add" size={28} color="#fff" />
				</PressableScale>
				<CreateChoreModal visible={modal} onClose={() => setModal(false)} onCreate={onCreate} onUpdate={onUpdate} initialChore={editChore} />
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safe: { flex: 1, backgroundColor: colors.white },
	container: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
	headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
	backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF6EC', alignItems: 'center', justifyContent: 'center', marginRight: 6 },
	filterTrigger: { backgroundColor: colors.burntOrange, height: 34, borderRadius: 17, paddingHorizontal: spacing.md, alignItems: 'center', justifyContent: 'center' },
	sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
	avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFE4CC', alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
	choreRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.sm, borderRadius: radii.button },
	choreRowAlt: { backgroundColor: '#FAFAFA' },
	statusWrap: { flexDirection: 'row', alignItems: 'center' },
	statusDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.burntOrange, backgroundColor: '#FFF6EC', alignItems: 'center', justifyContent: 'center' },
	statusPending: { backgroundColor: colors.burntOrange, borderColor: colors.burntOrange, opacity: 0.85 },
	statusDone: { backgroundColor: colors.burntOrange, borderColor: colors.burntOrange },
	progressOuter: { height: 6, backgroundColor: '#F1F1F1', borderRadius: 4, overflow: 'hidden', marginTop: spacing.sm },
	progressInner: { height: 6, backgroundColor: colors.burntOrange },
	swipeActions: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6 },
	actionBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginHorizontal: 4 },
	dropdownBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.05)' },
	dropdownWrapper: { position: 'absolute', top: 68, right: spacing.lg },
	dropdownCard: { width: 240, paddingVertical: spacing.sm },
	memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
	avatarSmall: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFE4CC', alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
	fab: { position: 'absolute', right: 20, bottom: 30, backgroundColor: '#BF5700', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8 },
}); 