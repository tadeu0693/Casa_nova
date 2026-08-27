import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/src/utils/ThemeContext";
import type { lightColors } from "@/src/theme";
import { Icon } from "@/src/components/UI";
import { build3DHtml } from "@/src/utils/build3d";
import type { Project } from "@/src/types";

// Web build uses a native <iframe> since react-native-webview doesn't render on web.
// Metro auto-picks this file when bundling for web.
export function View3D({ project, onBack }: { project: Project; onBack: () => void }) {
  const { colors } = useTheme();
  const styles = useMemo(() => buildStyles(colors), [colors]);
  const html = useMemo(() => build3DHtml(project), [project]);
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
      </View>
      <View style={styles.frameWrap} testID="view3d-iframe">
        {/* @ts-expect-error web iframe */}
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
  frameWrap: { flex: 1, backgroundColor: colors.bg },
});
}
