import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import { AuthContext } from "../context/Authcontext";
import { ENDPOINTS } from "../services/api/endpoints";
import API from "../services/api/method";

const appVersion = Constants.expoConfig?.version;

export default function Index() {
  const { width } = useWindowDimensions();
  const isWideLayout = width >= 900;
  const horizontalPadding = width < 420 ? 18 : 32;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [serverError, setServerError] = useState("");
  const [latestVersion, setLatestVersion] = useState("");

  const router = useRouter();
  const { login } = useContext(AuthContext);

  useEffect(() => {
    const loadLatestVersion = async () => {
      try {
        const versionInfo = await API.get(ENDPOINTS.APP.VERSION);
        setLatestVersion(versionInfo.latestVersion || "");
      } catch {
        setLatestVersion("");
      }
    };

    loadLatestVersion();
  }, []);

  const validateEmail = (text: string) => {
    setEmail(text);
    setServerError("");
    if (!text) {
      setEmailError("");
    } else if (!/\S+@\S+\.\S+/.test(text)) {
      setEmailError("Please enter a valid email");
    } else {
      setEmailError("");
    }
  };

  const validatePassword = (text: string) => {
    setPassword(text);
    setServerError("");
    if (!text) {
      setPasswordError("");
    } else if (text.length < 6) {
      setPasswordError("Password must be at least 6 characters");
    } else {
      setPasswordError("");
    }
  };

  const handleLogin = async () => {
    let hasError = false;

    if (!email) {
      setEmailError("Email is required");
      hasError = true;
    }

    if (!password) {
      setPasswordError("Password is required");
      hasError = true;
    }

    if (hasError || emailError || passwordError) {
      return;
    }

    setIsLoading(true);

    try {
      await login(email, password);

      setServerError("");
      setIsLoading(false);
      router.push("/main/home");
    } catch (error: any) {
      setIsLoading(false);
      setServerError(
        error.response?.data?.message ||
          error.message ||
          "An error occurred during login. Please try again."
      );
    }
  };

  const handleSignUp = () => {
    router.push("/auth/register");
  };

  const handleForgotPassword = () => {
    // Navigate to forgot password screen
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingHorizontal: horizontalPadding,
              paddingTop: Platform.OS === "ios" ? 56 : 36,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.shell, isWideLayout && styles.shellWide]}>
            <View
              style={[
                styles.heroPanel,
                isWideLayout ? styles.heroPanelWide : styles.heroPanelMobile,
              ]}
            >
              <View style={styles.logoRow}>
                <View style={styles.logoCircle}>
                  <Ionicons name="chatbubble-ellipses" size={32} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={styles.appName}>ChatApp</Text>
                  <Text style={styles.appTagline}>Fast. Private. Connected.</Text>
                </View>
              </View>

              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>Welcome back!</Text>
                <Text style={styles.heroSubtitle}>
                  Sign in and jump right into your conversations.
                </Text>
              </View>

              <View style={styles.previewCard}>
                <View style={styles.previewHeader}>
                  <View style={styles.previewAvatar}>
                    <Ionicons name="sparkles" size={18} color="#0F172A" />
                  </View>
                  <View style={styles.previewTextBlock}>
                    <Text style={styles.previewName}>{"Today's chats"}</Text>
                    <Text style={styles.previewStatus}>3 new messages waiting</Text>
                  </View>
                </View>
                <View style={styles.messageBubblePrimary}>
                  <Text style={styles.messageBubbleTextPrimary}>
                    Are you available now?
                  </Text>
                </View>
                <View style={styles.messageBubbleSecondary}>
                  <Text style={styles.messageBubbleTextSecondary}>
                    Yes, joining in a minute.
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.formCard, isWideLayout && styles.formCardWide]}>
              <View style={styles.formHeader}>
                <Text style={styles.formEyebrow}>Secure login</Text>
                <Text style={styles.formTitle}>Sign in to your account</Text>
                <Text style={styles.formSubtitle}>
                  Use your email and password to continue.
                </Text>
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
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor="#94A3B8"
                    value={email}
                    onChangeText={validateEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
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
                    style={[styles.input, styles.passwordInput]}
                    placeholder="Enter your password"
                    placeholderTextColor="#94A3B8"
                    value={password}
                    onChangeText={validatePassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
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
                {passwordError ? (
                  <Text style={styles.errorText}>{passwordError}</Text>
                ) : (
                  <TouchableOpacity
                    style={styles.forgotPassword}
                    onPress={handleForgotPassword}
                  >
                    <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                  </TouchableOpacity>
                )}
              </View>

              {serverError ? (
                <Text style={[styles.errorText, styles.serverError]}>{serverError}</Text>
              ) : null}

              <TouchableOpacity
                style={[styles.loginButton, isLoading ? styles.loginButtonDisabled : null]}
                onPress={handleLogin}
                disabled={isLoading}
                activeOpacity={0.86}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Text style={styles.loginButtonText}>Sign In</Text>
                    <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or continue with</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.socialButtonsContainer}>
                <TouchableOpacity style={styles.socialButton} disabled={isLoading}>
                  <Ionicons name="logo-google" size={20} color="#EA4335" />
                  <Text style={styles.socialButtonText}>Google</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.socialButton} disabled={isLoading}>
                  <Ionicons name="logo-apple" size={22} color="#111827" />
                  <Text style={styles.socialButtonText}>Apple</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.footer}>
                <Text style={styles.footerText}>{"Don't have an account? "}</Text>
                <TouchableOpacity onPress={handleSignUp} disabled={isLoading}>
                  <Text style={styles.signUpText}>Sign Up</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.versionText}>
                Version {appVersion}
                {latestVersion && latestVersion !== appVersion
                  ? ` | Latest ${latestVersion}`
                  : ""}
              </Text>
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
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingBottom: 36,
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
  heroPanelMobile: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    minHeight: 280,
  },
  heroPanelWide: {
    borderTopLeftRadius: 30,
    borderBottomLeftRadius: 30,
    minHeight: 640,
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
    fontWeight: "800",
    color: "#FFFFFF",
  },
  appTagline: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 13,
    fontWeight: "600",
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
    color: "rgba(255,255,255,0.82)",
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
  formCardWide: {
    borderTopRightRadius: 30,
    borderBottomRightRadius: 30,
    borderBottomLeftRadius: 0,
    justifyContent: "center",
    maxWidth: 500,
  },
  formHeader: {
    marginBottom: 26,
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
    marginBottom: 18,
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
    minHeight: 58,
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
  serverError: {
    marginBottom: 12,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginTop: 8,
  },
  forgotPasswordText: {
    fontSize: 13,
    color: "#0EA5E9",
    fontWeight: "800",
  },
  loginButton: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#0F172A",
    borderRadius: 18,
    paddingVertical: 17,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 58,
    marginTop: 4,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 7,
  },
  loginButtonDisabled: {
    backgroundColor: "#9CA3AF",
    shadowOpacity: 0,
    elevation: 0,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  dividerText: {
    color: "#94A3B8",
    marginHorizontal: 16,
    fontSize: 13,
    fontWeight: "700",
  },
  socialButtonsContainer: {
    flexDirection: "row",
    gap: 12,
  },
  socialButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  socialButtonText: {
    color: "#334155",
    fontSize: 15,
    fontWeight: "800",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 26,
    paddingTop: 22,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  footerText: {
    fontSize: 15,
    color: "#64748B",
  },
  signUpText: {
    fontSize: 15,
    color: "#0EA5E9",
    fontWeight: "900",
  },
  versionText: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 14,
    textAlign: "center",
  },
});
