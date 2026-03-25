import { Feather, Ionicons,Entypo } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AppState,
  AppStateStatus,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import EmojiKeyboard from "rn-emoji-keyboard";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { WebView } from "react-native-webview";
import { darkTheme, lightTheme } from "../../constants/colors";
import { horizontalScale, moderateScale, verticalScale } from "utils/metrics";
import useAuthStore from "../../../store/useUserStore";
import { getChatMessages, getEmployees, sendChatMessage } from "../../../api/api";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { io, Socket } from "socket.io-client";

const SOCKET_URL =
  process.env.EXPO_PUBLIC_SOCKET_URL || "https://avinyahrms.duckdns.org";
const JITSI_DOMAIN = process.env.EXPO_PUBLIC_JITSI_DOMAIN || "meet.jit.si";
const MEETING_STORE_KEY = "active_meetings";

const normalizeSystemText = (text?: string) => (text || "").trim().toLowerCase();

const getMeetingSystemLabel = (text?: string) => {
  const normalized = normalizeSystemText(text);
  if (normalized === "meeting started" || normalized === "you entered") return "You entered";
  if (normalized === "meeting ended" || normalized === "you left") return "You left";
  return null;
};

const extractMeetingUrlFromText = (text?: string) => {
  if (!text) return null;
  const match = text.match(/Join meeting:\s*(https?:\/\/\S+)/i);
  if (!match?.[1]) return null;
  return match[1].trim();
};

