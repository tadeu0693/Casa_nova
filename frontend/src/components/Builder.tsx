import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors } from "@/src/theme";
import { Button, Chip, Field, Header, Icon, Screen } from "@/src/components/UI";
import type { Room } from "@/src/types";

const BUILD_TYPES = ["Casa térrea", "Sobrado", "Edícula", "Reforma"];
const ROOM_TEMPLATES = [
  { name: "Sala", width: 4, length: 5 },
  { name: "Cozinha", width: 3, length: 4 },
  { name: "Quarto", width: 3, length: 3.5 },
  { name: "Banheiro", width: 2, length: 2 },
  { name: "Suíte", width: 3.5, length: 4 },
  { name: "Área de serviço", width: 2, length: 2.5 },
  { name: "Varanda", width: 3, length: 2 },
  { name: "Escritório", width: 3, length: 3 },
];

export function Builder({
  onDone,
  initial,
}: {
  onDone: (p: { name: string; build_type: string; width: number; length: number; rooms: Room[] }) => void;
  initial?: { name: string; build_type: string; width: number; length: number; rooms: Room[] } | null;
}) {
  const [type, setType] = useState(initial?.build_type || "Casa térrea");
  const [width, setWidth] = useState(String(initial?.width || 8));
  const [length, setLength] = useState(String(initial?.length || 12));
  const [rooms, setRooms] = useState<Room[]>(initial?.rooms?.length ? initial.rooms : [
    { name: "Sala", width: 4, length: 5, x: 0, y: 0 },
    { name: "Cozinha", width: 3, length: 4, x: 4, y: 0 },
    { name: "Quarto", width: 3, length: 3.5, x: 0, y: 5 },
  ]);
  const [projectName, setProjectName] = useState(initial?.name || "Meu projeto");

  const totalArea = useMemo(() => (Number(width) || 0) * (Number(length) || 0), [width, length]);
  const usedArea = useMemo(() => rooms.reduce((a, r) => a + r.width * r.length, 0), [rooms]);

  const addTemplate = (t: (typeof ROOM_TEMPLATES)[number]) => {
    const nextX = rooms.length ? (rooms[rooms.length - 1].x || 0) + (rooms[rooms.length - 1].width || 3) : 0;
    setRooms([...rooms, { ...t, x: nextX, y: 0 }]);
  };
  const removeRoom = (idx: number) => setRooms(rooms.filter((_, i) => i !== idx));
  const updateRoom = (idx: number, key: keyof Room, val: string) => {
    const next = [...rooms];
    const parsed = key === "name" ? val : Number(val.replace(",", ".")) || 0;
    (next[idx] as any)[key] = parsed;
    setRooms(next);
  };

  return (
    <Screen testID="builder-screen">
      <Header title="Novo projeto" subtitle="Vamos desenhar sua ideia" />
      <Text style={styles.progress}>ETAPA 1 DE 3 <Text style={{ color: colors.brand }}>━━━━</Text><Text style={{ color: colors.line }}>━━━━━━</Text></Text>

      <Field testID="builder-name" label="Nome do projeto" value={projectName} onChangeText={setProjectName} placeholder="Ex.: Casa da praia" />

      <Text style={styles.formTitle}>Tipo de construção</Text>
      <View style={styles.chipRow}>
        {BUILD_TYPES.map((x) => (
          <Chip testID={`build-type-${x}`} key={x} label={x} active={type === x} onPress={() => setType(x)} />
        ))}
      </View>

      <View style={styles.twoFields}>
        <View style={{ flex: 1 }}>
          <Field testID="builder-width" label="Largura do terreno (m)" value={width} onChangeText={setWidth} keyboardType="decimal-pad" />
        </View>
        <View style={{ flex: 1 }}>
          <Field testID="builder-length" label="Comprimento (m)" value={length} onChangeText={setLength} keyboardType="decimal-pad" />
        </View>
      </View>

      <View style={styles.areaCard}>
        <View>
          <Text style={styles.areaKicker}>ÁREA TOTAL</Text>
          <Text style={styles.areaValue}>{totalArea.toFixed(1)} m²</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.areaKicker}>USADA EM CÔMODOS</Text>
          <Text style={[styles.areaValue, usedArea > totalArea && { color: colors.warn }]}>{usedArea.toFixed(1)} m²</Text>
        </View>
      </View>

      <Text style={styles.formTitle}>Adicionar cômodo</Text>
      <View style={styles.chipRow}>
        {ROOM_TEMPLATES.map((t) => (
          <Pressable key={t.name} testID={`add-template-${t.name}`} onPress={() => addTemplate(t)} style={styles.addChip}>
            <Icon name="add" size={14} color={colors.brand} />
            <Text style={styles.addChipText}>{t.name}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.formTitle, { marginTop: 26 }]}>Seus cômodos</Text>
      {rooms.length === 0 && <Text style={styles.body}>Toque em um modelo acima para começar.</Text>}
      {rooms.map((r, i) => (
        <View key={`room-${i}`} style={styles.roomCard} testID={`room-row-${i}`}>
          <View style={styles.roomHead}>
            <TextInput
              testID={`room-name-${i}`}
              value={r.name}
              onChangeText={(v) => updateRoom(i, "name", v)}
              style={styles.roomName}
            />
            <Pressable testID={`room-remove-${i}`} onPress={() => removeRoom(i)} hitSlop={10}>
              <Icon name="trash-outline" size={18} color={colors.muted} />
            </Pressable>
          </View>
          <View style={styles.dimRow}>
            <View style={styles.dim}>
              <Text style={styles.dimLabel}>Largura (m)</Text>
              <TextInput
                testID={`room-width-${i}`}
                value={String(r.width)}
                onChangeText={(v) => updateRoom(i, "width", v)}
                keyboardType="decimal-pad"
                style={styles.dimInput}
              />
            </View>
            <View style={styles.dim}>
              <Text style={styles.dimLabel}>Comprimento (m)</Text>
              <TextInput
                testID={`room-length-${i}`}
                value={String(r.length)}
                onChangeText={(v) => updateRoom(i, "length", v)}
                keyboardType="decimal-pad"
                style={styles.dimInput}
              />
            </View>
            <View style={styles.dim}>
              <Text style={styles.dimLabel}>Área</Text>
              <View style={styles.dimReadonly}>
                <Text style={styles.dimReadonlyText}>{(r.width * r.length).toFixed(1)} m²</Text>
              </View>
            </View>
          </View>
        </View>
      ))}

      <Button
        testID="builder-next"
        title="Ver planta 2D"
        onPress={() =>
          onDone({
            name: projectName,
            build_type: type,
            width: Number(width) || 8,
            length: Number(length) || 12,
            rooms: rooms.map((r, i) => ({
              ...r,
              x: r.x ?? i * 3,
              y: r.y ?? 0,
            })),
          })
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  progress: { fontSize: 11, color: colors.muted, letterSpacing: 1.3, marginBottom: 20, fontWeight: "700" },
  formTitle: { fontSize: 18, fontWeight: "700", color: colors.ink, marginTop: 20 },
  body: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 7 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  twoFields: { flexDirection: "row", gap: 12 },
  areaCard: { backgroundColor: colors.card, borderRadius: 14, padding: 16, marginTop: 22, flexDirection: "row", justifyContent: "space-between" },
  areaKicker: { color: colors.muted, fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  areaValue: { color: colors.ink, fontSize: 20, fontWeight: "700", marginTop: 4 },
  addChip: { flexDirection: "row", gap: 4, height: 36, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.brand, borderRadius: 999, alignItems: "center", backgroundColor: colors.pale, flexShrink: 0 },
  addChipText: { color: colors.brand, fontWeight: "700", fontSize: 12 },
  roomCard: { backgroundColor: colors.white, borderRadius: 14, padding: 14, marginTop: 12, borderWidth: 1, borderColor: colors.line },
  roomHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  roomName: { fontWeight: "700", fontSize: 15, color: colors.ink, flex: 1 },
  dimRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  dim: { flex: 1 },
  dimLabel: { color: colors.muted, fontSize: 10, fontWeight: "700", marginBottom: 4 },
  dimInput: { height: 40, borderWidth: 1, borderColor: colors.line, borderRadius: 8, paddingHorizontal: 10, color: colors.ink, fontSize: 14, backgroundColor: colors.white },
  dimReadonly: { height: 40, borderRadius: 8, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  dimReadonlyText: { color: colors.ink, fontWeight: "700", fontSize: 13 },
});
