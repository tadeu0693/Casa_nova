import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useTheme } from "@/src/utils/ThemeContext";
import type { lightColors } from "@/src/theme";
import { Button, Chip, Field, Header, Icon, Screen } from "@/src/components/UI";
import type { Room } from "@/src/types";

const BUILD_TYPES = ["Casa térrea", "Sobrado", "Edícula", "Reforma"];
const FLOORS = [
  { value: 0, label: "Térreo" },
  { value: 1, label: "1º Andar" },
  { value: 2, label: "2º Andar" },
];
const ROOM_TEMPLATES: { name: string; width: number; length: number; icon: keyof typeof import("@expo/vector-icons/build/Ionicons").Ionicons.glyphMap }[] = [
  { name: "Sala", width: 4, length: 5, icon: "tv-outline" },
  { name: "Cozinha", width: 3, length: 4, icon: "restaurant-outline" },
  { name: "Quarto", width: 3, length: 3.5, icon: "bed-outline" },
  { name: "Suíte", width: 3.5, length: 4, icon: "bed" },
  { name: "Closet", width: 2, length: 2.5, icon: "shirt-outline" },
  { name: "Banheiro", width: 2, length: 2, icon: "water-outline" },
  { name: "Lavabo", width: 1.5, length: 2, icon: "water" },
  { name: "Área de serviço", width: 2, length: 2.5, icon: "shirt-outline" },
  { name: "Conceito aberto", width: 6, length: 5, icon: "expand-outline" },
  { name: "Área gourmet", width: 4, length: 3, icon: "wine-outline" },
  { name: "Área gourmet externa", width: 4, length: 3, icon: "sunny-outline" },
  { name: "Churrasqueira", width: 2.5, length: 2, icon: "flame-outline" },
  { name: "Churrasqueira externa", width: 2.5, length: 2, icon: "flame-outline" },
  { name: "Piscina", width: 4, length: 2.5, icon: "water" },
  { name: "Varanda", width: 3, length: 2, icon: "sunny-outline" },
  { name: "Sacada", width: 3, length: 1.5, icon: "sunny-outline" },
  { name: "Escritório", width: 3, length: 3, icon: "briefcase-outline" },
  { name: "Corredor", width: 1, length: 3, icon: "swap-vertical-outline" },
  { name: "Escada", width: 1.5, length: 3, icon: "trending-up-outline" },
  { name: "Garagem", width: 3, length: 5, icon: "car-outline" },
  { name: "Jardim", width: 3, length: 3, icon: "leaf-outline" },
  { name: "Quintal", width: 4, length: 4, icon: "leaf" },
];

// Recognizes free-text room mentions ("2 quartos", "1 suíte", "sala", "cozinha e 2 banheiros")
// and maps each to a ROOM_TEMPLATES entry, so the person can just describe the house in
// plain Portuguese instead of tapping every chip by hand.
const ROOM_KEYWORDS: { keywords: string[]; templateName: string }[] = [
  { keywords: ["suíte", "suite"], templateName: "Suíte" },
  { keywords: ["quarto", "dormitório", "dormitorio"], templateName: "Quarto" },
  { keywords: ["banheiro", "wc"], templateName: "Banheiro" },
  { keywords: ["lavabo"], templateName: "Lavabo" },
  { keywords: ["cozinha"], templateName: "Cozinha" },
  { keywords: ["conceito aberto", "ambiente integrado", "integrado"], templateName: "Conceito aberto" },
  { keywords: ["sala de estar", "sala de jantar", "sala"], templateName: "Sala" },
  { keywords: ["área gourmet externa", "area gourmet externa", "gourmet externa"], templateName: "Área gourmet externa" },
  { keywords: ["churrasqueira externa", "churrasco externo"], templateName: "Churrasqueira externa" },
  { keywords: ["área gourmet", "area gourmet", "gourmet"], templateName: "Área gourmet" },
  { keywords: ["churrasqueira", "churrasco"], templateName: "Churrasqueira" },
  { keywords: ["piscina"], templateName: "Piscina" },
  { keywords: ["varanda"], templateName: "Varanda" },
  { keywords: ["sacada"], templateName: "Sacada" },
  { keywords: ["escritório", "escritorio", "home office"], templateName: "Escritório" },
  { keywords: ["closet"], templateName: "Closet" },
  { keywords: ["área de serviço", "area de servico", "lavanderia"], templateName: "Área de serviço" },
  { keywords: ["corredor", "hall"], templateName: "Corredor" },
  { keywords: ["escada"], templateName: "Escada" },
  { keywords: ["garagem", "vaga"], templateName: "Garagem" },
  { keywords: ["quintal"], templateName: "Quintal" },
  { keywords: ["jardim"], templateName: "Jardim" },
];
const NUMBER_WORDS: Record<string, number> = { um: 1, uma: 1, dois: 2, duas: 2, três: 3, tres: 3, quatro: 4, cinco: 5, seis: 6 };

