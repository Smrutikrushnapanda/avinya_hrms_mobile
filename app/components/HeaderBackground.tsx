import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

const PARTICLES = [
  { key: "t1", size: 8, left: "10%", top: 14, type: "circle", duration: 5200, delay: 0, drift: 14, float: 18 },
  { key: "t2", size: 12, left: "28%", top: 52, type: "square", duration: 6400, delay: 600, drift: 10, float: 16 },
  { key: "t3", size: 6, left: "46%", top: 18, type: "circle", duration: 5600, delay: 1200, drift: 12, float: 20 },
  { key: "t4", size: 10, left: "64%", top: 34, type: "square", duration: 7000, delay: 300, drift: 16, float: 14 },
  { key: "t5", size: 14, left: "82%", top: 10, type: "circle", duration: 7600, delay: 900, drift: 10, float: 22 },
  { key: "t6", size: 7, left: "20%", top: 88, type: "circle", duration: 6200, delay: 1500, drift: 8, float: 16 },
  { key: "t7", size: 11, left: "58%", top: 86, type: "square", duration: 6800, delay: 400, drift: 12, float: 18 },
  { key: "t8", size: 9, left: "74%", top: 92, type: "circle", duration: 5900, delay: 1100, drift: 9, float: 15 },
];

const HeaderBackground = () => {
  const particleAnims = useRef(
    PARTICLES.map(() => new Animated.Value(0))
  ).current;

  useEffect(() => {
    const loops = particleAnims.map((anim, index) => {
      const duration = PARTICLES[index].duration;
      const delay = PARTICLES[index].delay;
      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration,
            useNativeDriver: true,
          }),
        ])
      );
    });
    loops.forEach((l) => l.start());
    return () => {
      loops.forEach((l) => l.stop());
    };
  }, [particleAnims]);

  return (
    <View style={styles.wrapper} pointerEvents="none">
      <View style={styles.backgroundLayer}>
        <View style={styles.softGlow} />
        <View style={styles.softGlowAlt} />
        <View style={styles.ridge} />
      </View>
      <View style={styles.particles}>
        {PARTICLES.map((p, index) => {
          const anim = particleAnims[index];
          const translateY = anim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -p.float],
          });
          const translateX = anim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, p.drift],
          });
          const opacity = anim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.25, 0.6],
          });
          return (
            <Animated.View
              key={p.key}
              style={[
                styles.particle,
                {
                  width: p.size,
                  height: p.size,
                  left: p.left,
                  top: p.top,
                  borderRadius: p.type === "circle" ? p.size / 2 : 3,
                  transform: [{ translateY }, { translateX }],
                  opacity,
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    overflow: "hidden",
    zIndex: 0,
  },
  backgroundLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    overflow: "hidden",
  },
  softGlow: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(255,255,255,0.08)",
    top: -110,
    right: -40,
  },
  softGlowAlt: {
    position: "absolute",
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: "rgba(0,0,0,0.10)",
    bottom: -60,
    left: -10,
  },
  ridge: {
    position: "absolute",
    height: 120,
    left: -20,
    right: -20,
    bottom: -60,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderTopLeftRadius: 140,
    borderTopRightRadius: 140,
    transform: [{ rotate: "-2deg" }],
  },
  particles: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 180,
    overflow: "hidden",
  },
  particle: {
    position: "absolute",
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
});

export default HeaderBackground;
