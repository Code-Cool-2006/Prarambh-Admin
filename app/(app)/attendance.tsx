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
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import client from '@/src/api/client';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { SparkTheme } from '@/constants/theme';
import { CosmicBackground } from '@/components/CosmicBackground';

interface AttendanceRecord {
  id: string | number;
  name: string;
  usn?: string;
  college?: string;
  attendance_code?: string;
  check_ins: number;
  last_in: string | null;
  last_out: string | null;
}

type FilterTab = 'ALL' | 'PRESENT' | 'PENDING';

export default function AttendanceList() {
  const insets = useSafeAreaInsets();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [actionLoadingId, setActionLoadingId] = useState<string | number | null>(null);

  const today = useMemo(() => {
    return new Date().toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }, []);

  const handleExportCSV = async () => {
    if (records.length === 0) {
      Alert.alert('No Data', 'There is no attendance data to export.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const headers = ['ID', 'Name', 'USN', 'College', 'Attendance Code', 'Status', 'Check-ins', 'Check-in Time'];
      const rows = records.map(r => {
        const isPresent = r.check_ins > 0;
        const statusText = isPresent ? 'Present' : 'Absent';
        const timeText = isPresent && r.last_in ? new Date(r.last_in).toLocaleTimeString() : 'N/A';
        return [
          `"${String(r.id)}"`,
          `"${r.name.replace(/"/g, '""')}"`,
          `"${(r.usn || '').replace(/"/g, '""')}"`,
          `"${(r.college || '').replace(/"/g, '""')}"`,
          `"${r.attendance_code || 'N/A'}"`,
          statusText,
          r.check_ins,
          `"${timeText}"`
        ].join(',');
      });

      const csvContent = [headers.join(','), ...rows].join('\n');
      const dateStr = new Date().toISOString().slice(0, 10);
      const fileUri = `${FileSystem.documentDirectory}SPARK_Attendance_${dateStr}.csv`;

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

  const handleQuickCheckIn = async (record: AttendanceRecord) => {
    setActionLoadingId(record.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const scanCode = record.attendance_code || record.usn || String(record.id);
      await client.post('/scan', {
        qrData: scanCode,
        scanType: 'IN',
        scannedBy: 'Admin (Manual)',
        location: 'Admin Dashboard',
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await fetchRecords(false);
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Check-in Failed', err.response?.data?.error || 'Unable to log check-in.');
    } finally {
      setActionLoadingId(null);
    }
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

  // Filter records based on active tab and search query
  const filteredRecords = useMemo(() => {
    let list = records;

    // Tab filter
    if (activeTab === 'PRESENT') {
      list = list.filter(r => r.check_ins > 0);
    } else if (activeTab === 'PENDING') {
      list = list.filter(r => r.check_ins === 0);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(r =>
        r.name.toLowerCase().includes(q) ||
        (r.usn && r.usn.toLowerCase().includes(q)) ||
        (r.college && r.college.toLowerCase().includes(q)) ||
        (r.attendance_code && r.attendance_code.toLowerCase().includes(q))
      );
    }

    return list;
  }, [records, activeTab, searchQuery]);

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
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  if (loading) {
    return (
      <View style={s.center}>
        <CosmicBackground />
        <ActivityIndicator size="large" color={SparkTheme.accent} />
      </View>
    );
  }

  return (
    <View style={s.screen}>
      <CosmicBackground />

      {/* Date Header Strip */}
      <View style={s.dateStrip}>
        <View style={s.dateBadge}>
          <Ionicons name="calendar-outline" size={13} color="#e879f9" style={{ marginRight: 6 }} />
          <Text style={s.dateLabel}>{today}</Text>
        </View>
        <TouchableOpacity style={s.exportBtn} onPress={handleExportCSV} activeOpacity={0.8}>
          <LinearGradient
            colors={SparkTheme.gradients.radiant}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.exportGradient}
          >
            <Ionicons name="cloud-download-outline" size={14} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={s.exportText}>Export CSV</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Summary Dashboard Metric Cards */}
      <View style={s.dashboardContainer}>
        <LinearGradient
          colors={['rgba(26, 12, 54, 0.85)', 'rgba(14, 5, 31, 0.9)']}
          style={s.dashboard}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
          <TouchableOpacity
            style={s.summaryItem}
            onPress={() => setActiveTab('PRESENT')}
            activeOpacity={0.7}
          >
            <Text style={[s.summaryNum, { color: '#34d399' }]}>{present}</Text>
            <View style={s.statBadgeRow}>
              <View style={[s.statDot, { backgroundColor: '#34d399' }]} />
              <Text style={s.summaryLabel}>Checked In</Text>
            </View>
          </TouchableOpacity>

          <View style={s.metricDivider} />

          <TouchableOpacity
            style={s.summaryItem}
            onPress={() => setActiveTab('PENDING')}
            activeOpacity={0.7}
          >
            <Text style={[s.summaryNum, { color: '#e879f9' }]}>{absent}</Text>
            <View style={s.statBadgeRow}>
              <View style={[s.statDot, { backgroundColor: '#e879f9' }]} />
              <Text style={s.summaryLabel}>Pending</Text>
            </View>
          </TouchableOpacity>

          <View style={s.metricDivider} />

          <TouchableOpacity
            style={s.summaryItem}
            onPress={() => setActiveTab('ALL')}
            activeOpacity={0.7}
          >
            <Text style={[s.summaryNum, { color: '#38bdf8' }]}>{total}</Text>
            <View style={s.statBadgeRow}>
              <View style={[s.statDot, { backgroundColor: '#38bdf8' }]} />
              <Text style={s.summaryLabel}>Total</Text>
            </View>
          </TouchableOpacity>
        </LinearGradient>
      </View>

      {/* Segmented Filter Tabs */}
      <View style={s.tabContainer}>
        <TouchableOpacity
          style={[s.tabItem, activeTab === 'ALL' && s.tabItemActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab('ALL');
          }}
        >
          <Text style={[s.tabText, activeTab === 'ALL' && s.tabTextActive]}>
            All ({total})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.tabItem, activeTab === 'PRESENT' && s.tabItemActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab('PRESENT');
          }}
        >
          <Text style={[s.tabText, activeTab === 'PRESENT' && s.tabTextActive]}>
            Checked In ({present})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.tabItem, activeTab === 'PENDING' && s.tabItemActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab('PENDING');
          }}
        >
          <Text style={[s.tabText, activeTab === 'PENDING' && s.tabTextActive]}>
            Pending ({absent})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={s.searchContainer}>
        <View style={s.searchWrapper}>
          <Ionicons name="search-outline" size={17} color="#c084fc" style={s.searchIcon} />
          <TextInput
            style={s.searchInput}
            placeholder="Search by name, USN, code, or college..."
            placeholderTextColor={SparkTheme.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={s.clearBtn}>
              <Ionicons name="close-circle" size={17} color="#a78bfa" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Attendance List */}
      <FlatList
        data={filteredRecords}
        keyExtractor={r => String(r.id)}
        contentContainerStyle={[
          s.listContent,
          {
            paddingBottom: Math.max(insets.bottom, 20) + 24,
          },
        ]}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#e879f9"
            colors={['#e879f9', '#9333ea']}
          />
        }
        ListEmptyComponent={
          <View style={s.emptyContainer}>
            <Ionicons name="sparkles-outline" size={42} color={SparkTheme.textMuted} style={{ marginBottom: 12 }} />
            <Text style={s.emptyText}>
              {searchQuery ? 'No attendees match your search query' : 'No attendance logs recorded today'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isPresent = item.check_ins > 0;
          const isActionLoading = actionLoadingId === item.id;

          return (
            <View style={[s.cardRow, isPresent ? s.cardRowPresent : s.cardRowPending]}>
              {/* Avatar */}
              {isPresent ? (
                <LinearGradient
                  colors={SparkTheme.gradients.emerald}
                  style={s.avatar}
                >
                  <Text style={s.avatarTextPresent}>
                    {initials(item.name)}
                  </Text>
                </LinearGradient>
              ) : (
                <View style={[s.avatar, s.avatarPending]}>
                  <Text style={s.avatarTextPending}>
                    {initials(item.name)}
                  </Text>
                </View>
              )}

              {/* Attendee Info */}
              <View style={{ flex: 1 }}>
                <Text style={s.name} numberOfLines={1}>{item.name}</Text>

                {/* Meta details (USN, College & Code) */}
                <View style={s.metaRow}>
                  {item.usn ? (
                    <View style={s.usnBadge}>
                      <Text style={s.usnText}>{item.usn}</Text>
                    </View>
                  ) : null}
                  {item.attendance_code ? (
                    <View style={s.codePill}>
                      <Text style={s.codePillText}>{item.attendance_code}</Text>
                    </View>
                  ) : null}
                </View>

                {item.college ? (
                  <Text style={s.collegeText} numberOfLines={1}>
                    {item.college}
                  </Text>
                ) : null}

                {/* Status Time */}
                {isPresent ? (
                  <View style={s.timeRow}>
                    <Ionicons name="checkmark-circle" size={13} color="#34d399" style={{ marginRight: 4 }} />
                    <Text style={s.timeText}>
                      Checked In at {formatTime(item.last_in)}
                    </Text>
                  </View>
                ) : (
                  <View style={s.timeRow}>
                    <Ionicons name="time-outline" size={12} color="#a78bfa" style={{ marginRight: 4 }} />
                    <Text style={s.pendingText}>Awaiting check-in</Text>
                  </View>
                )}
              </View>

              {/* Status Action / Pill */}
              {isPresent ? (
                <View style={s.verifiedPill}>
                  <Ionicons name="checkmark" size={12} color="#34d399" style={{ marginRight: 3 }} />
                  <Text style={s.verifiedPillText}>Verified</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={s.checkInBtn}
                  onPress={() => handleQuickCheckIn(item)}
                  disabled={isActionLoading}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#7c3aed', '#9333ea']}
                    style={s.checkInGradient}
                  >
                    {isActionLoading ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-done" size={12} color="#ffffff" style={{ marginRight: 3 }} />
                        <Text style={s.checkInBtnText}>Check In</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              )}
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
    backgroundColor: SparkTheme.bg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(9, 2, 24, 0.9)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 92, 246, 0.2)',
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(124, 58, 237, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  dateLabel: {
    fontSize: 11.5,
    color: SparkTheme.text,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  exportBtn: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  exportGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  exportText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#ffffff',
  },
  dashboardContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  dashboard: {
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: 'rgba(139, 92, 246, 0.35)',
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryNum: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  statBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  statDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  summaryLabel: {
    fontSize: 10,
    color: SparkTheme.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  metricDivider: {
    width: 1,
    backgroundColor: 'rgba(139, 92, 246, 0.25)',
    marginVertical: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginVertical: 8,
    gap: 8,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(14, 5, 31, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  tabItemActive: {
    backgroundColor: 'rgba(124, 58, 237, 0.25)',
    borderColor: '#c084fc',
  },
  tabText: {
    color: SparkTheme.textMuted,
    fontSize: 11.5,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#e879f9',
    fontWeight: '700',
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SparkTheme.inputBg,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1.2,
    borderColor: SparkTheme.inputBorder,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: SparkTheme.text,
    fontSize: 13.5,
    height: '100%',
  },
  clearBtn: {
    padding: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 13,
    borderWidth: 1.2,
  },
  cardRowPresent: {
    backgroundColor: 'rgba(10, 30, 24, 0.75)',
    borderColor: 'rgba(52, 211, 153, 0.35)',
  },
  cardRowPending: {
    backgroundColor: 'rgba(14, 5, 31, 0.8)',
    borderColor: 'rgba(139, 92, 246, 0.25)',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarPending: {
    backgroundColor: '#1b0c36',
    borderWidth: 1.2,
    borderColor: 'rgba(168, 85, 247, 0.4)',
  },
  avatarTextPresent: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '800',
  },
  avatarTextPending: {
    color: '#c4b5fd',
    fontSize: 13.5,
    fontWeight: '700',
  },
  name: {
    fontSize: 14.5,
    fontWeight: '700',
    color: SparkTheme.text,
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 2,
  },
  usnBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    backgroundColor: 'rgba(124, 58, 237, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.35)',
  },
  usnText: {
    color: '#e879f9',
    fontSize: 9.5,
    fontWeight: '700',
  },
  codePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    backgroundColor: 'rgba(19, 8, 42, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.25)',
  },
  codePillText: {
    color: SparkTheme.textSecondary,
    fontSize: 9.5,
    fontWeight: '600',
  },
  collegeText: {
    color: SparkTheme.textMuted,
    fontSize: 10.5,
    fontWeight: '500',
    marginTop: 1,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  timeText: {
    fontSize: 10.5,
    color: '#34d399',
    fontWeight: '600',
  },
  pendingText: {
    fontSize: 10.5,
    color: SparkTheme.textMuted,
    fontWeight: '500',
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.4)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginLeft: 8,
  },
  verifiedPillText: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  checkInBtn: {
    borderRadius: 8,
    overflow: 'hidden',
    marginLeft: 8,
  },
  checkInGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  checkInBtnText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    color: SparkTheme.textMuted,
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
});
