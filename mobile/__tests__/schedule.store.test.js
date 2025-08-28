import useScheduleStore from '../src/state/useScheduleStore';
import * as Notifications from 'expo-notifications';

jest.mock('expo-notifications');

describe('useScheduleStore reminders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('reschedules notifications on lead time change', async () => {
    const { getState, setState } = useScheduleStore;
    setState({ nextClass: { course: 'C S 311', building: 'GDC', room: '2.216', start_time: '23:59' }, scheduledIds: ['a','b'], leadTimes: [30, 10] });
    await getState().rescheduleReminders();
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(2);
    const scheduledFirst = Notifications.scheduleNotificationAsync.mock.calls.length;
    await getState().setLeadTimes([60, 15]);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(scheduledFirst + 2);
  });
}); 