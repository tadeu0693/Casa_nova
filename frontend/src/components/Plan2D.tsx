import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { colors } from "@/src/theme";
import { Button, Header, Icon, Screen } from "@/src/components/UI";
import type { Room } from "@/src/types";

const CANVAS_HEIGHT = 380;
const PADDING = 12;

const ROOM_COLORS = [
  { bg: "#FDE9DE", border: "#E28866" }, // terracotta
  { bg: "#E4EAE4", border: "#8FA88F" }, // sage
  { bg: "#E8F0F2", border: "#6BA3B0" }, // sky
  { bg: "#F5EBD5", border: "#C8A76A" }, // sand
  { bg: "#EDE4F1", border: "#9B7EB5" }, // lilac
  { bg: "#F0E5DE", border: "#B08A72" }, // clay
];

export function Plan2D({
  project,
  onNext,
  onSave,
  saving,
}: {
  project: { name: string; build_type: string; width: number; length: number; rooms: Room[] };
  onNext: () => void;
  onSave: (rooms: Room[]) => void;
  saving?: boolean;
}) {
  const [containerW, setContainerW] = useState(340);
  const [rooms, setRooms] = useState<Room[]>(
    project.rooms.map((r, i) => ({
      ...r,
      x: r.x ?? i * (project.width / Math.max(project.rooms.length, 1)),
      y: r.y ?? 0,
    })),
  );
  const [selected, setSelected] = useState<number>(0);

  const scale = useMemo(() => {
    const availW = containerW - PADDING * 2;
    const availH = CANVAS_HEIGHT - PADDING * 2;
    return Math.min(availW / project.width, availH / project.length);
  }, [containerW, project.width, project.length]);

  const updateRoom = (idx: number, patch: Partial<Room>) => {
    setRooms((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const nudge = (idx: number, key: "width" | "length" | "x" | "y", delta: number) => {
    const r = rooms[idx];
    const next = Math.max(1, ((r as any)[key] || 0) + delta);
    if (key === "width" && next + (r.x || 0) > project.width) return;
    if (key === "length" && next + (r.y || 0) > project.length) return;
    if (key === "x" && (next < 0 || next + r.width > project.width)) return;
    if (key === "y" && (next < 0 || next + r.length > project.length)) return;
    updateRoom(idx, { [key]: Number(next.toFixed(2)) } as any);
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Screen testID="plan2d-screen">
        <Header title="Planta 2D" subtitle={`${project.name} · ${project.width} × ${project.length} m`} />

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <Icon name="hand-right-outline" size={14} color={colors.muted} />
            <Text style={styles.legendText}>Arraste para mover</Text>
          </View>
          <View style={styles.legendItem}>
            <Icon name="resize-outline" size={14} color={colors.muted} />
            <Text style={styles.legendText}>Toque + botões para ajustar</Text>
          </View>
        </View>

        <View
          testID="plan2d-canvas"
          onLayout={(e) => setContainerW(e.nativeEvent.layout.width)}
          style={styles.canvas}
        >
          <Grid width={project.width} length={project.length} scale={scale} />
          {rooms.map((r, i) => (
            <DraggableRoom
              key={`${r.name}-${i}`}
              room={r}
              index={i}
              scale={scale}
              maxWidth={project.width}
              maxLength={project.length}
              selected={selected === i}
              onSelect={() => setSelected(i)}
              onCommit={(patch) => updateRoom(i, patch)}
            />
          ))}
          <Text style={styles.canvasScaleLabel}>Escala: 1m ≈ {Math.round(scale)}px</Text>
        </View>

        {rooms[selected] && (
          <View style={styles.selectedCard} testID="plan2d-selected-card">
            <View style={styles.selectedHead}>
              <View style={[styles.dot, { backgroundColor: ROOM_COLORS[selected % ROOM_COLORS.length].border }]} />
              <Text style={styles.selectedTitle}>{rooms[selected].name}</Text>
              <Text style={styles.selectedMeta}>
                {(rooms[selected].width * rooms[selected].length).toFixed(1)} m²
              </Text>
            </View>
            <View style={styles.ctrlRow}>
              <CtrlPair label="Largura" value={rooms[selected].width} onMinus={() => nudge(selected, "width", -0.5)} onPlus={() => nudge(selected, "width", 0.5)} testID="ctrl-width" />
              <CtrlPair label="Comprimento" value={rooms[selected].length} onMinus={() => nudge(selected, "length", -0.5)} onPlus={() => nudge(selected, "length", 0.5)} testID="ctrl-length" />
            </View>
          </View>
        )}

        <View style={styles.actionsRow}>
          <View style={{ flex: 1 }}>
            <Button testID="plan2d-save" title={saving ? "Salvando..." : "Salvar layout"} onPress={() => onSave(rooms)} secondary disabled={saving} />
          </View>
          <View style={{ flex: 1 }}>
            <Button testID="plan2d-next" title="Calcular materiais" onPress={() => { onSave(rooms); onNext(); }} />
          </View>
        </View>
      </Screen>
    </GestureHandlerRootView>
  );
}

function CtrlPair({ label, value, onMinus, onPlus, testID }: { label: string; value: number; onMinus: () => void; onPlus: () => void; testID: string }) {
  return (
    <View style={styles.ctrlBox}>
      <Text style={styles.ctrlLabel}>{label}</Text>
      <View style={styles.ctrlInner}>
        <Pressable testID={`${testID}-minus`} onPress={onMinus} style={styles.ctrlBtn} hitSlop={8}>
          <Icon name="remove" size={16} color={colors.brand} />
        </Pressable>
        <Text style={styles.ctrlValue}>{value.toFixed(1)}m</Text>
        <Pressable testID={`${testID}-plus`} onPress={onPlus} style={styles.ctrlBtn} hitSlop={8}>
          <Icon name="add" size={16} color={colors.brand} />
        </Pressable>
      </View>
    </View>
  );
}

function Grid({ width, length, scale }: { width: number; length: number; scale: number }) {
  const cols = Math.ceil(width);
  const rows = Math.ceil(length);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: cols + 1 }).map((_, i) => (
        <View key={`v-${i}`} style={[styles.gridLine, { left: PADDING + i * scale, top: PADDING, height: rows * scale, width: 1 }]} />
      ))}
      {Array.from({ length: rows + 1 }).map((_, i) => (
        <View key={`h-${i}`} style={[styles.gridLine, { top: PADDING + i * scale, left: PADDING, width: cols * scale, height: 1 }]} />
      ))}
    </View>
  );
}

