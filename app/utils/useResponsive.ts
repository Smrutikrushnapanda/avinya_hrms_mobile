import { Dimensions, Platform } from 'react-native';

export const useResponsive = () => {
  const { width, height } = Dimensions.get('window');
  
  const isWeb = Platform.OS === 'web';
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;
  
  return {
    isWeb,
    isMobile,
    isTablet,
    isDesktop,
    width,
    height,
  };
};
