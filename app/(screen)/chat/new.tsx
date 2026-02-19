import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
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
import { createDirectConversation, getEmployees } from "../../../api/api";

const NewChat = () => {
  const colorScheme = useColorScheme() ?? "light";
  const colors = colorScheme === "dark" ? darkTheme : lightTheme;
  const router = useRouter();
  const { user } = useAuthStore();

  const [search, setSearch] = useState("");
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadEmployees = async () => {
      if (!user?.organizationId) return;
      setLoading(true);
      try {
        const res = await getEmployees(user.organizationId);
        const data = res.data?.data || res.data || [];
        const list = Array.isArray(data) ? data : [];
        setEmployees(list.filter((e) => e.userId !== user.userId));
      } finally {
        setLoading(false);
      }
    };
    loadEmployees();
  }, [user?.organizationId, user?.userId]);

  const filtered = useMemo(() => {
    if (!search.trim()) return employees;
    const q = search.toLowerCase();
    return employees.filter((e) => {
      const name = `${e.firstName || ""} ${e.lastName || ""}`.toLowerCase();
      const designation = `${e.designation?.name || e.designationName || ""}`.toLowerCase();
      return name.includes(q) || designation.includes(q);
    });
  }, [employees, search]);

  const startChatWith = async (emp: any) => {
    try {
      const res = await createDirectConversation(emp.userId);
      const conv = res.data;
      const name = `${emp.firstName || ""} ${emp.lastName || ""}`.trim();
      router.push({
        pathname: "/(screen)/chat/[id]",
        params: {
          id: conv.id,
          title: name || "Chat",
          avatar: emp.photoUrl || "",
          peerId: emp.userId || "",
        },
      });
    } catch {
      // ignore
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Chat</Text>
      </View>

      <View style={styles.searchBar}>
        <Feather name="search" size={18} color="#6B7280" />
        <TextInput
          placeholder="Search employees"
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

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.userId}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.employeeRow}
            onPress={() => startChatWith(item)}
          >
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {item.firstName?.charAt(0)?.toUpperCase() || "U"}
              </Text>
            </View>
            <View>
              <Text style={styles.employeeName}>
                {item.firstName} {item.lastName}
              </Text>
              <Text style={styles.employeeSub}>
                {item.designation?.name || item.designationName || "Employee"}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={styles.divider} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No employees found</Text>
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
    paddingBottom: verticalScale(16),
    paddingHorizontal: horizontalScale(20),
    flexDirection: "row",
    alignItems: "center",
    gap: horizontalScale(10),
  },
  backBtn: {
    padding: moderateScale(4),
  },
  headerTitle: {
    fontSize: moderateScale(18),
    fontWeight: "700",
    color: "#fff",
  },
  searchBar: {
    backgroundColor: "#fff",
    marginHorizontal: horizontalScale(16),
    marginTop: verticalScale(-12),
    paddingHorizontal: horizontalScale(12),
    paddingVertical: verticalScale(10),
    borderRadius: moderateScale(12),
    flexDirection: "row",
    alignItems: "center",
    gap: horizontalScale(8),
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  searchInput: {
    flex: 1,
    fontSize: moderateScale(13),
    color: "#111827",
  },
  listContent: {
    paddingTop: verticalScale(12),
    paddingBottom: verticalScale(24),
  },
  employeeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: horizontalScale(16),
    paddingVertical: verticalScale(12),
  },
  avatarCircle: {
    width: moderateScale(42),
    height: moderateScale(42),
    borderRadius: moderateScale(21),
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: horizontalScale(12),
  },
  avatarText: {
    fontWeight: "700",
    color: "#0F172A",
  },
  employeeName: {
    fontSize: moderateScale(14),
    fontWeight: "600",
    color: "#0F172A",
  },
  employeeSub: {
    fontSize: moderateScale(12),
    color: "#94A3B8",
    marginTop: verticalScale(2),
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginHorizontal: horizontalScale(16),
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(40),
  },
  emptyText: {
    color: "#94A3B8",
  },
});

export default NewChat;
