import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { colors } from "@/src/theme";
import { Icon } from "@/src/components/UI";
import { build3DHtml } from "@/src/utils/build3d";
import type { Project } from "@/src/types";

export function View3D({ project, onBack }: { project: Project; onBack: () => void }) {
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
      <WebView
        testID="view3d-webview"
        originWhitelist={["*"]}
        source={{ html }}
        style={styles.web}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        allowsInlineMediaPlayback
        androidLayerType="hardware"
        renderLoading={() => (
          <View style={styles.loading}><Text style={styles.loadingText}>Carregando maquete…</Text></View>
        )}
        startInLoadingState
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    zIndex: 5,
  },
  back: { width: 40, height: 40, alignItems: "center", justifyContent: "center", marginLeft: -8 },
  title: { color: colors.ink, fontSize: 17, fontWeight: "700" },
  subtitle: { color: colors.muted, fontSize: 12, marginTop: 2 },
  web: { flex: 1, backgroundColor: "#F8F7F4" },
  loading: { position: "absolute", inset: 0 as any, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  loadingText: { color: colors.muted, fontSize: 13, fontWeight: "600" },
});
