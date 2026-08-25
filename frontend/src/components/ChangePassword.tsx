import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { request } from "@/src/api";
import { colors } from "@/src/theme";
import { Button, Field, Icon, Screen } from "@/src/components/UI";

export function ChangePassword({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError("");
    if (newPassword !== confirmPassword) {
      setError("A confirmação não bate com a senha nova");
      return;
    }
    setLoading(true);
    try {
      await request("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      onDone();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen testID="change-password-screen">
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 18 }}>
        <Pressable testID="cp-back" onPress={onBack} hitSlop={10} style={{ marginRight: 12 }}>
          <Icon name="chevron-back" size={22} color={colors.ink} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: "700", color: colors.ink }}>Alterar senha</Text>
          <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>Digite sua senha atual e a nova senha</Text>
        </View>
      </View>
      <View>
        <Field testID="cp-current" label="Senha atual" value={currentPassword} onChangeText={setCurrentPassword} placeholder="Sua senha de hoje" secureTextEntry />
        <Field testID="cp-new" label="Nova senha" value={newPassword} onChangeText={setNewPassword} placeholder="Mínimo de 6 caracteres" secureTextEntry />
        <Field testID="cp-confirm" label="Confirme a nova senha" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Digite de novo" secureTextEntry />
        {error ? (
          <View style={{ backgroundColor: "#FBEAEC", padding: 12, borderRadius: 10, marginTop: 8, marginBottom: 4 }}>
            <Text style={{ color: "#A3333D" }}>{error}</Text>
          </View>
        ) : null}
        <Button
          testID="cp-submit"
          title={loading ? "Salvando..." : "Salvar nova senha"}
          onPress={submit}
          disabled={loading || !currentPassword || newPassword.length < 6 || !confirmPassword}
        />
      </View>
    </Screen>
  );
}
