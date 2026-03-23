import { Ionicons } from "@expo/vector-icons";
import { darkTheme, lightTheme } from "app/constants/colors";
import { useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  LayoutAnimation,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
  useColorScheme,
} from "react-native";
import CustomDialog from "../components/CustomDialog";
import { horizontalScale, moderateScale, verticalScale } from "utils/metrics";
import {
  commentPost,
  getLatestPosts,
  getPostComments,
  likePost,
  unlikePost,
} from "../../api/api";
import useAuthStore from "../../store/useUserStore";

if (Platform.OS === "android") {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

const { width: screenWidth } = Dimensions.get("window");

// Post types matching the backend
const POST_TYPES = [
  { value: "all", label: "All Posts" },
  { value: "announcement", label: "Announcements" },
  { value: "new_joiner", label: "New Joiners" },
  { value: "celebration", label: "Celebrations" },
  { value: "event", label: "Events" },
  { value: "general", label: "General" },
];

interface Like {
  id: string;
  userId: string;
  user?: {
    firstName?: string;
    lastName?: string;
    avatar?: string;
    passportPhotoUrl?: string;
  };
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  userId?: string;
  user: {
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
}

interface Post {
  id: string;
  content: string;
  imageUrl?: string;
  postType: string;
  isPinned: boolean;
  author?: {
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
  organizationId: string;
  createdAt: string;
  likes?: Like[];
  comments?: Comment[];
  likeCount?: number;
  commentCount?: number;
}

const Posts = () => {
  const colorScheme = useColorScheme() ?? "light";
  const colors = colorScheme === "dark" ? darkTheme : lightTheme;
  const isDarkMode = colorScheme === "dark";
  const router = useRouter();
  const navigation = useNavigation();

  const { user, isAuthenticated, initializeAuth } = useAuthStore();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedType, setSelectedType] = useState("all");
  const [initialized, setInitialized] = useState(false);

  // Comment state
  const [newComments, setNewComments] = useState<Record<string, string>>({});
  const [submittingComments, setSubmittingComments] = useState<Record<string, boolean>>({});
  const [expandedPosts, setExpandedPosts] = useState<Record<string, boolean>>({});
  const [likingPosts, setLikingPosts] = useState<Record<string, boolean>>({});

  // Dialog state
  const [dialogVisible, setDialogVisible] = useState<boolean>(false);
  const [dialogType, setDialogType] = useState<string>("INFO");
  const [dialogTitle, setDialogTitle] = useState<string>("");
  const [dialogMessage, setDialogMessage] = useState<string>("");

  const showDialog = (
    type: string,
    title: string,
    message: string,
  ) => {
    setDialogType(type);
    setDialogTitle(title);
    setDialogMessage(message);
    setDialogVisible(true);
  };

  // Initialize auth once on mount
  useEffect(() => {
    const init = async () => {
      if (!isAuthenticated && !user) {
        await initializeAuth();
      }
      setInitialized(true);
    };
    init();
  }, []);

  // Fetch posts once auth is ready
  useEffect(() => {
    if (!initialized) return;

    if (!user?.userId) {
      showDialog("DANGER", "Error", "User not authenticated. Please login again.");
      router.replace("/(auth)/Login");
      return;
    }

    loadPosts();
  }, [initialized, user?.userId]);

  const loadPosts = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const res = await getLatestPosts({ limit: 50 });
      setPosts(res.data || []);
    } catch (error: any) {
      console.error("Error loading posts:", error);
      showDialog("DANGER", "Error", error?.message || "Failed to load posts");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    await loadPosts(true);
  };

  const handleLike = async (postId: string, post: Post) => {
    if (!user) {
      showDialog("DANGER", "Error", "Please login to like posts");
      return;
    }

    if (likingPosts[postId]) {
      return;
    }

    const hasLiked = post.likes?.some((like) => like.userId === user.userId);

    setLikingPosts((prev) => ({ ...prev, [postId]: true }));

    try {
      if (hasLiked) {
        await unlikePost(postId, user.userId);
        setPosts((prevPosts) =>
          prevPosts.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  likes: p.likes?.filter((l) => l.userId !== user.userId),
                  likeCount: Math.max(0, (p.likeCount || 1) - 1),
                }
              : p
          )
        );
        showDialog("SUCCESS", "Success", "Like removed");
      } else {
        await likePost(postId, user.userId);
        setPosts((prevPosts) =>
          prevPosts.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  likes: [
                    ...(p.likes || []),
                    {
                      id: "",
                      userId: user.userId,
                      user: {
                        firstName: user.firstName,
                        lastName: user.lastName,
                        avatar: user.profileImage,
                      },
                    },
                  ],
                  likeCount: (p.likeCount || 0) + 1,
                }
              : p
          )
        );
        showDialog("SUCCESS", "Success", "Post liked!");
      }
    } catch (error: any) {
      console.error("Like error:", error);
      if (
        error.response?.data?.message === "You have already liked this post" ||
        error.response?.status === 400
      ) {
        showDialog("DANGER", "Error", "You have already liked this post");
        loadPosts();
      } else {
        showDialog("DANGER", "Error", "Failed to update like");
      }
    } finally {
      setLikingPosts((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const handleComment = async (postId: string) => {
    const commentText = newComments[postId];
    if (!commentText?.trim() || !user) return;

    setSubmittingComments((prev) => ({ ...prev, [postId]: true }));
    try {
      const res = await commentPost(postId, {
        userId: user.userId,
        content: commentText,
      });
      setPosts((prevPosts) =>
        prevPosts.map((p) =>
          p.id === postId
            ? {
                ...p,
                comments: [...(p.comments || []), res.data],
                commentCount: (p.commentCount || 0) + 1,
              }
            : p
        )
      );
      setNewComments((prev) => ({ ...prev, [postId]: "" }));
      showDialog("SUCCESS", "Success", "Comment added!");
    } catch (error: any) {
      console.error("Comment error:", error);
      showDialog("DANGER", "Error", "Failed to add comment");
    } finally {
      setSubmittingComments((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const toggleExpand = (postId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedPosts((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  const filteredPosts = posts.filter((post) => {
    const matchesType = selectedType === "all" || post.postType === selectedType;
    return matchesType;
  });

  const getTypeBadge = (type: string) => {
    const typeConfig = POST_TYPES.find((t) => t.value === type);
    if (!typeConfig || type === "all") return null;

    const badgeColors: Record<string, { bg: string; text: string }> = {
      announcement: {
        bg: isDarkMode ? "rgba(59,130,246,0.22)" : "#DBEAFE",
        text: isDarkMode ? "#93C5FD" : "#1E40AF",
      },
      new_joiner: {
        bg: isDarkMode ? "rgba(34,197,94,0.2)" : "#DCFCE7",
        text: isDarkMode ? "#86EFAC" : "#166534",
      },
      celebration: {
        bg: isDarkMode ? "rgba(168,85,247,0.2)" : "#F3E8FF",
        text: isDarkMode ? "#C4B5FD" : "#7C3AED",
      },
      event: {
        bg: isDarkMode ? "rgba(249,115,22,0.2)" : "#FFEDD5",
        text: isDarkMode ? "#FDBA74" : "#C2410C",
      },
      general: {
        bg: colors.inputBackground,
        text: colors.textSecondary,
      },
    };

    const color = badgeColors[type] || { bg: colors.inputBackground, text: colors.textSecondary };

    return (
      <View style={[styles.typeBadge, { backgroundColor: color.bg }]}>
        <Text style={[styles.typeBadgeText, { color: color.text }]}>
          {typeConfig.label}
        </Text>
      </View>
    );
  };

  const formatDate = (iso: string) => {
    try {
      const date = new Date(iso);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const renderPost = ({ item: post }: { item: Post }) => {
    const hasLiked = post.likes?.some((like) => like.userId === user?.userId);
    const isExpanded = expandedPosts[post.id];
    const isLiking = likingPosts[post.id];
    const isSubmittingComment = submittingComments[post.id];

    return (
      <View
        style={[
          styles.postCard,
          { backgroundColor: colors.white, borderColor: colors.border, borderWidth: 1 },
        ]}
      >
        {/* Post Header */}
        <View style={styles.postHeader}>
          <View
            style={[
              styles.avatarContainer,
              { backgroundColor: colors.primary },
            ]}
          >
            <Text style={styles.avatarText}>
              {post.author?.firstName?.[0] || "A"}
            </Text>
          </View>
          <View style={styles.postAuthorInfo}>
            <View style={styles.authorNameRow}>
              <Text style={[styles.authorName, { color: colors.text }]}>
                {post.author?.firstName} {post.author?.lastName}
              </Text>
              {post.isPinned && (
                <View
                  style={[
                    styles.pinnedBadge,
                    {
                      backgroundColor: isDarkMode
                        ? "rgba(245,158,11,0.2)"
                        : "#FEF3C7",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.pinnedText,
                      { color: isDarkMode ? "#FCD34D" : "#92400E" },
                    ]}
                  >
                    Pinned
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.postMetaRow}>
              <Text style={[styles.postDate, { color: colors.grey }]}>
                {formatDate(post.createdAt)}
              </Text>
              {getTypeBadge(post.postType)}
            </View>
          </View>
        </View>

        {/* Post Content */}
        <View style={styles.postContent}>
          <Text
            style={[styles.postText, { color: colors.text }]}
            numberOfLines={isExpanded ? undefined : 4}
          >
            {post.content}
          </Text>
          {post.content.length > 200 && !isExpanded && (
            <Pressable onPress={() => toggleExpand(post.id)}>
              <Text style={[styles.readMoreText, { color: colors.primary }]}>
                Read more...
              </Text>
            </Pressable>
          )}
        </View>

        {/* Post Image */}
        {post.imageUrl && (
          <View style={styles.postImageContainer}>
            <Image
              source={{ uri: post.imageUrl }}
              style={styles.postImage}
              resizeMode="cover"
            />
          </View>
        )}

        {/* Like/Comment Counts */}
        <View style={[styles.interactionBar, { borderTopColor: colors.grey + "30" }]}>
          <TouchableOpacity
            style={styles.interactionButton}
            onPress={() => handleLike(post.id, post)}
            disabled={isLiking}
          >
            <Ionicons
              name={hasLiked ? "heart" : "heart-outline"}
              size={20}
              color={hasLiked ? colors.red : colors.grey}
            />
            <Text
              style={[
                styles.interactionText,
                { color: hasLiked ? colors.red : colors.grey },
              ]}
            >
              {post.likeCount || 0}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.interactionButton}
            onPress={() => toggleExpand(post.id)}
          >
            <Ionicons
              name="chatbubble-outline"
              size={18}
              color={colors.grey}
            />
            <Text style={[styles.interactionText, { color: colors.grey }]}>
              {post.commentCount || 0}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Who Liked Section */}
        {post.likes && post.likes.length > 0 && (
          <View style={styles.likedBySection}>
            <View style={styles.likedAvatars}>
              {post.likes.slice(0, 4).map((like, idx) => (
                <View
                  key={like.id || idx}
                  style={[
                    styles.likedAvatar,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Text style={styles.likedAvatarText}>
                    {like.user?.firstName?.[0] || "U"}
                  </Text>
                </View>
              ))}
              {post.likes.length > 4 && (
                <View
                  style={[
                    styles.likedAvatar,
                    { backgroundColor: colors.grey + "40" },
                  ]}
                >
                  <Text style={[styles.likedAvatarText, { fontSize: 10 }]}>
                    +{post.likes.length - 4}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.likedByText, { color: colors.grey }]}>
              {post.likes.length === 1
                ? `${post.likes[0].user?.firstName} liked`
                : `${post.likes[0].user?.firstName} and ${
                    post.likes.length - 1
                  } others`}
            </Text>
          </View>
        )}

        {/* Comments Section */}
        {isExpanded && (
          <View style={[styles.commentsSection, { borderTopColor: colors.grey + "30" }]}>
            {/* Add Comment */}
            <View style={styles.addCommentRow}>
              <View
                style={[
                  styles.commentAvatar,
                  { backgroundColor: colors.primary },
                ]}
              >
                <Text style={styles.commentAvatarText}>
                  {user?.firstName?.[0] || "U"}
                </Text>
              </View>
              <View style={styles.commentInputContainer}>
                <TextInput
                  style={[
                    styles.commentInput,
                    {
                      backgroundColor: colors.background,
                      color: colors.text,
                      borderColor: colors.grey + "40",
                    },
                  ]}
                  placeholder="Write a comment..."
                  placeholderTextColor={colors.grey}
                  value={newComments[post.id] || ""}
                  onChangeText={(text) =>
                    setNewComments((prev) => ({
                      ...prev,
                      [post.id]: text,
                    }))
                  }
                  multiline
                />
                <TouchableOpacity
                  style={[
                    styles.postCommentButton,
                    {
                      backgroundColor:
                        !newComments[post.id]?.trim() || isSubmittingComment
                          ? colors.grey + "40"
                          : colors.primary,
                    },
                  ]}
                  onPress={() => handleComment(post.id)}
                  disabled={
                    !newComments[post.id]?.trim() || isSubmittingComment
                  }
                >
                  {isSubmittingComment ? (
                    <ActivityIndicator size="small" color={colors.onPrimary} />
                  ) : (
                    <Ionicons name="send" size={16} color={colors.onPrimary} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Comments List */}
            {post.comments && post.comments.length > 0 && (
              <View style={styles.commentsList}>
                {post.comments.map((comment) => (
                  <View key={comment.id} style={styles.commentItem}>
                    <View
                      style={[
                        styles.commentAvatar,
                        { backgroundColor: colors.primary },
                      ]}
                    >
                      <Text style={styles.commentAvatarText}>
                        {comment.user?.firstName?.[0] || "U"}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.commentBubble,
                        { backgroundColor: colors.background },
                      ]}
                    >
                      <View style={styles.commentHeader}>
                        <Text style={[styles.commentAuthor, { color: colors.text }]}>
                          {comment.user?.firstName} {comment.user?.lastName}
                        </Text>
                        <Text style={[styles.commentDate, { color: colors.grey }]}>
                          {formatDate(comment.createdAt)}
                        </Text>
                      </View>
                      <Text style={[styles.commentContent, { color: colors.text }]}>
                        {comment.content}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  // Filter chips
  const renderFilterChips = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.filterContainer}
      contentContainerStyle={styles.filterContent}
    >
      {POST_TYPES.map((type) => (
        <TouchableOpacity
          key={type.value}
          style={[
            styles.filterChip,
            {
              backgroundColor:
                selectedType === type.value ? colors.primary : colors.white,
              borderColor:
                selectedType === type.value ? colors.primary : colors.grey + "40",
            },
          ]}
          onPress={() => setSelectedType(type.value)}
        >
          <Text
            style={[
              styles.filterChipText,
              {
                color:
                  selectedType === type.value ? colors.white : colors.text,
              },
            ]}
          >
            {type.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.hero, { backgroundColor: colors.primary }]}>
          <View style={styles.heroHeaderRow}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={[
                styles.heroBackButton,
                {
                  backgroundColor: isDarkMode
                    ? "rgba(9,15,27,0.82)"
                    : "rgba(255,255,255,0.92)",
                  borderColor: isDarkMode ? colors.border : "rgba(255,255,255,0.4)",
                },
              ]}
              activeOpacity={0.8}
            >
              <Ionicons
                name="arrow-back"
                size={20}
                color={isDarkMode ? colors.text : "#0b4f73"}
              />
            </TouchableOpacity>
            <View style={styles.heroTitleBlock}>
              <Text style={[styles.heroTitle, { color: colors.onPrimary }]}>Posts</Text>
              <Text style={[styles.heroSubtitle, { color: "rgba(255,255,255,0.82)" }]}>
                Updates, announcements and events
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading posts...
          </Text>
        </View>
        <CustomDialog
          isVisible={dialogVisible}
          type={dialogType as any}
          title={dialogTitle}
          message={dialogMessage}
          onConfirm={() => setDialogVisible(false)}
          autoCloseTimeout={dialogType === "SUCCESS" ? 1500 : 2000}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.hero, { backgroundColor: colors.primary }]}>
        <View style={styles.heroHeaderRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[
              styles.heroBackButton,
              {
                backgroundColor: isDarkMode
                  ? "rgba(9,15,27,0.82)"
                  : "rgba(255,255,255,0.92)",
                borderColor: isDarkMode ? colors.border : "rgba(255,255,255,0.4)",
              },
            ]}
            activeOpacity={0.8}
          >
            <Ionicons
              name="arrow-back"
              size={20}
              color={isDarkMode ? colors.text : "#0b4f73"}
            />
          </TouchableOpacity>
          <View style={styles.heroTitleBlock}>
            <Text style={[styles.heroTitle, { color: colors.onPrimary }]}>Posts</Text>
            <Text style={[styles.heroSubtitle, { color: "rgba(255,255,255,0.82)" }]}>
              Updates, announcements and events
            </Text>
          </View>
        </View>
      </View>
      
      {/* Filter Chips */}
      <View style={styles.filterCardWrap}>
        <View
          style={[
            styles.filterCard,
            { backgroundColor: colors.white, borderColor: colors.border, borderWidth: 1 },
          ]}
        >
          {renderFilterChips()}
        </View>
      </View>

      {/* Posts List */}
      <FlatList
        data={filteredPosts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name="newspaper-outline"
              size={64}
              color={colors.grey}
            />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No posts found
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.grey }]}>
              {selectedType !== "all"
                ? "Try adjusting your filters"
                : "Check back later for new posts"}
            </Text>
          </View>
        }
      />

      <CustomDialog
        isVisible={dialogVisible}
        type={dialogType as any}
        title={dialogTitle}
        message={dialogMessage}
        onConfirm={() => setDialogVisible(false)}
        autoCloseTimeout={dialogType === "SUCCESS" ? 1500 : 2000}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  hero: {
    paddingTop: verticalScale(48),
    paddingBottom: verticalScale(86),
    paddingHorizontal: horizontalScale(16),
  },
  heroHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: horizontalScale(12),
  },
  heroBackButton: {
    width: horizontalScale(40),
    height: horizontalScale(40),
    borderRadius: horizontalScale(20),
    backgroundColor: "rgba(255,255,255,0.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  heroTitleBlock: {
    flex: 1,
  },
  heroTitle: {
    color: "#fff",
    fontSize: moderateScale(22),
    fontWeight: "700",
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.82)",
    fontSize: moderateScale(12),
    marginTop: verticalScale(2),
  },
  filterCardWrap: {
    marginTop: verticalScale(-42),
    paddingHorizontal: horizontalScale(16),
    zIndex: 5,
  },
  filterCard: {
    borderRadius: moderateScale(16),
    paddingVertical: verticalScale(8),
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: verticalScale(10),
    fontSize: moderateScale(16),
    fontWeight: "500",
  },
  filterContainer: {
    maxHeight: verticalScale(50),
  },
  filterContent: {
    paddingHorizontal: horizontalScale(12),
    paddingVertical: verticalScale(4),
    gap: horizontalScale(8),
  },
  filterChip: {
    paddingHorizontal: horizontalScale(14),
    paddingVertical: verticalScale(6),
    borderRadius: moderateScale(20),
    borderWidth: 1,
    marginRight: horizontalScale(8),
  },
  filterChipText: {
    fontSize: moderateScale(13),
    fontWeight: "500",
  },
  listContent: {
    padding: horizontalScale(16),
    paddingTop: verticalScale(16),
    paddingBottom: verticalScale(30),
  },
  postCard: {
    borderRadius: moderateScale(12),
    marginBottom: verticalScale(16),
    padding: horizontalScale(16),
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  postHeader: {
    flexDirection: "row",
    marginBottom: verticalScale(12),
  },
  avatarContainer: {
    width: horizontalScale(40),
    height: horizontalScale(40),
    borderRadius: horizontalScale(20),
    justifyContent: "center",
    alignItems: "center",
    marginRight: horizontalScale(12),
  },
  avatarText: {
    color: "#fff",
    fontSize: moderateScale(16),
    fontWeight: "600",
  },
  postAuthorInfo: {
    flex: 1,
  },
  authorNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: horizontalScale(6),
  },
  authorName: {
    fontSize: moderateScale(15),
    fontWeight: "600",
  },
  pinnedBadge: {
    paddingHorizontal: horizontalScale(6),
    paddingVertical: verticalScale(2),
    borderRadius: moderateScale(4),
  },
  pinnedText: {
    fontSize: moderateScale(10),
    fontWeight: "600",
  },
  postMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: verticalScale(2),
    gap: horizontalScale(8),
  },
  postDate: {
    fontSize: moderateScale(11),
  },
  typeBadge: {
    paddingHorizontal: horizontalScale(8),
    paddingVertical: verticalScale(2),
    borderRadius: moderateScale(4),
  },
  typeBadgeText: {
    fontSize: moderateScale(10),
    fontWeight: "600",
  },
  postContent: {
    marginBottom: verticalScale(12),
  },
  postText: {
    fontSize: moderateScale(14),
    lineHeight: moderateScale(20),
  },
  readMoreText: {
    fontSize: moderateScale(13),
    fontWeight: "500",
    marginTop: verticalScale(4),
  },
  postImageContainer: {
    marginBottom: verticalScale(12),
  },
  postImage: {
    width: "100%",
    height: horizontalScale(200),
    borderRadius: moderateScale(8),
  },
  interactionBar: {
    flexDirection: "row",
    paddingTop: verticalScale(10),
    borderTopWidth: 1,
    gap: horizontalScale(20),
  },
  interactionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: horizontalScale(4),
  },
  interactionText: {
    fontSize: moderateScale(13),
    fontWeight: "500",
  },
  likedBySection: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: verticalScale(10),
    gap: horizontalScale(8),
  },
  likedAvatars: {
    flexDirection: "row",
  },
  likedAvatar: {
    width: horizontalScale(20),
    height: horizontalScale(20),
    borderRadius: horizontalScale(10),
    justifyContent: "center",
    alignItems: "center",
    marginLeft: horizontalScale(-6),
    borderWidth: 2,
    borderColor: "#fff",
  },
  likedAvatarText: {
    color: "#fff",
    fontSize: moderateScale(10),
    fontWeight: "600",
  },
  likedByText: {
    fontSize: moderateScale(11),
  },
  commentsSection: {
    marginTop: verticalScale(12),
    paddingTop: verticalScale(12),
    borderTopWidth: 1,
  },
  addCommentRow: {
    flexDirection: "row",
    marginBottom: verticalScale(12),
  },
  commentAvatar: {
    width: horizontalScale(32),
    height: horizontalScale(32),
    borderRadius: horizontalScale(16),
    justifyContent: "center",
    alignItems: "center",
    marginRight: horizontalScale(10),
  },
  commentAvatarText: {
    color: "#fff",
    fontSize: moderateScale(12),
    fontWeight: "600",
  },
  commentInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: horizontalScale(8),
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: moderateScale(8),
    paddingHorizontal: horizontalScale(12),
    paddingVertical: verticalScale(8),
    fontSize: moderateScale(13),
    maxHeight: horizontalScale(80),
  },
  postCommentButton: {
    width: horizontalScale(36),
    height: horizontalScale(36),
    borderRadius: moderateScale(18),
    justifyContent: "center",
    alignItems: "center",
  },
  commentsList: {
    gap: verticalScale(10),
  },
  commentItem: {
    flexDirection: "row",
  },
  commentBubble: {
    flex: 1,
    padding: horizontalScale(10),
    borderRadius: moderateScale(8),
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: verticalScale(4),
  },
  commentAuthor: {
    fontSize: moderateScale(12),
    fontWeight: "600",
  },
  commentDate: {
    fontSize: moderateScale(10),
  },
  commentContent: {
    fontSize: moderateScale(12),
    lineHeight: moderateScale(18),
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: verticalScale(60),
  },
  emptyTitle: {
    fontSize: moderateScale(18),
    fontWeight: "600",
    marginTop: verticalScale(16),
  },
  emptySubtitle: {
    fontSize: moderateScale(13),
    marginTop: verticalScale(4),
    textAlign: "center",
  },
});

export default Posts;
