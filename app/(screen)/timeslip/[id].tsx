import { Feather } from "@expo/vector-icons";
import Header from "app/components/Header";
import { darkTheme, lightTheme } from "../../constants/colors";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { horizontalScale, moderateScale, verticalScale } from "utils/metrics";
import { getEmployeeProfile, getTimeslipById, getTimeslipsByEmployee } from "../../../api/api";
import useAuthStore from "../../../store/useUserStore";

interface Approver {
  id: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
}

interface Approval {
  id: string;
  action: "PENDING" | "APPROVED" | "REJECTED";
  remarks?: string | null;
  acted_at?: string | null;
  step_no: number;
  approver: Approver;
}

interface TimeslipDetail {
  id: string;
  date: string;
  missing_type: "IN" | "OUT" | "BOTH" | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  corrected_in?: string | null;
  corrected_out?: string | null;
  reason?: string;
  created_at: string;
  updated_at: string;
  approvals: Approval[];
}

interface TimelineEvent {
  id: string;
  title: string;
  time: string;
  date: string;
  status: "completed" | "pending" | "rejected";
  description: string;
  icon: string;
  details?: string;
}

const TimeSlip = () => {
  const colorScheme = useColorScheme() ?? "light";
  const colors = colorScheme === "dark" ? darkTheme : lightTheme;
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuthStore();

  const [timeslipDetail, setTimeslipDetail] = useState<TimeslipDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [employeeData, setEmployeeData] = useState<any>(null);

  useEffect(() => {
    const fetchTimeslipDetail = async () => {
      if (!user?.userId || !id) {
        setError("User ID or Timeslip ID not found");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const employeeResponse = await getEmployeeProfile(user.userId);
        setEmployeeData(employeeResponse.data);
        const employeeId = employeeResponse.data.id;
        if (!employeeId) {
          throw new Error("Employee ID not found in profile");
        }

        try {
          const timeslipResponse = await getTimeslipById(String(id));
          setTimeslipDetail(timeslipResponse.data);
        } catch (err) {
          const timeslipListResponse = await getTimeslipsByEmployee(employeeId, 50, 1);
          const timeslips = Array.isArray(timeslipListResponse.data.data)
            ? timeslipListResponse.data.data
            : [timeslipListResponse.data.data];
          const specificTimeslip = timeslips.find((slip: any) => slip.id.toString() === id.toString());
          if (!specificTimeslip) {
            throw new Error("Timeslip not found");
          }
          setTimeslipDetail(specificTimeslip);
        }

        setError(null);
      } catch (err: any) {
        console.error("Error fetching timeslip detail:", err);
        setError(err.message || "Failed to fetch timeslip details");
      } finally {
        setLoading(false);
      }
    };
    fetchTimeslipDetail();
  }, [user?.userId, id]);

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case "APPROVED":
        return "#4CAF50";
      case "PENDING":
        return "#FF9800";
      case "REJECTED":
        return "#F44336";
      default:
        return "#666";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toUpperCase()) {
      case "APPROVED":
        return "check-circle";
      case "PENDING":
        return "clock";
      case "REJECTED":
        return "x-circle";
      default:
        return "circle";
    }
  };

  const generateTimeline = (): TimelineEvent[] => {
    if (!timeslipDetail) return [];

    const timeline: TimelineEvent[] = [];
    const status = (timeslipDetail.status || "PENDING").toUpperCase() as
      | "PENDING"
      | "APPROVED"
      | "REJECTED";

    const submittedDate = new Date(timeslipDetail.created_at);
    timeline.push({
      id: "submitted",
      title: "Request Submitted",
      time: submittedDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      date: submittedDate.toLocaleDateString("en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      status: "completed",
      description: `${timeslipDetail.missing_type} time correction request submitted`,
      icon: "send",
      details: timeslipDetail.reason || "Time correction request submitted for review",
    });

    (timeslipDetail.approvals || []).forEach((approval, index) => {
      const status = approval.action === "APPROVED"
        ? "completed"
        : approval.action === "REJECTED"
        ? "rejected"
        : "pending";
      const stepNo = approval.step_no || index + 1;
      const approverName = approval.approver
        ? `${approval.approver.firstName} ${approval.approver.lastName}`
        : "Approver";
      const stepTitle = `Step ${stepNo} - ${approval.action}`;
      timeline.push({
        id: `approval_${approval.id}`,
        title: stepTitle,
        time: approval.acted_at
          ? new Date(approval.acted_at).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "",
        date: approval.acted_at
          ? new Date(approval.acted_at).toLocaleDateString("en-US", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : "",
        status,
        description:
          status === "completed"
            ? `Approved by ${approverName}`
            : status === "rejected"
            ? `Rejected by ${approverName}`
            : `Assigned to ${approverName} (Pending)`,
        icon: getStatusIcon(approval.action),
        details:
          status === "completed"
            ? `Approved by ${approverName}`
            : status === "rejected"
            ? approval.remarks || `Rejected by ${approverName}`
            : `Waiting for ${approverName} to review`,
      });
    });

    const finalStatus =
      status === "APPROVED" ? "completed" : status === "REJECTED" ? "rejected" : "pending";
    const finalDate = timeslipDetail.updated_at
      ? new Date(timeslipDetail.updated_at)
      : new Date(timeslipDetail.created_at);
    timeline.push({
      id: "final_status",
      title: "Final Status",
      time: finalDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      date: finalDate.toLocaleDateString("en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      status: finalStatus,
      description:
        finalStatus === "completed"
          ? "Time correction request fully approved"
          : finalStatus === "rejected"
          ? "Request rejected"
          : "Awaiting final approval",
      icon: getStatusIcon(timeslipDetail.status),
      details:
        finalStatus === "completed"
          ? "The time correction has been fully approved and applied"
          : finalStatus === "rejected"
          ? timeslipDetail.reason || "The request was not approved"
          : "Waiting for final processing",
    });

    return timeline;
  };

  const formatTime = (timeString?: string | null) => {
    if (!timeString) return "Not recorded";
    return new Date(timeString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title="Timeslip Details" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading timeslip details...</Text>
        </View>
      </View>
    );
  }

  if (error || !timeslipDetail) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title="Timeslip Details" />
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={48} color="#F44336" />
          <Text style={styles.errorText}>{error || "Timeslip not found"}</Text>
        </View>
      </View>
    );
  }

  const timeline = generateTimeline();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Timeslip Details" />
      <View style={{ height: verticalScale(40) }} />
      <View style={styles.cardWrapper}>
        <View style={[styles.card, { backgroundColor: colors.white }]}>
          <View style={styles.triangle} />
          <View style={styles.triangle2} />
          <View style={styles.triangle3} />
          <View style={styles.triangle4} />
          <View style={styles.contentContainer}>
            <View style={styles.dateBadge}>
              <Text style={styles.dateBadgeText}>
                {new Date(timeslipDetail.date).toLocaleDateString("en-US", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </Text>
            </View>
            <View style={styles.timeEntriesContainer}>
              <View style={styles.timeEntry}>
                <View style={styles.timeEntryHeader}>
                  <View style={[styles.entryIcon, { backgroundColor: "#E3F2FD" }]}>
                    <Feather name="log-in" size={16} color="#2196F3" />
                  </View>
                  <Text style={styles.entryLabel}>Check In</Text>
                </View>
                <View style={styles.timeDetails}>
                  <Text style={styles.timeValue}>
                    {formatTime(timeslipDetail.corrected_in)}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(timeslipDetail.status) + "15" },
                    ]}
                  >
                    <Feather
                      name={getStatusIcon(timeslipDetail.status)}
                      size={10}
                      color={getStatusColor(timeslipDetail.status)}
                    />
                    <Text
                      style={[
                        styles.statusBadgeText,
                        { color: getStatusColor(timeslipDetail.status) },
                      ]}
                    >
                      {timeslipDetail.status}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.verticalDivider}>
                <View style={styles.dividerLine} />
                <View style={styles.dividerDot} />
              </View>
              <View style={styles.timeEntry}>
                <View style={styles.timeEntryHeader}>
                  <View style={[styles.entryIcon, { backgroundColor: "#FFF3E0" }]}>
                    <Feather name="log-out" size={16} color="#FF9800" />
                  </View>
                  <Text style={styles.entryLabel}>Check Out</Text>
                </View>
                <View style={styles.timeDetails}>
                  <Text style={styles.timeValue}>
                    {formatTime(timeslipDetail.corrected_out)}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(timeslipDetail.status) + "15" },
                    ]}
                  >
                    <Feather
                      name={getStatusIcon(timeslipDetail.status)}
                      size={10}
                      color={getStatusColor(timeslipDetail.status)}
                    />
                    <Text
                      style={[
                        styles.statusBadgeText,
                        { color: getStatusColor(timeslipDetail.status) },
                      ]}
                    >
                      {timeslipDetail.status}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>
      <View style={[styles.reasonCard, { backgroundColor: colors.white }]}>
        <View style={styles.reasonTitleContainer}>
          <Feather
            name="info"
            size={moderateScale(20)}
            color={colors.primary}
            style={{ marginRight: horizontalScale(8) }}
          />
          <Text style={[styles.reasonTitle, { color: colors.text }]}>Reason</Text>
        </View>
        <Text style={[styles.reasonText, { color: colors.textSecondary || "#4B5563" }]}>
          {timeslipDetail.reason || "No reason provided"}
        </Text>
      </View>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.timelineContainer}>
          <Text style={[styles.timelineTitle, { color: colors.text }]}>Request Timeline</Text>
          {timeline.map((event, index) => (
            <View key={event.id} style={styles.timelineItem}>
              <View style={styles.timelineLeft}>
                <View
                  style={[
                    styles.timelineIcon,
                    {
                      backgroundColor:
                        event.status === "completed"
                          ? "#4CAF50"
                          : event.status === "rejected"
                          ? "#F44336"
                          : "#FF9800",
                    },
                  ]}
                >
                  <Feather name={event.icon} size={16} color="#fff" />
                </View>
                {index < timeline.length - 1 && (
                  <View
                    style={[
                      styles.timelineLine,
                      { backgroundColor: event.status === "completed" ? "#4CAF50" : "#E5E7EB" },
                    ]}
                  />
                )}
              </View>
              <View style={[styles.timelineContent, { backgroundColor: colors.white, borderColor: colors.border || "#F1F5F9" }]}>
                <View style={styles.timelineHeader}>
                  <Text style={[styles.timelineEventTitle, { color: colors.text }]}>{event.title}</Text>
                  {event.time && (
                    <Text style={[styles.timelineTime, { color: colors.textSecondary || "#6B7280" }]}>
                      {event.time} • {event.date}
                    </Text>
                  )}
                </View>
                <Text style={[styles.timelineDescription, { color: colors.textSecondary || "#4B5563" }]}>
                  {event.description}
                </Text>
                {event.details && (
                  <Text style={[styles.timelineDetails, { color: colors.textSecondary || "#6B7280" }]}>
                    {event.details}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  cardWrapper: {
    marginTop: verticalScale(-120),
    paddingHorizontal: horizontalScale(20),
    zIndex: 10,
  },
  card: {
    borderRadius: moderateScale(16),
    padding: moderateScale(16),
    paddingTop: moderateScale(20),
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(4),
    borderWidth: 1,
    borderColor: "#F1F5F9",
    backgroundColor: "#FFFFFF",
    position: "relative",
    overflow: "hidden",
  },
  contentContainer: {
    zIndex: 2,
    position: "relative",
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
  dateBadge: {
    position: "absolute",
    top: moderateScale(-21),
    right: moderateScale(-16),
    backgroundColor: "#005F90",
    paddingHorizontal: horizontalScale(12),
    paddingVertical: verticalScale(6),
    borderRadius: moderateScale(0),
    zIndex: 1,
  },
  dateBadgeText: {
    color: "#fff",
    fontSize: moderateScale(10),
    fontWeight: "700",
  },
  timeEntriesContainer: {
    flexDirection: "row",
    padding: moderateScale(16),
    paddingTop: moderateScale(20),
    paddingBottom: moderateScale(12),
  },
  timeEntry: {
    flex: 1,
  },
  timeEntryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: verticalScale(12),
  },
  entryIcon: {
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: moderateScale(16),
    justifyContent: "center",
    alignItems: "center",
    marginRight: horizontalScale(8),
  },
  entryLabel: {
    fontSize: moderateScale(12),
    fontWeight: "600",
    color: "#6B7280",
  },
  timeDetails: {
    alignItems: "flex-start",
  },
  timeValue: {
    fontSize: moderateScale(18),
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: verticalScale(8),
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: horizontalScale(8),
    paddingVertical: verticalScale(4),
    borderRadius: moderateScale(12),
  },
  statusBadgeText: {
    marginLeft: horizontalScale(4),
    fontSize: moderateScale(10),
    fontWeight: "600",
  },
  verticalDivider: {
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: horizontalScale(16),
    position: "relative",
  },
  dividerLine: {
    width: 2,
    height: moderateScale(60),
    backgroundColor: "#E5E7EB",
    borderRadius: moderateScale(1),
  },
  dividerDot: {
    position: "absolute",
    width: moderateScale(8),
    height: moderateScale(8),
    borderRadius: moderateScale(4),
    backgroundColor: "#005F90",
  },
  reasonCard: {
    marginHorizontal: horizontalScale(20),
    marginBottom: verticalScale(20),
    marginTop: verticalScale(15),
    padding: moderateScale(16),
    backgroundColor: "#FFFFFF",
    borderRadius: moderateScale(12),
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(4),
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  reasonTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: verticalScale(8),
  },
  reasonTitle: {
    fontSize: moderateScale(16),
    fontWeight: "700",
    color: "#1F2937",
  },
  reasonText: {
    fontSize: moderateScale(14),
    color: "#4B5563",
    lineHeight: moderateScale(22),
  },
  timelineContainer: {
    paddingHorizontal: horizontalScale(20),
    marginBottom: verticalScale(20),
  },
  timelineTitle: {
    fontSize: moderateScale(18),
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: verticalScale(20),
    marginTop: verticalScale(20),
  },
  timelineItem: {
    flexDirection: "row",
    marginBottom: verticalScale(20),
  },
  timelineLeft: {
    alignItems: "center",
    marginRight: horizontalScale(16),
  },
  timelineIcon: {
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: moderateScale(16),
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: verticalScale(1) },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(2),
  },
  timelineLine: {
    width: moderateScale(2),
    flex: 1,
    marginTop: verticalScale(8),
    minHeight: moderateScale(40),
  },
  timelineContent: {
    flex: 1,
    backgroundColor: "#fff",
    padding: moderateScale(16),
    borderRadius: moderateScale(12),
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: verticalScale(1) },
    shadowOpacity: 0.05,
    shadowRadius: moderateScale(2),
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  timelineHeader: {
    marginBottom: verticalScale(8),
  },
  timelineEventTitle: {
    fontSize: moderateScale(16),
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: verticalScale(4),
  },
  timelineTime: {
    fontSize: moderateScale(12),
    color: "#6B7280",
    fontWeight: "500",
  },
  timelineDescription: {
    fontSize: moderateScale(14),
    color: "#4B5563",
    fontWeight: "500",
    marginBottom: verticalScale(4),
  },
  timelineDetails: {
    fontSize: moderateScale(12),
    color: "#6B7280",
    fontStyle: "italic",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: horizontalScale(20),
  },
  loadingText: {
    fontSize: moderateScale(16),
    marginTop: verticalScale(16),
    textAlign: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: horizontalScale(20),
  },
  errorText: {
    fontSize: moderateScale(16),
    color: "#F44336",
    textAlign: "center",
    marginTop: verticalScale(16),
    marginBottom: verticalScale(24),
  },
  backButton: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: horizontalScale(24),
    paddingVertical: verticalScale(12),
    borderRadius: moderateScale(8),
  },
  backButtonText: {
    color: "#fff",
    fontSize: moderateScale(16),
    fontWeight: "600",
  },
});

export default TimeSlip;
