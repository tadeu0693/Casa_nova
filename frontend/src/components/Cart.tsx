import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { request } from "@/src/api";
import { colors } from "@/src/theme";
import { Header, Icon, Screen } from "@/src/components/UI";
import type { CartItem, Project } from "@/src/types";

type CartResp = { items: CartItem[]; total_price: number; total_freight: number; grand_total: number; purchased_total: number; stores: string[] };

export function Cart({ onExplore, project }: { onExplore: () => void; project?: Project | null }) {
  const [data, setData] = useState<CartResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [budget, setBudget] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await request("/cart");
      setData(d);
    } catch {
      setData({ items: [], total_price: 0, total_freight: 0, grand_total: 0, purchased_total: 0, stores: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!project) { setBudget(null); return; }
    request("/estimate", { method: "POST", body: JSON.stringify(project) })
      .then((d) => setBudget(d.estimated_total || null))
      .catch(() => setBudget(null));
  }, [project]);

  const remove = async (offerId: string) => {
    await request(`/cart/${encodeURIComponent(offerId)}`, { method: "DELETE" }).catch(() => undefined);
    load();
  };

  const togglePurchased = async (item: CartItem) => {
    // Update on screen right away so it feels instant, then confirm with the server.
    setData((prev) => {
      if (!prev) return prev;
      const items = prev.items.map((it) => (it.offer_id === item.offer_id ? { ...it, purchased: !it.purchased } : it));
      const purchased_total = items.reduce((sum, it) => (it.purchased ? sum + it.price * it.quantity : sum), 0);
      return { ...prev, items, purchased_total: Math.round(purchased_total * 100) / 100 };
    });
    await request(`/cart/${encodeURIComponent(item.offer_id)}/purchased`, {
      method: "PATCH",
      body: JSON.stringify({ purchased: !item.purchased }),
    }).catch(() => load()); // if it failed, resync with the real server state
  };

  if (loading) {
    return (
      <Screen>
        <Header title="Carrinho comparativo" subtitle="Calculando o menor custo total..." />
        <ActivityIndicator color={colors.brand} size="large" style={{ marginTop: 60 }} />
      </Screen>
    );
  }

  const items = data?.items || [];

  return (
    <Screen testID="cart-screen">
      <Header title="Carrinho comparativo" subtitle={`${items.length} item(ns) · ${data?.stores.length || 0} loja(s)`} />

      {items.length === 0 ? (
        <View style={styles.empty}>
          <Icon name="basket-outline" size={40} color={colors.brand} />
          <Text style={styles.emptyTitle}>Seu carrinho está vazio</Text>
          <Text style={styles.emptyText}>Adicione ofertas na aba Ofertas para comparar preços e frete.</Text>
          <Pressable testID="cart-explore" onPress={onExplore} style={styles.cta}>
            <Text style={styles.ctaText}>Explorar ofertas</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.summary}>
            <Row label="Produtos" value={data!.total_price} />
            <Row label="Frete estimado" value={data!.total_freight} />
            <View style={styles.divider} />
            <Row label="Total" value={data!.grand_total} bold />
            {data!.stores.length > 1 ? (
              <View style={styles.savingsBadge}>
                <Icon name="sparkles-outline" size={12} color={colors.green} />
                <Text style={styles.savingsText}>Comprando em {data!.stores.length} lojas você compara e escolhe o melhor total.</Text>
              </View>
            ) : null}
          </View>

          {budget ? (
            <View style={styles.progressCard} testID="cart-budget-progress">
              <View style={styles.progressHead}>
                <Text style={styles.progressLabel}>GASTO REAL DA OBRA</Text>
                <Text style={styles.progressPct}>{Math.min(100, Math.round((data!.purchased_total / budget) * 100))}%</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${Math.min(100, (data!.purchased_total / budget) * 100)}%` }]} />
              </View>
              <Text style={styles.progressText}>
                R$ {data!.purchased_total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} comprados de R$ {budget.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} estimados
              </Text>
            </View>
          ) : null}

          {items.map((it) => (
            <View testID={`cart-item-${it.offer_id}`} key={it.offer_id} style={[styles.item, it.purchased && styles.itemPurchased]}>
              <Pressable testID={`cart-purchased-${it.offer_id}`} onPress={() => togglePurchased(it)} hitSlop={8} style={styles.checkbox}>
                <Icon name={it.purchased ? "checkmark-circle" : "ellipse-outline"} size={24} color={it.purchased ? colors.green : colors.dim} />
              </Pressable>
              <View style={styles.itemImage}>
                <Icon name="cube-outline" size={22} color={colors.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text numberOfLines={2} style={[styles.itemTitle, it.purchased && styles.itemTitlePurchased]}>{it.title}</Text>
                <Text style={styles.itemStore}>{it.store}{it.purchased ? " · comprado" : ""}</Text>
                <View style={styles.priceRow}>
                  <Text style={styles.price}>R$ {it.price.toFixed(2)}</Text>
                  {it.freight ? <Text style={styles.freight}> + R$ {it.freight.toFixed(2)} frete</Text> : null}
                </View>
              </View>
              <View style={styles.actions}>
                {it.url ? (
                  <Pressable testID={`cart-open-${it.offer_id}`} onPress={() => Linking.openURL(it.url)} style={styles.iconBtn}>
                    <Icon name="open-outline" size={16} color={colors.brand} />
                  </Pressable>
                ) : null}
                <Pressable testID={`cart-remove-${it.offer_id}`} onPress={() => remove(it.offer_id)} style={styles.iconBtn}>
                  <Icon name="trash-outline" size={16} color={colors.error} />
                </Pressable>
              </View>
            </View>
          ))}
        </>
      )}
    </Screen>
  );
}

function Row({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && { color: colors.ink, fontWeight: "700" }]}>{label}</Text>
      <Text style={[styles.rowValue, bold && { color: colors.brand, fontSize: 20 }]}>
        R$ {value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: "center", marginTop: 60, paddingHorizontal: 30 },
  emptyTitle: { color: colors.ink, fontSize: 20, fontWeight: "700", marginTop: 15 },
  emptyText: { color: colors.muted, fontSize: 13, marginTop: 8, textAlign: "center", lineHeight: 20 },
  cta: { marginTop: 24, backgroundColor: colors.brand, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
  ctaText: { color: "#fff", fontWeight: "700" },
  summary: { backgroundColor: colors.card, borderRadius: 14, padding: 16, marginBottom: 16 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 },
  rowLabel: { color: colors.muted, fontSize: 13, fontWeight: "600" },
  rowValue: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: 8 },
  savingsBadge: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, padding: 8, backgroundColor: "#E7F3E7", borderRadius: 8 },
  savingsText: { color: colors.green, fontSize: 11, fontWeight: "600", flex: 1 },
  progressCard: { backgroundColor: colors.white, borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.line },
  progressHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  progressLabel: { color: colors.muted, fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  progressPct: { color: colors.brand, fontWeight: "700", fontSize: 15 },
  progressBar: { height: 8, borderRadius: 4, backgroundColor: colors.card, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: colors.green, borderRadius: 4 },
  progressText: { color: colors.muted, fontSize: 11, marginTop: 8, fontWeight: "600" },
  checkbox: { paddingRight: 2 },
  itemPurchased: { opacity: 0.6 },
  itemTitlePurchased: { textDecorationLine: "line-through" },
  item: { flexDirection: "row", gap: 12, alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.line },
  itemImage: { width: 48, height: 48, borderRadius: 10, backgroundColor: colors.pale, alignItems: "center", justifyContent: "center" },
  itemTitle: { color: colors.ink, fontSize: 13, fontWeight: "600", lineHeight: 18 },
  itemStore: { color: colors.muted, fontSize: 11, fontWeight: "700", marginTop: 3 },
  priceRow: { flexDirection: "row", marginTop: 4, alignItems: "center" },
  price: { color: colors.green, fontWeight: "700", fontSize: 13 },
  freight: { color: colors.blue, fontSize: 11, fontWeight: "600" },
  actions: { flexDirection: "column", gap: 6 },
  iconBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
});
