import { Ionicons } from "@expo/vector-icons";
import Header from "app/components/Header";
import { darkTheme, lightTheme } from "app/constants/colors";
import { useRouter } from "expo-router";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import CustomDialog from "../components/CustomDialog";
import { horizontalScale, moderateScale, verticalScale } from "utils/metrics";
import api, { getEmployeeProfile, getPayrollRecords } from "../../api/api";
import useAuthStore from "../../store/useUserStore";

interface PayrollRecord {
  id: string;
  payPeriod: string;
  periodStart: string;
  periodEnd: string;
  netPay: number;
  grossPay?: number;
  deductions?: number;
  status: string;
}

const { width: screenWidth } = Dimensions.get("window");

const Payslips = () => {
  const colorScheme = useColorScheme() ?? "light";
  const colors = colorScheme === "dark" ? darkTheme : lightTheme;
  const router = useRouter();

  const { user, isAuthenticated, initializeAuth } = useAuthStore();
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const [dialogVisible, setDialogVisible] = useState<boolean>(false);
  const [dialogType, setDialogType] = useState<string>("INFO");
  const [dialogTitle, setDialogTitle] = useState<string>("");
  const [dialogMessage, setDialogMessage] = useState<string>("");
  const [dialogButtons, setDialogButtons] = useState<Array<{text: string, onPress: () => void, style?: 'default' | 'cancel' | 'destructive'}>>([]);

  const showDialog = (
    type: string,
    title: string,
    message: string,
    buttons?: {text: string, onPress?: () => void, style?: 'default' | 'cancel' | 'destructive'}[]
  ) => {
    setDialogType(type);
    setDialogTitle(title);
    setDialogMessage(message);
    if (buttons && buttons.length > 0) {
      setDialogButtons(buttons.map(btn => ({
        text: btn.text,
        onPress: btn.onPress || (() => setDialogVisible(false)),
        style: btn.style
      })));
    } else {
      setDialogButtons([{ text: "OK", onPress: () => setDialogVisible(false) }]);
    }
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

  // Fetch payslips once auth is ready
  useEffect(() => {
    if (!initialized) return;

    if (!user?.userId) {
      setLoading(false);
      showDialog("DANGER", "Error", "User not authenticated. Please login again.");
      router.replace("/(auth)/Login");
      return;
    }

    fetchPayslips();
  }, [initialized, user?.userId]);

  const fetchPayslips = async () => {
    const userId = user?.userId;
    if (!userId) return;

    try {
      setLoading(true);
      const empRes = await getEmployeeProfile(userId);
      const employeeId = empRes.data?.id;
      const organizationId = empRes.data?.organizationId;
      if (!employeeId || !organizationId) {
        throw new Error("Employee profile not found");
      }

      const res = await getPayrollRecords({
        organizationId,
        employeeId,
        status: "paid",
        limit: 200,
        page: 1,
      });
      setRecords(res.data?.data || []);
    } catch (error: any) {
      console.error("Error fetching payslips:", error);
      showDialog("DANGER", "Error", error?.message || "Failed to load payslips");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPayslips();
  };

  const handleDownload = async (record: PayrollRecord) => {
    try {
      setDownloadingId(record.id);
      const accessToken = useAuthStore.getState().accessToken;
      const baseUrl = api.defaults.baseURL || "";
      const url = `${baseUrl.replace(/\/$/, "")}/payroll/${record.id}/slip`;
      const fileName = `payslip-${record.payPeriod}-${record.id}.pdf`;
      const fileUri = FileSystem.documentDirectory + fileName;
      const downloadRes = await FileSystem.downloadAsync(url, fileUri, {
        headers: accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : {},
      });
      if (downloadRes.status !== 200) {
        throw new Error("Download failed");
      }

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "application/pdf",
          dialogTitle: "Save or Share Payslip",
        });
      } else {
        showDialog("SUCCESS", "Downloaded", "Payslip saved to app storage.");
      }
    } catch (error) {
      showDialog("DANGER", "Error", "Failed to download payslip.");
    } finally {
      setDownloadingId(null);
    }
  };

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return "N/A";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "N/A";
      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  const formatCurrency = (amount?: number): string => {
    if (amount == null) return "N/A";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const totalEarnings = records.reduce((sum, r) => sum + (r.netPay || 0), 0);

  if (loading) {
    return (
      <View
        style={[styles.loadingContainer, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Loading payslips...
        </Text>
        <CustomDialog isVisible={dialogVisible} type={dialogType as any} title={dialogTitle} message={dialogMessage} buttons={dialogButtons} onCancel={() => setDialogVisible(false)} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Payslips" />
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Hero Card */}
        <View style={[styles.heroCard, { backgroundColor: colors.white }]}>
          <View style={styles.triangle} />
          <View style={styles.triangle2} />
          <View style={styles.triangle3} />
          <View style={styles.triangle4} />

          <View style={styles.heroContent}>
            <View
              style={[
                styles.heroIconContainer,
                { backgroundColor: colors.primary + "15" },
              ]}
            >
              <Ionicons name="wallet" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.heroTitle, { color: colors.text }]}>
              {records.length}
            </Text>
            <Text style={[styles.heroSubtitle, { color: colors.grey }]}>
              Payslips Available
            </Text>
            {records.length > 0 && (
              <View
                style={[
                  styles.heroBadge,
                  { backgroundColor: colors.primary },
                ]}
              >
                <Text style={styles.heroBadgeText}>
                  Total Earned: {formatCurrency(totalEarnings)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Records Section */}
        {records.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.white }]}>
            <Ionicons
              name="document-text-outline"
              size={48}
              color={colors.grey}
            />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No payslips yet
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.grey }]}>
              Payslips will appear here after HR processes them.
            </Text>
          </View>
        ) : (
          <View style={[styles.section, { backgroundColor: colors.white }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Payment History
            </Text>
            {records.map((record, index) => {
              const isDownloading = downloadingId === record.id;
              return (
                <View
                  key={record.id}
                  style={[
                    styles.payslipItem,
                    { backgroundColor: colors.background },
                    index === records.length - 1 && { marginBottom: 0 },
                  ]}
                >
                  <View style={styles.payslipRow}>
                    <View
                      style={[
                        styles.payslipIconContainer,
                        { backgroundColor: colors.primary + "15" },
                      ]}
                    >
                      <Ionicons
                        name="receipt-outline"
                        size={20}
                        color={colors.primary}
                      />
                    </View>
                    <View style={styles.payslipInfo}>
                      <Text
                        style={[styles.payslipPeriod, { color: colors.text }]}
                      >
                        {record.payPeriod}
                      </Text>
                      <Text
                        style={[styles.payslipDate, { color: colors.grey }]}
                      >
                        {formatDate(record.periodStart)} -{" "}
                        {formatDate(record.periodEnd)}
                      </Text>
                    </View>
                    <View style={styles.payslipRight}>
                      <Text
                        style={[styles.payslipAmount, { color: colors.text }]}
                      >
                        {formatCurrency(record.netPay)}
                      </Text>
                      <View style={styles.statusBadge}>
                        <View style={styles.statusDot} />
                        <Text style={styles.statusText}>Paid</Text>
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.downloadButton,
                      { borderColor: colors.primary },
                      isDownloading && { opacity: 0.6 },
                    ]}
                    onPress={() => handleDownload(record)}
                    activeOpacity={0.7}
                    disabled={isDownloading}
                  >
                    {isDownloading ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Ionicons
                        name="download-outline"
                        size={16}
                        color={colors.primary}
                      />
                    )}
                    <Text
                      style={[
                        styles.downloadText,
                        { color: colors.primary },
                      ]}
                    >
                      {isDownloading ? "Downloading..." : "Download Payslip"}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
      <CustomDialog isVisible={dialogVisible} type={dialogType as any} title={dialogTitle} message={dialogMessage} buttons={dialogButtons} onCancel={() => setDialogVisible(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  scrollContainer: {
    flex: 1,
    marginTop: verticalScale(-90),
  },
  scrollContent: {
    paddingHorizontal: horizontalScale(20),
    paddingBottom: verticalScale(20),
  },

  // Hero Card - matching profile card style
  heroCard: {
    borderRadius: moderateScale(20),
    padding: moderateScale(10),
    marginBottom: verticalScale(20),
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: verticalScale(1) },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(4),
    borderWidth: 1,
    borderColor: "#E8ECEF",
    position: "relative",
    overflow: "hidden",
  },
  triangle: {
    position: "absolute",
    top: 10,
    left: 10,
    width: 0,
    height: 0,
    borderStyle: "solid",
    borderTopWidth: moderateScale(60),
    borderRightWidth: moderateScale(60),
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopColor: "#E1F4FF",
    borderRightColor: "transparent",
  },
  triangle2: {
    position: "absolute",
    bottom: 10,
    right: 10,
    width: 0,
    height: 0,
    borderStyle: "solid",
    borderTopWidth: moderateScale(60),
    borderRightWidth: moderateScale(60),
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopColor: "#E1F4FF",
    borderRightColor: "transparent",
    transform: [{ rotate: "180deg" }],
  },
  triangle3: {
    position: "absolute",
    bottom: 10,
    left: 10,
    width: 0,
    height: 0,
    borderStyle: "solid",
    borderTopWidth: moderateScale(60),
    borderRightWidth: moderateScale(60),
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopColor: "#E1F4FF",
    borderRightColor: "transparent",
    transform: [{ rotate: "270deg" }],
  },
  triangle4: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 0,
    height: 0,
    borderStyle: "solid",
    borderTopWidth: moderateScale(60),
    borderRightWidth: moderateScale(60),
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopColor: "#E1F4FF",
    borderRightColor: "transparent",
    transform: [{ rotate: "90deg" }],
  },
  heroContent: {
    alignItems: "center",
    paddingVertical: verticalScale(16),
    zIndex: 3,
  },
  heroIconContainer: {
    width: horizontalScale(64),
    height: horizontalScale(64),
    borderRadius: horizontalScale(32),
    justifyContent: "center",
    alignItems: "center",
    marginBottom: verticalScale(12),
  },
  heroTitle: {
    fontSize: moderateScale(32),
    fontWeight: "bold",
    marginBottom: verticalScale(2),
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.1)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  heroSubtitle: {
    fontSize: moderateScale(14),
    marginBottom: verticalScale(12),
    textAlign: "center",
  },
  heroBadge: {
    paddingHorizontal: horizontalScale(16),
    paddingVertical: verticalScale(8),
    borderRadius: moderateScale(20),
  },
  heroBadgeText: {
    color: "#fff",
    fontSize: moderateScale(13),
    fontWeight: "700",
  },

  // Section card - matching profile infoSection style
  section: {
    borderRadius: moderateScale(16),
    padding: moderateScale(20),
    marginBottom: verticalScale(16),
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: moderateScale(18),
    fontWeight: "bold",
    marginBottom: verticalScale(16),
  },

  // Payslip item - matching profile infoItem style
  payslipItem: {
    padding: moderateScale(12),
    borderRadius: moderateScale(12),
    marginBottom: verticalScale(10),
  },
  payslipRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  payslipIconContainer: {
    width: horizontalScale(40),
    height: horizontalScale(40),
    borderRadius: horizontalScale(20),
    justifyContent: "center",
    alignItems: "center",
    marginRight: horizontalScale(12),
  },
  payslipInfo: {
    flex: 1,
  },
  payslipPeriod: {
    fontSize: moderateScale(15),
    fontWeight: "600",
    marginBottom: verticalScale(2),
  },
  payslipDate: {
    fontSize: moderateScale(11),
    fontWeight: "500",
  },
  payslipRight: {
    alignItems: "flex-end",
  },
  payslipAmount: {
    fontSize: moderateScale(15),
    fontWeight: "700",
    marginBottom: verticalScale(4),
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E8",
    paddingHorizontal: horizontalScale(8),
    paddingVertical: verticalScale(2),
    borderRadius: moderateScale(10),
    gap: horizontalScale(4),
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4CAF50",
  },
  statusText: {
    color: "#4CAF50",
    fontSize: moderateScale(10),
    fontWeight: "600",
  },
  downloadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: verticalScale(10),
    paddingVertical: verticalScale(8),
    borderRadius: moderateScale(10),
    borderWidth: 1,
    gap: horizontalScale(6),
  },
  downloadText: {
    fontSize: moderateScale(13),
    fontWeight: "600",
  },

  // Empty state
  emptyCard: {
    borderRadius: moderateScale(16),
    padding: moderateScale(40),
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  emptyTitle: {
    fontSize: moderateScale(18),
    fontWeight: "700",
    marginTop: verticalScale(16),
  },
  emptySubtitle: {
    marginTop: verticalScale(8),
    fontSize: moderateScale(13),
    textAlign: "center",
  },
});

export default Payslips;
