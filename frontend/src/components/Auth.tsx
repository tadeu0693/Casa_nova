import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Linking as RNLinking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { storage } from "@/src/utils/storage";
import { request, TOKEN_KEY } from "@/src/api";
import { useTheme } from "@/src/utils/ThemeContext";
import type { lightColors } from "@/src/theme";
import { Button, Field, Icon } from "@/src/components/UI";
import type { User } from "@/src/types";

WebBrowser.maybeCompleteAuthSession();

export function Auth({ onLogged }: { onLogged: (u: User) => void }) {
  const { colors } = useTheme();
  const styles = useMemo(() => buildStyles(colors), [colors]);
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [forgotStep, setForgotStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError("");
    setLoading(true);
    try {
      const data = await request(`/auth/${mode === "login" ? "login" : "register"}`, {
        method: "POST",
        body: JSON.stringify({ email, password, name: name || undefined }),
      });
      await storage.secureSet(TOKEN_KEY, data.session_token);
      onLogged(data.user);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const requestCode = async () => {
    setError(""); setInfo(""); setLoading(true);
    try {
      const data = await request("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
      setInfo(data.message || "Se esse e-mail tiver uma conta, enviamos um código.");
      setForgotStep("reset");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    setError(""); setInfo(""); setLoading(true);
    try {
      await request("/auth/reset-password", { method: "POST", body: JSON.stringify({ email, code, new_password: newPassword }) });
      setMode("login");
      setForgotStep("request");
      setPassword("");
      setCode("");
      setNewPassword("");
      setInfo("Senha redefinida! Já pode entrar com a senha nova.");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const backToLogin = () => {
    setMode("login");
    setForgotStep("request");
    setError("");
    setInfo("");
  };

  const google = async () => {
    setError("");
    try {
      const redirect = Platform.OS === "web" ? `${window.location.origin}/` : Linking.createURL("");
      if (Platform.OS === "web") {
        window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirect)}`;
        return;
      }
      const result = await WebBrowser.openAuthSessionAsync(`https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirect)}`, redirect);
      const url = (result.type === "success" ? result.url : undefined) || (await RNLinking.getInitialURL());
      const match = url?.match(/[?#&]session_id=([^&#]+)/);
      if (!match) throw new Error("Login Google cancelado");
      const data = await request("/auth/session", { method: "POST", body: JSON.stringify({ session_id: decodeURIComponent(match[1]) }) });
      await storage.secureSet(TOKEN_KEY, data.session_token);
      onLogged(data.user);
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
          <View style={styles.mark}>
            <Icon name="construct-outline" size={25} color="#fff" />
          </View>
          <Text style={styles.kicker}>CONSTRÓIFÁCIL</Text>
          <Text style={styles.heroTitle}>Planeje melhor.{"\n"}Construa com confiança.</Text>
          <Text style={styles.subtle}>Seu projeto, materiais e melhores ofertas em um só lugar.</Text>

          {mode === "forgot" ? (
            <>
              <Text style={[styles.subtle, { marginTop: 18, fontWeight: "700", color: colors.ink }]}>
                {forgotStep === "request" ? "Esqueci minha senha" : "Digite o código que enviamos"}
              </Text>
              {forgotStep === "request" ? (
                <>
                  <Field testID="forgot-email" label="E-mail" value={email} onChangeText={setEmail} placeholder="voce@email.com" keyboardType="email-address" />
                  {info ? <Text style={styles.infoText}>{info}</Text> : null}
                  {error ? (
                    <View style={styles.error}>
                      <Icon name="alert-circle-outline" size={18} color="#A3333D" />
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  ) : null}
                  <Button testID="forgot-send" title={loading ? "Enviando..." : "Enviar código por e-mail"} onPress={requestCode} disabled={loading || !email} />
                </>
              ) : (
                <>
                  <Text style={styles.infoText}>{info || `Enviamos um código de 6 dígitos para ${email}.`}</Text>
                  <Field testID="forgot-code" label="Código de 6 dígitos" value={code} onChangeText={setCode} placeholder="000000" keyboardType="number-pad" />
                  <Field testID="forgot-new-password" label="Nova senha" value={newPassword} onChangeText={setNewPassword} placeholder="Mínimo de 6 caracteres" secureTextEntry />
                  {error ? (
                    <View style={styles.error}>
                      <Icon name="alert-circle-outline" size={18} color="#A3333D" />
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  ) : null}
                  <Button testID="forgot-reset" title={loading ? "Salvando..." : "Redefinir senha"} onPress={resetPassword} disabled={loading || code.length !== 6 || newPassword.length < 6} />
                  <Pressable testID="forgot-resend" onPress={requestCode} style={styles.switch}>
                    <Text style={styles.switchText}>Reenviar código</Text>
                  </Pressable>
                </>
              )}
              <Pressable testID="forgot-back" onPress={backToLogin} style={styles.switch}>
                <Icon name="arrow-back" size={16} color={colors.brand} />
                <Text style={styles.switchText}>Voltar para o login</Text>
              </Pressable>
            </>
          ) : (
            <>
              {mode === "register" && <Field testID="auth-name" label="Seu nome" value={name} onChangeText={setName} placeholder="Como podemos chamar você?" />}
              <Field testID="auth-email" label="E-mail" value={email} onChangeText={setEmail} placeholder="voce@email.com" keyboardType="email-address" />
              <Field testID="auth-password" label="Senha" value={password} onChangeText={setPassword} placeholder="Mínimo de 6 caracteres" secureTextEntry />
              {mode === "login" && (
                <Pressable testID="auth-forgot" onPress={() => { setMode("forgot"); setError(""); setInfo(""); }} style={styles.forgotLink}>
                  <Text style={styles.forgotLinkText}>Esqueci minha senha</Text>
                </Pressable>
              )}
              {info ? <Text style={styles.infoText}>{info}</Text> : null}
              {error ? (
                <View style={styles.error}>
                  <Icon name="alert-circle-outline" size={18} color="#A3333D" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}
              <Button testID="auth-submit" title={loading ? "Entrando..." : mode === "login" ? "Entrar na minha conta" : "Criar conta"} onPress={submit} disabled={loading || !email || !password} />
              <Pressable testID="auth-google" style={styles.google} onPress={google}>
                <Icon name="logo-google" size={18} color={colors.ink} />
                <Text style={styles.googleText}>Continuar com Google</Text>
              </Pressable>
              <Pressable testID="auth-switch" onPress={() => { setMode(mode === "login" ? "register" : "login"); setError(""); setInfo(""); }} style={styles.switch}>
                <Text style={styles.switchText}>{mode === "login" ? "Ainda não tenho uma conta" : "Já tenho uma conta"}</Text>
                <Icon name="arrow-forward" size={16} color={colors.brand} />
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function buildStyles(colors: typeof lightColors) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  wrap: { padding: 28, paddingTop: 58, paddingBottom: 40 },
  mark: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center", marginBottom: 22 },
  kicker: { color: colors.brand, fontSize: 12, letterSpacing: 1.7, fontWeight: "700" },
  heroTitle: { color: colors.ink, fontSize: 31, lineHeight: 37, fontWeight: "700", marginTop: 12 },
  subtle: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 7 },
  google: { height: 50, borderWidth: 1, borderColor: colors.line, borderRadius: 12, marginTop: 12, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 10, backgroundColor: "#fff" },
  googleText: { fontWeight: "700", color: colors.ink },
  switch: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 25, minHeight: 44 },
  switchText: { color: colors.brand, fontWeight: "700" },
  error: { backgroundColor: "#FBEAEC", padding: 12, borderRadius: 10, flexDirection: "row", gap: 8, marginTop: 18 },
  errorText: { color: "#A3333D", flex: 1 },
  forgotLink: { alignSelf: "flex-end", marginTop: 10, minHeight: 30, justifyContent: "center" },
  forgotLinkText: { color: colors.brand, fontWeight: "700", fontSize: 13 },
  infoText: { color: colors.muted, fontSize: 13, marginTop: 14, lineHeight: 19 },
  });
}