const ChatScreen = () => {
  const colorScheme = useColorScheme() ?? "light";
  const colors = colorScheme === "dark" ? darkTheme : lightTheme;
  const isDarkMode = colorScheme === "dark";
  const router = useRouter();
  const params = useLocalSearchParams();
  const conversationId = String(params.id || "");
  const title = String(params.title || "Chat");
  const avatar = String(params.avatar || "");
  const peerId = String(params.peerId || "");

  const { accessToken, user } = useAuthStore();

  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showEmojiPanel, setShowEmojiPanel] = useState(false);
  const [showChatDetails, setShowChatDetails] = useState(false);
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [meetingMinimized, setMeetingMinimized] = useState(false);
  const [meetingMuted, setMeetingMuted] = useState(false);
  const [meetingVideoOff, setMeetingVideoOff] = useState(false);
  const [meetingUrl, setMeetingUrl] = useState("");
  const [activeMeetingUrl, setActiveMeetingUrl] = useState<string | null>(null);

  // @mention state
  const [employees, setEmployees] = useState<any[]>([]);
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [viewPhoto, setViewPhoto] = useState<string | null>(null);

  const employeePhotoMap = React.useMemo(() => {
    const map = new Map<string, string>();
    employees.forEach((e) => {
      const url = e.passportPhotoUrl || e.photoUrl || "";
      if (e.userId && url) map.set(e.userId, url);
    });
    return map;
  }, [employees]);

  const listRef = useRef<FlatList>(null);
  const meetingWebViewRef = useRef<WebView>(null);

  const sortByCreatedAt = useCallback(
    (items: any[]) =>
      [...items].sort(
        (a, b) =>
          new Date(a?.createdAt || 0).getTime() - new Date(b?.createdAt || 0).getTime()
      ),
    []
  );

  const upsertMessage = useCallback(
    (items: any[], incoming: any) => {
      if (!incoming?.id) return items;
      const base = items.filter((item) => item?.id !== incoming.id);
      return sortByCreatedAt([...base, incoming]);
    },
    [sortByCreatedAt]
  );

  const resolveUrl = (url?: string) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    return `${SOCKET_URL}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  const loadMessages = useCallback(async () => {
    if (!conversationId) return;
    const res = await getChatMessages(conversationId);
    const data = res.data ?? [];
    const list = Array.isArray(data) ? data : [];
    setMessages(sortByCreatedAt(list));
  }, [conversationId, sortByCreatedAt]);

  const formatMessageTime = (dateString?: string) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatMessageDate = (dateString?: string) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  };

  const getMeetingState = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(MEETING_STORE_KEY);
      const parsed: Array<{ conversationId: string; url: string; expiresAt: number; linkPosted?: boolean }> =
        raw ? JSON.parse(raw) : [];
      const now = Date.now();
      const valid = parsed.filter((item) => item.expiresAt > now);
      if (valid.length !== parsed.length) {
        await AsyncStorage.setItem(MEETING_STORE_KEY, JSON.stringify(valid));
      }
      return valid.find((item) => item.conversationId === conversationId) || null;
    } catch {
      return null;
    }
  }, [conversationId]);

  const setMeetingState = useCallback(
    async (state: { conversationId: string; url: string; linkPosted?: boolean } | null) => {
      try {
        const raw = await AsyncStorage.getItem(MEETING_STORE_KEY);
        const parsed: Array<{ conversationId: string; url: string; expiresAt: number; linkPosted?: boolean }> =
          raw ? JSON.parse(raw) : [];
        const now = Date.now();
        const filtered = parsed.filter(
          (item) => item.expiresAt > now && item.conversationId !== (state?.conversationId || ""),
        );
        if (state) {
          filtered.push({
            conversationId: state.conversationId,
            url: state.url,
            linkPosted: state.linkPosted ?? true,
            expiresAt: now + 2 * 60 * 60 * 1000,
          });
        }
        await AsyncStorage.setItem(MEETING_STORE_KEY, JSON.stringify(filtered));
      } catch {
        // ignore
      }
    },
    [],
  );

  const getRecentMeetingUrl = useCallback((list: any[]) => {
    const now = Date.now();
    const sorted = [...list].sort(
      (a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime(),
    );
    const recent = sorted.find((item) => {
      const url = extractMeetingUrlFromText(item?.text);
      if (!url) return false;
      return now - new Date(item?.createdAt || 0).getTime() <= 2 * 60 * 60 * 1000;
    });
    return extractMeetingUrlFromText(recent?.text);
  }, []);

  // Load employees for @mention
  useEffect(() => {
    if (!user?.organizationId) return;
    getEmployees(user.organizationId)
      .then((res) => {
        const data = res.data?.data || res.data || [];
        const list = Array.isArray(data) ? data : [];
        setEmployees(list.filter((e: any) => e.userId !== user.userId));
      })
      .catch(() => {});
  }, [user?.organizationId, user?.userId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    let mounted = true;
    const syncMeeting = async () => {
      const stored = await getMeetingState();
      if (!mounted) return;
      if (stored?.url) {
        setActiveMeetingUrl(stored.url);
        return;
      }
      const recent = getRecentMeetingUrl(messages);
      if (recent) {
        setActiveMeetingUrl(recent);
        await setMeetingState({ conversationId, url: recent, linkPosted: true });
        return;
      }
      setActiveMeetingUrl(null);
    };
    void syncMeeting();
    return () => {
      mounted = false;
    };
  }, [conversationId, getMeetingState, getRecentMeetingUrl, messages, setMeetingState]);

  useEffect(() => {
    if (!accessToken) return;
    let socket: Socket | null = null;

    const connect = () => {
      if (socket?.connected) return;
      try {
        socket = io(SOCKET_URL, {
          auth: { token: accessToken },
          transports: ["websocket"],
        });
        socket.on("chat:message", (payload: any) => {
          if (payload?.conversationId !== conversationId) return;
          const msg = payload?.message;
          if (!msg?.id) return;
          setMessages((prev) => {
            const withoutMatchingPending = prev.filter(
              (item) =>
                !(
                  item?.pending &&
                  item?.senderId === msg?.senderId &&
                  (item?.text || "") === (msg?.text || "")
                )
            );
            return upsertMessage(withoutMatchingPending, msg);
          });
        });
        socket.on("chat:presence", (payload: any) => {
          if (!payload?.userId) return;
          if (payload.userId === peerId) {
            setIsOnline(payload.status === "online");
          }
        });
      } catch {
        // ignore
      }
    };

    const disconnect = () => {
      if (socket) {
        socket.disconnect();
        socket = null;
        setIsOnline(false);
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
  }, [accessToken, conversationId, peerId, upsertMessage]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.length) {
      setAttachments((prev) => [
        ...prev,
        { uri: result.assets[0].uri, type: "image" },
      ]);
    }
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.assets?.length) {
      setAttachments((prev) => [
        ...prev,
        {
          uri: result.assets[0].uri,
          type: "file",
          name: result.assets[0].name,
          mimeType: result.assets[0].mimeType,
        },
      ]);
    }
  };

  const openAttach = () => {
    setShowAttachMenu((prev) => !prev);
  };

  // Detect @mention while typing
  const handleTextChange = (val: string) => {
    setText(val);
    const lastAtIndex = val.lastIndexOf("@");
    if (lastAtIndex !== -1) {
      const afterAt = val.slice(lastAtIndex + 1);
      // Only show list if there's no space after @ (still typing a name)
      if (!afterAt.includes(" ")) {
        setMentionSearch(afterAt);
        setShowMentionList(true);
        return;
      }
    }
    setShowMentionList(false);
  };

  // Insert selected employee mention into text
  const insertMention = (emp: any) => {
    const name = `${emp.firstName || ""} ${emp.lastName || ""}`.trim();
    const lastAtIndex = text.lastIndexOf("@");
    const newText = text.slice(0, lastAtIndex) + `@${name} `;
    setText(newText);
    setShowMentionList(false);
  };

  const filteredMentions = mentionSearch
    ? employees.filter((e) =>
        `${e.firstName || ""} ${e.lastName || ""}`
          .toLowerCase()
          .includes(mentionSearch.toLowerCase())
      )
    : employees.slice(0, 6);

  const handleSend = async () => {
    if (!text.trim() && attachments.length === 0) return;
    setSending(true);
    try {
      const tempId = `local-${Date.now()}`;
      const tempMessage = {
        id: tempId,
        senderId: user?.userId,
        text: text.trim() || null,
        createdAt: new Date().toISOString(),
        attachments: [],
        pending: true,
        readByAll: false,
      };
      setMessages((prev) => [...prev, tempMessage]);

      const form = new FormData();
      if (text.trim()) form.append("text", text.trim());
      attachments.forEach((a: any, index: number) => {
        form.append("files", {
          uri: a.uri,
          name: a.name || `file-${index}.jpg`,
          type:
            a.type === "image"
              ? "image/jpeg"
              : a.mimeType || "application/octet-stream",
        } as any);
      });
      const res = await sendChatMessage(conversationId, form);
      const msg = res.data;
      setMessages((prev) => {
        const withoutTemp = prev.filter((item) => item.id !== tempId);
        return upsertMessage(withoutTemp, msg);
      });
      setText("");
      setAttachments([]);
      setShowAttachMenu(false);
      setShowMentionList(false);
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  };

  const openMeeting = async (mode: "create" | "join") => {
    if (!conversationId) return;
    const recent = getRecentMeetingUrl(messages);
    const nextUrl =
      mode === "create"
        ? `https://${JITSI_DOMAIN}/hrms-chat-${conversationId}`
        : activeMeetingUrl || recent || "";
    if (mode === "join" && !nextUrl) {
      return;
    }

    if (mode === "create") {
      try {
        const form = new FormData();
        form.append("text", `Join meeting: ${nextUrl}`);
        await sendChatMessage(conversationId, form);
      } catch {
        // ignore
      }
    }

    try {
      const entered = new FormData();
      entered.append("text", "You entered");
      await sendChatMessage(conversationId, entered);
    } catch {
      // ignore
    }

    await setMeetingState({ conversationId, url: nextUrl, linkPosted: true });
    setActiveMeetingUrl(nextUrl);
    setMeetingUrl(nextUrl);
    setMeetingOpen(true);
    setMeetingMinimized(false);
  };

  const closeMeeting = async () => {
    if (conversationId) {
      try {
        const left = new FormData();
        left.append("text", "You left");
        await sendChatMessage(conversationId, left);
      } catch {
        // ignore
      }
    }
    await setMeetingState(null);
    setMeetingOpen(false);
    setMeetingMinimized(false);
    setActiveMeetingUrl(null);
    setMeetingUrl("");
    setMeetingMuted(false);
    setMeetingVideoOff(false);
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMine = item.senderId === user?.userId;
    const meetingSystemLabel = getMeetingSystemLabel(item.text);
    if (meetingSystemLabel) {
      return (
        <View style={styles.systemMsgWrap}>
          <Text style={[styles.systemMsgText, { color: colors.textMuted }]}>
            {meetingSystemLabel} • {formatMessageDate(item.createdAt)}
          </Text>
        </View>
      );
    }
    const senderPhotoKey = !isMine ? employeePhotoMap.get(item.senderId) : undefined;
    const senderPhotoUrl = senderPhotoKey ? resolveUrl(senderPhotoKey) : "";
    const senderInitial = (item.sender?.firstName || "?")[0].toUpperCase();

    const handleShareAttachment = async (url: string, fileName?: string) => {
      try {
        await Share.share({
          url: url,
          title: fileName || "File",
          message: `Check out this file: ${fileName || 'Download'}`,
        });
      } catch (error) {
        console.error("Share failed:", error);
      }
    };

    return (
      <View
        style={[
          styles.msgRow,
          isMine ? styles.msgRowRight : styles.msgRowLeft,
        ]}
      >
        {!isMine && (
          <TouchableOpacity
            onPress={() => senderPhotoUrl && setViewPhoto(senderPhotoUrl)}
            activeOpacity={senderPhotoUrl ? 0.7 : 1}
            style={[styles.senderAvatar, { backgroundColor: colors.inputBackground }]}
          >
            {senderPhotoUrl ? (
              <Image source={{ uri: senderPhotoUrl }} style={styles.senderAvatarImage} />
            ) : (
              <Text style={[styles.senderAvatarText, { color: colors.primary }]}>
                {senderInitial}
              </Text>
            )}
          </TouchableOpacity>
        )}
        <View
          style={[
            styles.bubble,
            isMine ? styles.bubbleMine : styles.bubbleOther,
            isMine
              ? { backgroundColor: isDarkMode ? `${colors.primary}33` : "#E0F2FE" }
              : {
                  backgroundColor: colors.white,
                  borderColor: colors.border,
                },
          ]}
        >
          {item.text ? <Text style={[styles.msgText, { color: colors.text }]}>{item.text}</Text> : null}
          {Array.isArray(item.attachments) &&
            item.attachments.map((a: any) => (
              <View key={a.id} style={styles.attachment}>
                {a.type === "image" ? (
                  <TouchableOpacity
                    onPress={() => handleShareAttachment(resolveUrl(a.url), a.fileName)}
                    activeOpacity={0.85}
                    style={styles.imageWrapper}
                  >
                    <Image
                      source={{ uri: resolveUrl(a.url) }}
                      style={styles.image}
                    />
                    <View style={styles.imageOverlay}>
                      <Feather name="download" size={24} color="#fff" />
                    </View>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={() => handleShareAttachment(resolveUrl(a.url), a.fileName)}
                    style={[
                      styles.fileRow,
                      { backgroundColor: colors.inputBackground },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Feather name="file" size={16} color={colors.textSecondary} />
                    <Text style={[styles.fileName, { color: colors.textSecondary }]} numberOfLines={1}>
                      {a.fileName || "File"}
                    </Text>
                    <Feather name="download" size={14} color={colors.primary} style={{ marginLeft: "auto" }} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          <View style={styles.timeRow}>
            <Text style={[styles.time, { color: colors.textMuted }]}>
              {formatMessageTime(item.createdAt)}
            </Text>
            {isMine && (
              <View style={styles.tickWrap}>
                <View
                  style={[
                    styles.statusDot,
                    item.readByAll
                      ? styles.statusDotRead
                      : item.pending
                      ? styles.statusDotPending
                      : styles.statusDotSent,
                  ]}
                />
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={colors.onPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerInfoTap}
            activeOpacity={0.85}
            onPress={() => setShowChatDetails(true)}
          >
            <View
              style={[
                styles.avatarCircle,
                { backgroundColor: isDarkMode ? colors.inputBackground : "#E2E8F0" },
              ]}
            >
              {avatar ? (
                <Image source={{ uri: resolveUrl(avatar) }} style={styles.avatarImg} />
              ) : (
                <Text
                  style={[
                    styles.avatarText,
                    { color: isDarkMode ? colors.text : "#0F172A" },
                  ]}
                >
                  {title.charAt(0)}
                </Text>
              )}
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: colors.onPrimary }]}>{title}</Text>
              <View style={styles.statusRow}>
                <View
                  style={[
                    styles.presenceDot,
                    isOnline ? styles.presenceDotOnline : styles.presenceDotOffline,
                  ]}
                />
                <Text style={[styles.subtitle, { color: "rgba(255,255,255,0.82)" }]}>
                  {isOnline ? "Online" : "Offline"}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => void openMeeting("create")}
              style={styles.headerActionButton}
              accessibilityLabel="Create meeting"
              accessibilityHint="Creates and shares a meeting link in this chat"
            >
              <Feather name="plus" size={16} color={colors.onPrimary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => void openMeeting("join")}
              style={[styles.headerActionButton, !activeMeetingUrl && styles.headerActionDisabled]}
              disabled={!activeMeetingUrl}
              accessibilityLabel="Join meeting"
              accessibilityHint="Joins the active meeting in this chat"
            >
              <Feather name="video" size={16} color={colors.onPrimary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowChatDetails(true)}
              style={[styles.headerActionButton, styles.headerActionGhost]}
              accessibilityLabel="Chat details"
            >
              <Feather name="info" size={16} color={colors.onPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {activeMeetingUrl ? (
          <View
            style={[
              styles.meetBanner,
              { backgroundColor: colors.inputBackground, borderBottomColor: colors.border },
            ]}
          >
            <View
              style={[
                styles.meetBannerIcon,
                { backgroundColor: isDarkMode ? `${colors.primary}33` : "#E0F2FE" },
              ]}
            >
              <Feather name="video" size={16} color={colors.primary} />
            </View>
            <View style={styles.meetBannerTextWrap}>
              <Text style={[styles.meetBannerTitle, { color: colors.text }]}>
                Meet inside this chat
              </Text>
              <Text style={[styles.meetBannerSubtitle, { color: colors.textMuted }]}>
                Join the active meeting
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.meetBannerButton, { backgroundColor: colors.primary }]}
              onPress={() => void openMeeting("join")}
            >
              <Text style={[styles.meetBannerButtonText, { color: colors.onPrimary }]}>
                Join
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.body}>
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.chatContent}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Feather name="message-circle" size={40} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No messages yet
                </Text>
                <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
                  Say hello to start the conversation.
                </Text>
              </View>
            }
          />

          {showAttachMenu && (
            <TouchableOpacity
              style={styles.attachOverlay}
              activeOpacity={1}
              onPress={() => setShowAttachMenu(false)}
            >
              <View style={styles.attachMenu}>
                <TouchableOpacity
                  style={styles.attachAction}
                  onPress={() => {
                    setShowAttachMenu(false);
                    pickImage();
                  }}
                >
                  <View style={[styles.attachFab, styles.attachFabPhoto]}>
                    <Feather name="image" size={18} color={colors.onPrimary} />
                  </View>
                  <Text
                    style={[
                      styles.attachLabel,
                      { color: colors.text, backgroundColor: colors.white, borderColor: colors.border },
                    ]}
                  >
                    Photo
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.attachAction}
                  onPress={() => {
                    setShowAttachMenu(false);
                    pickDocument();
                  }}
                >
                  <View style={[styles.attachFab, styles.attachFabFile]}>
                    <Feather name="file-text" size={18} color={colors.onPrimary} />
                  </View>
                  <Text
                    style={[
                      styles.attachLabel,
                      { color: colors.text, backgroundColor: colors.white, borderColor: colors.border },
                    ]}
                  >
                    File
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}

          {attachments.length > 0 && (
            <View
              style={[
                styles.attachPreview,
                { backgroundColor: colors.inputBackground, borderTopColor: colors.border },
              ]}
            >
              {attachments.map((a: any, i: number) => (
                <View key={`${a.uri}-${i}`} style={styles.previewItem}>
                  <Text style={[styles.previewText, { color: colors.textSecondary }]}>
                    {a.type === "image" ? "Photo" : a.name || "File"}
                  </Text>
                  <TouchableOpacity
                    onPress={() =>
                      setAttachments((prev) =>
                        prev.filter((_, idx) => idx !== i)
                      )
                    }
                  >
                    <Feather name="x" size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* @mention employee picker */}
          {showMentionList && filteredMentions.length > 0 && (
            <View
              style={[
                styles.mentionList,
                {
                  backgroundColor: colors.white,
                  borderTopColor: colors.border,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <FlatList
                data={filteredMentions}
                keyExtractor={(item) => item.userId}
                keyboardShouldPersistTaps="handled"
                style={{ maxHeight: verticalScale(180) }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.mentionRow}
                    onPress={() => insertMention(item)}
                  >
                    <View
                      style={[
                        styles.mentionAvatar,
                        { backgroundColor: isDarkMode ? `${colors.primary}2E` : "#E0F2FE" },
                      ]}
                    >
                      {item.photoUrl ? (
                        <Image
                          source={{ uri: resolveUrl(item.photoUrl) }}
                          style={styles.mentionAvatarImg}
                        />
                      ) : (
                        <Text style={[styles.mentionAvatarText, { color: colors.primary }]}>
                          {item.firstName?.charAt(0)?.toUpperCase() || "?"}
                        </Text>
                      )}
                    </View>
                    <View>
                      <Text style={[styles.mentionName, { color: colors.text }]}>
                        {item.firstName} {item.lastName}
                      </Text>
                      <Text style={[styles.mentionSub, { color: colors.textMuted }]}>
                        {item.designation?.name || item.designationName || "Employee"}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={[styles.mentionDivider, { backgroundColor: colors.border }]} />}
              />
            </View>
          )}

          <View
            style={[
              styles.inputBar,
              { borderTopColor: colors.border, backgroundColor: colors.white },
            ]}
          >
            <TouchableOpacity onPress={openAttach} style={styles.iconBtn}>
              <Feather
                name={showAttachMenu ? "x" : "paperclip"}
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setShowEmojiPanel((v) => !v);
                setShowAttachMenu(false);
                setShowMentionList(false);
              }}
              style={styles.iconBtn}
            >
              <Text style={[styles.emojiToggleIcon, showEmojiPanel && { opacity: 0.6 }]}>
                <Entypo name="emoji-flirt" size={20} color={colors.textMuted} />
              </Text>
            </TouchableOpacity>
            <TextInput
              value={text}
              onChangeText={handleTextChange}
              onFocus={() => setShowEmojiPanel(false)}
              placeholder="Type a message or @ to mention"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { color: colors.text }]}
            />
            <TouchableOpacity
              onPress={handleSend}
              style={[
                styles.sendBtn,
                { backgroundColor: colors.primary },
                (!text.trim() && attachments.length === 0) && styles.sendBtnDisabled,
                sending && { opacity: 0.6 },
              ]}
              disabled={sending || (!text.trim() && attachments.length === 0)}
            >
              <Feather name="send" size={18} color={colors.onPrimary} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* Full emoji keyboard — renders as a bottom sheet modal */}
      <EmojiKeyboard
        onEmojiSelected={(emojiObject) => {
          setText((prev) => prev + emojiObject.emoji);
        }}
        open={showEmojiPanel}
        onClose={() => setShowEmojiPanel(false)}
      />

      {meetingOpen && !meetingMinimized ? (
        <View style={styles.meetingOverlay}>
          <View
            style={[
              styles.meetingCard,
              { backgroundColor: colors.white, borderColor: colors.border },
            ]}
          >
            <View style={[styles.meetingHeader, { borderBottomColor: colors.border }]}>
              <View>
                <Text style={[styles.meetingTitle, { color: colors.text }]}>Live meeting</Text>
                <Text style={[styles.meetingSubtitle, { color: colors.textMuted }]}>
                  {title}
                </Text>
              </View>
              <View style={styles.meetingHeaderActions}>
                <TouchableOpacity
                  onPress={() => setMeetingMinimized(true)}
                  style={[
                    styles.meetingHeaderButton,
                    { backgroundColor: colors.inputBackground },
                  ]}
                >
                  <Feather name="minimize-2" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => void closeMeeting()}
                  style={[
                    styles.meetingHeaderButton,
                    { backgroundColor: colors.inputBackground },
                  ]}
                >
                  <Feather name="phone-off" size={16} color={colors.red} />
                </TouchableOpacity>
              </View>
            </View>
            {meetingUrl ? (
              <WebView
                ref={meetingWebViewRef}
                source={{ uri: meetingUrl }}
                style={styles.meetingWebView}
                allowsInlineMediaPlayback
                mediaPlaybackRequiresUserAction={false}
              />
            ) : (
              <View
                style={[
                  styles.meetingFallback,
                  { backgroundColor: colors.surface },
                ]}
              >
                <Text style={[styles.meetingFallbackText, { color: colors.textMuted }]}>
                  Loading meeting...
                </Text>
              </View>
            )}
          </View>
        </View>
      ) : null}

      {meetingOpen && meetingMinimized ? (
        <View
          style={[
            styles.meetingMiniOverlay,
            { backgroundColor: colors.white, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.meetingMiniTitle, { color: colors.text }]}>
            Live meeting
          </Text>
          <View style={styles.meetingMiniControls}>
            <TouchableOpacity
              style={[styles.meetingMiniButton, { backgroundColor: colors.inputBackground }]}
              onPress={() => setMeetingMuted((prev) => !prev)}
            >
              <Feather
                name={meetingMuted ? "mic-off" : "mic"}
                size={16}
                color={colors.text}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.meetingMiniButton, { backgroundColor: colors.inputBackground }]}
              onPress={() => setMeetingVideoOff((prev) => !prev)}
            >
              <Feather
                name={meetingVideoOff ? "video-off" : "video"}
                size={16}
                color={colors.text}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.meetingMiniButton, { backgroundColor: colors.inputBackground }]}
              onPress={() => setMeetingMinimized(false)}
            >
              <Feather name="maximize-2" size={16} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.meetingMiniButton, styles.meetingMiniEndButton]}
              onPress={() => void closeMeeting()}
            >
              <Feather name="phone-off" size={16} color={colors.onPrimary} />
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      <Modal
        visible={showChatDetails}
        transparent
        animationType="slide"
        onRequestClose={() => setShowChatDetails(false)}
      >
        <TouchableOpacity
          style={styles.detailsBackdrop}
          activeOpacity={1}
          onPress={() => setShowChatDetails(false)}
        >
          <TouchableOpacity
            style={[styles.detailsSheet, { backgroundColor: colors.white }]}
            activeOpacity={1}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={[styles.detailsHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity
                onPress={() => setShowChatDetails(false)}
                style={[
                  styles.detailsCloseButton,
                  { backgroundColor: colors.inputBackground },
                ]}
              >
                <Feather name="x" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
              <Text style={[styles.detailsHeaderTitle, { color: colors.text }]}>
                Chat Details
              </Text>
            </View>
            <View
              style={[
                styles.detailsProfileBlock,
                { borderBottomColor: colors.border },
              ]}
            >
              <View
                style={[
                  styles.detailsAvatar,
                  { backgroundColor: isDarkMode ? `${colors.primary}2E` : "#E0F2FE" },
                ]}
              >
                {avatar ? (
                  <Image source={{ uri: resolveUrl(avatar) }} style={styles.detailsAvatarImage} />
                ) : (
                  <Text style={[styles.detailsAvatarText, { color: colors.primary }]}>
                    {title.charAt(0)}
                  </Text>
                )}
              </View>
              <Text style={[styles.detailsName, { color: colors.text }]}>{title}</Text>
              <Text style={[styles.detailsStatus, { color: colors.textMuted }]}>
                {isOnline ? "Online" : "Offline"}
              </Text>
            </View>
            <View style={styles.detailsSection}>
              <Text style={[styles.detailsSectionTitle, { color: colors.textMuted }]}>
                Shared media
              </Text>
              <Text style={[styles.detailsSectionSub, { color: colors.textSecondary }]}>
                No shared media yet
              </Text>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Profile photo viewer modal */}
      <Modal
        visible={!!viewPhoto}
        transparent
        animationType="fade"
        onRequestClose={() => setViewPhoto(null)}
      >
        <TouchableOpacity
          style={styles.photoModalOverlay}
          activeOpacity={1}
          onPress={() => setViewPhoto(null)}
        >
          <View style={styles.photoModalContent}>
            {viewPhoto && (
              <Image
                source={{ uri: viewPhoto }}
                style={styles.photoModalImage}
                resizeMode="contain"
              />
            )}
            <TouchableOpacity
              style={styles.photoModalClose}
              onPress={() => setViewPhoto(null)}
            >
              <Feather name="x" size={20} color={colors.onPrimary} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  body: {
    flex: 1,
  },
  header: {
    paddingTop: verticalScale(50),
    paddingBottom: verticalScale(14),
    paddingHorizontal: horizontalScale(16),
    backgroundColor: "#005F90",
    flexDirection: "row",
    alignItems: "center",
  },
  backBtn: {
    marginRight: horizontalScale(12),
  },
  headerInfoTap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  avatarCircle: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: moderateScale(18),
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
    borderRadius: moderateScale(18),
  },
  avatarText: {
    fontWeight: "700",
    color: "#0F172A",
  },
  headerText: {
    marginLeft: horizontalScale(10),
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: horizontalScale(8),
  },
  headerActionButton: {
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: moderateScale(16),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  headerActionGhost: {
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  headerActionDisabled: {
    opacity: 0.35,
  },
  meetBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingHorizontal: horizontalScale(14),
    paddingVertical: verticalScale(10),
  },
  meetBannerIcon: {
    width: moderateScale(34),
    height: moderateScale(34),
    borderRadius: moderateScale(12),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E0F2FE",
  },
  meetBannerTextWrap: {
    flex: 1,
    marginLeft: horizontalScale(10),
  },
  meetBannerTitle: {
    fontSize: moderateScale(12),
    fontWeight: "700",
    color: "#0F172A",
  },
  meetBannerSubtitle: {
    marginTop: verticalScale(2),
    fontSize: moderateScale(10),
    color: "#64748B",
  },
  meetBannerButton: {
    paddingHorizontal: horizontalScale(12),
    paddingVertical: verticalScale(6),
    borderRadius: moderateScale(14),
    backgroundColor: "#005F90",
  },
  meetBannerButtonText: {
    fontSize: moderateScale(11),
    fontWeight: "700",
    color: "#fff",
  },
  title: {
    fontSize: moderateScale(15),
    fontWeight: "700",
    color: "#fff",
  },
  subtitle: {
    fontSize: moderateScale(11),
    color: "#cbd5e1",
    marginTop: verticalScale(2),
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: horizontalScale(6),
    marginTop: verticalScale(2),
  },
  presenceDot: {
    width: moderateScale(6),
    height: moderateScale(6),
    borderRadius: moderateScale(3),
  },
  presenceDotOnline: {
    backgroundColor: "#22C55E",
  },
  presenceDotOffline: {
    backgroundColor: "#94A3B8",
  },
  chatContent: {
    paddingHorizontal: horizontalScale(16),
    paddingTop: verticalScale(12),
    paddingBottom: verticalScale(20),
  },
  msgRow: {
    marginBottom: verticalScale(10),
  },
  systemMsgWrap: {
    alignItems: "center",
    marginBottom: verticalScale(10),
  },
  systemMsgText: {
    fontSize: moderateScale(11),
    color: "#64748B",
  },
  msgRowLeft: {
    alignItems: "flex-start",
  },
  msgRowRight: {
    alignItems: "flex-end",
  },
  bubble: {
    maxWidth: "78%",
    padding: moderateScale(10),
    borderRadius: moderateScale(12),
  },
  bubbleMine: {
    backgroundColor: "#E0F2FE",
    borderTopRightRadius: 0,
  },
  bubbleOther: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 0,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  msgText: {
    fontSize: moderateScale(13),
    color: "#0F172A",
  },
  time: {
    fontSize: moderateScale(9),
    color: "#94A3B8",
    marginTop: verticalScale(4),
    alignSelf: "flex-end",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: horizontalScale(6),
    marginTop: verticalScale(4),
    alignSelf: "flex-end",
  },
  tickWrap: {
    marginLeft: horizontalScale(4),
  },
  statusDot: {
    width: moderateScale(6),
    height: moderateScale(6),
    borderRadius: moderateScale(3),
    borderWidth: 1,
  },
  statusDotPending: {
    backgroundColor: "transparent",
    borderColor: "#94A3B8",
  },
  statusDotSent: {
    backgroundColor: "#94A3B8",
    borderColor: "#94A3B8",
  },
  statusDotRead: {
    backgroundColor: "#0EA5E9",
    borderColor: "#0EA5E9",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: horizontalScale(12),
    paddingVertical: verticalScale(8),
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    backgroundColor: "#fff",
  },
  iconBtn: {
    padding: moderateScale(6),
  },
  input: {
    flex: 1,
    fontSize: moderateScale(13),
    color: "#0F172A",
    paddingHorizontal: horizontalScale(10),
  },
  sendBtn: {
    backgroundColor: "#005F90",
    padding: moderateScale(10),
    borderRadius: moderateScale(20),
    marginLeft: horizontalScale(6),
  },
  sendBtnDisabled: {
    backgroundColor: "#94A3B8",
  },
  attachment: {
    marginTop: verticalScale(6),
  },
  image: {
    width: moderateScale(180),
    height: moderateScale(120),
    borderRadius: moderateScale(8),
  },
  imageWrapper: {
    position: "relative",
  },
  imageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: moderateScale(8),
    alignItems: "center",
    justifyContent: "center",
  },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: horizontalScale(6),
    backgroundColor: "#F1F5F9",
    paddingVertical: verticalScale(6),
    paddingHorizontal: horizontalScale(8),
    borderRadius: moderateScale(8),
  },
  fileName: {
    fontSize: moderateScale(11),
    color: "#334155",
    maxWidth: horizontalScale(140),
  },
  attachPreview: {
    paddingHorizontal: horizontalScale(12),
    paddingVertical: verticalScale(6),
    backgroundColor: "#F8FAFC",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  previewItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: verticalScale(4),
  },
  previewText: {
    fontSize: moderateScale(11),
    color: "#475569",
  },
  attachOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: -verticalScale(260),
    bottom: verticalScale(0),
    zIndex: 20,
  },
  attachMenu: {
    position: "absolute",
    left: horizontalScale(12),
    bottom: verticalScale(64),
    gap: verticalScale(10),
  },
  attachAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: horizontalScale(10),
  },
  attachFab: {
    width: moderateScale(42),
    height: moderateScale(42),
    borderRadius: moderateScale(21),
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: verticalScale(3) },
    shadowOpacity: 0.2,
    shadowRadius: moderateScale(4),
  },
  attachFabPhoto: {
    backgroundColor: "#0EA5E9",
  },
  attachFabFile: {
    backgroundColor: "#6366F1",
  },
  attachLabel: {
    fontSize: moderateScale(12),
    fontWeight: "600",
    color: "#0F172A",
    backgroundColor: "#fff",
    paddingHorizontal: horizontalScale(10),
    paddingVertical: verticalScale(6),
    borderRadius: moderateScale(12),
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emojiToggleIcon: {
    fontSize: moderateScale(20),
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(50),
  },
  emptyText: {
    marginTop: verticalScale(10),
    fontSize: moderateScale(14),
    fontWeight: "600",
    color: "#64748B",
  },
  emptySubtext: {
    marginTop: verticalScale(4),
    fontSize: moderateScale(11),
    color: "#94A3B8",
  },
  // @mention picker styles
  mentionList: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -verticalScale(2) },
    shadowOpacity: 0.08,
    shadowRadius: moderateScale(4),
  },
  mentionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: horizontalScale(14),
    paddingVertical: verticalScale(8),
  },
  mentionAvatar: {
    width: moderateScale(34),
    height: moderateScale(34),
    borderRadius: moderateScale(17),
    backgroundColor: "#E0F2FE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: horizontalScale(10),
    overflow: "hidden",
  },
  mentionAvatarImg: {
    width: "100%",
    height: "100%",
  },
  mentionAvatarText: {
    fontWeight: "700",
    fontSize: moderateScale(13),
    color: "#005F90",
  },
  mentionName: {
    fontSize: moderateScale(13),
    fontWeight: "600",
    color: "#0F172A",
  },
  mentionSub: {
    fontSize: moderateScale(11),
    color: "#94A3B8",
    marginTop: verticalScale(1),
  },
  mentionDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginHorizontal: horizontalScale(14),
  },
  senderAvatar: {
    width: moderateScale(28),
    height: moderateScale(28),
    borderRadius: moderateScale(14),
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: horizontalScale(6),
    alignSelf: "flex-end",
    marginBottom: verticalScale(2),
    overflow: "hidden",
  },
  senderAvatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: moderateScale(14),
  },
  senderAvatarText: {
    fontSize: moderateScale(11),
    fontWeight: "700",
    color: "#005F90",
  },
  meetingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: horizontalScale(14),
    zIndex: 80,
  },
  meetingCard: {
    width: "100%",
    height: "78%",
    borderRadius: moderateScale(14),
    overflow: "hidden",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  meetingHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: horizontalScale(12),
    paddingVertical: verticalScale(10),
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  meetingTitle: {
    fontSize: moderateScale(13),
    fontWeight: "700",
    color: "#0F172A",
  },
  meetingSubtitle: {
    marginTop: verticalScale(2),
    fontSize: moderateScale(11),
    color: "#64748B",
  },
  meetingHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: horizontalScale(8),
  },
  meetingHeaderButton: {
    width: moderateScale(30),
    height: moderateScale(30),
    borderRadius: moderateScale(15),
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  meetingWebView: {
    flex: 1,
    backgroundColor: "#000",
  },
  meetingFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0F172A",
  },
  meetingFallbackText: {
    fontSize: moderateScale(12),
    color: "#CBD5E1",
  },
  meetingMiniOverlay: {
    position: "absolute",
    right: horizontalScale(14),
    bottom: verticalScale(84),
    width: horizontalScale(230),
    borderRadius: moderateScale(14),
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: horizontalScale(10),
    paddingVertical: verticalScale(10),
    zIndex: 85,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: verticalScale(3) },
    shadowOpacity: 0.18,
    shadowRadius: moderateScale(8),
    elevation: 8,
  },
  meetingMiniTitle: {
    fontSize: moderateScale(11),
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: verticalScale(8),
  },
  meetingMiniControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  meetingMiniButton: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: moderateScale(18),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
  },
  meetingMiniEndButton: {
    backgroundColor: "#DC2626",
  },
  detailsBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  detailsSheet: {
    borderTopLeftRadius: moderateScale(18),
    borderTopRightRadius: moderateScale(18),
    backgroundColor: "#fff",
    minHeight: verticalScale(360),
    paddingBottom: verticalScale(24),
  },
  detailsHeader: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingHorizontal: horizontalScale(14),
    paddingVertical: verticalScale(12),
  },
  detailsCloseButton: {
    width: moderateScale(30),
    height: moderateScale(30),
    borderRadius: moderateScale(15),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    marginRight: horizontalScale(10),
  },
  detailsHeaderTitle: {
    fontSize: moderateScale(15),
    fontWeight: "700",
    color: "#0F172A",
  },
  detailsProfileBlock: {
    alignItems: "center",
    paddingHorizontal: horizontalScale(16),
    paddingVertical: verticalScale(20),
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  detailsAvatar: {
    width: moderateScale(76),
    height: moderateScale(76),
    borderRadius: moderateScale(38),
    backgroundColor: "#E0F2FE",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  detailsAvatarImage: {
    width: "100%",
    height: "100%",
  },
  detailsAvatarText: {
    fontSize: moderateScale(24),
    fontWeight: "700",
    color: "#0369A1",
  },
  detailsName: {
    marginTop: verticalScale(10),
    fontSize: moderateScale(18),
    fontWeight: "700",
    color: "#0F172A",
  },
  detailsStatus: {
    marginTop: verticalScale(4),
    fontSize: moderateScale(12),
    color: "#64748B",
  },
  detailsSection: {
    paddingHorizontal: horizontalScale(16),
    paddingTop: verticalScale(16),
  },
  detailsSectionTitle: {
    fontSize: moderateScale(12),
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
  },
  detailsSectionSub: {
    marginTop: verticalScale(8),
    fontSize: moderateScale(13),
    color: "#94A3B8",
  },
  photoModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  photoModalContent: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  photoModalImage: {
    width: moderateScale(300),
    height: moderateScale(300),
    borderRadius: moderateScale(16),
  },
  photoModalClose: {
    position: "absolute",
    top: -moderateScale(14),
    right: -moderateScale(14),
    width: moderateScale(30),
    height: moderateScale(30),
    borderRadius: moderateScale(15),
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
});

export default ChatScreen;
