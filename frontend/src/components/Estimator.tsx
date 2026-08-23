import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { request } from "@/src/api";
import { colors } from "@/src/theme";
import { Button, Header, Icon, Screen } from "@/src/components/UI";
import type { Project } from "@/src/types";

type EstimateData = {
  area: number;
  materials: { name: string; quantity: number; unit: string; category: string; room: string; search: string }[];
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

      <Text style={styles.section}>Lista de materiais</Text>
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
      <Text style={styles.note}>{data?.note}</Text>

      <Button testID="estimator-offers-cta" title="Encontrar melhores ofertas" onPress={onOffers} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  total: { backgroundColor: colors.ink, borderRadius: 17, padding: 21, marginBottom: 22 },
  totalLabel: { color: colors.dim, fontSize: 11, fontWeight: "700", letterSpacing: 1.1 },
  totalValue: { color: "#fff", fontSize: 29, fontWeight: "700", marginTop: 8 },
  totalNote: { color: colors.dim, fontSize: 12, marginTop: 7 },
  section: { color: colors.ink, fontWeight: "700", fontSize: 18, marginBottom: 10 },
  material: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderColor: colors.line },
  materialIcon: { backgroundColor: colors.pale, width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  materialName: { color: colors.ink, fontWeight: "700", fontSize: 14 },
  materialMeta: { color: colors.muted, fontSize: 12, marginTop: 4 },
  materialQty: { color: colors.ink, fontWeight: "700" },
  unit: { color: colors.muted, fontSize: 11, fontWeight: "400" },
  note: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 17, marginBottom: 6 },
});
