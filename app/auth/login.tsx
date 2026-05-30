import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { AuthContext } from "../context/Authcontext";
import { ENDPOINTS } from "../services/api/endpoints";
import API from "../services/api/method";

const { width, height } = Dimensions.get("window");
const appVersion = Constants.expoConfig?.version;

export default function Index() {
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
    // Validate inputs
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
      // Use the AuthContext login function
      await login(email, password);
      
      setServerError("");
      setIsLoading(false);
      
      // Navigate to home on success
      router.push("/main/home");
    } catch (error: any) {
      setIsLoading(false);
      
      // Show error message on screen
      setServerError(error.response?.data?.message || error.message || "An error occurred during login. Please try again.");
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
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <View style={styles.headerSection}>
            <View style={styles.logoContainer}>
              <View style={styles.logoCircle}>
                <Text style={styles.logoEmoji}>💬</Text>
              </View>
              <Text style={styles.appName}>ChatApp</Text>
              <Text style={styles.subtitle}>Welcome back!</Text>
              <Text style={styles.subtitleSecondary}>
                Sign in to continue chatting
              </Text>
            </View>
          </View>

          {/* Form Section */}
          <View style={styles.formContainer}>
            {/* Email Input */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Email</Text>
              <View style={[styles.inputContainer, emailError ? styles.inputError : null]}>
                <Text style={styles.inputIcon}>✉️</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor="#9CA3AF"
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

            {/* Password Input */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={[styles.inputContainer, passwordError ? styles.inputError : null]}>
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="Enter your password"
                  placeholderTextColor="#9CA3AF"
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
                  <Text style={styles.eyeIcon}>
                    {showPassword ? "👁️" : "👁️‍🗨️"}
                  </Text>
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

            {serverError ? <Text style={styles.errorText}>{serverError}</Text> : null}

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginButton, isLoading ? styles.loginButtonDisabled : null]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social Login Buttons */}
            <View style={styles.socialButtonsContainer}>
              <TouchableOpacity style={styles.socialButton} disabled={isLoading}>
                <Text style={styles.socialIcon}>🔵</Text>
                <Text style={styles.socialButtonText}>Google</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.socialButton} disabled={isLoading}>
                <Text style={styles.socialIcon}>🍎</Text>
                <Text style={styles.socialButtonText}>Apple</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={handleSignUp} disabled={isLoading}>
              <Text style={styles.signUpText}>Sign Up</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.versionText}>
            Version {appVersion}
            {latestVersion && latestVersion !== appVersion ? ` | Latest ${latestVersion}` : ""}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Math.min(24, width * 0.06),
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 40,
  },
  
  // Header Styles
  headerSection: {
    marginBottom: 32,
  },
  logoContainer: {
    alignItems: "center",
  },
  logoCircle: {
    width: Math.min(100, width * 0.25),
    height: Math.min(100, width * 0.25),
    borderRadius: Math.min(50, width * 0.125),
    backgroundColor: "#4F46E5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#4F46E5",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  logoEmoji: {
    fontSize: Math.min(48, width * 0.12),
  },
  appName: {
    fontSize: Math.min(32, width * 0.08),
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: Math.min(18, width * 0.045),
    fontWeight: "600",
    color: "#4F46E5",
    marginBottom: 4,
  },
  subtitleSecondary: {
    fontSize: Math.min(14, width * 0.035),
    color: "#64748B",
  },
  
  // Form Styles
  formContainer: {
    width: "100%",
  },
  inputWrapper: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: Math.min(14, width * 0.035),
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    paddingHorizontal: 16,
    minHeight: 56,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  inputError: {
    borderColor: "#EF4444",
  },
  inputIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: Math.min(16, width * 0.04),
    color: "#1E293B",
    paddingVertical: 12,
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeButton: {
    padding: 8,
  },
  eyeIcon: {
    fontSize: 18,
  },
  errorText: {
    fontSize: 12,
    color: "#EF4444",
    marginTop: 6,
    marginLeft: 4,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginTop: 8,
  },
  forgotPasswordText: {
    fontSize: 13,
    color: "#4F46E5",
    fontWeight: "500",
  },
  
  // Login Button
  loginButton: {
    backgroundColor: "#4F46E5",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#4F46E5",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
    minHeight: 56,
    justifyContent: "center",
  },
  loginButtonDisabled: {
    backgroundColor: "#9CA3AF",
    shadowOpacity: 0,
    elevation: 0,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: Math.min(18, width * 0.045),
    fontWeight: "700",
  },
  
  // Divider
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 28,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  dividerText: {
    color: "#9CA3AF",
    marginHorizontal: 16,
    fontSize: 13,
  },
  
  // Social Buttons
  socialButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  socialButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    gap: 8,
  },
  socialIcon: {
    fontSize: 20,
  },
  socialButtonText: {
    color: "#374151",
    fontSize: Math.min(15, width * 0.038),
    fontWeight: "600",
  },
  
  // Footer
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  footerText: {
    fontSize: Math.min(15, width * 0.038),
    color: "#64748B",
  },
  signUpText: {
    fontSize: Math.min(15, width * 0.038),
    color: "#4F46E5",
    fontWeight: "700",
  },
  versionText: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 14,
    textAlign: "center",
  },
});