function DraggableRoom({
  room,
  index,
  scale,
  maxWidth,
  maxLength,
  selected,
  onSelect,
  onCommit,
}: {
  room: Room;
  index: number;
  scale: number;
  maxWidth: number;
  maxLength: number;
  selected: boolean;
  onSelect: () => void;
  onCommit: (patch: Partial<Room>) => void;
}) {
  const startX = (room.x || 0) * scale;
  const startY = (room.y || 0) * scale;
  const tx = useSharedValue(startX);
  const ty = useSharedValue(startY);

  // Sync when props change (external edits)
  if (Math.abs(tx.value - startX) > 0.5) tx.value = startX;
  if (Math.abs(ty.value - startY) > 0.5) ty.value = startY;

  const color = ROOM_COLORS[index % ROOM_COLORS.length];

  const commit = (nx: number, ny: number) => {
    const newX = Math.max(0, Math.min(maxWidth - room.width, nx / scale));
    const newY = Math.max(0, Math.min(maxLength - room.length, ny / scale));
    onCommit({ x: Number(newX.toFixed(2)), y: Number(newY.toFixed(2)) });
  };

  const pan = Gesture.Pan()
    .onStart(() => {
      runOnJS(onSelect)();
    })
    .onUpdate((e) => {
      const nx = startX + e.translationX;
      const ny = startY + e.translationY;
      const maxTx = (maxWidth - room.width) * scale;
      const maxTy = (maxLength - room.length) * scale;
      tx.value = Math.max(0, Math.min(maxTx, nx));
      ty.value = Math.max(0, Math.min(maxTy, ny));
    })
    .onEnd(() => {
      runOnJS(commit)(tx.value, ty.value);
    });

  const tap = Gesture.Tap().onEnd(() => runOnJS(onSelect)());
  const composed = Gesture.Simultaneous(pan, tap);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value + PADDING }, { translateY: ty.value + PADDING }],
  }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.View
        style={[
          styles.room,
          {
            width: room.width * scale,
            height: room.length * scale,
            backgroundColor: color.bg,
            borderColor: selected ? colors.brand : color.border,
            borderWidth: selected ? 2.5 : 1.5,
          },
          animatedStyle,
        ]}
      >
        <Text style={styles.roomLabel}>{room.name}</Text>
        <Text style={styles.roomDim}>{room.width}×{room.length}m</Text>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: "row", gap: 18, marginBottom: 10 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendText: { color: colors.muted, fontSize: 11, fontWeight: "600" },
  canvas: {
    height: CANVAS_HEIGHT,
    backgroundColor: "#F1EFEA",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: "hidden",
    marginBottom: 16,
  },
  gridLine: { position: "absolute", backgroundColor: "#D9D5CE" },
  canvasScaleLabel: { position: "absolute", bottom: 8, right: 12, fontSize: 10, color: colors.muted, fontWeight: "600" },
  room: {
    position: "absolute",
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  roomLabel: { color: colors.ink, fontSize: 12, fontWeight: "700", textAlign: "center", paddingHorizontal: 4 },
  roomDim: { color: colors.ink, opacity: 0.6, fontSize: 10, marginTop: 2, fontWeight: "600" },
  selectedCard: { backgroundColor: colors.white, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.line },
  selectedHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  selectedTitle: { color: colors.ink, fontWeight: "700", fontSize: 15, flex: 1 },
  selectedMeta: { color: colors.brand, fontWeight: "700", fontSize: 13 },
  ctrlRow: { flexDirection: "row", gap: 10 },
  ctrlBox: { flex: 1, backgroundColor: colors.card, borderRadius: 10, padding: 10 },
  ctrlLabel: { color: colors.muted, fontSize: 10, fontWeight: "700", marginBottom: 8 },
  ctrlInner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  ctrlBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.pale, alignItems: "center", justifyContent: "center" },
  ctrlValue: { color: colors.ink, fontWeight: "700", fontSize: 14 },
  actionsRow: { flexDirection: "row", gap: 10, marginTop: 4 },
});
