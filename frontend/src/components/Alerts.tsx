import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View, KeyboardAvoidingView, Platform } from "react-native";
import { request } from "@/src/api";
import { colors } from "@/src/theme";
import { Button, Field, Header, Icon, Screen } from "@/src/components/UI";
import type { PriceAlert } from "@/src/types";

const SUGGESTIONS = ["Cimento 50kg", "Areia média", "Bloco cerâmico", "Piso porcelanato", "Tinta acrílica"];

export function Alerts({ onBack, onSeeOffers }: { onBack: () => void; onSeeOffers: (q: string) => void }) {
  const [items, setItems] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await request("/alerts");
      setItems(Array.isArray(d) ? d : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const remove = async (id: string) => {
    await request(`/alerts/${id}`, { method: "DELETE" }).catch(() => undefined);
    load();
  };

  return (
    <Screen testID="alerts-screen">
      <View style={styles.top}>
        <Pressable testID="alerts-back" onPress={onBack} hitSlop={10} style={styles.back}>
          <Icon name="chevron-back" size={22} color={colors.ink} />
        </Pressable>
      </View>
      <Header title="Alertas de preço" subtitle="Avisamos quando o material chegar no valor que você quer" />

      <Pressable testID="alerts-add" onPress={() => setShowForm(true)} style={styles.addBar}>
        <Icon name="add-circle" size={22} color={colors.brand} />
        <Text style={styles.addText}>Criar novo alerta</Text>
      </Pressable>

      {loading ? (
        <ActivityIndicator color={colors.brand} size="large" style={{ marginTop: 60 }} />
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Icon name="notifications-outline" size={38} color={colors.brand} />
          <Text style={styles.emptyTitle}>Nenhum alerta ativo</Text>
          <Text style={styles.emptyText}>Crie alertas para não perder queda de preço nos materiais da sua obra.</Text>
        </View>
      ) : (
        items.map((a) => (
          <View key={a.alert_id} style={styles.item} testID={`alert-${a.alert_id}`}>
            <View style={styles.bell}>
              <Icon name="notifications" size={18} color={colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>{a.query}</Text>
              <Text style={styles.itemMeta}>Alvo: R$ {a.target_price.toFixed(2)}</Text>
            </View>
            <Pressable testID={`alert-view-${a.alert_id}`} onPress={() => onSeeOffers(a.query)} style={styles.iconBtn}>
              <Icon name="pricetag-outline" size={16} color={colors.brand} />
            </Pressable>
            <Pressable testID={`alert-remove-${a.alert_id}`} onPress={() => remove(a.alert_id)} style={styles.iconBtn}>
              <Icon name="trash-outline" size={16} color={colors.error} />
            </Pressable>
          </View>
        ))
      )}

      <AlertForm
        visible={showForm}
        onClose={() => setShowForm(false)}
        onCreated={() => { setShowForm(false); load(); }}
      />
    </Screen>
  );
}

function AlertForm({ visible, onClose, onCreated }: { visible: boolean; onClose: () => void; onCreated: () => void }) {
  const [query, setQuery] = useState("");
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) { setQuery(""); setPrice(""); setError(""); }
  }, [visible]);

  const submit = async () => {
    setError("");
    const target = Number(price.replace(",", "."));
    if (!query.trim()) return setError("Informe o material");
    if (!target || target <= 0) return setError("Informe um preço alvo válido");
    setSaving(true);
    try {
      await request("/alerts", {
        method: "POST",
        body: JSON.stringify({ query: query.trim(), target_price: target }),
      });
      onCreated();
    } catch (e: any) {
      setError(e.message || "Erro ao criar alerta");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Novo alerta</Text>
            <Text style={styles.sheetBody}>Qual material acompanhar e a partir de qual preço?</Text>

            <Field testID="alert-query" label="Material (o que buscar)" value={query} onChangeText={setQuery} placeholder="Ex.: Cimento 50kg" />
            <View style={styles.chipRow}>
              {SUGGESTIONS.map((s) => (
                <Pressable key={s} testID={`suggest-${s}`} onPress={() => setQuery(s)} style={styles.suggest}>
                  <Text style={styles.suggestText}>{s}</Text>
                </Pressable>
              ))}
            </View>

            <Field testID="alert-price" label="Preço alvo (R$)" value={price} onChangeText={setPrice} placeholder="Ex.: 39,90" keyboardType="decimal-pad" />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Button testID="alert-save" title={saving ? "Salvando..." : "Criar alerta"} onPress={submit} disabled={saving} />
            <Pressable onPress={onClose} style={styles.cancel}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", marginBottom: 4 },
  back: { width: 40, height: 40, alignItems: "center", justifyContent: "center", marginLeft: -8 },
  addBar: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.pale, padding: 14, borderRadius: 12, marginBottom: 16 },
  addText: { color: colors.brand, fontWeight: "700", fontSize: 14 },
  empty: { alignItems: "center", marginTop: 60, paddingHorizontal: 30 },
  emptyTitle: { color: colors.ink, fontSize: 18, fontWeight: "700", marginTop: 15 },
  emptyText: { color: colors.muted, fontSize: 13, marginTop: 8, textAlign: "center", lineHeight: 20 },
  item: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.line },
  bell: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.pale, alignItems: "center", justifyContent: "center" },
  itemTitle: { color: colors.ink, fontWeight: "700", fontSize: 14 },
  itemMeta: { color: colors.muted, fontSize: 12, marginTop: 3 },
  iconBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,.35)" },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 24, paddingBottom: 40 },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, marginBottom: 16 },
  sheetTitle: { color: colors.ink, fontSize: 20, fontWeight: "700" },
  sheetBody: { color: colors.muted, fontSize: 13, marginTop: 6, lineHeight: 19 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  suggest: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  suggestText: { fontSize: 11, color: colors.muted, fontWeight: "600" },
  error: { color: "#A3333D", fontSize: 12, marginTop: 8 },
  cancel: { alignItems: "center", paddingVertical: 14 },
  cancelText: { color: colors.muted, fontWeight: "700" },
});
