import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { request } from "@/src/api";
import { useTheme } from "@/src/utils/ThemeContext";
import type { lightColors } from "@/src/theme";
import { Button, Icon } from "@/src/components/UI";
import type { CepData } from "@/src/types";

export function CepModal({
  visible,
  onClose,
  onSaved,
  currentCep,
}: {
  visible: boolean;
  onClose: () => void;
  onSaved: (data: CepData) => void;
  currentCep: string | null;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => buildStyles(colors), [colors]);
  const [cep, setCep] = useState(currentCep || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    setLoading(true);
    try {
      const digits = cep.replace(/\D/g, "");
      if (digits.length !== 8) throw new Error("Digite os 8 dígitos do CEP");
      const d = await request(`/cep/${digits}`);
      onSaved(d);
      onClose();
    } catch (e: any) {
      setError(e.message || "CEP inválido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.head}>
              <Icon name="location" size={22} color={colors.brand} />
              <Text style={styles.title}>Ofertas na sua região</Text>
            </View>
            <Text style={styles.body}>
              Informe seu CEP para calcularmos frete estimado e priorizar lojas próximas.
            </Text>

            <Text style={styles.label}>CEP</Text>
            <TextInput
              testID="cep-input"
              value={cep}
              onChangeText={setCep}
              placeholder="00000-000"
              placeholderTextColor="#A4A39D"
              keyboardType="number-pad"
              maxLength={9}
              style={styles.input}
              autoFocus
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Button testID="cep-save" title={loading ? "Buscando..." : "Salvar CEP"} onPress={submit} disabled={loading || !cep} />
            <Pressable testID="cep-cancel" onPress={onClose} style={styles.cancel}>
              <Text style={styles.cancelText}>Agora não</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function buildStyles(colors: typeof lightColors) {
  return StyleSheet.create({
    backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,.35)" },
    sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 24, paddingBottom: 40 },
    handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, marginBottom: 16 },
    head: { flexDirection: "row", alignItems: "center", gap: 10 },
    title: { color: colors.ink, fontSize: 20, fontWeight: "700" },
    body: { color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: 8 },
    label: { color: colors.muted, fontSize: 12, fontWeight: "700", marginTop: 20, marginBottom: 8, letterSpacing: 0.3 },
    input: { height: 52, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 16, fontSize: 17, backgroundColor: colors.card, color: colors.ink, fontWeight: "600" },
    error: { color: "#A3333D", fontSize: 12, marginTop: 8 },
    cancel: { alignItems: "center", paddingVertical: 14 },
    cancelText: { color: colors.muted, fontWeight: "700" },
  });
}
