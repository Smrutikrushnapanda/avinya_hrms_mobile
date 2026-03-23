import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  useColorScheme,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { darkTheme, lightTheme } from "../constants/colors";
import { horizontalScale, moderateScale, verticalScale } from "utils/metrics";
import { getPolicies } from "../../api/api";

if (Platform.OS === "android") {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

interface Policy {
  id: string;
  title: string;
  content: string;
  category: string | null;
  updatedAt: string;
}

const Services = () => {
  const colorScheme = useColorScheme() ?? "light";
  const colors = colorScheme === "dark" ? darkTheme : lightTheme;
  const isDarkMode = colorScheme === "dark";
  const navigation = useNavigation();

  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchPolicies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPolicies();
      setPolicies(Array.isArray(res.data) ? res.data : []);
    } catch {
      setError("Failed to load company policies. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId((prev) => (prev === id ? null : id));
  };

  // Group by category
  const grouped = policies.reduce<Record<string, Policy[]>>((acc, p) => {
    const cat = p.category ?? "General";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  const categories = Object.keys(grouped);
  const totalPolicies = policies.length;

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "";
    }
  };

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
            <Text style={[styles.heroTitle, { color: colors.onPrimary }]}>
              Policies
            </Text>
            <Text style={[styles.heroSubtitle, { color: "rgba(255,255,255,0.82)" }]}>
              Company policy, guidelines and updates
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.introCard,
            { backgroundColor: colors.white, borderColor: colors.border, borderWidth: 1 },
          ]}
        >
          <View style={styles.introRow}>
            <View style={[styles.introIconWrap, { backgroundColor: `${colors.primary}14` }]}>
              <Ionicons name="shield-checkmark-outline" size={22} color={colors.primary} />
            </View>
            <View style={styles.introCopy}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Company Policies
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.grey }]}>
                Workplace rules, compliance notes and internal guidelines.
              </Text>
            </View>
          </View>

          <View style={styles.metricsRow}>
            <View style={[styles.metricCard, { backgroundColor: `${colors.primary}10` }]}>
              <Text style={[styles.metricValue, { color: colors.primary }]}>{totalPolicies}</Text>
              <Text style={[styles.metricLabel, { color: colors.grey }]}>Policies</Text>
            </View>
            <View style={[styles.metricCard, { backgroundColor: `${colors.primary}10` }]}>
              <Text style={[styles.metricValue, { color: colors.primary }]}>{categories.length}</Text>
              <Text style={[styles.metricLabel, { color: colors.grey }]}>Categories</Text>
            </View>
          </View>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.grey }]}>
              Loading policies...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={[styles.errorText, { color: colors.red }]}>{error}</Text>
            <Pressable
              style={[styles.retryBtn, { backgroundColor: colors.primary }]}
              onPress={fetchPolicies}
            >
              <Text style={[styles.retryBtnText, { color: colors.onPrimary }]}>
                Retry
              </Text>
            </Pressable>
          </View>
        ) : policies.length === 0 ? (
          <View style={styles.centered}>
            <Text style={[styles.emptyText, { color: colors.grey }]}>
              No policies published yet.
            </Text>
          </View>
        ) : (
          categories.map((category) => (
            <View key={category} style={styles.categoryGroup}>
              <View style={styles.categoryHeader}>
                <Text style={[styles.categoryLabel, { color: colors.text }]}>
                  {category}
                </Text>
                <Text style={[styles.categoryCount, { color: colors.grey }]}>
                  {grouped[category].length} item{grouped[category].length > 1 ? "s" : ""}
                </Text>
              </View>
              {grouped[category].map((policy) => {
                const isExpanded = expandedId === policy.id;
                return (
                  <Pressable
                    key={policy.id}
                    style={[
                      styles.policyCard,
                      {
                        backgroundColor: colors.white,
                        borderColor: isExpanded ? colors.primary : `${colors.grey}22`,
                        shadowColor: colors.primary,
                      },
                    ]}
                    onPress={() => toggleExpand(policy.id)}
                    android_ripple={{ color: `${colors.primary}20` }}
                  >
                    <View style={styles.policyHeader}>
                      <View style={styles.policyTitleRow}>
                        <View style={[styles.policyIconBadge, { backgroundColor: `${colors.primary}14` }]}>
                          <Ionicons name="document-text-outline" size={16} color={colors.primary} />
                        </View>
                        <Text
                          style={[styles.policyTitle, { color: colors.text }]}
                          numberOfLines={isExpanded ? undefined : 1}
                        >
                          {policy.title}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.chevron,
                          { color: colors.primary },
                        ]}
                      >
                        {isExpanded ? "▲" : "▼"}
                      </Text>
                    </View>

                    {isExpanded && (
                      <View style={[styles.policyBody, { borderTopColor: colors.border }]}>
                        <View style={styles.policyMetaRow}>
                          <Text style={[styles.policyMetaTag, { color: colors.primary, backgroundColor: `${colors.primary}12` }]}>
                            {category}
                          </Text>
                        </View>
                        <Text
                          style={[styles.policyContent, { color: colors.text }]}
                        >
                          {policy.content}
                        </Text>
                        <Text
                          style={[styles.policyDate, { color: colors.grey }]}
                        >
                          Last updated: {formatDate(policy.updatedAt)}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          ))
        )}

        {/* Placeholder for future services */}
        <View style={styles.comingSoon}>
          <Text style={[styles.comingSoonText, { color: colors.grey }]}>
            More services will appear here later.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

export default Services;

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
    borderWidth: 1,
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: verticalScale(0),
    paddingBottom: 40,
  },
  introCard: {
    marginTop: verticalScale(-42),
    marginBottom: 18,
    padding: moderateScale(16),
    borderRadius: moderateScale(16),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  introRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: horizontalScale(12),
  },
  introIconWrap: {
    width: horizontalScale(44),
    height: horizontalScale(44),
    borderRadius: horizontalScale(14),
    justifyContent: "center",
    alignItems: "center",
  },
  introCopy: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 13,
  },
  metricsRow: {
    flexDirection: "row",
    gap: horizontalScale(12),
    marginTop: verticalScale(16),
  },
  metricCard: {
    flex: 1,
    borderRadius: moderateScale(14),
    paddingVertical: verticalScale(12),
    paddingHorizontal: horizontalScale(14),
  },
  metricValue: {
    fontSize: moderateScale(18),
    fontWeight: "700",
  },
  metricLabel: {
    marginTop: verticalScale(2),
    fontSize: moderateScale(12),
    fontWeight: "500",
  },
  categoryGroup: {
    marginBottom: 18,
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  categoryLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
  categoryCount: {
    fontSize: 12,
    fontWeight: "500",
  },
  policyCard: {
    borderRadius: 16,
    borderWidth: 1.2,
    marginBottom: 12,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  policyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  policyTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  policyIconBadge: {
    width: horizontalScale(32),
    height: horizontalScale(32),
    borderRadius: horizontalScale(10),
    justifyContent: "center",
    alignItems: "center",
  },
  policyTitle: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  chevron: {
    fontSize: 11,
    marginLeft: 8,
  },
  policyBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 12,
  },
  policyMetaRow: {
    flexDirection: "row",
    marginBottom: verticalScale(10),
  },
  policyMetaTag: {
    fontSize: moderateScale(11),
    fontWeight: "600",
    paddingHorizontal: horizontalScale(8),
    paddingVertical: verticalScale(4),
    borderRadius: moderateScale(999),
    overflow: "hidden",
  },
  policyContent: {
    fontSize: 13,
    lineHeight: 21,
    opacity: 0.9,
  },
  policyDate: {
    fontSize: 11,
    marginTop: 10,
  },
  centered: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    marginTop: 8,
  },
  errorText: {
    fontSize: 13,
    textAlign: "center",
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  retryBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  emptyText: {
    fontSize: 13,
  },
  comingSoon: {
    alignItems: "center",
    marginTop: 24,
    paddingVertical: 16,
  },
  comingSoonText: {
    fontSize: 12,
    fontStyle: "italic",
  },
});
