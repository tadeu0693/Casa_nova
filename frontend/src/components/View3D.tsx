import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { colors } from "@/src/theme";
import { Icon } from "@/src/components/UI";
import { build3DHtml } from "@/src/utils/build3d";
import type { Project } from "@/src/types";

export function View3D({ project, onBack }: { project: Project; onBack: () => void }) {
  const html = useMemo(() => build3DHtml(project), [project]);
  const [sharing, setSharing] = useState(false);

  const handleMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "share_screenshot" && data.dataUrl) {
        setSharing(true);
        const base64 = data.dataUrl.split(",")[1];
        const safeName = project.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "maquete";
        const fileUri = `${FileSystem.cacheDirectory}${safeName}-3d.png`;
        await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
        const available = await Sharing.isAvailableAsync();
        if (available) {
          await Sharing.shareAsync(fileUri, { mimeType: "image/png", dialogTitle: "Compartilhar maquete 3D" });
        }
      }
    } catch (e) {
      // Sharing is a nice-to-have — a failure here shouldn't disrupt viewing the 3D model.
    } finally {
      setSharing(false);
    }
  };

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
        onMessage={handleMessage}
        renderLoading={() => (
          <View style={styles.loading}><Text style={styles.loadingText}>Carregando maquete…</Text></View>
        )}
        startInLoadingState
      />
      {sharing ? (
        <View style={styles.sharingOverlay}>
          <Text style={styles.loadingText}>Preparando imagem…</Text>
        </View>
      ) : null}
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
  sharingOverlay: { position: "absolute", top: "45%", alignSelf: "center", backgroundColor: colors.bg, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.line },
});
