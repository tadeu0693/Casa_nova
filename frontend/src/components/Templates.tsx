import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { request } from "@/src/api";
import { colors } from "@/src/theme";
import { Header, Icon, Screen } from "@/src/components/UI";
import type { Project } from "@/src/types";

type Template = {
  id: string;
  name: string;
  description: string;
  icon: string;
  build_type: string;
  width: number;
  length: number;
  rooms: { name: string; width: number; length: number; x: number; y: number }[];
};

export function Templates({ onPick, onBack }: { onPick: (project: Project) => void; onBack: () => void }) {
  const [items, setItems] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    request("/templates")
      .then((d) => setItems(d.templates || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const pick = (t: Template) => {
    onPick({
      name: t.name,
      build_type: t.build_type,
      width: t.width,
      length: t.length,
      rooms: t.rooms,
    });
  };

  return (
    <Screen testID="templates-screen">
      <View style={styles.top}>
        <Pressable testID="templates-back" onPress={onBack} hitSlop={10} style={styles.back}>
          <Icon name="chevron-back" size={22} color={colors.ink} />
        </Pressable>
      </View>
      <Header title="Modelos prontos" subtitle="Comece em segundos e personalize depois" />

      {loading ? (
        <ActivityIndicator color={colors.brand} size="large" style={{ marginTop: 60 }} />
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Icon name="alert-circle-outline" size={32} color={colors.muted} />
          <Text style={styles.emptyText}>Não foi possível carregar os modelos agora.</Text>
        </View>
      ) : (
        items.map((t) => {
          const area = (t.width * t.length).toFixed(0);
          return (
            <Pressable
              key={t.id}
              testID={`template-${t.id}`}
              onPress={() => pick(t)}
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.75 }]}
            >
              <View style={styles.iconBox}>
                <Icon name={t.icon as any} size={26} color={colors.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.cardHead}>
                  <Text style={styles.cardTitle}>{t.name}</Text>
                  <Text style={styles.cardArea}>{area} m²</Text>
                </View>
                <Text style={styles.cardDesc}>{t.description}</Text>
                <View style={styles.roomsRow}>
                  {t.rooms.slice(0, 4).map((r, i) => (
                    <View key={i} style={styles.roomChip}>
                      <Text style={styles.roomChipText}>{r.name}</Text>
                    </View>
                  ))}
                  {t.rooms.length > 4 ? (
                    <View style={styles.roomChip}>
                      <Text style={styles.roomChipText}>+{t.rooms.length - 4}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
              <Icon name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>
          );
        })
      )}

      <View style={styles.hint}>
        <Icon name="bulb-outline" size={16} color={colors.blue} />
        <Text style={styles.hintText}>
          Escolha um modelo e ajuste medidas, cômodos ou renomeie tudo depois no editor 2D.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", marginBottom: 4 },
  back: { width: 40, height: 40, alignItems: "center", justifyContent: "center", marginLeft: -8 },
  empty: { alignItems: "center", marginTop: 60, padding: 20 },
  emptyText: { color: colors.muted, marginTop: 10, textAlign: "center" },
  card: {
    flexDirection: "row",
    gap: 14,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 12,
    alignItems: "center",
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.pale,
    alignItems: "center",
    justifyContent: "center",
  },
  cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { color: colors.ink, fontWeight: "700", fontSize: 15, flex: 1 },
  cardArea: { color: colors.brand, fontWeight: "700", fontSize: 13 },
  cardDesc: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 4 },
  roomsRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 8 },
  roomChip: { backgroundColor: colors.card, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  roomChipText: { fontSize: 10, color: colors.ink, fontWeight: "600" },
  hint: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#E8F0F2",
    marginTop: 8,
    alignItems: "flex-start",
  },
  hintText: { color: colors.blue, fontSize: 12, lineHeight: 18, flex: 1 },
});
