import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Easing,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";
import { ENDPOINTS } from "../services/api/endpoints";
import API from "../services/api/method";

export default function Register() {
  const { width } = useWindowDimensions();
  const isWideLayout = width >= 900;
  const horizontalPadding = width < 420 ? 18 : 32;
  const backgroundDrift = useRef(new Animated.Value(0)).current;
  const backgroundPulse = useRef(new Animated.Value(0)).current;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  const nameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [termsError, setTermsError] = useState("");

  const router = useRouter();

  useEffect(() => {
    const driftAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(backgroundDrift, {
          toValue: 1,
          duration: 9000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(backgroundDrift, {
          toValue: 0,
          duration: 9000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(backgroundPulse, {
          toValue: 1,
          duration: 4200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(backgroundPulse, {
          toValue: 0,
          duration: 4200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    driftAnimation.start();
    pulseAnimation.start();

    return () => {
      driftAnimation.stop();
      pulseAnimation.stop();
    };
  }, [backgroundDrift, backgroundPulse]);

  const validateName = (text: string) => {
    setName(text);
    if (!text) {
      setNameError("Name is required");
    } else if (text.length < 2) {
      setNameError("Name must be at least 2 characters");
    } else {
      setNameError("");
    }
  };

  const validateEmail = (text: string) => {
    setEmail(text);
    if (!text) {
      setEmailError("Email is required");
    } else if (!/\S+@\S+\.\S+/.test(text)) {
      setEmailError("Please enter a valid email");
    } else {
      setEmailError("");
    }
  };

  const validatePassword = (text: string) => {
    setPassword(text);
    if (!text) {
      setPasswordError("Password is required");
    } else if (text.length < 6) {
      setPasswordError("Password must be at least 6 characters");
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(text)) {
      setPasswordError("Password must contain uppercase, lowercase, and number");
    } else {
      setPasswordError("");
    }

    if (confirmPassword && confirmPassword !== text) {
      setConfirmPasswordError("Passwords do not match");
    } else if (confirmPassword) {
      setConfirmPasswordError("");
    }
  };

  const validateConfirmPassword = (text: string) => {
    setConfirmPassword(text);
    if (!text) {
      setConfirmPasswordError("Please confirm your password");
    } else if (text !== password) {
      setConfirmPasswordError("Passwords do not match");
    } else {
      setConfirmPasswordError("");
    }
  };

  const handleRegister = async () => {
    let hasError = false;

    if (!name) {
      setNameError("Name is required");
      hasError = true;
    }

    if (!email) {
      setEmailError("Email is required");
      hasError = true;
    }

    if (!password) {
      setPasswordError("Password is required");
      hasError = true;
    }

    if (!confirmPassword) {
      setConfirmPasswordError("Please confirm your password");
      hasError = true;
    }

    if (!acceptTerms) {
      setTermsError("You must accept the terms and conditions");
      hasError = true;
    }

    if (hasError || nameError || emailError || passwordError || confirmPasswordError) {
      return;
    }

    setIsLoading(true);

    try {
      await API.post(ENDPOINTS.AUTH.REGISTER, {
        username: name,
        email,
        password,
      });

      setIsLoading(false);
      Alert.alert("Success", "Account created successfully! Please log in.", [
        {
          text: "OK",
          onPress: () => router.push("/auth"),
        },
      ]);
      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setAcceptTerms(false);
    } catch (error: any) {
      setIsLoading(false);
      Alert.alert(
        "Registration Failed",
        error.response?.data?.message ||
          error.message ||
          "An error occurred during registration. Please try again."
      );
    }
  };

  const handleLogin = () => {
    router.push("/auth");
  };

  const handleTermsPress = () => {
    const nextAccepted = !acceptTerms;
    setAcceptTerms(nextAccepted);
    if (nextAccepted) {
      setTermsError("");
    }
  };

  const primaryBandTranslate = backgroundDrift.interpolate({
    inputRange: [0, 1],
    outputRange: [-42, 34],
  });
  const secondaryBandTranslate = backgroundDrift.interpolate({
    inputRange: [0, 1],
    outputRange: [38, -28],
  });
  const accentOpacity = backgroundPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.36],
  });

  return (
    <View style={[styles.container, !isWideLayout && styles.containerMobile]}>
      <View style={styles.backgroundBase} pointerEvents="none">
        <Animated.View
          style={[
            styles.backgroundBand,
            styles.backgroundBandPrimary,
            {
              opacity: isWideLayout ? 0.32 : 0.5,
              transform: [{ translateX: primaryBandTranslate }, { rotate: "-16deg" }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.backgroundBand,
            styles.backgroundBandSecondary,
            {
              opacity: isWideLayout ? 0.28 : 0.42,
              transform: [{ translateX: secondaryBandTranslate }, { rotate: "18deg" }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.backgroundGlow,
            {
              opacity: accentOpacity,
              transform: [
                {
                  scale: backgroundPulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.96, 1.08],
                  }),
                },
              ],
            },
          ]}
        />
      </View>

      <StatusBar
        barStyle={isWideLayout ? "light-content" : "dark-content"}
        backgroundColor={isWideLayout ? "#0F172A" : "#F8FAFC"}
      />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            !isWideLayout && styles.scrollContentMobile,
            {
              paddingHorizontal: horizontalPadding,
              paddingTop: isWideLayout ? (Platform.OS === "ios" ? 56 : 36) : 22,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.shell, isWideLayout && styles.shellWide]}>
            {isWideLayout ? (
              <View style={[styles.heroPanel, styles.heroPanelWide]}>
                <View style={styles.logoRow}>
                  <View style={styles.logoCircle}>
                    <Ionicons name="chatbubble-ellipses" size={32} color="#FFFFFF" />
                  </View>
                  <Text style={styles.appName}>JyoChat</Text>
                </View>

                <View style={styles.heroCopy}>
                  <Text style={styles.heroTitle}>Start fresh.</Text>
                  <Text style={styles.heroSubtitle}>
                    Create your account and keep every conversation close.
                  </Text>
                </View>

                <View style={styles.previewCard}>
                  <View style={styles.previewHeader}>
                    <View style={styles.previewAvatar}>
                      <Ionicons name="person-add" size={18} color="#0F172A" />
                    </View>
                    <View style={styles.previewTextBlock}>
                      <Text style={styles.previewName}>New account</Text>
                      <Text style={styles.previewStatus}>Ready in under a minute</Text>
                    </View>
                  </View>
                  <View style={styles.messageBubblePrimary}>
                    <Text style={styles.messageBubbleTextPrimary}>
                      Your chat space is waiting.
                    </Text>
                  </View>
                  <View style={styles.messageBubbleSecondary}>
                    <Text style={styles.messageBubbleTextSecondary}>
                      Create profile and join in.
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}

            <View
              style={[
                styles.formCard,
                isWideLayout ? styles.formCardWide : styles.formCardMobile,
              ]}
            >
              {!isWideLayout ? (
                <View style={styles.mobileBrand}>
                  <View style={styles.mobileLogoCircle}>
                    <Ionicons name="chatbubble-ellipses" size={30} color="#FFFFFF" />
                  </View>
                  <Text style={styles.mobileAppName}>JyoChat</Text>
                </View>
              ) : null}

              {isWideLayout ? (
                <View style={styles.formHeader}>
                  <Text style={styles.formEyebrow}>Join JyoChat</Text>
                  <Text style={styles.formTitle}>Create your account</Text>
                  <Text style={styles.formSubtitle}>
                    Set up your profile and start chatting securely.
                  </Text>
                </View>
              ) : null}

              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <View style={[styles.inputContainer, nameError ? styles.inputError : null]}>
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color="#64748B"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    ref={nameRef}
                    style={styles.input}
                    placeholder="Enter your full name"
                    placeholderTextColor="#94A3B8"
                    value={name}
                    onChangeText={validateName}
                    returnKeyType="next"
                    onSubmitEditing={() => emailRef.current?.focus()}
                    autoCapitalize="words"
                    autoCorrect={false}
                    editable={!isLoading}
                    blurOnSubmit={false}
                  />
                </View>
                {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
              </View>

              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Email</Text>
                <View style={[styles.inputContainer, emailError ? styles.inputError : null]}>
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color="#64748B"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    ref={emailRef}
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor="#94A3B8"
                    value={email}
                    onChangeText={validateEmail}
                    keyboardType="email-address"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                    blurOnSubmit={false}
                  />
                </View>
                {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
              </View>

              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Password</Text>
                <View
                  style={[styles.inputContainer, passwordError ? styles.inputError : null]}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color="#64748B"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    ref={passwordRef}
                    style={[styles.input, styles.passwordInput]}
                    placeholder="Create a password"
                    placeholderTextColor="#94A3B8"
                    value={password}
                    onChangeText={validatePassword}
                    returnKeyType="next"
                    onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                    blurOnSubmit={false}
                  />
                  <Pressable
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={22}
                      color="#475569"
                    />
                  </Pressable>
                </View>
                {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
              </View>

              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Confirm Password</Text>
                <View
                  style={[
                    styles.inputContainer,
                    confirmPasswordError ? styles.inputError : null,
                  ]}
                >
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={20}
                    color="#64748B"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    ref={confirmPasswordRef}
                    style={[styles.input, styles.passwordInput]}
                    placeholder="Confirm your password"
                    placeholderTextColor="#94A3B8"
                    value={confirmPassword}
                    onChangeText={validateConfirmPassword}
                    returnKeyType="done"
                    onSubmitEditing={handleRegister}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                    blurOnSubmit={false}
                  />
                  <Pressable
                    style={styles.eyeButton}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <Ionicons
                      name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                      size={22}
                      color="#475569"
                    />
                  </Pressable>
                </View>
                {confirmPasswordError ? (
                  <Text style={styles.errorText}>{confirmPasswordError}</Text>
                ) : null}
              </View>

              <TouchableOpacity
                style={styles.termsContainer}
                onPress={handleTermsPress}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <View style={[styles.checkbox, acceptTerms && styles.checkboxChecked]}>
                  {acceptTerms ? (
                    <Ionicons name="checkmark" size={15} color="#FFFFFF" />
                  ) : null}
                </View>
                <Text style={styles.termsText}>
                  I agree to the <Text style={styles.termsLink}>Terms of Service</Text> and{" "}
                  <Text style={styles.termsLink}>Privacy Policy</Text>
                </Text>
              </TouchableOpacity>
              {termsError ? <Text style={styles.errorText}>{termsError}</Text> : null}

              <TouchableOpacity
                style={[
                  styles.registerButton,
                  isLoading ? styles.registerButtonDisabled : null,
                ]}
                onPress={handleRegister}
                disabled={isLoading}
                activeOpacity={0.86}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Text style={styles.registerButtonText}>Create Account</Text>
                    <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.footer}>
                <Text style={styles.footerText}>Already have an account? </Text>
                <TouchableOpacity onPress={handleLogin} disabled={isLoading}>
                  <Text style={styles.loginText}>Log In</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
    overflow: "hidden",
  },
  containerMobile: {
    backgroundColor: "#F8FAFC",
  },
  backgroundBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#F8FAFC",
  },
  backgroundBand: {
    position: "absolute",
    width: "130%",
    height: 190,
    borderRadius: 42,
  },
  backgroundBandPrimary: {
    top: 44,
    left: "-16%",
    backgroundColor: "#CFFAFE",
  },
  backgroundBandSecondary: {
    bottom: 78,
    right: "-18%",
    backgroundColor: "#FED7AA",
  },
  backgroundGlow: {
    position: "absolute",
    top: "26%",
    right: "-18%",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "#A7F3D0",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingBottom: 36,
  },
  scrollContentMobile: {
    justifyContent: "flex-start",
    paddingBottom: 24,
  },
  shell: {
    width: "100%",
    maxWidth: 1120,
    alignSelf: "center",
    gap: 18,
  },
  shellWide: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 0,
  },
  heroPanel: {
    flex: 1,
    backgroundColor: "#14B8A6",
    padding: 34,
    justifyContent: "space-between",
    overflow: "hidden",
  },
  heroPanelWide: {
    borderTopLeftRadius: 30,
    borderBottomLeftRadius: 30,
    minHeight: 720,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  logoCircle: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: "#0F172A",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 8,
  },
  appName: {
    fontSize: 28,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  heroCopy: {
    marginVertical: 30,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 42,
    lineHeight: 48,
    fontWeight: "900",
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.84)",
    fontSize: 17,
    lineHeight: 25,
    marginTop: 12,
    maxWidth: 420,
  },
  previewCard: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 24,
    padding: 18,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.2,
    shadowRadius: 26,
    elevation: 8,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  previewAvatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FDE68A",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  previewTextBlock: {
    flex: 1,
  },
  previewName: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "800",
  },
  previewStatus: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 2,
  },
  messageBubblePrimary: {
    alignSelf: "flex-start",
    backgroundColor: "#0F172A",
    borderRadius: 18,
    borderBottomLeftRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 11,
    maxWidth: "82%",
    marginBottom: 10,
  },
  messageBubbleSecondary: {
    alignSelf: "flex-end",
    backgroundColor: "#E0F2FE",
    borderRadius: 18,
    borderBottomRightRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 11,
    maxWidth: "82%",
  },
  messageBubbleTextPrimary: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  messageBubbleTextSecondary: {
    color: "#075985",
    fontSize: 14,
    fontWeight: "700",
  },
  formCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    padding: 30,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: "#020617",
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.18,
    shadowRadius: 32,
    elevation: 10,
  },
  formCardMobile: {
    flex: 0,
    backgroundColor: "transparent",
    borderRadius: 0,
    paddingHorizontal: 4,
    paddingVertical: 8,
    borderWidth: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  formCardWide: {
    borderTopRightRadius: 30,
    borderBottomRightRadius: 30,
    borderBottomLeftRadius: 0,
    justifyContent: "center",
    maxWidth: 500,
  },
  mobileBrand: {
    alignItems: "center",
    marginBottom: 20,
  },
  mobileLogoCircle: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: "#14B8A6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    shadowColor: "#14B8A6",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 5,
  },
  mobileAppName: {
    color: "#0F172A",
    fontSize: 28,
    fontWeight: "900",
  },
  formHeader: {
    marginBottom: 24,
    alignItems: "flex-start",
  },
  formEyebrow: {
    color: "#F97316",
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  formTitle: {
    color: "#0F172A",
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "900",
    marginTop: 8,
  },
  formSubtitle: {
    color: "#64748B",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  inputWrapper: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#334155",
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    paddingHorizontal: 16,
    minHeight: 56,
  },
  inputError: {
    borderColor: "#F43F5E",
    backgroundColor: "#FFF1F2",
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#0F172A",
    paddingVertical: 12,
  },
  passwordInput: {
    paddingRight: 12,
  },
  eyeButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  errorText: {
    fontSize: 13,
    color: "#E11D48",
    marginTop: 6,
    marginLeft: 4,
    fontWeight: "600",
  },
  termsContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 2,
    marginBottom: 18,
    paddingHorizontal: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#94A3B8",
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 1,
    backgroundColor: "#FFFFFF",
  },
  checkboxChecked: {
    backgroundColor: "#14B8A6",
    borderColor: "#14B8A6",
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    color: "#64748B",
    lineHeight: 20,
    fontWeight: "600",
  },
  termsLink: {
    color: "#0EA5E9",
    fontWeight: "800",
  },
  registerButton: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#0F172A",
    borderRadius: 18,
    paddingVertical: 17,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 58,
    marginTop: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 7,
  },
  registerButtonDisabled: {
    backgroundColor: "#9CA3AF",
    shadowOpacity: 0,
    elevation: 0,
  },
  registerButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  footerText: {
    fontSize: 15,
    color: "#64748B",
  },
  loginText: {
    fontSize: 15,
    color: "#0EA5E9",
    fontWeight: "900",
  },
});