function parseHouseDescription(text: string): { name: string; width: number; length: number }[] {
  const found: { name: string; width: number; length: number }[] = [];
  // Split on commas, " e ", line breaks and " com " so "2 quartos, sala e cozinha" becomes 3 chunks.
  const chunks = text
    .toLowerCase()
    .split(/,|\n|\bcom\b|\se\s/)
    .map((c) => c.trim())
    .filter(Boolean);

  chunks.forEach((chunk) => {
    const match = ROOM_KEYWORDS.find((k) => k.keywords.some((kw) => chunk.includes(kw)));
    if (!match) return;
    const template = ROOM_TEMPLATES.find((t) => t.name === match.templateName);
    if (!template) return;
    const numMatch = chunk.match(/\d+/);
    let qty = numMatch ? parseInt(numMatch[0], 10) : 1;
    if (!numMatch) {
      const wordHit = Object.keys(NUMBER_WORDS).find((w) => chunk.includes(w));
      if (wordHit) qty = NUMBER_WORDS[wordHit];
    }
    qty = Math.max(1, Math.min(qty, 10));
    for (let i = 0; i < qty; i++) found.push({ name: template.name, width: template.width, length: template.length });
  });
  return found;
}

export function Builder({
  onDone,
  initial,
}: {
  onDone: (p: { name: string; build_type: string; width: number; length: number; rooms: Room[] }) => void;
  initial?: { name: string; build_type: string; width: number; length: number; rooms: Room[] } | null;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => buildStyles(colors), [colors]);
  const [type, setType] = useState(initial?.build_type || "Casa térrea");
  const [width, setWidth] = useState(String(initial?.width || 8));
  const [length, setLength] = useState(String(initial?.length || 12));
  const [rooms, setRooms] = useState<Room[]>(initial?.rooms?.length ? initial.rooms : [
    { name: "Sala", width: 4, length: 5, x: 0, y: 0 },
    { name: "Cozinha", width: 3, length: 4, x: 4, y: 0 },
    { name: "Quarto", width: 3, length: 3.5, x: 0, y: 5 },
  ]);
  const [projectName, setProjectName] = useState(initial?.name || "Meu projeto");
  const [selectedFloor, setSelectedFloor] = useState(0);

  const totalArea = useMemo(() => (Number(width) || 0) * (Number(length) || 0), [width, length]);
  const usedArea = useMemo(() => rooms.reduce((a, r) => a + r.width * r.length, 0), [rooms]);
  const usedFloors = useMemo(() => Array.from(new Set(rooms.map((r) => r.floor || 0))).sort((a, b) => a - b), [rooms]);

  const addTemplate = (t: (typeof ROOM_TEMPLATES)[number]) => {
    const buildingWidth = Number(width) || 8;
    // Only rooms already on the SAME floor matter for stacking/wrapping —
    // each floor gets its own independent layout, exactly like a real building.
    const sameFloorRooms = rooms.filter((r) => (r.floor || 0) === selectedFloor);
    let x = 0;
    let y = 0;
    if (sameFloorRooms.length) {
      const last = sameFloorRooms[sameFloorRooms.length - 1];
      const lastX = last.x || 0;
      const lastY = last.y || 0;
      // "Current row" = every existing room (on this floor) sitting at the same y as the last one added.
      const currentRow = sameFloorRooms.filter((r) => Math.abs((r.y || 0) - lastY) < 0.01);
      const rowHeight = Math.max(...currentRow.map((r) => r.length || 0));
      if (lastX + last.width + t.width <= buildingWidth + 0.001) {
        // Still fits in the current row, keep going right.
        x = lastX + last.width;
        y = lastY;
      } else {
        // Doesn't fit anymore: wrap to a new row below, back at the left edge.
        x = 0;
        y = lastY + rowHeight;
      }
    }
    setRooms([...rooms, { name: t.name, width: t.width, length: t.length, x, y, floor: selectedFloor }]);
  };
  const removeRoom = (idx: number) => setRooms(rooms.filter((_, i) => i !== idx));
  const updateRoom = (idx: number, key: keyof Room, val: string) => {
    const next = [...rooms];
    const parsed = key === "name" ? val : Number(val.replace(",", ".")) || 0;
    (next[idx] as any)[key] = parsed;
    setRooms(next);
  };
  const setRoomFloor = (idx: number, floor: number) => {
    const next = [...rooms];
    next[idx] = { ...next[idx], floor };
    setRooms(next);
  };

  const [description, setDescription] = useState("");
  const generateFromDescription = () => {
    const parsed = parseHouseDescription(description);
    if (!parsed.length) return;
    let updated = [...rooms];
    parsed.forEach((t) => {
      const buildingWidth = Number(width) || 8;
      const sameFloorRooms = updated.filter((r) => (r.floor || 0) === selectedFloor);
      let x = 0;
      let y = 0;
      if (sameFloorRooms.length) {
        const last = sameFloorRooms[sameFloorRooms.length - 1];
        const lastX = last.x || 0;
        const lastY = last.y || 0;
        const currentRow = sameFloorRooms.filter((r) => Math.abs((r.y || 0) - lastY) < 0.01);
        const rowHeight = Math.max(...currentRow.map((r) => r.length || 0));
        if (lastX + last.width + t.width <= buildingWidth + 0.001) {
          x = lastX + last.width;
          y = lastY;
        } else {
          x = 0;
          y = lastY + rowHeight;
        }
      }
      const room = { name: t.name, width: t.width, length: t.length, x, y, floor: selectedFloor };
      updated = [...updated, room];
    });
    setRooms(updated);
    setDescription("");
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

      <Text style={styles.formTitle}>Descreva sua casa (opcional)</Text>
      <Text style={styles.body}>Escreva do seu jeito e a gente monta os cômodos pra você. Ex.: "2 quartos, sala, cozinha, banheiro e uma suíte"</Text>
      <TextInput
        testID="builder-description"
        value={description}
        onChangeText={setDescription}
        placeholder="Ex.: 2 quartos, sala, cozinha e banheiro"
        placeholderTextColor={colors.dim}
        multiline
        style={styles.descriptionInput}
      />
      <Button testID="builder-generate" title="Gerar cômodos automaticamente" onPress={generateFromDescription} disabled={!description.trim()} />

      <Text style={[styles.formTitle, { marginTop: 26 }]}>Andar</Text>
      <View style={styles.floorWarnBox}>
        <Icon name="alert-circle-outline" size={16} color={colors.brand} />
        <Text style={styles.floorWarnText}>Confira sempre este seletor antes de adicionar um cômodo — é ele que decide se o cômodo vai para o térreo ou para cima, essencial em sobrados.</Text>
      </View>
      <View style={styles.chipRow}>
        {FLOORS.map((f) => (
          <Chip key={f.value} testID={`floor-${f.value}`} label={f.label} active={selectedFloor === f.value} onPress={() => setSelectedFloor(f.value)} />
        ))}
      </View>
      <Text style={styles.floorActiveLabel}>Adicionando em: {FLOORS.find((f) => f.value === selectedFloor)?.label}</Text>

      <Text style={styles.formTitle}>Adicionar cômodo</Text>
      <Text style={styles.body}>Escolha qualquer ambiente da lista — inclusive piscina, área gourmet, churrasqueira e conceito aberto.</Text>
      <View style={styles.chipRow}>
        {ROOM_TEMPLATES.map((t) => (
          <Pressable key={t.name} testID={`add-template-${t.name}`} onPress={() => addTemplate(t)} style={styles.addChip}>
            <Icon name={t.icon} size={14} color={colors.brand} />
            <Text style={styles.addChipText}>{t.name}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.formTitle, { marginTop: 26 }]}>Seus cômodos</Text>
      {rooms.length === 0 && <Text style={styles.body}>Toque em um modelo acima para começar.</Text>}
      {usedFloors.map((floorValue) => (
        <View key={`floor-group-${floorValue}`}>
          {usedFloors.length > 1 && (
            <Text style={styles.floorGroupLabel}>{FLOORS.find((f) => f.value === floorValue)?.label || `Andar ${floorValue}`}</Text>
          )}
          {rooms.map((r, i) => (r.floor || 0) !== floorValue ? null : (
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
              <View style={[styles.chipRow, { marginTop: 10 }]}>
                {FLOORS.map((f) => (
                  <Chip key={f.value} testID={`room-${i}-floor-${f.value}`} label={f.label} active={(r.floor || 0) === f.value} onPress={() => setRoomFloor(i, f.value)} />
                ))}
              </View>
            </View>
          ))}
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
              floor: r.floor || 0,
            })),
          })
        }
      />
    </Screen>
  );
}

