import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getActiveNotices } from '../../api/api';
import useAuthStore from '../../store/useUserStore';
import CustomDialog from "./CustomDialog";

const { width, height } = Dimensions.get('window');

interface Notice {
  id: string;
  title: string;
  message: string;
  bg_image_url: string;
  type: string;
  start_at: string;
  end_at: string;
}

interface OndemandNotificationsProps {
  isVisible: boolean;
  onClose: () => void;
}

const OndemandNotifications: React.FC<OndemandNotificationsProps> = ({ isVisible, onClose }) => {
  const [data, setData] = useState<Notice | null>(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shouldShowNotification, setShouldShowNotification] = useState(false);
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

  const { user } = useAuthStore.getState();
  const router = useRouter();

  const fetchDataFromBackend = async () => {
    setDataLoading(true);
    if (!user?.userId) {
      setError('User not authenticated');
      setDataLoading(false);
      return;
    }

    try {
      const response = await getActiveNotices();
      const notice = response.data;

      if (notice?.start_at && notice?.end_at) {
        const nowDate = new Date().toISOString().split('T')[0];
        const start = new Date(notice.start_at).toISOString().split('T')[0];
        const end = new Date(notice.end_at).toISOString().split('T')[0];

        // Check if the notification is within the active period
        if (start <= nowDate && nowDate <= end) {
          // Check if notification was already shown today
          const lastShownDate = await AsyncStorage.getItem('lastShownDate');
          const lastNoticeId = await AsyncStorage.getItem('lastNoticeId');
          const currentDate = new Date().toISOString().split('T')[0];

          if (lastShownDate === currentDate && lastNoticeId === notice.id) {
            // Notification was already shown today for this notice ID
            setShouldShowNotification(false);
          } else {
            setData(notice);
            setShouldShowNotification(true);
            // Update storage with current date and notice ID
            await AsyncStorage.setItem('lastShownDate', currentDate);
            await AsyncStorage.setItem('lastNoticeId', notice.id);
          }
        } else {
          setData(null);
          setShouldShowNotification(false);
        }
      } else {
        setData(null);
        setShouldShowNotification(false);
      }
    } catch {
      setError('Failed to load notification. Please try again.');
      setShouldShowNotification(false);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (isVisible) fetchDataFromBackend();
  }, [isVisible]);

  const getMarkedDates = () => {
    if (!data?.start_at || !data?.end_at) return {};
    const markedDates: Record<string, any> = {};
    let currentDate = new Date(data.start_at);
    const end = new Date(data.end_at);

    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0];
      markedDates[dateStr] = { selected: true, selectedColor: '#2f7ed3' };
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return markedDates;
  };

  if (!isVisible || !shouldShowNotification) return null;

  return (
    <Modal visible={isVisible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.container}>
          {data?.bg_image_url && (
            <Image
              source={{ uri: data.bg_image_url }}
              style={data.type === 'wish' ? styles.fullScreenImage : styles.partialImage}
              resizeMode={data.type === 'wish' ? 'cover' : 'contain'}
              onLoad={() => setImageLoading(false)}
              onError={() => {
                setImageLoading(false);
                showDialog("DANGER", "Error", "Failed to load image");
              }}
            />
          )}

          {data?.type === 'wish' && (
            <LottieView
              source={{ uri: 'https://assets2.lottiefiles.com/packages/lf20_u4yrau.json' }}
              autoPlay
              loop={false}
              style={styles.confettiAnimation}
            />
          )}

          {(imageLoading || dataLoading) && (
            <View style={styles.imageLoadingContainer}>
              <Image
                source={{ uri: 'https://example.com/loading-image.png' }} // Replace with your loading image URL
                style={styles.loadingImage}
                resizeMode="contain"
              />
              <ActivityIndicator size="large" color="#ffffff" style={styles.activityIndicator} />
            </View>
          )}

          <SafeAreaView style={styles.contentContainer}>
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={fetchDataFromBackend}>
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.closeErrorButton} onPress={onClose}>
                  <Text style={styles.closeErrorButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            ) : data && !dataLoading ? (
              <View style={styles.innerContent}>
                {data.type === 'info' && (
                  <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.textContainer}>
                      <Text style={styles.heading}>{data.title}</Text>
                      <Text style={styles.messageDetails}>{data.message}</Text>
                      <View style={styles.calendarContainer}>
                        <Text style={styles.calendarTitle}>Active Period</Text>
                        <Calendar
                          style={styles.calendar}
                          markedDates={getMarkedDates()}
                          theme={{
                            calendarBackground: '#ffffff',
                            textSectionTitleColor: '#2f7ed3',
                            selectedDayBackgroundColor: '#2f7ed3',
                            selectedDayTextColor: '#ffffff',
                            todayTextColor: '#2f7ed3',
                            dayTextColor: '#333333',
                            textDisabledColor: '#d9e1e8',
                            arrowColor: '#2f7ed3',
                          }}
                        />
                      </View>
                    </View>
                  </ScrollView>
                )}
                {!imageLoading && (
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => {
                      onClose();
                      router.replace('/(tabs)');
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.closeButtonText}>Got It</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : null}
          </SafeAreaView>
          <CustomDialog isVisible={dialogVisible} type={dialogType as any} title={dialogTitle} message={dialogMessage} buttons={dialogButtons} onCancel={() => setDialogVisible(false)} />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, width: '100%', backgroundColor: 'transparent' },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 12,
    marginHorizontal: 20,
  },
  errorText: { color: '#FF4D4D', fontSize: 16, textAlign: 'center', marginBottom: 16, fontWeight: '500' },
  retryButton: { backgroundColor: '#D32F2F', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, marginBottom: 12 },
  retryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  closeErrorButton: { backgroundColor: '#808080', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  closeErrorButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  fullScreenImage: { position: 'absolute', width, height, top: 0, left: 0 },
  partialImage: {
    width: width * 0.9,
    height: height * 0.4,
    alignSelf: 'center',
    marginTop: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  confettiAnimation: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  imageLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  loadingImage: {
    width: 100,
    height: 100,
    marginBottom: 20,
  },
  activityIndicator: {
    marginTop: 10,
  },
  contentContainer: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', padding: 20 },
  innerContent: { flex: 1, justifyContent: 'flex-end', width: '100%' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingBottom: 20 },
  textContainer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
    margin: 10,
  },
  heading: { fontSize: 34, fontWeight: '700', color: '#333', textAlign: 'center', marginBottom: 16 },
  messageDetails: { fontSize: 18, color: '#333', textAlign: 'center', lineHeight: 26, marginBottom: 20 },
  calendarContainer: { width: '100%', padding: 10, backgroundColor: '#fff', borderRadius: 8, marginTop: 10 },
  calendarTitle: { fontSize: 20, fontWeight: '600', color: '#333', textAlign: 'center', marginBottom: 10 },
  calendar: { borderRadius: 8 },
  closeButton: {
    backgroundColor: '#2f7ed3',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
    alignSelf: 'center',
    width: '90%',
    marginBottom: 30,
  },
  closeButtonText: { color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center' },
});

export default OndemandNotifications;