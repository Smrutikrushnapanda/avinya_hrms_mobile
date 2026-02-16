// SliderButton.js
import React, { useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';

const { width: screenWidth } = Dimensions.get('window');

const SliderButton = ({
  // Dimensions
  width = screenWidth * 0.8,
  height = 70,
  buttonSize = 60,
  
  // Colors
  backgroundColor = '#e0e0e0',
  buttonColor = '#4CAF50',
  progressColor = '#4CAF50',
  textColor = '#666',
  completedTextColor = '#fff',
  
  // Text
  text = 'Slide to unlock',
  completedText = '✓ Completed!',
  buttonIcon = '→',
  
  // Behavior
  threshold = 0.8, // How far to slide before completing (0.8 = 80%)
  resetDelay = 2000, // Time before auto-reset in ms
  
  // Callbacks
  onComplete,
  onReset,
  
  // Animation
  springTension = 100,
  springFriction = 8,
  animationDuration = 200,
  
  // Style overrides
  containerStyle,
  sliderStyle,
  buttonStyle,
  textStyle,
}) => {
  const [isCompleted, setIsCompleted] = useState(false);
  const translateX = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  
  const maxSlideDistance = width - buttonSize - 10; // 10 for padding

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { 
      useNativeDriver: false,
      listener: (event) => {
        const { translationX } = event.nativeEvent;
        if (translationX < 0) {
          translateX.setValue(0);
        } else if (translationX > maxSlideDistance) {
          translateX.setValue(maxSlideDistance);
        }
      }
    }
  );

  const onHandlerStateChange = (event) => {
    const { translationX, state } = event.nativeEvent;
    
    if (state === 5) { // GESTURE_STATE.END
      if (translationX > maxSlideDistance * threshold) {
        // Complete the action
        Animated.parallel([
          Animated.timing(translateX, {
            toValue: maxSlideDistance,
            duration: animationDuration,
            useNativeDriver: false,
          }),
          Animated.timing(scale, {
            toValue: 1.2,
            duration: animationDuration,
            useNativeDriver: false,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: animationDuration + 100,
            useNativeDriver: false,
          }),
        ]).start(() => {
          setIsCompleted(true);
          onComplete && onComplete();
          
          // Reset after delay
          setTimeout(() => {
            resetSlider();
          }, resetDelay);
        });
      } else {
        // Snap back to start
        Animated.parallel([
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: false,
            tension: springTension,
            friction: springFriction,
          }),
          Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: false,
          }),
        ]).start();
      }
    }
  };

  const resetSlider = () => {
    setIsCompleted(false);
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: 0,
        duration: animationDuration + 100,
        useNativeDriver: false,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: animationDuration + 100,
        useNativeDriver: false,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: animationDuration + 100,
        useNativeDriver: false,
      }),
    ]).start(() => {
      onReset && onReset();
    });
  };

  const dynamicStyles = {
    sliderContainer: {
      width,
      height,
      backgroundColor,
      borderRadius: height / 2,
    },
    sliderButton: {
      width: buttonSize,
      height: buttonSize,
      borderRadius: buttonSize / 2,
      backgroundColor: buttonColor,
    },
    progressBar: {
      backgroundColor: progressColor,
      borderRadius: height / 2,
    },
    completedContainer: {
      width,
      height,
      backgroundColor: buttonColor,
      borderRadius: height / 2,
    },
    sliderText: {
      color: textColor,
    },
    completedText: {
      color: completedTextColor,
    },
  };

  if (isCompleted) {
    return (
      <View style={[styles.container, containerStyle]}>
        <View style={[styles.completedContainer, dynamicStyles.completedContainer]}>
          <Text style={[styles.completedText, dynamicStyles.completedText, textStyle]}>
            {completedText}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={[styles.sliderContainer, dynamicStyles.sliderContainer, sliderStyle]}>
        <Animated.Text style={[
          styles.sliderText, 
          dynamicStyles.sliderText, 
          textStyle,
          { opacity }
        ]}>
          {text}
        </Animated.Text>
        
        <PanGestureHandler
          onGestureEvent={onGestureEvent}
          onHandlerStateChange={onHandlerStateChange}
        >
          <Animated.View
            style={[
              styles.sliderButton,
              dynamicStyles.sliderButton,
              buttonStyle,
              {
                transform: [
                  { translateX },
                  { scale }
                ],
              },
            ]}
          >
            <View style={styles.buttonIcon}>
              <Text style={styles.iconText}>{buttonIcon}</Text>
            </View>
          </Animated.View>
        </PanGestureHandler>
        
        <Animated.View
          style={[
            styles.progressBar,
            dynamicStyles.progressBar,
            {
              width: Animated.add(translateX, buttonSize),
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sliderText: {
    fontSize: 16,
    fontWeight: '600',
    position: 'absolute',
    zIndex: 1,
  },
  sliderButton: {
    position: 'absolute',
    left: 5,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 2,
  },
  buttonIcon: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  progressBar: {
    height: '100%',
    position: 'absolute',
    left: 0,
    opacity: 0.3,
    zIndex: 0,
  },
  completedContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  completedText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default SliderButton;