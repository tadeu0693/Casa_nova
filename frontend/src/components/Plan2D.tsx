import { useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useTheme } from "@/src/utils/ThemeContext";
import type { lightColors } from "@/src/theme";
import { Button, Header, Icon, Screen } from "@/src/components/UI";
import type { Opening, OpeningKind, Room, WallSide } from "@/src/types";

const CANVAS_HEIGHT = 380;
const PADDING = 12;
const ALL_WALLS: WallSide[] = ["n", "s", "w", "e"];
const MIN_ROOM = 1.2; // metres — below this a room stops being a room

// Room fills are fixed light pastels in BOTH themes, so the text on top of them must be
// a fixed dark tone too. Using colors.ink made the labels near-white on pastel in dark
// mode — the room names became impossible to read.
const ROOM_INK = "#241F1A";
const WALL_INK = "#4A4038";

const ROOM_COLORS = [
  { bg: "#FDE9DE", border: "#E28866" }, // terracotta
  { bg: "#E4EAE4", border: "#8FA88F" }, // sage
  { bg: "#E8F0F2", border: "#6BA3B0" }, // sky
  { bg: "#F5EBD5", border: "#C8A76A" }, // sand
  { bg: "#EDE4F1", border: "#9B7EB5" }, // lilac
  { bg: "#F0E5DE", border: "#B08A72" }, // clay
];

// Ready-made rooms: each one lands already closed on all four walls, at a sane default
// size the person can then stretch by the handles on its edges.
const ROOM_KIT: { name: string; w: number; l: number; icon: any }[] = [
  { name: "Quarto", w: 3, l: 3, icon: "bed-outline" },
  { name: "Sala", w: 4, l: 3.5, icon: "tv-outline" },
  { name: "Cozinha", w: 3, l: 2.5, icon: "restaurant-outline" },
  { name: "Banheiro", w: 2, l: 1.8, icon: "water-outline" },
  { name: "Suíte", w: 3.5, l: 3.5, icon: "bed-outline" },
  { name: "Varanda", w: 3, l: 1.8, icon: "sunny-outline" },
  { name: "Garagem", w: 3, l: 5, icon: "car-outline" },
];

const OPENING_KIT: { kind: OpeningKind; label: string; width: number; icon: any }[] = [
  { kind: "porta", label: "Porta", width: 0.9, icon: "log-in-outline" },
  { kind: "janela", label: "Janela", width: 1.2, icon: "browsers-outline" },
];

const WALL_LABEL: Record<WallSide, string> = { n: "Cima", s: "Baixo", w: "Esq.", e: "Dir." };

function wallsOf(r: Room): WallSide[] {
  return r.walls && r.walls.length ? r.walls : ALL_WALLS;
}
function openingsOf(r: Room): Opening[] {
  return r.openings || [];
}
function newId() {
  return Math.random().toString(36).slice(2, 9);
}

/** Geometry of one wall of a room, in metres. */
function wallRect(r: Room, side: WallSide) {
  const x = r.x || 0;
  const y = r.y || 0;
  if (side === "n") return { x1: x, y1: y, x2: x + r.width, y2: y, horizontal: true, len: r.width };
  if (side === "s") return { x1: x, y1: y + r.length, x2: x + r.width, y2: y + r.length, horizontal: true, len: r.width };
  if (side === "w") return { x1: x, y1: y, x2: x, y2: y + r.length, horizontal: false, len: r.length };
  return { x1: x + r.width, y1: y, x2: x + r.width, y2: y + r.length, horizontal: false, len: r.length };
}

