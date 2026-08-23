import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { request } from "@/src/api";
import { colors } from "@/src/theme";
import { Button, Header, Icon, Screen } from "@/src/components/UI";
import type { Project } from "@/src/types";

type PerRoom = { name: string; area: number; cost: number; cost_per_m2: number; share: number };
type EstimateData = {
  area: number;
  materials: { name: string; quantity: number; unit: string; category: string; room: string; search: string }[];
  per_room: PerRoom[];
  estimated_total: number;
  note: string;
};

export function Estimator({
  project,
  onOffers,
  onSearchMaterial,
}: {
  project: Project;
  onOffers: () => void;
  onSearchMaterial: (query: string) => void;
}) {
  const [data, setData] = useState<EstimateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"materials" | "rooms">("materials");

  useEffect(() => {
    request("/estimate", { method: "POST", body: JSON.stringify(project) })
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <Screen>
        <Header title="Seu orçamento" subtitle="Calculando materiais..." />
        <ActivityIndicator color={colors.brand} size="large" style={{ marginTop: 80 }} />
      </Screen>
    );
  }

  const perRoom = data?.per_room || [];
  const maxCost = Math.max(...perRoom.map((r) => r.cost), 1);

  return (
    <Screen testID="estimator-screen">
      <Header title="Seu orçamento" subtitle={`${data?.area || 0} m² · ${project.rooms.length} ambientes`} />

      <View style={styles.total}>
        <Text style={styles.totalLabel}>ESTIMATIVA INICIAL</Text>
        <Text style={styles.totalValue}>
          R$ {(data?.estimated_total || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </Text>
        <Text style={styles.totalNote}>Valores variam por região e acabamento</Text>
      </View>

      <View style={styles.segment}>
        <Pressable
          testID="view-materials"
          onPress={() => setView("materials")}
          style={[styles.segBtn, view === "materials" && styles.segBtnActive]}
        >
          <Text style={[styles.segTxt, view === "materials" && styles.segTxtActive]}>LISTA COMPLETA</Text>
        </Pressable>
        <Pressable
          testID="view-rooms"
          onPress={() => setView("rooms")}
          style={[styles.segBtn, view === "rooms" && styles.segBtnActive]}
        >
          <Text style={[styles.segTxt, view === "rooms" && styles.segTxtActive]}>POR AMBIENTE</Text>
        </Pressable>
      </View>

      {view === "materials" ? (
        <>
          {(data?.materials || []).map((m) => (
            <Pressable
              testID={`material-${m.name}`}
              key={m.name}
              style={styles.material}
              onPress={() => onSearchMaterial(m.search)}
            >
              <View style={styles.materialIcon}>
                <Icon
                  name={m.category === "Acabamento" ? "color-fill-outline" : "cube-outline"}
                  size={20}
                  color={colors.brand}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.materialName}>{m.name}</Text>
                <Text style={styles.materialMeta}>{m.category} · toque para ver ofertas</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.materialQty}>
                  {m.quantity} <Text style={styles.unit}>{m.unit}</Text>
                </Text>
                <Icon name="chevron-forward" size={16} color={colors.muted} />
              </View>
            </Pressable>
          ))}
        </>
      ) : (
        <>
          <Text style={styles.hint}>
            Cômodos com hidráulica e revestimento (banheiro, cozinha, suíte) custam mais por m².
          </Text>
          {perRoom.map((r) => {
            const barWidth = `${Math.max(6, (r.cost / maxCost) * 100)}%` as const;
            return (
              <View key={r.name} style={styles.roomRow} testID={`room-cost-${r.name}`}>
                <View style={styles.roomHead}>
                  <Text style={styles.roomName}>{r.name}</Text>
                  <Text style={styles.roomCost}>R$ {r.cost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</Text>
                </View>
                <View style={styles.roomMeta}>
                  <Text style={styles.metaLabel}>{r.area} m²</Text>
                  <View style={styles.metaDot} />
                  <Text style={styles.metaLabel}>R$ {r.cost_per_m2.toFixed(2)}/m²</Text>
                  <View style={styles.metaDot} />
                  <Text style={styles.metaLabel}>{r.share.toFixed(1)}% do total</Text>
                </View>
                <View style={styles.bar}>
                  <View style={[styles.barFill, { width: barWidth }]} />
                </View>
              </View>
            );
          })}
        </>
      )}

      <Text style={styles.note}>{data?.note}</Text>

      <Button testID="estimator-offers-cta" title="Encontrar melhores ofertas" onPress={onOffers} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  total: { backgroundColor: colors.ink, borderRadius: 17, padding: 21, marginBottom: 20 },
  totalLabel: { color: colors.dim, fontSize: 11, fontWeight: "700", letterSpacing: 1.1 },
  totalValue: { color: "#fff", fontSize: 29, fontWeight: "700", marginTop: 8 },
  totalNote: { color: colors.dim, fontSize: 12, marginTop: 7 },
  segment: { flexDirection: "row", backgroundColor: colors.card, borderRadius: 12, padding: 4, marginBottom: 14 },
  segBtn: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 9 },
  segBtnActive: { backgroundColor: colors.white },
  segTxt: { color: colors.muted, fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  segTxtActive: { color: colors.brand },
  material: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderColor: colors.line },
  materialIcon: { backgroundColor: colors.pale, width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  materialName: { color: colors.ink, fontWeight: "700", fontSize: 14 },
  materialMeta: { color: colors.muted, fontSize: 12, marginTop: 4 },
  materialQty: { color: colors.ink, fontWeight: "700" },
  unit: { color: colors.muted, fontSize: 11, fontWeight: "400" },
  hint: { color: colors.muted, fontSize: 12, lineHeight: 18, marginBottom: 12 },
  roomRow: { paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.line },
  roomHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  roomName: { color: colors.ink, fontWeight: "700", fontSize: 15 },
  roomCost: { color: colors.brand, fontWeight: "700", fontSize: 15 },
  roomMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  metaLabel: { color: colors.muted, fontSize: 11, fontWeight: "600" },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.line },
  bar: { height: 6, borderRadius: 3, backgroundColor: colors.card, overflow: "hidden" },
  barFill: { height: "100%", backgroundColor: colors.brand, borderRadius: 3 },
  note: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 17, marginBottom: 6 },
});
