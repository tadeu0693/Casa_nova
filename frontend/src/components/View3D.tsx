import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useTheme } from "@/src/utils/ThemeContext";
import type { lightColors } from "@/src/theme";
import { Icon } from "@/src/components/UI";
import { build3DHtml } from "@/src/utils/build3d";
import type { PlanRoom, Project } from "@/src/types";

export function View3D({ project, onBack, onSavePlan, onNext }: { project: Project; onBack: () => void; onSavePlan?: (plan: PlanRoom[], floors: number) => void | Promise<void>; onNext?: () => void }) {
  const { colors } = useTheme();
  const styles = useMemo(() => buildStyles(colors), [colors]);
  // The HTML is built ONCE per mount. Saving furniture updates the project, and if the
  // markup depended on `project` every placed sofa would reload the WebView and throw
  // away the camera angle and the furnishing session mid-drag.
  const initialProject = useRef(project);
  const html = useMemo(() => build3DHtml(initialProject.current), []);
  const [sharing, setSharing] = useState(false);
  // The page carries three.js inside it, so it is ~800 KB. Handing that much markup to
  // the WebView as a prop is unreliable — it is written to a file and loaded by URI
  // instead, which is what a browser does with a page this size anyway.
  const [pageUri, setPageUri] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const uri = `${FileSystem.cacheDirectory}maquete-3d.html`;
        await FileSystem.writeAsStringAsync(uri, html);
        if (!cancelled) setPageUri(uri);
      } catch (e: any) {
        // Falling back to the inline prop keeps the screen usable if the write fails.
        if (!cancelled) setLoadError(`não foi possível preparar a página (${e?.message || e})`);
      }
    })();
    return () => { cancelled = true; };
  }, [html]);

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
      if (data.type === "save_plan" && onSavePlan) {
        await onSavePlan(data.plan || [], data.floors);
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
        {onNext ? (
          <Pressable testID="view3d-next" onPress={onNext} style={styles.nextBtn}>
            <Text style={styles.nextText}>Materiais</Text>
            <Icon name="chevron-forward" size={16} color={colors.white} />
          </Pressable>
        ) : null}
      </View>
      {loadError ? (
        <View style={styles.errBox} testID="view3d-error">
          <Text style={styles.errTitle}>Não foi possível abrir a maquete 3D</Text>
          <Text style={styles.errText}>{loadError}</Text>
        </View>
      ) : null}
      <WebView
        testID="view3d-webview"
        originWhitelist={["*"]}
        source={pageUri ? { uri: pageUri } : { html, baseUrl: "https://localhost/" }}
        allowFileAccess
        allowFileAccessFromFileURLs
        allowUniversalAccessFromFileURLs
        mixedContentMode="always"
        onError={(e) => setLoadError(e.nativeEvent?.description || "falha ao abrir a página")}
        onRenderProcessGone={() => setLoadError("a maquete consumiu memória demais e foi encerrada pelo sistema")}
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
    zIndex: 5,
  },
  back: { width: 40, height: 40, alignItems: "center", justifyContent: "center", marginLeft: -8 },
  title: { color: colors.ink, fontSize: 17, fontWeight: "700" },
  subtitle: { color: colors.muted, fontSize: 12, marginTop: 2 },
  nextBtn: { flexDirection: "row", alignItems: "center", gap: 2, backgroundColor: colors.brand, borderRadius: 999, paddingLeft: 14, paddingRight: 10, paddingVertical: 9 },
  nextText: { color: colors.white, fontWeight: "700", fontSize: 13 },
  errBox: { margin: 16, padding: 14, borderRadius: 12, backgroundColor: colors.pale, borderWidth: 1, borderColor: colors.brand },
  errTitle: { color: colors.brand, fontWeight: "700", fontSize: 14, textAlign: "center" },
  errText: { color: colors.muted, fontSize: 12, marginTop: 6, textAlign: "center" },
  web: { flex: 1, backgroundColor: colors.bg },
  loading: { position: "absolute", inset: 0 as any, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  loadingText: { color: colors.muted, fontSize: 13, fontWeight: "600" },
  sharingOverlay: { position: "absolute", top: "45%", alignSelf: "center", backgroundColor: colors.bg, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.line },
});
}
