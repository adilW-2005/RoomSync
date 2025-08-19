import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, FlatList, Modal, Pressable, Dimensions, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import UTText from '../../components/UTText';
import UTInput from '../../components/UTInput';
import UTCard from '../../components/UTCard';
import UTButton from '../../components/UTButton';
import EmptyState from '../../components/EmptyState';
import FadeSlideIn from '../../components/FadeSlideIn';
import useEventStore from '../../state/useEventStore';
import useChoreStore from '../../state/useChoreStore';
import useExpenseStore from '../../state/useExpenseStore';
import { colors, spacing } from '../../styles/theme';
import CreateEventModal from './CreateEventModal';

// Date helpers
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
const endOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
const startOfWeek = (d) => { const s = new Date(d); const diff = s.getDay(); s.setDate(s.getDate() - diff); s.setHours(0,0,0,0); return s; };
const endOfWeek = (d) => { const s = startOfWeek(d); const e = new Date(s); e.setDate(s.getDate() + 6); e.setHours(23,59,59,999); return e; };
const isSameDay = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export default function EventsScreen({ navigation }) {
  const { events, fetchEvents, createEvent, loading: eventsLoading } = useEventStore();
  const { openChores, doneChores, fetchOpen, fetchDone, loading: choresLoading } = useChoreStore();
  const { expenses, fetchExpenses, loading: expensesLoading } = useExpenseStore();

  // Anchor week and selection
  const [anchor, setAnchor] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(() => new Date());
  const [dayFocused, setDayFocused] = useState(false);

  // Month picker state
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(() => new Date());

  // Quick event modal state
  const [modal, setModal] = useState(false);

  useEffect(() => { fetchEvents(); fetchOpen().catch(() => {}); fetchDone().catch(() => {}); fetchExpenses({ page: 1 }).catch(() => {}); }, []);

  // Header label: week range or single day
  const headerLabel = useMemo(() => {
    if (dayFocused) {
      return selectedDay.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
    }
    const s = startOfWeek(anchor); const e = endOfWeek(anchor);
    const sFmt = s.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const eFmt = e.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    return `${sFmt} - ${eFmt}`;
  }, [dayFocused, anchor, selectedDay]);

  // Agenda range
  const range = useMemo(() => {
    return dayFocused
      ? { start: startOfDay(selectedDay), end: endOfDay(selectedDay) }
      : { start: startOfWeek(anchor), end: endOfWeek(anchor) };
  }, [dayFocused, anchor, selectedDay]);

  // Combine agenda items
  const agenda = useMemo(() => {
    const items = [];
    (events || []).forEach((ev) => { const d = new Date(ev.startAt); if (d >= range.start && d <= range.end) items.push({ id: `event-${ev.id}`, type: 'event', date: d, title: ev.title, startAt: ev.startAt, endAt: ev.endAt, locationText: ev.locationText }); });
    (openChores || []).forEach((c) => { const d = new Date(c.dueAt); if (d >= range.start && d <= range.end) items.push({ id: `chore-${c.id}`, type: 'chore', date: d, title: c.title, status: 'open' }); });
    (doneChores || []).forEach((c) => { const d = new Date(c.dueAt || c.updatedAt || c.createdAt); if (d >= range.start && d <= range.end) items.push({ id: `chore-${c.id}`, type: 'chore', date: d, title: c.title, status: 'done' }); });
    (expenses || []).forEach((ex) => { const d = new Date(ex.createdAt); if (d >= range.start && d <= range.end) items.push({ id: `expense-${ex.id}`, type: 'expense', date: d, title: ex.notes || 'Expense', amount: ex.amount }); });
    items.sort((a, b) => a.date - b.date);
    return items;
  }, [events, openChores, doneChores, expenses, range.start.getTime(), range.end.getTime()]);

  // Week days row
  const weekDays = useMemo(() => {
    const s = startOfWeek(anchor);
    return Array.from({ length: 7 }).map((_, i) => new Date(s.getFullYear(), s.getMonth(), s.getDate() + i));
  }, [anchor]);

  // Month grid for picker (6x7)
  const monthGrid = useMemo(() => {
    const s = new Date(pickerMonth.getFullYear(), pickerMonth.getMonth(), 1);
    const e = new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() + 1, 0);
    const startPad = s.getDay();
    const cells = 42;
    const arr = [];
    for (let i = 0; i < cells; i++) {
      const dayNum = i - startPad + 1;
      const date = new Date(pickerMonth.getFullYear(), pickerMonth.getMonth(), dayNum);
      const inCurrent = date.getMonth() === pickerMonth.getMonth();
      arr.push({ date, inCurrent });
    }
    return arr;
  }, [pickerMonth]);

  const onPrevWeek = () => {
    setAnchor((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7));
    if (dayFocused) setSelectedDay((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7));
  };
  const onNextWeek = () => {
    setAnchor((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7));
    if (dayFocused) setSelectedDay((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7));
  };

  const onTapHeaderDate = () => {
    setPickerMonth(new Date(dayFocused ? selectedDay : anchor));
    setShowPicker(true);
  };

  const onSelectPickerDate = (d) => {
    setSelectedDay(d);
    setAnchor(d);
    setDayFocused(true);
    setShowPicker(false);
  };

  const openCreate = () => {
    setModal(true);
  };

  const submitEvent = async (payload) => {
    try { await createEvent(payload); setModal(false); } catch (e) { Alert.alert('Error', e.message || 'Failed to create'); }
  };

  // Fixed width for centered month grid
  const PICKER_W = 300;
  const pickerCellW = (PICKER_W - (6 * 6)) / 7;

  return (
    <View style={styles.container}>
      {/* Header with week nav and tappable date */}
      <View style={styles.headerRow}>
        <Pressable onPress={onPrevWeek} accessibilityLabel="Previous week"><Ionicons name="chevron-back" size={22} color={colors.burntOrange} /></Pressable>
        <Pressable onPress={onTapHeaderDate} accessibilityLabel="Open calendar">
          <UTText variant="subtitle" style={{ color: colors.deepCharcoal }}>{headerLabel}</UTText>
        </Pressable>
        <Pressable onPress={onNextWeek} accessibilityLabel="Next week"><Ionicons name="chevron-forward" size={22} color={colors.burntOrange} /></Pressable>
      </View>

      {/* Week row (always visible) */}
      <View style={styles.weekBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, alignItems: 'center' }}>
          {weekDays.map((d) => {
            const selected = dayFocused && isSameDay(d, selectedDay);
            return (
              <Pressable
                key={d.toDateString()}
                onPress={() => { if (dayFocused && isSameDay(d, selectedDay)) { setDayFocused(false); } else { setSelectedDay(d); setDayFocused(true); } }}
                style={[styles.dayPill, { backgroundColor: selected ? colors.burntOrange : colors.white, borderColor: selected ? colors.burntOrange : '#E5E5EA' }]}
                accessibilityLabel={`Select ${d.toDateString()}`}
              >
                <UTText style={{ color: selected ? colors.white : colors.deepCharcoal }}>{d.toLocaleDateString(undefined, { weekday: 'short' })}</UTText>
                <UTText style={{ color: selected ? colors.white : colors.deepCharcoal, marginTop: 2 }}>{d.getDate()}</UTText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Month picker panel */}
      {showPicker ? (
        <View style={styles.pickerWrap}>
          <View style={[styles.pickerCard, { width: PICKER_W }]}> 
            <View style={styles.pickerHeader}>
              <Pressable onPress={() => setPickerMonth(new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() - 1, 1))} accessibilityLabel="Previous month"><Ionicons name="chevron-back" size={20} color={colors.burntOrange} /></Pressable>
              <UTText style={{ color: colors.burntOrange, fontFamily: 'Poppins_600SemiBold' }}>{pickerMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</UTText>
              <Pressable onPress={() => setPickerMonth(new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() + 1, 1))} accessibilityLabel="Next month"><Ionicons name="chevron-forward" size={20} color={colors.burntOrange} /></Pressable>
            </View>
            <View style={styles.weekHeader}>{['Su','Mo','Tu','We','Th','Fr','Sa'].map((w) => (<UTText key={w} style={{ flex: 1, textAlign: 'center' }}>{w}</UTText>))}</View>
            <View style={styles.grid}>
              {monthGrid.map(({ date, inCurrent }, idx) => {
                const sel = isSameDay(date, selectedDay);
                return (
                  <Pressable key={idx} onPress={() => onSelectPickerDate(date)} style={[styles.dayCell, { width: pickerCellW }, sel ? { backgroundColor: colors.burntOrange } : { backgroundColor: colors.white, opacity: inCurrent ? 1 : 0.5 }]}>
                    <UTText style={{ color: sel ? colors.white : colors.deepCharcoal }}>{date.getDate()}</UTText>
                  </Pressable>
                );
              })}
            </View>
            <View style={{ alignItems: 'flex-end', paddingTop: spacing.xs }}>
              <Pressable onPress={() => setShowPicker(false)} style={[styles.segmentPill, { backgroundColor: colors.white }]}><UTText style={{ color: colors.burntOrange }}>Done</UTText></Pressable>
            </View>
          </View>
        </View>
      ) : null}

      {/* Agenda list */}
      <FlatList
        data={agenda}
        keyExtractor={(i) => i.id}
        refreshing={eventsLoading || choresLoading || expensesLoading}
        onRefresh={() => { fetchEvents(); fetchOpen().catch(() => {}); fetchDone().catch(() => {}); fetchExpenses({ page: 1 }).catch(() => {}); }}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 160 }}
        ListHeaderComponent={(<View style={{ paddingTop: spacing.md }}><UTText variant="subtitle" style={{ marginBottom: spacing.sm }}>{dayFocused ? `Agenda for ${selectedDay.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}` : 'This Week'}</UTText></View>)}
        ListEmptyComponent={(<EmptyState title="No events or chores" subtitle="Add an event to get started." icon="🗓️" />)}
        renderItem={({ item, index }) => (
          <FadeSlideIn delay={index * 35}>
            <UTCard style={{ marginBottom: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {item.type === 'event' ? (
                  <View style={[styles.iconCircle, { backgroundColor: '#FFE4D1' }]}><Ionicons name="calendar-outline" size={18} color={colors.burntOrange} /></View>
                ) : item.type === 'chore' ? (
                  <View style={[styles.iconCircle, { backgroundColor: '#FFF3EC' }]}><Ionicons name={item.status === 'done' ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={colors.burntOrange} /></View>
                ) : (
                  <View style={[styles.iconCircle, { backgroundColor: '#FFF3EC' }]}><Ionicons name="cash-outline" size={18} color={colors.burntOrange} /></View>
                )}
                <View style={{ marginLeft: spacing.sm, flex: 1 }}>
                  <UTText variant="subtitle">{item.title}</UTText>
                  {item.type === 'event' ? (
                    <UTText variant="meta" style={{ marginTop: 2 }}>
                      {new Date(item.startAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}{item.endAt ? ` - ${new Date(item.endAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''}
                    </UTText>
                  ) : item.type === 'expense' ? (
                    <UTText variant="meta" style={{ marginTop: 2, color: colors.burntOrange }}>Due ${Number(item.amount || 0).toFixed(2)}</UTText>
                  ) : (
                    <UTText variant="meta" style={{ marginTop: 2, color: colors.burntOrange }}>{item.status === 'done' ? 'Completed' : 'Pending'}</UTText>
                  )}
                </View>
              </View>
            </UTCard>
          </FadeSlideIn>
        )}
      />

      {/* FAB */}
      <Pressable onPress={openCreate} style={styles.fab} accessibilityLabel="Create">
        <Ionicons name="add" size={26} color={colors.white} />
      </Pressable>

      <CreateEventModal visible={modal} onClose={() => setModal(false)} onCreate={submitEvent} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.lightGray },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  weekBar: { height: 78, justifyContent: 'center', marginBottom: spacing.sm },
  dayPill: { width: 64, height: 64, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  weekHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: spacing.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 6, columnGap: 6 },
  dayCell: { height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  iconCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: spacing.xs },
  segmentPill: { height: 34, paddingHorizontal: 16, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  pickerWrap: { alignItems: 'center', marginTop: spacing.sm, marginBottom: spacing.sm, zIndex: 2 },
  pickerCard: { backgroundColor: colors.white, borderRadius: 16, padding: spacing.md, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  fab: { position: 'absolute', right: 20, bottom: 80, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.burntOrange, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  backdrop: { },
  sheet: { },
}); 