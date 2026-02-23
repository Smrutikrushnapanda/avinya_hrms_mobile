import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import Header from "app/components/Header";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme
} from "react-native";
import { horizontalScale, moderateScale, verticalScale } from "utils/metrics";
import { darkTheme, lightTheme } from "../constants/colors";
import { getInboxMessages, markMessageRead } from "../../api/api";
import useAuthStore from "../../store/useUserStore";
import { io, Socket } from "socket.io-client";
import useMessageStore from "../../store/useMessageStore";

const SOCKET_URL =
  process.env.EXPO_PUBLIC_SOCKET_URL || "https://avinya-hrms-backend.onrender.com";

type MessageItem = {
  id: string;
  initials: string;
  title: string;
  subtitle: string;
  message: string;
  time: string;
  sentAtMs: number;
  isNew: boolean;
  category: "work" | "admin" | "social";
  priority: "high" | "medium" | "low";
};

const Message = () => {
  const colorScheme = useColorScheme() ?? "light";
  const colors = colorScheme === "dark" ? darkTheme : lightTheme;
  const navigation = useNavigation();
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const { unreadCount, setUnreadCount, incrementUnread, decrementUnread } =
    useMessageStore();

  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("All"); // Changed from activeTab to selectedFilter

  const [notifications, setNotifications] = useState<MessageItem[]>([]);

  // Filter tabs similar to Leave component
  const filters = ["All", "Unread", "Today"];

  // Filter messages based on selected filter and search
  const filteredData = useMemo(() => {
    let filtered = notifications;
    const today = new Date();

    // Filter by selected filter
    switch (selectedFilter) {
      case "Unread":
        filtered = notifications.filter((item) => item.isNew);
        break;
      case "Today":
        filtered = notifications.filter((item) => {
          const d = new Date(item.sentAtMs);
          return (
            d.getFullYear() === today.getFullYear() &&
            d.getMonth() === today.getMonth() &&
            d.getDate() === today.getDate()
          );
        });
        break;
      default:
        filtered = notifications;
    }

    // Filter by search
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter((item) =>
        item.title.toLowerCase().includes(searchLower) ||
        item.subtitle.toLowerCase().includes(searchLower) ||
        item.message.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [notifications, search, selectedFilter]);

  const filterCounts = useMemo(() => {
    const today = new Date();
    const isToday = (ms: number) => {
      const d = new Date(ms);
      return (
        d.getFullYear() === today.getFullYear() &&
        d.getMonth() === today.getMonth() &&
        d.getDate() === today.getDate()
      );
    };
    return {
      All: notifications.length,
      Unread: notifications.filter((n) => n.isNew).length,
      Today: notifications.filter((n) => isToday(n.sentAtMs)).length,
    };
  }, [notifications]);

  const handleRead = async (id) => {
    const wasUnread = notifications.find((item) => item.id === id)?.isNew;
    setNotifications(prevNotifications =>
      prevNotifications.map(item =>
        item.id === id ? { ...item, isNew: false } : item
      )
    );
    if (wasUnread) {
      decrementUnread(1);
    }
    try {
      await markMessageRead(id);
    } catch {
      // ignore read errors
    }
  };

  const handleMessagePress = (item) => {
    handleRead(item.id);
    router.push({
      pathname: "/(screen)/MessagaDetails",
      params: {
        message: JSON.stringify(item),
      },
    });
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchMessages().finally(() => setRefreshing(false));
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high": return "#F44336";
      case "medium": return "#FF9800";
      case "low": return "#4CAF50";
      default: return "#0077B6";
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case "work": return "briefcase";
      case "admin": return "file-text";
      case "social": return "heart";
      default: return "message-circle";
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const isToday =
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      date.getFullYear() === yesterday.getFullYear() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getDate() === yesterday.getDate();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    if (isYesterday) return "Yesterday";
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const mapServerMessage = (msg: any): MessageItem => {
    const sentAt = msg.sentAt ? new Date(msg.sentAt) : new Date();
    const timeLabel = formatTime(sentAt);
    return {
      id: msg.id,
      initials: "HR",
      title: msg.title || "Message",
      subtitle: msg.type ? `${msg.type} message` : "Admin message",
      message: msg.body || "",
      time: timeLabel,
      sentAtMs: sentAt.getTime(),
      isNew: msg.status === "UNREAD",
      category: "admin",
      priority: "medium",
    };
  };

  const fetchMessages = async () => {
    try {
      const response = await getInboxMessages();
      const data = Array.isArray(response.data) ? response.data : [];
      const mapped = data.map(mapServerMessage);
      setNotifications(mapped);
      setUnreadCount(mapped.filter((m) => m.isNew).length);
    } catch (error) {
      console.error("Failed to load messages:", error);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  useEffect(() => {
    if (!accessToken) return;
    let socket: Socket | null = null;
    try {
      socket = io(SOCKET_URL, {
        auth: { token: accessToken },
        transports: ["websocket"],
      });

      socket.on("message:new", (payload: any) => {
        const incoming = payload?.message;
        if (!incoming?.id) return;
        setNotifications((prev) => {
          if (prev.some((m) => m.id === incoming.id)) return prev;
          return [mapServerMessage({ ...incoming, status: "UNREAD" }), ...prev];
        });
        incrementUnread(1);
      });
    } catch (err) {
      console.error("Socket connection error:", err);
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, [accessToken]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Messages" />
      
      {/* Search and Filter Card */}
      <View style={styles.cardWrapper}>
        <View style={[styles.card, { backgroundColor: colors.white }]}>
          {/* Search Section */}
          <View style={styles.searchSection}>
            <View style={styles.searchWrapper}>
              <Feather name="search" size={20} color="#666" style={styles.searchIcon} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search messages..."
                placeholderTextColor="#999"
                style={styles.searchInput}
                returnKeyType="search"
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch("")} style={styles.clearButton}>
                  <Feather name="x" size={18} color="#666" />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity style={styles.filterButton}>
              <Feather name="filter" size={20} color="#005F90" />
            </TouchableOpacity>
          </View>

          {/* Filter Tabs */}
          <View style={styles.filterBar}>
            {filters.map((filter) => (
              <TouchableOpacity
                key={filter}
                onPress={() => setSelectedFilter(filter)}
                style={[
                  styles.filterItem,
                  selectedFilter === filter && styles.filterItemActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    selectedFilter === filter && styles.filterTextActive,
                  ]}
                >
                  {filter}
                </Text>
                <View
                  style={[
                    styles.filterCount,
                    selectedFilter === filter && styles.filterCountActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterCountText,
                      selectedFilter === filter && styles.filterCountTextActive,
                    ]}
                  >
                    {filterCounts[filter as keyof typeof filterCounts]}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Messages Section */}
      <View style={styles.messagesSection}>
        <View style={styles.messagesHeader}>
          <Text style={styles.sectionTitle}>
            {search
              ? `Search Results (${filteredData.length})`
              : `${selectedFilter} Messages (${filteredData.length})`}
          </Text>
          <View style={styles.unreadPill}>
            <Text style={styles.unreadPillText}>{unreadCount} unread</Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          style={styles.messagesList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {filteredData.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="inbox" size={48} color="#ccc" />
              <Text style={styles.emptyStateText}>
                {search ? "No messages found" : `No ${selectedFilter.toLowerCase()} messages`}
              </Text>
              <Text style={styles.emptyStateSubtext}>
                {search ? "Try adjusting your search terms" : "Try switching to a different filter"}
              </Text>
            </View>
          ) : (
            filteredData.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.notificationCard,
                  item.isNew && styles.notificationCardUnread,
                  index === filteredData.length - 1 && styles.lastCard,
                ]}
                onPress={() => handleMessagePress(item)}
                activeOpacity={0.7}
              >
                <View style={styles.cardContent}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{item.initials}</Text>
                    {item.isNew && <View style={styles.notificationBadge} />}
                  </View>
                  
                  <View style={styles.notificationContent}>
                    <View style={styles.titleRow}>
                      <View style={styles.titleContainer}>
                        <Text style={[styles.title, item.isNew && styles.textUnread]}>
                          {item.title}
                        </Text>
                        <View style={styles.metaInfo}>
                          <Feather 
                            name={getCategoryIcon(item.category)} 
                            size={12} 
                            color="#666" 
                          />
                          <View 
                            style={[
                              styles.priorityDot, 
                              { backgroundColor: getPriorityColor(item.priority) }
                            ]} 
                          />
                        </View>
                      </View>
                      <Text style={[styles.time, item.isNew && styles.timeUnread]}>
                        {formatTime(new Date(item.sentAtMs))}
                      </Text>
                    </View>
                    
                    <Text style={[styles.subtitle, item.isNew && styles.textUnread]}>
                      {item.subtitle}
                    </Text>
                    
                    <Text
                      style={[styles.message, item.isNew && styles.messageUnread]}
                      numberOfLines={2}
                      ellipsizeMode="tail"
                    >
                      {item.message}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.cardActions}>
                  <Feather name="chevron-right" size={16} color="#ccc" />
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  cardWrapper: {
    marginTop: verticalScale(-100),
    paddingHorizontal: horizontalScale(16),
    zIndex: 10,
  },
  card: {
    borderRadius: moderateScale(16),
    padding: moderateScale(20),
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: verticalScale(4) },
    shadowOpacity: 0.15,
    shadowRadius: moderateScale(8),
  },
  searchSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: horizontalScale(12),
    marginBottom: verticalScale(16),
  },
  searchWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: moderateScale(12),
    paddingHorizontal: horizontalScale(16),
    paddingVertical: verticalScale(12),
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  searchIcon: {
    marginRight: horizontalScale(12),
  },
  searchInput: {
    flex: 1,
    color: "#000",
    fontSize: moderateScale(14),
    fontWeight: "500",
  },
  clearButton: {
    padding: moderateScale(4),
  },
  filterButton: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: moderateScale(12),
    backgroundColor: "#F8F9FA",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  filterBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#f5f5f5",
    borderRadius: moderateScale(16),
    paddingVertical: verticalScale(8),
  },
  filterItem: {
    paddingHorizontal: horizontalScale(14),
    paddingVertical: verticalScale(6),
    borderRadius: moderateScale(20),
    flexDirection: "row",
    alignItems: "center",
    gap: horizontalScale(6),
  },
  filterItemActive: {
    backgroundColor: "#005F90",
  },
  filterText: {
    fontSize: moderateScale(14),
    color: "#666",
    fontWeight: "500",
  },
  filterTextActive: {
    color: "#fff",
  },
  filterCount: {
    minWidth: moderateScale(18),
    height: moderateScale(18),
    borderRadius: moderateScale(9),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E2E8F0",
    paddingHorizontal: horizontalScale(4),
  },
  filterCountActive: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  filterCountText: {
    fontSize: moderateScale(10),
    fontWeight: "700",
    color: "#334155",
  },
  filterCountTextActive: {
    color: "#fff",
  },
  messagesSection: {
    flex: 1,
    paddingHorizontal: horizontalScale(16),
    marginTop: verticalScale(20),
  },
  messagesHeader: {
    marginBottom: verticalScale(16),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: moderateScale(16),
    fontWeight: "600",
    color: "#1a1a1a",
  },
  unreadPill: {
    backgroundColor: "#E0F2FE",
    paddingHorizontal: horizontalScale(10),
    paddingVertical: verticalScale(4),
    borderRadius: moderateScale(12),
  },
  unreadPillText: {
    color: "#0369A1",
    fontSize: moderateScale(11),
    fontWeight: "700",
  },
  messagesList: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: verticalScale(100),
  },
  notificationCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: moderateScale(12),
    padding: moderateScale(16),
    marginBottom: verticalScale(12),
    borderBottomWidth:1,
    borderColor:"#E0E0E0",
    // elevation: 2,
    // shadowColor: "#000",
    // shadowOffset: { width: 0, height: verticalScale(2) },
    // shadowOpacity: 0.08,
    // shadowRadius: moderateScale(4),
    // borderLeftWidth: moderateScale(4),
    // borderLeftColor: "#E0E0E0",
  },
  notificationCardUnread: {
    backgroundColor: "#F8FAFC",
    borderLeftWidth: moderateScale(3),
    borderLeftColor: "#0EA5E9",
  },
  // lastCard: {
  //   marginBottom: verticalScale(20),
  // },
  cardContent: {
    flex: 1,
    flexDirection: "row",
  },
  avatar: {
    width: moderateScale(44),
    height: moderateScale(44),
    borderRadius: moderateScale(22),
    backgroundColor: "#0077B6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: horizontalScale(12),
    position: "relative",
  },
  avatarText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: moderateScale(14),
  },
  notificationBadge: {
    width: moderateScale(12),
    height: moderateScale(12),
    borderRadius: moderateScale(6),
    backgroundColor: "#FF1744",
    position: "absolute",
    top: verticalScale(-2),
    right: horizontalScale(-2),
    borderWidth: 2,
    borderColor: "#fff",
  },
  notificationContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: verticalScale(4),
  },
  titleContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginRight: horizontalScale(8),
  },
  title: {
    fontWeight: "600",
    fontSize: moderateScale(14),
    color: "#1a1a1a",
    flex: 1,
  },
  metaInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  priorityDot: {
    width: moderateScale(6),
    height: moderateScale(6),
    borderRadius: moderateScale(3),
    marginLeft: horizontalScale(6),
  },
  time: {
    fontSize: moderateScale(11),
    color: "#999",
    fontWeight: "500",
  },
  timeUnread: {
    color: "#666",
    fontWeight: "600",
  },
  subtitle: {
    fontWeight: "500",
    fontSize: moderateScale(13),
    color: "#0077B6",
    marginBottom: verticalScale(4),
  },
  message: {
    color: "#666",
    fontSize: moderateScale(12),
    lineHeight: moderateScale(18),
  },
  messageUnread: {
    color: "#444",
  },
  textUnread: {
    color: "#1a1a1a",
    fontWeight: "700",
  },
  cardActions: {
    justifyContent: "center",
    alignItems: "center",
    paddingLeft: horizontalScale(8),
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(60),
  },
  emptyStateText: {
    fontSize: moderateScale(16),
    fontWeight: "600",
    color: "#666",
    marginTop: verticalScale(16),
  },
  emptyStateSubtext: {
    fontSize: moderateScale(12),
    color: "#999",
    marginTop: verticalScale(4),
    textAlign: "center",
  },
});

export default Message;
