import { useEffect, useMemo, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/src/utils/ThemeContext";
import type { lightColors } from "@/src/theme";
import { Icon } from "@/src/components/UI";
import { build3DHtml } from "@/src/utils/build3d";
import type { PlanRoom, Project } from "@/src/types";

// Web build uses a native <iframe> since react-native-webview doesn't render on web.
// Metro auto-picks this file when bundling for web.
export function View3D({ project, onBack, onSavePlan, onNext }: { project: Project; onBack: () => void; onSavePlan?: (plan: PlanRoom[], floors: number) => void | Promise<void>; onNext?: () => void }) {
  const { colors } = useTheme();
  const styles = useMemo(() => buildStyles(colors), [colors]);
  // Built once per mount: saving updates the project, and rebuilding the markup on every
  // change would reload the iframe and throw away the editing session mid-drag.
  const initialProject = useRef(project);
  const html = useMemo(() => build3DHtml(initialProject.current), []);

  // The iframe has no ReactNativeWebView, so the scene falls back to window.parent.
  const saveRef = useRef(onSavePlan);
  saveRef.current = onSavePlan;
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (data && data.type === "save_plan" && saveRef.current) {
          saveRef.current(data.plan || [], data.floors);
        }
      } catch {
        // Messages from other sources aren't ours to handle.
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.topBar}>
        <Pressable testID="view3d-back" onPress={onBack} hitSlop={10} style={styles.back}>
          <Icon name="chevron-back" size={22} color={colors.ink} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{project.name}</Text>
          <Text style={styles.subtitle}>Maquete 3D · {project.width}×{project.length} m</Text>
        </View>
        {onNext ? (
          <Pressable testID="view3d-next" onPress={onNext} style={styles.nextBtn}>
            <Text style={styles.nextText}>Materiais</Text>
            <Icon name="chevron-forward" size={16} color={colors.white} />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.frameWrap} testID="view3d-iframe">
        <iframe
          srcDoc={html}
          title="3D preview"
          style={{ width: "100%", height: "100%", border: "none", background: colors.bg }}
        />
      </View>
    </SafeAreaView>
  );
}

function buildStyles(colors: typeof lightColors) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bg,
  },
  back: { width: 40, height: 40, alignItems: "center", justifyContent: "center", marginLeft: -8 },
  title: { color: colors.ink, fontSize: 17, fontWeight: "700" },
  subtitle: { color: colors.muted, fontSize: 12, marginTop: 2 },
  nextBtn: { flexDirection: "row", alignItems: "center", gap: 2, backgroundColor: colors.brand, borderRadius: 999, paddingLeft: 14, paddingRight: 10, paddingVertical: 9 },
  nextText: { color: colors.white, fontWeight: "700", fontSize: 13 },
  frameWrap: { flex: 1, backgroundColor: colors.bg },
});
}
