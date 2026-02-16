import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { moderateScale, verticalScale } from "utils/metrics";
import { getActivePolls, savePollResponse } from "../../api/api";
import useAuthStore from "../../store/useUserStore";

// Types
interface Poll {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  questions: Question[];
  responses?: Response[];
}

interface Question {
  id: string;
  question_text: string;
  is_required: boolean;
  options: Option[];
}

interface Option {
  id: string;
  option_text: string;
}

interface Response {
  id: string;
  poll_id: string;
  question_id: string;
  user_id: string;
  option_ids: string[];
  submitted_at: string;
}

interface MessageModalProps {
  onClose?: () => void;
}

/**
 * MessageModal will fetch the active poll and display it if and only if
 * the user has not submitted a response. It collects single-choice answers and submits
 * via the correct API endpoint, one per question.
 */
const MessageModal: React.FC<MessageModalProps> = ({ onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pollData, setPollData] = useState<Poll | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<{
    [questionId: string]: string;
  }>({});
  const { user } = useAuthStore.getState();

  // Fetch poll (if any), decide if modal should show
  const fetchPolls = async () => {
    if (!user?.userId) {
      setError("User not authenticated");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await getActivePolls();
      const { poll, responses } = response.data;

      if (
        poll &&
        poll.start_time &&
        poll.end_time &&
        poll.questions &&
        Array.isArray(poll.questions) &&
        poll.questions.length > 0
      ) {
        const nowDate = new Date().toISOString().split("T")[0];
        const start = new Date(poll.start_time).toISOString().split("T")[0];
        const end = new Date(poll.end_time).toISOString().split("T")[0];
        const isPollActive = start <= nowDate && nowDate <= end;

        const hasResponded = responses?.some(
          (resp) => resp.user_id === user.userId
        );

        if (isPollActive && !hasResponded) {
          poll.responses = responses || []; // Inject responses into pollData if needed
          setPollData(poll);
          setIsVisible(true);
        } else {
          setPollData(null);
          setIsVisible(false);
        }
      } else {
        setPollData(null);
        setIsVisible(false);
      }
    } catch (err: any) {
      console.log("❌ Poll error:", err);
      setError("Failed to load poll. Please try again.");
      setIsVisible(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPolls();
    // eslint-disable-next-line
  }, []);

  // Option select
  const handleOptionSelect = (qId: string, oId: string) => {
    setSelectedOptions((prev) => ({ ...prev, [qId]: oId }));
  };

  // Submit handler
  const handleSubmit = async () => {
    if (!pollData || !user?.userId) return;

    // Ensure all required questions are answered
    const requiredAnswered = pollData.questions
      .filter((q) => q.is_required)
      .every((q) => selectedOptions[q.id]);

    if (!requiredAnswered) {
      Alert.alert("Incomplete", "Please answer all required questions.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Submit one API call per question
      for (const q of pollData.questions) {
        const optionId = selectedOptions[q.id];
        if (optionId) {
          await savePollResponse({
            poll_id: pollData.id,
            question_id: q.id,
            user_id: user.userId,
            option_ids: [selectedOptions[q.id]],
          });
        }
      }

      Alert.alert("Success", "Your response has been submitted successfully!", [
        {
          text: "OK",
          onPress: () => {
            setIsVisible(false);
            onClose?.();
          },
        },
      ]);
    } catch {
      Alert.alert("Error", "Failed to submit poll. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  if (!isVisible && !isLoading) return null;

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#026D94" />
              <Text style={styles.loadingText}>Loading poll...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={fetchPolls}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : pollData ? (
            <>
              <ScrollView
                style={styles.scrollContainer}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.titleContainer}>
                  <Icon
                    name="poll"
                    size={moderateScale(24)}
                    color="#005472ff"
                    style={styles.titleIcon}
                  />
                  <Text style={styles.modalTitle}>{pollData.title}</Text>
                </View>
                <Text style={styles.modalMessage}>{pollData.description}</Text>
                <View style={styles.devider}></View>
                {pollData.questions.map((q, index) => (
                  <View key={q.id} style={styles.questionContainer}>
                    <Text style={styles.questionText}>
                      {`${index + 1}. ${q.question_text} `}
                      {q.is_required && <Text style={styles.required}>*</Text>}
                    </Text>
                    {q.options.map((option) => (
                      <TouchableOpacity
                        key={option.id}
                        style={[
                          styles.optionButton,
                          selectedOptions[q.id] === option.id &&
                            styles.optionButtonSelected,
                        ]}
                        onPress={() => handleOptionSelect(q.id, option.id)}
                        disabled={isSubmitting}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            selectedOptions[q.id] === option.id &&
                              styles.optionTextSelected,
                          ]}
                        >
                          {option.option_text}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
              </ScrollView>
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    isSubmitting && styles.disabledButton,
                  ]}
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <View style={styles.submitLoadingContainer}>
                      <ActivityIndicator size="small" color="#fff" />
                      <Text style={styles.submitButtonText}>Submitting...</Text>
                    </View>
                  ) : (
                    <Text style={styles.submitButtonText}>Submit</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.closeButton,
                    isSubmitting && styles.disabledButton,
                  ]}
                  onPress={handleClose}
                  disabled={isSubmitting}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
};

// Styles
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    maxHeight: "80%",
    backgroundColor: "#fff",
    borderRadius: moderateScale(10),
    paddingTop: moderateScale(16),
    paddingBottom: moderateScale(16),

    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
    padding: moderateScale(20),
  },
  loadingText: {
    marginTop: verticalScale(10),
    fontSize: moderateScale(14),
    color: "#666",
  },
  errorContainer: {
    justifyContent: "center",
    alignItems: "center",
    padding: moderateScale(20),
  },
  errorText: {
    fontSize: moderateScale(14),
    color: "#FF0000",
    textAlign: "center",
    marginBottom: verticalScale(16),
  },
  retryButton: {
    backgroundColor: "#026D94",
    paddingHorizontal: moderateScale(16),
    paddingVertical: verticalScale(8),
    borderRadius: moderateScale(5),
  },
  retryButtonText: {
    color: "#fff",
    fontSize: moderateScale(14),
    fontWeight: "500",
  },
  scrollContainer: {
    width: "100%",
    maxHeight: "auto",
  },
  scrollContent: {
    paddingBottom: verticalScale(10),
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: verticalScale(3),
    paddingLeft: moderateScale(8),
    paddingRight: moderateScale(8),
  },
  titleIcon: {
    marginRight: moderateScale(8),
  },
  modalTitle: {
    fontSize: moderateScale(18),
    fontWeight: "bold",
    color: "#005472ff",
    textAlign: "left",
    paddingRight: moderateScale(16),
  },
  modalMessage: {
    fontSize: moderateScale(13),
    color: "#666",
    textAlign: "left",
    marginBottom: verticalScale(16),
    paddingLeft: moderateScale(16),
    paddingRight: moderateScale(16),
  },
  questionContainer: {
    marginBottom: verticalScale(12),
    width: "100%",
    paddingLeft: moderateScale(16),
    paddingRight: moderateScale(16),
  },
  questionText: {
    fontSize: moderateScale(14),
    fontWeight: "600",
    color: "#585858ff",
    marginBottom: verticalScale(9),
  },
  required: {
    color: "#FF0000",
  },
  optionButton: {
    padding: moderateScale(10),
    borderWidth: 1,
    borderColor: "#026D94",
    borderRadius: moderateScale(5),
    marginBottom: verticalScale(6),
    width: "100%",
    alignItems: "center",
  },
  optionButtonSelected: {
    backgroundColor: "#026D94",
    borderColor: "#026D94",
  },
  optionText: {
    fontSize: moderateScale(14),
    color: "#026D94",
  },
  optionTextSelected: {
    color: "#fff",
    fontWeight: "500",
  },
  buttonContainer: {
    width: "100%",
  },
  submitButton: {
    backgroundColor: "#029413ff",
    paddingVertical: verticalScale(10),
    borderRadius: moderateScale(8),
    marginBottom: verticalScale(8),
    alignItems: "center",
    marginLeft: moderateScale(16),
    marginRight: moderateScale(16),
  },
  submitLoadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: moderateScale(14),
    fontWeight: "500",
    marginLeft: moderateScale(8),
  },
  closeButton: {
    backgroundColor: "#666",
    paddingVertical: verticalScale(10),
    borderRadius: moderateScale(8),
    alignItems: "center",
    marginTop: 6,
    marginLeft: moderateScale(16),
    marginRight: moderateScale(16),
  },
  closeButtonText: {
    color: "#fff",
    fontSize: moderateScale(14),
    fontWeight: "500",
  },
  disabledButton: {
    opacity: 0.6,
  },
  devider: {
    height: 1,
    width: "100%",
    backgroundColor: "#d1d1d19f",
    marginBottom: 13,
  },
});

export default MessageModal;
