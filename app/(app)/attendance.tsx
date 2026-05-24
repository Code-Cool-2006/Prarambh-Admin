import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Platform,
  Alert,
} from 'react-native';
import client from '@/src/api/client';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

interface AttendanceRecord {
  id: string | number;
  name: string;
  check_ins: number;
  last_in: string | null;
  last_out: string | null;
}

export default function AttendanceList() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const today = useMemo(() => {
    return new Date().toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }, []);

  const handleExportCSV = async () => {
    if (records.length === 0) {
      Alert.alert('No Data', 'There is no attendance data to export.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const headers = ['ID', 'Name', 'Status', 'Check-ins', 'Check-in Time'];
      const rows = records.map(r => {
        const isPresent = r.check_ins > 0;
        const statusText = isPresent ? 'Present' : 'Absent';
        const timeText = isPresent && r.last_in ? new Date(r.last_in).toLocaleTimeString() : 'N/A';
        return [
          r.id,
          `"${r.name.replace(/"/g, '""')}"`,
          statusText,
          r.check_ins,
          timeText
        ].join(',');
      });

      const csvContent = [headers.join(','), ...rows].join('\n');
      const dateStr = new Date().toISOString().slice(0, 10);
      const fileUri = `${FileSystem.documentDirectory}Attendance_Report_${dateStr}.csv`;

      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: `Export Attendance Report - ${dateStr}`,
          UTI: 'public.comma-separated-values-text'
        });
      } else {
        Alert.alert('Success', `Report saved to: ${fileUri}`);
      }
    } catch (err) {
      console.error('Failed to export CSV:', err);
      Alert.alert('Export Failed', 'An error occurred while generating the CSV file.');
    }
  };

  const fetchRecords = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const res = await client.get('/attendance/report/today');
      // Sort: present first, then alphabetically by name
      const sorted = res.data.sort((a: AttendanceRecord, b: AttendanceRecord) => {
        if (a.check_ins > 0 && b.check_ins === 0) return -1;
        if (a.check_ins === 0 && b.check_ins > 0) return 1;
        return a.name.localeCompare(b.name);
      });
      setRecords(sorted);
    } catch (err) {
      console.log('Error fetching records:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fetchRecords(false);
  };

  const { present, absent, total } = useMemo(() => {
    const p = records.filter(r => r.check_ins > 0).length;
    const t = records.length;
    return {
      present: p,
      absent: t - p,
      total: t,
    };
  }, [records]);

  // Filter records based on search query
  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return records;
    return records.filter(r =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [records, searchQuery]);

  const initials = (name: string) => {
    return name
      .split(' ')
      .filter(n => n.length > 0)
      .map(n => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '';
    }
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  return (
    <View style={s.screen}>
      {/* Date Header Strip */}
      <View style={s.dateStrip}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="calendar-outline" size={16} color="#94A3B8" style={{ marginRight: 6 }} />
          <Text style={s.dateLabel}>{today}</Text>
        </View>
        <TouchableOpacity style={s.exportBtn} onPress={handleExportCSV} activeOpacity={0.7}>
          <Ionicons name="download-outline" size={14} color="#10B981" style={{ marginRight: 4 }} />
          <Text style={s.exportText}>Export CSV</Text>
        </TouchableOpacity>
      </View>

      {/* Summary Dashboard Card */}
      <LinearGradient
        colors={['#1E293B', '#0F172A']}
        style={s.dashboard}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <View style={s.dashboardRow}>
          <View style={s.summaryItem}>
            <Text style={[s.summaryNum, { color: '#10B981' }]}>{present}</Text>
            <Text style={s.summaryLabel}>Present</Text>
          </View>
          <View style={s.divider} />
          <View style={s.summaryItem}>
            <Text style={[s.summaryNum, { color: '#F59E0B' }]}>{absent}</Text>
            <Text style={s.summaryLabel}>Absent</Text>
          </View>
          <View style={s.divider} />
          <View style={s.summaryItem}>
            <Text style={[s.summaryNum, { color: '#38BDF8' }]}>{total}</Text>
            <Text style={s.summaryLabel}>Total</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Search Input */}
      <View style={s.searchContainer}>
        <View style={s.searchWrapper}>
          <Ionicons name="search-outline" size={18} color="#94A3B8" style={s.searchIcon} />
          <TextInput
            style={s.searchInput}
            placeholder="Search attendee by name..."
            placeholderTextColor="#6B7280"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={s.clearBtn}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Attendance List */}
      <FlatList
        data={filteredRecords}
        keyExtractor={r => String(r.id)}
        contentContainerStyle={s.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#10B981"
            colors={['#10B981']}
          />
        }
        ListEmptyComponent={
          <View style={s.emptyContainer}>
            <Ionicons name="people-outline" size={48} color="#475569" style={{ marginBottom: 12 }} />
            <Text style={s.emptyText}>
              {searchQuery ? 'No attendees match your search' : 'No attendance logs recorded today'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isPresent = item.check_ins > 0;
          return (
            <View style={[s.row, isPresent ? s.rowPresent : s.rowAbsent]}>
              {/* Initial Avatar */}
              <View style={[s.avatar, isPresent ? s.avatarPresent : s.avatarAbsent]}>
                <Text style={[s.avatarText, isPresent ? s.avatarTextPresent : s.avatarTextAbsent]}>
                  {initials(item.name)}
                </Text>
              </View>

              {/* Attendee Details */}
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{item.name}</Text>
                {isPresent ? (
                  <View style={s.timeRow}>
                    <Ionicons name="time-outline" size={12} color="#94A3B8" style={{ marginRight: 4 }} />
                    <Text style={s.time}>
                      Checked In at {formatTime(item.last_in)}
                    </Text>
                  </View>
                ) : (
                  <View style={s.timeRow}>
                    <Ionicons name="ellipse" size={8} color="#F59E0B" style={{ marginRight: 6 }} />
                    <Text style={s.absentText}>Not checked in</Text>
                  </View>
                )}
              </View>

              {/* Status Pill */}
              <View style={[s.pill, isPresent ? s.pillIn : s.pillOut]}>
                <Text style={[s.pillText, isPresent ? s.pillTextIn : s.pillTextOut]}>
                  {isPresent ? 'Present' : 'Absent'}
                </Text>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0F172A', // Deep dark Slate background
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
  },
  dateStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  dateLabel: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  exportText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
  },
  dashboard: {
    margin: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  dashboardRow: {
    flexDirection: 'row',
    paddingVertical: 20,
    paddingHorizontal: 8,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryNum: {
    fontSize: 26,
    fontWeight: '800',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  divider: {
    width: 1.5,
    backgroundColor: '#334155',
    marginVertical: 4,
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 14,
    height: '100%',
  },
  clearBtn: {
    padding: 4,
  },
  listContent: {
    padding: 16,
    paddingTop: 4,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
  },
  rowPresent: {
    borderColor: 'rgba(16, 185, 129, 0.15)',
  },
  rowAbsent: {
    borderColor: 'rgba(245, 158, 11, 0.1)',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarPresent: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  avatarAbsent: {
    backgroundColor: 'rgba(71, 85, 105, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(71, 85, 105, 0.3)',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
  },
  avatarTextPresent: {
    color: '#10B981',
  },
  avatarTextAbsent: {
    color: '#94A3B8',
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  time: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  absentText: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '500',
  },
  pill: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pillIn: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  pillOut: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pillTextIn: {
    color: '#10B981',
  },
  pillTextOut: {
    color: '#F59E0B',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});
