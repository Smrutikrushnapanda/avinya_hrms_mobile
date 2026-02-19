import { Feather, Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { darkTheme, lightTheme } from "../../constants/colors";
import { horizontalScale, moderateScale, verticalScale } from "utils/metrics";
import useAuthStore from "../../../store/useUserStore";
import { getChatMessages, sendChatMessage } from "../../../api/api";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { io, Socket } from "socket.io-client";

const SOCKET_URL =
  process.env.EXPO_PUBLIC_SOCKET_URL || "https://avinya-hrms-backend.onrender.com";

const ChatScreen = () => {
  const colorScheme = useColorScheme() ?? "light";
  const colors = colorScheme === "dark" ? darkTheme : lightTheme;
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

  const listRef = useRef<FlatList>(null);

  const resolveUrl = (url?: string) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    return `${SOCKET_URL}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  const loadMessages = useCallback(async () => {
    if (!conversationId) return;
    const res = await getChatMessages(conversationId);
    const data = res.data ?? [];
    setMessages(Array.isArray(data) ? data : []);
  }, [conversationId]);

  const formatMessageTime = (dateString?: string) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (!accessToken) return;
    let socket: Socket | null = null;
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
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
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
    return () => {
      if (socket) socket.disconnect();
    };
  }, [accessToken, conversationId, peerId]);

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
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? msg : m))
      );
      setText("");
      setAttachments([]);
      setShowAttachMenu(false);
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMine = item.senderId === user?.userId;
    return (
      <View
        style={[
          styles.msgRow,
          isMine ? styles.msgRowRight : styles.msgRowLeft,
        ]}
      >
        <View
          style={[
            styles.bubble,
            isMine ? styles.bubbleMine : styles.bubbleOther,
          ]}
        >
          {item.text ? <Text style={styles.msgText}>{item.text}</Text> : null}
          {Array.isArray(item.attachments) &&
            item.attachments.map((a: any) => (
              <View key={a.id} style={styles.attachment}>
                {a.type === "image" ? (
                  <Image
                    source={{ uri: resolveUrl(a.url) }}
                    style={styles.image}
                  />
                ) : (
                  <View style={styles.fileRow}>
                    <Feather name="file" size={16} color="#334155" />
                    <Text style={styles.fileName} numberOfLines={1}>
                      {a.fileName || "File"}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          <View style={styles.timeRow}>
            <Text style={styles.time}>
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
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.avatarCircle}>
            {avatar ? (
              <Image source={{ uri: resolveUrl(avatar) }} style={styles.avatarImg} />
            ) : (
              <Text style={styles.avatarText}>{title.charAt(0)}</Text>
            )}
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>{title}</Text>
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.presenceDot,
                  isOnline ? styles.presenceDotOnline : styles.presenceDotOffline,
                ]}
              />
              <Text style={styles.subtitle}>
                {isOnline ? "Online" : "Offline"}
              </Text>
            </View>
          </View>
        </View>

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
                <Feather name="message-circle" size={40} color="#cbd5e1" />
                <Text style={styles.emptyText}>No messages yet</Text>
                <Text style={styles.emptySubtext}>
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
                    <Feather name="image" size={18} color="#fff" />
                  </View>
                  <Text style={styles.attachLabel}>Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.attachAction}
                  onPress={() => {
                    setShowAttachMenu(false);
                    pickDocument();
                  }}
                >
                  <View style={[styles.attachFab, styles.attachFabFile]}>
                    <Feather name="file-text" size={18} color="#fff" />
                  </View>
                  <Text style={styles.attachLabel}>File</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
          {attachments.length > 0 && (
            <View style={styles.attachPreview}>
              {attachments.map((a: any, i: number) => (
                <View key={`${a.uri}-${i}`} style={styles.previewItem}>
                  <Text style={styles.previewText}>
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
          <View style={styles.inputBar}>
            <TouchableOpacity onPress={openAttach} style={styles.iconBtn}>
              <Feather
                name={showAttachMenu ? "x" : "paperclip"}
                size={20}
                color="#334155"
              />
            </TouchableOpacity>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Type a message"
              placeholderTextColor="#94A3B8"
              style={styles.input}
            />
            <TouchableOpacity
              onPress={handleSend}
              style={[
                styles.sendBtn,
                (!text.trim() && attachments.length === 0) && styles.sendBtnDisabled,
                sending && { opacity: 0.6 },
              ]}
              disabled={sending || (!text.trim() && attachments.length === 0)}
            >
              <Feather name="send" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
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
});

export default ChatScreen;