function buildStyles(colors: typeof lightColors) {
  return StyleSheet.create({
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
  roomCard: { backgroundColor: colors.card, borderRadius: 14, padding: 14, marginTop: 12, borderWidth: 1, borderColor: colors.line },
  floorGroupLabel: { color: colors.brand, fontWeight: "700", fontSize: 12, letterSpacing: 0.5, marginTop: 18, textTransform: "uppercase" },
  descriptionInput: { backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 14, minHeight: 70, color: colors.ink, textAlignVertical: "top", marginBottom: 12 },
  floorWarnBox: { flexDirection: "row", gap: 8, backgroundColor: colors.pale, borderRadius: 12, padding: 12, marginBottom: 10, alignItems: "flex-start" },
  floorWarnText: { flex: 1, color: colors.brandDark, fontSize: 12, lineHeight: 17 },
  floorActiveLabel: { color: colors.muted, fontSize: 12, marginTop: 8, fontStyle: "italic" },
  roomHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  roomName: { fontWeight: "700", fontSize: 15, color: colors.ink, flex: 1 },
  dimRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  dim: { flex: 1 },
  dimLabel: { color: colors.muted, fontSize: 10, fontWeight: "700", marginBottom: 4 },
  dimInput: { height: 40, borderWidth: 1, borderColor: colors.line, borderRadius: 8, paddingHorizontal: 10, color: colors.ink, fontSize: 14, backgroundColor: colors.card },
  dimReadonly: { height: 40, borderRadius: 8, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  dimReadonlyText: { color: colors.ink, fontWeight: "700", fontSize: 13 },
});
}
