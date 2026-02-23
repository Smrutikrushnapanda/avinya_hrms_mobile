import { Feather, Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  AppState,
  AppStateStatus,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  useColorScheme,
} from "react-native";
import { darkTheme, lightTheme } from "../../constants/colors";
import { horizontalScale, moderateScale, verticalScale } from "utils/metrics";
import useAuthStore from "../../../store/useUserStore";
import { getChatConversations, getEmployees } from "../../../api/api";
import { io, Socket } from "socket.io-client";

const SOCKET_URL =
  process.env.EXPO_PUBLIC_SOCKET_URL || "https://avinya-hrms-backend.onrender.com";

const ChatList = () => {
  const colorScheme = useColorScheme() ?? "light";
  const colors = colorScheme === "dark" ? darkTheme : lightTheme;
  const router = useRouter();
  const { accessToken, user } = useAuthStore();

  const [search, setSearch] = useState("");
  const [conversations, setConversations] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<any[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  const loadConversations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getChatConversations();
      const data = res.data ?? [];
      const list = Array.isArray(data) ? data : [];
      setConversations(
        list.sort(
          (a: any, b: any) =>
            new Date(b.updatedAt || b.lastMessage?.createdAt || 0).getTime() -
            new Date(a.updatedAt || a.lastMessage?.createdAt || 0).getTime()
        )
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadEmployees = useCallback(async () => {
    if (!user?.organizationId) return;
    const res = await getEmployees(user.organizationId);
    const data = res.data?.data || res.data || [];
    const list = Array.isArray(data) ? data : [];
    setEmployees(list.filter((e) => e.userId !== user.userId));
  }, [user?.organizationId, user?.userId]);

  useFocusEffect(
    useCallback(() => {
      loadConversations();
      loadEmployees();
    }, [loadConversations, loadEmployees])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadConversations();
    } finally {
      setRefreshing(false);
    }
  }, [loadConversations]);

  React.useEffect(() => {
    if (!accessToken) return;
    let socket: Socket | null = null;

    const connect = () => {
      if (socket?.connected) return;
      try {
        socket = io(SOCKET_URL, {
          auth: { token: accessToken },
          transports: ["websocket"],
        });

        socket.on("chat:presence", (payload: any) => {
          if (!payload?.userId) return;
          setOnlineUsers((prev) => {
            const next = new Set(prev);
            if (payload.status === "online") next.add(payload.userId);
            if (payload.status === "offline") next.delete(payload.userId);
            return next;
          });
        });

        socket.on("chat:message", (payload: any) => {
          if (!payload?.conversationId) return;
          setConversations((prev) => {
            const idx = prev.findIndex((c) => c.id === payload.conversationId);
            if (idx === -1) {
              // conversation may be new for this user; reload list once
              loadConversations();
              return prev;
            }
            const updated = [...prev];
            const isOwnMessage = payload?.message?.senderId === user?.userId;
            updated[idx] = {
              ...updated[idx],
              lastMessage: payload.message,
              updatedAt: payload?.message?.createdAt || new Date().toISOString(),
              unreadCount: isOwnMessage
                ? 0
                : (updated[idx].unreadCount || 0) + 1,
            };
            return [updated[idx], ...updated.filter((_, i) => i !== idx)].sort(
              (a: any, b: any) =>
                new Date(b.updatedAt || b.lastMessage?.createdAt || 0).getTime() -
                new Date(a.updatedAt || a.lastMessage?.createdAt || 0).getTime()
            );
          });
        });
      } catch {
        // ignore socket errors
      }
    };

    const disconnect = () => {
      if (socket) {
        socket.disconnect();
        socket = null;
        setOnlineUsers(new Set());
      }
    };

    connect();

    const subscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (nextState === "active") {
          connect();
        } else if (nextState === "background" || nextState === "inactive") {
          disconnect();
        }
      }
    );

    return () => {
      subscription.remove();
      disconnect();
    };
  }, [accessToken, loadConversations, user?.userId]);

  const employeeMap = useMemo(() => {
    const map = new Map<string, any>();
    employees.forEach((e) => map.set(e.userId, e));
    return map;
  }, [employees]);

  const getDisplayParticipant = (conv: any) => {
    const other = (conv.participants || []).find(
      (p: any) => p.userId !== user?.userId
    );
    return other || conv.participants?.[0];
  };

  const filtered = conversations.filter((conv) => {
    const p = getDisplayParticipant(conv);
    const name = `${p?.firstName || ""} ${p?.lastName || ""}`.trim();
    const lastText = conv.lastMessage?.text || "";
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return name.toLowerCase().includes(q) || lastText.toLowerCase().includes(q);
  });

  const summary = useMemo(() => {
    const unread = conversations.reduce(
      (sum, c) => sum + (c.unreadCount || 0),
      0
    );
    return {
      total: conversations.length,
      unread,
      online: onlineUsers.size,
    };
  }, [conversations, onlineUsers]);

  const formatChatTime = (dateString?: string) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return "";
    const now = new Date();
    const isToday =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    if (isToday) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const openConversation = (
    convId: string,
    title: string,
    avatar?: string,
    peerId?: string
  ) => {
    router.push({
      pathname: "/(screen)/chat/[id]",
      params: { id: convId, title, avatar: avatar || "", peerId: peerId || "" },
    });
  };

  const resolveUrl = (url?: string) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    return `${SOCKET_URL}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  const renderItem = ({ item }: { item: any }) => {
    const p = getDisplayParticipant(item);
    const name = `${p?.firstName || ""} ${p?.lastName || ""}`.trim() || "Chat";
    const emp = p?.userId ? employeeMap.get(p.userId) : null;
    const avatar = emp?.photoUrl || "";
    const lastMessage = item.lastMessage?.text
      ? item.lastMessage.text
      : item.lastMessage?.attachments?.length
      ? "Attachment"
      : "Say hi";
    const time = formatChatTime(item.lastMessage?.createdAt);

    return (
      <TouchableOpacity
        style={[
          styles.chatRow,
          item.unreadCount > 0 && styles.chatRowUnread,
        ]}
        onPress={() => openConversation(item.id, name, avatar, p?.userId)}
      >
        <View style={styles.avatar}>
          {avatar ? (
            <View style={styles.avatarCircle}>
              <Image
                source={{ uri: resolveUrl(avatar) }}
                style={styles.avatarImage}
              />
            </View>
          ) : (
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          {p?.userId && onlineUsers.has(p.userId) && (
            <View style={styles.onlineDot} />
          )}
        </View>
        <View style={styles.chatInfo}>
          <View style={styles.chatTopRow}>
            <Text
              style={[
                styles.chatName,
                item.unreadCount > 0 && styles.chatNameUnread,
              ]}
            >
              {name}
            </Text>
            <Text
              style={[
                styles.chatTime,
                item.unreadCount > 0 && styles.chatTimeUnread,
              ]}
            >
              {time}
            </Text>
          </View>
          <View style={styles.chatBottomRow}>
            <Text
              style={[
                styles.chatPreview,
                item.unreadCount > 0 && styles.chatPreviewUnread,
              ]}
              numberOfLines={1}
            >
              {lastMessage}
            </Text>
            {item.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{item.unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chats</Text>
        </View>
        <TouchableOpacity onPress={() => router.push("/(screen)/chat/new")}>
          <Feather name="edit-2" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchBar}>
        <Feather name="search" size={18} color="#6B7280" />
        <TextInput
          placeholder="Search"
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Feather name="x" size={18} color="#6B7280" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.summaryBar}>
        <View style={styles.summaryPill}>
          <Text style={styles.summaryLabel}>All</Text>
          <Text style={styles.summaryValue}>{summary.total}</Text>
        </View>
        <View style={styles.summaryPill}>
          <Text style={styles.summaryLabel}>Unread</Text>
          <Text style={styles.summaryValue}>{summary.unread}</Text>
        </View>
        <View style={styles.summaryPill}>
          <View style={styles.onlineDotSm} />
          <Text style={styles.summaryLabel}>Online</Text>
          <Text style={styles.summaryValue}>{summary.online}</Text>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Feather name="message-circle" size={40} color="#cbd5e1" />
              <Text style={styles.emptyText}>No conversations yet</Text>
              <TouchableOpacity
                style={styles.emptyCta}
                onPress={() => router.push("/(screen)/chat/new")}
              >
                <Text style={styles.emptyCtaText}>Start a chat</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: "#005F90",
    paddingTop: verticalScale(50),
    paddingBottom: verticalScale(20),
    paddingHorizontal: horizontalScale(20),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: horizontalScale(10),
  },
  backBtn: {
    padding: moderateScale(4),
  },
  headerTitle: {
    fontSize: moderateScale(22),
    fontWeight: "700",
    color: "#fff",
  },
  searchBar: {
    backgroundColor: "#fff",
    marginHorizontal: horizontalScale(16),
    marginTop: verticalScale(-14),
    paddingHorizontal: horizontalScale(12),
    paddingVertical: verticalScale(10),
    borderRadius: moderateScale(12),
    flexDirection: "row",
    alignItems: "center",
    gap: horizontalScale(8),
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  summaryBar: {
    flexDirection: "row",
    gap: horizontalScale(10),
    paddingHorizontal: horizontalScale(16),
    paddingTop: verticalScale(12),
    paddingBottom: verticalScale(4),
  },
  summaryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: horizontalScale(6),
    backgroundColor: "#F8FAFC",
    borderRadius: moderateScale(16),
    paddingHorizontal: horizontalScale(10),
    paddingVertical: verticalScale(6),
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  summaryLabel: {
    fontSize: moderateScale(11),
    color: "#64748B",
    fontWeight: "600",
  },
  summaryValue: {
    fontSize: moderateScale(12),
    color: "#0F172A",
    fontWeight: "700",
  },
  onlineDotSm: {
    width: moderateScale(6),
    height: moderateScale(6),
    borderRadius: moderateScale(3),
    backgroundColor: "#22C55E",
  },
  searchInput: {
    flex: 1,
    fontSize: moderateScale(13),
    color: "#111827",
  },
  listContent: {
    paddingTop: verticalScale(10),
    paddingBottom: verticalScale(24),
  },
  chatRow: {
    flexDirection: "row",
    paddingHorizontal: horizontalScale(16),
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  chatRowUnread: {
    backgroundColor: "#F8FAFC",
  },
  avatar: {
    marginRight: horizontalScale(12),
  },
  avatarCircle: {
    width: moderateScale(46),
    height: moderateScale(46),
    borderRadius: moderateScale(23),
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarCircleSm: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: horizontalScale(12),
  },
  avatarText: {
    fontWeight: "700",
    color: "#0F172A",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: moderateScale(23),
  },
  onlineDot: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: moderateScale(10),
    height: moderateScale(10),
    borderRadius: moderateScale(5),
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#fff",
  },
  chatInfo: {
    flex: 1,
  },
  chatTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  chatName: {
    fontSize: moderateScale(14),
    fontWeight: "700",
    color: "#0F172A",
  },
  chatNameUnread: {
    color: "#0B1F3A",
  },
  chatTime: {
    fontSize: moderateScale(10),
    color: "#94A3B8",
  },
  chatTimeUnread: {
    color: "#475569",
    fontWeight: "600",
  },
  chatBottomRow: {
    marginTop: verticalScale(4),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  chatPreview: {
    flex: 1,
    color: "#64748B",
    fontSize: moderateScale(12),
    marginRight: horizontalScale(8),
  },
  chatPreviewUnread: {
    color: "#334155",
    fontWeight: "600",
  },
  unreadBadge: {
    backgroundColor: "#22C55E",
    minWidth: moderateScale(20),
    height: moderateScale(20),
    borderRadius: moderateScale(10),
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: horizontalScale(6),
  },
  unreadText: {
    color: "#fff",
    fontSize: moderateScale(11),
    fontWeight: "700",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(40),
  },
  emptyText: {
    marginTop: verticalScale(8),
    color: "#94A3B8",
  },
  emptyCta: {
    marginTop: verticalScale(12),
    paddingHorizontal: horizontalScale(14),
    paddingVertical: verticalScale(8),
    backgroundColor: "#005F90",
    borderRadius: moderateScale(14),
  },
  emptyCtaText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: moderateScale(12),
  },
});

export default ChatList;