export function Plan2D({
  project,
  onNext,
  onSave,
  saving,
  onView3D,
}: {
  project: { name: string; build_type: string; width: number; length: number; rooms: Room[] };
  onNext: () => void;
  onSave: (rooms: Room[]) => void;
  saving?: boolean;
  onView3D?: () => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => buildStyles(colors), [colors]);
  const [containerW, setContainerW] = useState(340);
  const [rooms, setRooms] = useState<Room[]>(
    project.rooms.map((r, i) => ({
      ...r,
      x: r.x ?? i * (project.width / Math.max(project.rooms.length, 1)),
      y: r.y ?? 0,
      floor: r.floor || 0,
      walls: r.walls && r.walls.length ? r.walls : [...ALL_WALLS],
      openings: r.openings || [],
    })),
  );
  const floors = useMemo(() => {
    const set = Array.from(new Set(rooms.map((r) => r.floor || 0))).sort((a, b) => a - b);
    return set.length ? set : [0];
  }, [rooms]);
  const [activeFloor, setActiveFloor] = useState(floors[0] ?? 0);
  const visibleIndices = useMemo(
    () => rooms.map((_, i) => i).filter((i) => (rooms[i].floor || 0) === activeFloor),
    [rooms, activeFloor],
  );
  const [selected, setSelected] = useState<number>(visibleIndices[0] ?? 0);
  // What the contextual menu points at: a whole room, or one specific wall of it.
  const [menu, setMenu] = useState<{ index: number; side?: WallSide; x: number; y: number } | null>(null);
  const [history, setHistory] = useState<Room[][]>([]);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<any>(null);

  const scale = useMemo(() => {
    const availW = containerW - PADDING * 2;
    const availH = CANVAS_HEIGHT - PADDING * 2;
    return Math.min(availW / project.width, availH / project.length);
  }, [containerW, project.width, project.length]);

  const say = (msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2400);
  };

  const snapshot = () => setHistory((h) => [...h.slice(-19), rooms]); // last 20 is plenty for "oops"

  const updateRoom = (idx: number, patch: Partial<Room>) => {
    snapshot();
    setRooms((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const undo = () => {
    setHistory((h) => {
      if (!h.length) return h;
      setRooms(h[h.length - 1]);
      return h.slice(0, -1);
    });
    setMenu(null);
  };

  const selectFloor = (f: number) => {
    setActiveFloor(f);
    setMenu(null);
    const firstOnFloor = rooms.findIndex((r) => (r.floor || 0) === f);
    setSelected(firstOnFloor >= 0 ? firstOnFloor : 0);
  };

  const nudge = (idx: number, key: "width" | "length", delta: number) => {
    const r = rooms[idx];
    const next = Math.max(MIN_ROOM, ((r as any)[key] || 0) + delta);
    if (key === "width" && next + (r.x || 0) > project.width) return;
    if (key === "length" && next + (r.y || 0) > project.length) return;
    updateRoom(idx, { [key]: Number(next.toFixed(2)) } as any);
  };

  // ---------- ETAPA 1: soltar um cômodo pronto na planta ----------
  const addRoomAt = (kit: (typeof ROOM_KIT)[number], mx: number, my: number) => {
    const w = Math.min(kit.w, project.width);
    const l = Math.min(kit.l, project.length);
    const x = Math.max(0, Math.min(project.width - w, mx - w / 2));
    const y = Math.max(0, Math.min(project.length - l, my - l / 2));
    snapshot();
    const room: Room = {
      name: kit.name,
      width: w,
      length: l,
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2)),
      floor: activeFloor,
      walls: [...ALL_WALLS],
      openings: [],
    };
    setRooms((prev) => {
      setSelected(prev.length);
      return [...prev, room];
    });
    say(`${kit.name} adicionado · puxe as bolinhas para redimensionar`);
  };

  // ---------- ETAPA 4: encaixar porta/janela na parede mais próxima ----------
  const dropOpening = (kind: OpeningKind, width: number, mx: number, my: number) => {
    let best: { idx: number; side: WallSide; pos: number; dist: number } | null = null;
    visibleIndices.forEach((idx) => {
      const r = rooms[idx];
      wallsOf(r).forEach((side) => {
        const wr = wallRect(r, side);
        let dist: number;
        let pos: number;
        if (wr.horizontal) {
          const clampedX = Math.max(wr.x1, Math.min(wr.x2, mx));
          dist = Math.hypot(mx - clampedX, my - wr.y1);
          pos = wr.len ? (clampedX - wr.x1) / wr.len : 0.5;
        } else {
          const clampedY = Math.max(wr.y1, Math.min(wr.y2, my));
          dist = Math.hypot(mx - wr.x1, my - clampedY);
          pos = wr.len ? (clampedY - wr.y1) / wr.len : 0.5;
        }
        if (!best || dist < best.dist) best = { idx, side, pos, dist };
      });
    });
    // A drop far from every wall is a miss, not a silent snap to the far side of the house.
    if (!best) {
      say("Adicione um cômodo antes de colocar portas e janelas");
      return;
    }
    const target = best as { idx: number; side: WallSide; pos: number; dist: number };
    if (target.dist > 1.6) {
      say("Solte em cima de uma parede para encaixar");
      return;
    }
    const room = rooms[target.idx];
    const wallLen = wallRect(room, target.side).len;
    const openW = Math.min(width, wallLen - 0.4);
    if (openW < 0.5) {
      say("Essa parede é curta demais para essa abertura");
      return;
    }
    // Keep the opening fully inside the wall, and off the corners.
    const half = openW / 2 / wallLen;
    const pos = Math.max(half + 0.04, Math.min(1 - half - 0.04, target.pos));
    const opening: Opening = { id: newId(), side: target.side, kind, pos, width: Number(openW.toFixed(2)) };
    snapshot();
    setRooms((prev) =>
      prev.map((r, i) => (i === target.idx ? { ...r, openings: [...openingsOf(r), opening] } : r)),
    );
    setSelected(target.idx);
    say(`${kind === "porta" ? "Porta" : "Janela"} encaixada em ${room.name}`);
  };

  // ---------- ETAPA 3: apagar uma parede específica ----------
  const removeWall = (idx: number, side: WallSide) => {
    const r = rooms[idx];
    const remaining = wallsOf(r).filter((s) => s !== side);
    snapshot();
    setRooms((prev) =>
      prev.map((room, i) =>
        i === idx
          ? { ...room, walls: remaining, openings: openingsOf(room).filter((o) => o.side !== side) }
          : room,
      ),
    );
    setMenu(null);
    say("Parede removida · o piso e as outras paredes continuam");
  };
  const restoreWall = (idx: number, side: WallSide) => {
    const r = rooms[idx];
    if (wallsOf(r).includes(side)) return;
    snapshot();
    setRooms((prev) => prev.map((room, i) => (i === idx ? { ...room, walls: [...wallsOf(r), side] } : room)));
    setMenu(null);
  };

  const rotateRoom = (idx: number) => {
    const r = rooms[idx];
    const nw = r.length;
    const nl = r.width;
    if (nw > project.width || nl > project.length) {
      say("Não cabe girado dentro do terreno");
      setMenu(null);
      return;
    }
    const x = Math.max(0, Math.min(project.width - nw, r.x || 0));
    const y = Math.max(0, Math.min(project.length - nl, r.y || 0));
    // Openings follow the rotation: a wall on the north edge becomes the east edge.
    const turn: Record<WallSide, WallSide> = { n: "e", e: "s", s: "w", w: "n" };
    updateRoom(idx, {
      width: Number(nw.toFixed(2)),
      length: Number(nl.toFixed(2)),
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2)),
      walls: wallsOf(r).map((s) => turn[s]),
      openings: openingsOf(r).map((o) => ({ ...o, side: turn[o.side] })),
    });
    setMenu(null);
  };

  const deleteRoom = (idx: number) => {
    snapshot();
    setRooms((prev) => prev.filter((_, i) => i !== idx));
    setMenu(null);
    setSelected(0);
    say("Cômodo excluído");
  };

  const removeOpening = (idx: number, openingId: string) => {
    snapshot();
    setRooms((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, openings: openingsOf(r).filter((o) => o.id !== openingId) } : r)),
    );
    say("Abertura removida");
  };

  const canvasRef = useRef<View>(null);
  const canvasFrame = useRef({ x: 0, y: 0 });
  const measureCanvas = () => {
    (canvasRef.current as any)?.measureInWindow?.((x: number, y: number) => {
      canvasFrame.current = { x, y };
    });
  };

  // A drop lands in metres, from a screen point relative to the canvas.
  const dropAt = (
    screenX: number,
    screenY: number,
    payload: { kit?: (typeof ROOM_KIT)[number]; opening?: (typeof OPENING_KIT)[number] },
  ) => {
    const localX = screenX - canvasFrame.current.x - PADDING;
    const localY = screenY - canvasFrame.current.y - PADDING;
    const insideX = localX >= -30 && localX <= project.width * scale + 30;
    const insideY = localY >= -30 && localY <= project.length * scale + 30;
    if (!insideX || !insideY) {
      say("Solte dentro da planta");
      return;
    }
    const mx = localX / scale;
    const my = localY / scale;
    if (payload.kit) addRoomAt(payload.kit, mx, my);
    else if (payload.opening) dropOpening(payload.opening.kind, payload.opening.width, mx, my);
  };

  const selectedRoom = rooms[selected];

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Screen testID="plan2d-screen">
        <Header title="Planta 2D" subtitle={`${project.name} · ${project.width} × ${project.length} m`} />

        {onView3D ? (
          <Pressable testID="plan2d-view3d" onPress={() => { onSave(rooms); onView3D(); }} style={styles.view3dBar}>
            <View style={styles.view3dIcon}>
              <Icon name="cube-outline" size={18} color={colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.view3dTitle}>Ver em 3D</Text>
              <Text style={styles.view3dText}>Maquete interativa · gire, aproxime e explore</Text>
            </View>
            <Icon name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        ) : null}

        {floors.length > 1 && (
          <View style={styles.floorTabs}>
            {floors.map((f) => (
              <Pressable key={f} testID={`plan2d-floor-${f}`} onPress={() => selectFloor(f)} style={[styles.floorTab, activeFloor === f && styles.floorTabActive]}>
                <Text style={[styles.floorTabText, activeFloor === f && styles.floorTabTextActive]}>{f === 0 ? "Térreo" : `${f}º Andar`}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* ---------- Paleta: cômodos prontos e aberturas ---------- */}
        <Text style={styles.paletteHint}>Segure e arraste para dentro da planta</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.palette} contentContainerStyle={styles.paletteInner}>
          {ROOM_KIT.map((kit) => (
            <PaletteChip
              key={kit.name}
              testID={`palette-room-${kit.name}`}
              icon={kit.icon}
              label={kit.name}
              sub={`${kit.w}×${kit.l}m`}
              styles={styles}
              colors={colors}
              onDrop={(sx, sy) => dropAt(sx, sy, { kit })}
              onTap={() => addRoomAt(kit, project.width / 2, project.length / 2)}
            />
          ))}
          {OPENING_KIT.map((op) => (
            <PaletteChip
              key={op.kind}
              testID={`palette-opening-${op.kind}`}
              icon={op.icon}
              label={op.label}
              sub={`${op.width}m`}
              accent
              styles={styles}
              colors={colors}
              onDrop={(sx, sy) => dropAt(sx, sy, { opening: op })}
              onTap={() => say(`Arraste a ${op.label.toLowerCase()} até uma parede`)}
            />
          ))}
        </ScrollView>

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <Icon name="hand-right-outline" size={14} color={colors.muted} />
            <Text style={styles.legendText}>Arraste para mover</Text>
          </View>
          <View style={styles.legendItem}>
            <Icon name="ellipsis-horizontal-circle-outline" size={14} color={colors.muted} />
            <Text style={styles.legendText}>Toque para o menu</Text>
          </View>
          <Pressable testID="plan2d-undo" onPress={undo} disabled={!history.length} style={[styles.undoBtn, !history.length && styles.undoBtnDisabled]}>
            <Icon name="arrow-undo-outline" size={14} color={history.length ? colors.brand : colors.dim} />
            <Text style={[styles.undoText, !history.length && styles.undoTextDisabled]}>Desfazer</Text>
          </Pressable>
        </View>

        <View
          ref={canvasRef}
          testID="plan2d-canvas"
          onLayout={(e) => {
            setContainerW(e.nativeEvent.layout.width);
            // Absolute position is needed to translate a palette drop into plan metres.
            measureCanvas();
          }}
          style={styles.canvas}
        >
          <Grid width={project.width} length={project.length} scale={scale} styles={styles} />
          {visibleIndices.map((i) => (
            <DraggableRoom
              key={`room-${i}-${rooms[i].name}`}
              room={rooms[i]}
              index={i}
              scale={scale}
              maxWidth={project.width}
              maxLength={project.length}
              selected={selected === i}
              onSelect={() => setSelected(i)}
              onCommit={(patch) => updateRoom(i, patch)}
              onBeforeResize={snapshot}
              onMenu={(x, y, side) => {
                setSelected(i);
                setMenu({ index: i, side, x, y });
              }}
              styles={styles}
              colors={colors}
            />
          ))}
          <Text style={styles.canvasScaleLabel}>Escala: 1m ≈ {Math.round(scale)}px</Text>

          {/* ---------- ETAPA 2: menu de contexto ---------- */}
          {menu && rooms[menu.index] ? (
            <ContextMenu
              styles={styles}
              colors={colors}
              room={rooms[menu.index]}
              side={menu.side}
              x={Math.max(6, Math.min(menu.x, containerW - 196))}
              y={Math.max(6, Math.min(menu.y, CANVAS_HEIGHT - 152))}
              onClose={() => setMenu(null)}
              onRotate={() => rotateRoom(menu.index)}
              onDelete={() => (menu.side ? removeWall(menu.index, menu.side) : deleteRoom(menu.index))}
              onRestore={() => menu.side && restoreWall(menu.index, menu.side)}
              onMove={() => {
                setMenu(null);
                say("Arraste o cômodo para movê-lo");
              }}
            />
          ) : null}
        </View>

        {toast ? (
          <View style={styles.toast} testID="plan2d-toast">
            <Text style={styles.toastText}>{toast}</Text>
          </View>
        ) : null}

        {selectedRoom && (
          <View style={styles.selectedCard} testID="plan2d-selected-card">
            <View style={styles.selectedHead}>
              <View style={[styles.dot, { backgroundColor: ROOM_COLORS[selected % ROOM_COLORS.length].border }]} />
              <Text style={styles.selectedTitle}>{selectedRoom.name}</Text>
              <Text style={styles.selectedMeta}>{(selectedRoom.width * selectedRoom.length).toFixed(1)} m²</Text>
            </View>
            <View style={styles.ctrlRow}>
              <CtrlPair colors={colors} styles={styles} label="Largura" value={selectedRoom.width} onMinus={() => nudge(selected, "width", -0.5)} onPlus={() => nudge(selected, "width", 0.5)} testID="ctrl-width" />
              <CtrlPair colors={colors} styles={styles} label="Comprimento" value={selectedRoom.length} onMinus={() => nudge(selected, "length", -0.5)} onPlus={() => nudge(selected, "length", 0.5)} testID="ctrl-length" />
            </View>

            <View style={styles.wallRow}>
              <Text style={styles.wallRowLabel}>Paredes</Text>
              {ALL_WALLS.map((side) => {
                const on = wallsOf(selectedRoom).includes(side);
                return (
                  <Pressable
                    key={side}
                    testID={`wall-toggle-${side}`}
                    onPress={() => (on ? removeWall(selected, side) : restoreWall(selected, side))}
                    style={[styles.wallPill, on && styles.wallPillOn]}
                  >
                    <Text style={[styles.wallPillText, on && styles.wallPillTextOn]}>{WALL_LABEL[side]}</Text>
                  </Pressable>
                );
              })}
            </View>

            {openingsOf(selectedRoom).length ? (
              <View style={styles.openingList}>
                {openingsOf(selectedRoom).map((o) => (
                  <Pressable key={o.id} testID={`opening-${o.id}`} onPress={() => removeOpening(selected, o.id)} style={styles.openingChip}>
                    <Icon name={o.kind === "porta" ? "log-in-outline" : "browsers-outline"} size={13} color={colors.brand} />
                    <Text style={styles.openingChipText}>
                      {o.kind === "porta" ? "Porta" : "Janela"} · {WALL_LABEL[o.side]} · {o.width.toFixed(2)}m
                    </Text>
                    <Icon name="close" size={13} color={colors.muted} />
                  </Pressable>
                ))}
              </View>
            ) : null}
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

/** A palette item that can be tapped (adds at the centre) or dragged onto the plan. */
function PaletteChip({
  icon,
  label,
  sub,
  accent,
  onDrop,
  onTap,
  styles,
  colors,
  testID,
}: {
  icon: any;
  label: string;
  sub: string;
  accent?: boolean;
  onDrop: (screenX: number, screenY: number) => void;
  onTap: () => void;
  styles: any;
  colors: typeof lightColors;
  testID: string;
}) {
  const dx = useSharedValue(0);
  const dy = useSharedValue(0);
  const dragging = useSharedValue(0);

  const pan = Gesture.Pan()
    // A short hold before the drag starts, so scrolling the palette sideways still works.
    .activateAfterLongPress(140)
    .onUpdate((e) => {
      dragging.value = 1;
      dx.value = e.translationX;
      dy.value = e.translationY;
    })
    .onEnd((e) => {
      dragging.value = 0;
      dx.value = 0;
      dy.value = 0;
      runOnJS(onDrop)(e.absoluteX, e.absoluteY);
    });
  const tap = Gesture.Tap().onEnd(() => runOnJS(onTap)());
  const gesture = Gesture.Exclusive(pan, tap);

  const ghost = useAnimatedStyle(() => ({
    transform: [{ translateX: dx.value }, { translateY: dy.value }, { scale: dragging.value ? 1.08 : 1 }],
    opacity: dragging.value ? 0.92 : 1,
    zIndex: dragging.value ? 50 : 1,
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View testID={testID} style={[styles.chip, accent && styles.chipAccent, ghost]}>
        <Icon name={icon} size={16} color={accent ? colors.white : colors.brand} />
        <Text style={[styles.chipText, accent && styles.chipTextAccent]}>{label}</Text>
        <Text style={[styles.chipSub, accent && styles.chipTextAccent]}>{sub}</Text>
      </Animated.View>
    </GestureDetector>
  );
}

function ContextMenu({
  room,
  side,
  x,
  y,
  onClose,
  onRotate,
  onDelete,
  onRestore,
  onMove,
  styles,
  colors,
}: {
  room: Room;
  side?: WallSide;
  x: number;
  y: number;
  onClose: () => void;
  onRotate: () => void;
  onDelete: () => void;
  onRestore: () => void;
  onMove: () => void;
  styles: any;
  colors: typeof lightColors;
}) {
  const wallExists = side ? wallsOf(room).includes(side) : true;
  return (
    <View testID="plan2d-context-menu" style={[styles.menu, { left: x, top: y }]}>
      <View style={styles.menuHead}>
        <Text style={styles.menuTitle} numberOfLines={1}>
          {side ? `Parede ${WALL_LABEL[side].toLowerCase()} · ${room.name}` : room.name}
        </Text>
        <Pressable testID="menu-close" onPress={onClose} hitSlop={10}>
          <Icon name="close" size={15} color={colors.muted} />
        </Pressable>
      </View>
      {side ? (
        wallExists ? (
          <MenuItem testID="menu-delete-wall" icon="trash-outline" label="Apagar esta parede" danger onPress={onDelete} styles={styles} colors={colors} />
        ) : (
          <MenuItem testID="menu-restore-wall" icon="add-circle-outline" label="Recolocar esta parede" onPress={onRestore} styles={styles} colors={colors} />
        )
      ) : (
        <>
          <MenuItem testID="menu-move" icon="move-outline" label="Mover" onPress={onMove} styles={styles} colors={colors} />
          <MenuItem testID="menu-rotate" icon="sync-outline" label="Girar 90°" onPress={onRotate} styles={styles} colors={colors} />
          <MenuItem testID="menu-delete-room" icon="trash-outline" label="Excluir cômodo" danger onPress={onDelete} styles={styles} colors={colors} />
        </>
      )}
    </View>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
  danger,
  testID,
  styles,
  colors,
}: {
  icon: any;
  label: string;
  onPress: () => void;
  danger?: boolean;
  testID: string;
  styles: any;
  colors: typeof lightColors;
}) {
  return (
    <Pressable testID={testID} onPress={onPress} style={styles.menuItem}>
      <Icon name={icon} size={15} color={danger ? colors.error : colors.ink} />
      <Text style={[styles.menuItemText, danger ? { color: colors.error } : null]}>{label}</Text>
    </Pressable>
  );
}

function CtrlPair({ label, value, onMinus, onPlus, testID, colors, styles }: { label: string; value: number; onMinus: () => void; onPlus: () => void; testID: string; colors: typeof lightColors; styles: any }) {
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

function Grid({ width, length, scale, styles }: { width: number; length: number; scale: number; styles: any }) {
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
  onBeforeResize,
  onMenu,
  colors,
  styles,
}: {
  room: Room;
  index: number;
  scale: number;
  maxWidth: number;
  maxLength: number;
  selected: boolean;
  onSelect: () => void;
  onCommit: (patch: Partial<Room>) => void;
  onBeforeResize: () => void;
  onMenu: (x: number, y: number, side?: WallSide) => void;
  colors: typeof lightColors;
  styles: any;
}) {
  const startX = (room.x || 0) * scale;
  const startY = (room.y || 0) * scale;
  const tx = useSharedValue(startX);
  const ty = useSharedValue(startY);

  // Sync when props change (external edits)
  if (Math.abs(tx.value - startX) > 0.5) tx.value = startX;
  if (Math.abs(ty.value - startY) > 0.5) ty.value = startY;

  const color = ROOM_COLORS[index % ROOM_COLORS.length];
  const boxW = room.width * scale;
  const boxH = room.length * scale;

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

  const openMenu = () => onMenu(startX + boxW / 2 - 60, startY + boxH + 10);
  const tap = Gesture.Tap().onEnd(() => {
    runOnJS(onSelect)();
    runOnJS(openMenu)();
  });
  const composed = Gesture.Simultaneous(pan, tap);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value + PADDING }, { translateY: ty.value + PADDING }],
  }));

  // Type scales with the box: a 2x2 m room on a 25 m lot is barely 24 px wide, and a
  // fixed 12 px label simply cannot fit inside it.
  const labelSize = Math.max(8, Math.min(12, Math.floor(Math.min(boxW / 5.2, boxH / 3.2))));
  const showDim = boxH > 42 && boxW > 52;
  const walls = wallsOf(room);
  const openings = openingsOf(room);

  // ---------- ETAPA 1: alças de redimensionar ----------
  const resize = (side: WallSide, deltaPx: number) => {
    const d = deltaPx / scale;
    if (side === "e") {
      const w = Math.max(MIN_ROOM, Math.min(maxWidth - (room.x || 0), room.width + d));
      onCommit({ width: Number(w.toFixed(2)) });
    } else if (side === "s") {
      const l = Math.max(MIN_ROOM, Math.min(maxLength - (room.y || 0), room.length + d));
      onCommit({ length: Number(l.toFixed(2)) });
    } else if (side === "w") {
      // Dragging the left edge moves x and changes width at the same time.
      const move = Math.max(-(room.x || 0), Math.min(room.width - MIN_ROOM, d));
      onCommit({ x: Number(((room.x || 0) + move).toFixed(2)), width: Number((room.width - move).toFixed(2)) });
    } else {
      const move = Math.max(-(room.y || 0), Math.min(room.length - MIN_ROOM, d));
      onCommit({ y: Number(((room.y || 0) + move).toFixed(2)), length: Number((room.length - move).toFixed(2)) });
    }
  };

  return (
    <GestureDetector gesture={composed}>
      <Animated.View
        style={[
          styles.room,
          {
            width: boxW,
            height: boxH,
            backgroundColor: color.bg,
            borderColor: selected ? colors.brand : "transparent",
            borderWidth: selected ? 2 : 0,
          },
          animatedStyle,
        ]}
      >
        {/* Paredes desenhadas uma a uma: cada uma é tocável e pode ser apagada sozinha. */}
        {ALL_WALLS.map((side) => (
          <WallStrip
            key={side}
            side={side}
            present={walls.includes(side)}
            boxW={boxW}
            boxH={boxH}
            color={color.border}
            openings={openings.filter((o) => o.side === side)}
            roomW={room.width}
            roomL={room.length}
            styles={styles}
            onPress={() => onMenu(startX + boxW / 2 - 60, startY + boxH + 10, side)}
          />
        ))}

        <Text
          style={[styles.roomLabel, { fontSize: labelSize }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {room.name}
        </Text>
        {showDim ? (
          <Text style={[styles.roomDim, { fontSize: labelSize - 2 }]} numberOfLines={1}>
            {room.width}×{room.length}m
          </Text>
        ) : null}

        {selected ? (
          <>
            <ResizeHandle side="e" boxW={boxW} boxH={boxH} styles={styles} onBefore={onBeforeResize} onResize={(d) => resize("e", d)} />
            <ResizeHandle side="s" boxW={boxW} boxH={boxH} styles={styles} onBefore={onBeforeResize} onResize={(d) => resize("s", d)} />
            <ResizeHandle side="w" boxW={boxW} boxH={boxH} styles={styles} onBefore={onBeforeResize} onResize={(d) => resize("w", d)} />
            <ResizeHandle side="n" boxW={boxW} boxH={boxH} styles={styles} onBefore={onBeforeResize} onResize={(d) => resize("n", d)} />
          </>
        ) : null}
      </Animated.View>
    </GestureDetector>
  );
}

/** One wall drawn as segments, with a real gap wherever a door or window sits. */
function WallStrip({
  side,
  present,
  boxW,
  boxH,
  color,
  openings,
  roomW,
  roomL,
  onPress,
  styles,
}: {
  side: WallSide;
  present: boolean;
  boxW: number;
  boxH: number;
  color: string;
  openings: Opening[];
  roomW: number;
  roomL: number;
  onPress: () => void;
  styles: any;
}) {
  const horizontal = side === "n" || side === "s";
  const lenPx = horizontal ? boxW : boxH;
  const lenM = horizontal ? roomW : roomL;
  const T = 3;

  // Gaps in normalised 0..1 coordinates along the wall.
  const gaps = openings
    .map((o) => {
      const halfRatio = o.width / 2 / Math.max(lenM, 0.01);
      return { from: Math.max(0, o.pos - halfRatio), to: Math.min(1, o.pos + halfRatio), kind: o.kind };
    })
    .sort((a, b) => a.from - b.from);

  const segments: { from: number; to: number }[] = [];
  let cursor = 0;
  gaps.forEach((g) => {
    if (g.from > cursor) segments.push({ from: cursor, to: g.from });
    cursor = Math.max(cursor, g.to);
  });
  if (cursor < 1) segments.push({ from: cursor, to: 1 });

  const edge: any = horizontal
    ? { [side === "n" ? "top" : "bottom"]: 0, height: T }
    : { [side === "w" ? "left" : "right"]: 0, width: T };
  const hit: any = horizontal
    ? { left: 0, width: lenPx, height: 16, [side === "n" ? "top" : "bottom"]: -6 }
    : { top: 0, height: lenPx, width: 16, [side === "w" ? "left" : "right"]: -6 };

  return (
    <>
      {/* Faixa tocável um pouco mais larga que a parede, para caber no dedo. */}
      <Pressable testID={`wall-${side}`} onPress={onPress} hitSlop={4} style={[styles.wallHit, hit]} />
      {present ? (
        segments.map((s, i) => (
          <View
            key={`${side}-seg-${i}`}
            pointerEvents="none"
            style={[
              styles.wallSeg,
              edge,
              { backgroundColor: color },
              horizontal
                ? { left: s.from * lenPx, width: Math.max(0, (s.to - s.from) * lenPx) }
                : { top: s.from * lenPx, height: Math.max(0, (s.to - s.from) * lenPx) },
            ]}
          />
        ))
      ) : (
        // Parede apagada: fica um tracinho fantasma, para a pessoa saber que ali é
        // passagem aberta e não um erro de desenho.
        <View
          pointerEvents="none"
          style={[
            styles.wallGhost,
            edge,
            horizontal ? { left: 0, width: lenPx } : { top: 0, height: lenPx },
          ]}
        />
      )}
      {/* Marcação da abertura: porta em branco, janela em vidro. */}
      {present
        ? gaps.map((g, i) => (
            <View
              key={`${side}-gap-${i}`}
              pointerEvents="none"
              style={[
                styles.opening,
                edge,
                g.kind === "porta" ? styles.openingDoor : styles.openingWindow,
                horizontal
                  ? { left: g.from * lenPx, width: Math.max(2, (g.to - g.from) * lenPx) }
                  : { top: g.from * lenPx, height: Math.max(2, (g.to - g.from) * lenPx) },
              ]}
            />
          ))
        : null}
    </>
  );
}

function ResizeHandle({
  side,
  boxW,
  boxH,
  onResize,
  onBefore,
  styles,
}: {
  side: WallSide;
  boxW: number;
  boxH: number;
  onResize: (deltaPx: number) => void;
  onBefore: () => void;
  styles: any;
}) {
  const last = useSharedValue(0);
  const pan = Gesture.Pan()
    .onStart(() => {
      last.value = 0;
      runOnJS(onBefore)();
    })
    .onUpdate((e) => {
      const v = side === "e" || side === "w" ? e.translationX : e.translationY;
      const step = v - last.value;
      // Resize in small increments so the room follows the finger instead of jumping.
      if (Math.abs(step) >= 2) {
        last.value = v;
        runOnJS(onResize)(step);
      }
    });

  const pos: any =
    side === "e"
      ? { right: -9, top: boxH / 2 - 9 }
      : side === "w"
        ? { left: -9, top: boxH / 2 - 9 }
        : side === "s"
          ? { bottom: -9, left: boxW / 2 - 9 }
          : { top: -9, left: boxW / 2 - 9 };

  return (
    <GestureDetector gesture={pan}>
      <Animated.View testID={`resize-${side}`} style={[styles.handle, pos]} />
    </GestureDetector>
  );
}

function buildStyles(colors: typeof lightColors) {
  return StyleSheet.create({
  view3dBar: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.pale, padding: 12, borderRadius: 12, marginBottom: 14 },
  view3dIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  view3dTitle: { color: colors.brand, fontWeight: "700", fontSize: 14 },
  view3dText: { color: colors.muted, fontSize: 11, marginTop: 2 },
  floorTabs: { flexDirection: "row", gap: 8, marginBottom: 12 },
  floorTab: { flex: 1, paddingVertical: 9, borderRadius: 10, backgroundColor: colors.card, alignItems: "center" },
  floorTabActive: { backgroundColor: colors.brand },
  floorTabText: { color: colors.muted, fontWeight: "700", fontSize: 12 },
  floorTabTextActive: { color: colors.white },
  paletteHint: { color: colors.muted, fontSize: 11, fontWeight: "600", marginBottom: 6 },
  palette: { marginBottom: 10, overflow: "visible" },
  paletteInner: { gap: 8, paddingRight: 8 },
  chip: { backgroundColor: colors.pale, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, alignItems: "center", minWidth: 74, gap: 1 },
  chipAccent: { backgroundColor: colors.brand },
  chipText: { color: colors.brand, fontSize: 12, fontWeight: "700" },
  chipTextAccent: { color: colors.white },
  chipSub: { color: colors.muted, fontSize: 9.5, fontWeight: "600" },
  legend: { flexDirection: "row", gap: 14, marginBottom: 10, alignItems: "center" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  undoBtn: { flexDirection: "row", alignItems: "center", gap: 5, marginLeft: "auto", backgroundColor: colors.pale, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  undoBtnDisabled: { backgroundColor: colors.card },
  undoText: { color: colors.brand, fontSize: 12, fontWeight: "700" },
  undoTextDisabled: { color: colors.dim },
  legendText: { color: colors.muted, fontSize: 11, fontWeight: "600" },
  canvas: {
    height: CANVAS_HEIGHT,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: "hidden",
    marginBottom: 16,
  },
  gridLine: { position: "absolute", backgroundColor: colors.line },
  canvasScaleLabel: { position: "absolute", bottom: 8, right: 12, fontSize: 10, color: colors.muted, fontWeight: "600" },
  room: {
    position: "absolute",
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  wallSeg: { position: "absolute", borderRadius: 1 },
  wallGhost: { position: "absolute", borderStyle: "dashed", borderWidth: 1, borderColor: WALL_INK, opacity: 0.35, backgroundColor: "transparent" },
  wallHit: { position: "absolute", backgroundColor: "transparent" },
  opening: { position: "absolute" },
  openingDoor: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#C85A32" },
  openingWindow: { backgroundColor: "#BFE0EA", borderWidth: 1, borderColor: "#5E93A6" },
  handle: { position: "absolute", width: 18, height: 18, borderRadius: 9, backgroundColor: colors.brand, borderWidth: 2, borderColor: colors.white },
  roomLabel: { color: ROOM_INK, fontWeight: "800", textAlign: "center" },
  roomDim: { color: ROOM_INK, opacity: 0.72, fontWeight: "700", marginTop: 1, textAlign: "center" },
  menu: { position: "absolute", backgroundColor: colors.bg, borderRadius: 12, borderWidth: 1, borderColor: colors.line, paddingVertical: 6, minWidth: 190, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  menuHead: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: colors.line },
  menuTitle: { flex: 1, color: colors.ink, fontWeight: "700", fontSize: 12 },
  menuItem: { flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 12, paddingVertical: 9 },
  menuItemText: { color: colors.ink, fontSize: 13, fontWeight: "600" },
  toast: { backgroundColor: colors.pale, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, marginBottom: 12 },
  toastText: { color: colors.brand, fontSize: 12, fontWeight: "700" },
  selectedCard: { backgroundColor: colors.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.line },
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
  wallRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12 },
  wallRowLabel: { color: colors.muted, fontSize: 10, fontWeight: "700", marginRight: 2 },
  wallPill: { flex: 1, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: "center" },
  wallPillOn: { backgroundColor: colors.pale, borderColor: colors.brand },
  wallPillText: { color: colors.dim, fontSize: 11, fontWeight: "700" },
  wallPillTextOn: { color: colors.brand },
  openingList: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  openingChip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.pale, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 10 },
  openingChipText: { color: colors.brand, fontSize: 11, fontWeight: "700" },
  actionsRow: { flexDirection: "row", gap: 10, marginTop: 4 },
});
}
