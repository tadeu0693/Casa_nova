import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { request } from "@/src/api";
import { colors } from "@/src/theme";
import { Button, Header, Icon, Screen } from "@/src/components/UI";
import type { Project } from "@/src/types";

function formatDate(iso?: string) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

export function Projects({
  onBack,
  onOpen,
  onNew,
  onTemplates,
}: {
  onBack: () => void;
  onOpen: (p: Project) => void;
  onNew: () => void;
  onTemplates: () => void;
}) {
  const [items, setItems] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<Project | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await request("/projects");
      setItems(Array.isArray(d) ? d : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const remove = async (p: Project) => {
    if (!p.project_id) return;
    await request(`/projects/${p.project_id}`, { method: "DELETE" }).catch(() => undefined);
    setPending(null);
    load();
  };

  return (
    <Screen testID="projects-screen">
      <View style={styles.top}>
        <Pressable testID="projects-back" onPress={onBack} hitSlop={10} style={styles.back}>
          <Icon name="chevron-back" size={22} color={colors.ink} />
        </Pressable>
      </View>
      <Header title="Meus projetos" subtitle="Continue de onde parou ou comece um novo" />

      <View style={styles.actionsRow}>
        <Pressable testID="projects-new" onPress={onNew} style={[styles.actionBtn, { backgroundColor: colors.brand }]}>
          <Icon name="add-circle" size={18} color="#fff" />
          <Text style={[styles.actionText, { color: "#fff" }]}>Novo do zero</Text>
        </Pressable>
        <Pressable testID="projects-templates" onPress={onTemplates} style={styles.actionBtn}>
          <Icon name="sparkles-outline" size={18} color={colors.brand} />
          <Text style={styles.actionText}>Usar modelo</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.brand} size="large" style={{ marginTop: 60 }} />
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Icon name="folder-open-outline" size={40} color={colors.brand} />
          <Text style={styles.emptyTitle}>Nenhum projeto salvo ainda</Text>
          <Text style={styles.emptyText}>
            Toque em &ldquo;Novo do zero&rdquo; ou escolha um modelo pronto para começar em segundos.
          </Text>
        </View>
      ) : (
        items.map((p) => {
          const area = (p.width * p.length).toFixed(0);
          const created = formatDate((p as any).updated_at || (p as any).created_at);
          return (
            <View testID={`project-${p.project_id}`} key={p.project_id} style={styles.card}>
              <Pressable style={styles.cardBody} onPress={() => onOpen(p)} testID={`project-open-${p.project_id}`}>
                <View style={styles.iconBox}>
                  <Icon
                    name={p.build_type === "Sobrado" ? "layers-outline" : p.build_type === "Edícula" ? "home-outline" : "home"}
                    size={24}
                    color={colors.brand}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={styles.cardTitle}>{p.name}</Text>
                  <Text style={styles.cardMeta}>
                    {p.build_type} · {area} m² · {p.rooms.length} ambiente{p.rooms.length === 1 ? "" : "s"}
                  </Text>
                  {created ? <Text style={styles.cardDate}>Atualizado {created}</Text> : null}
                </View>
                <Icon name="chevron-forward" size={18} color={colors.muted} />
              </Pressable>
              <Pressable
                testID={`project-delete-${p.project_id}`}
                onPress={() => setPending(p)}
                style={styles.trashBtn}
                hitSlop={8}
              >
                <Icon name="trash-outline" size={16} color={colors.error} />
              </Pressable>
            </View>
          );
        })
      )}

      <ConfirmDelete
        project={pending}
        onCancel={() => setPending(null)}
        onConfirm={() => pending && remove(pending)}
      />
    </Screen>
  );
}

function ConfirmDelete({
  project,
  onCancel,
  onConfirm,
}: {
  project: Project | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal visible={!!project} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        <View style={styles.confirm}>
          <View style={styles.warnIcon}>
            <Icon name="alert-circle" size={26} color={colors.error} />
          </View>
          <Text style={styles.confirmTitle}>Excluir projeto?</Text>
          <Text style={styles.confirmBody}>
            &ldquo;{project?.name}&rdquo; será removido permanentemente. Essa ação não pode ser desfeita.
          </Text>
          <Button testID="confirm-delete" title="Excluir" onPress={onConfirm} />
          <Pressable testID="cancel-delete" onPress={onCancel} style={styles.cancel}>
            <Text style={styles.cancelText}>Manter projeto</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", marginBottom: 4 },
  back: { width: 40, height: 40, alignItems: "center", justifyContent: "center", marginLeft: -8 },
  actionsRow: { flexDirection: "row", gap: 10, marginBottom: 18 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.pale,
  },
  actionText: { color: colors.brand, fontWeight: "700", fontSize: 13 },
  empty: { alignItems: "center", marginTop: 60, paddingHorizontal: 30 },
  emptyTitle: { color: colors.ink, fontSize: 18, fontWeight: "700", marginTop: 15 },
  emptyText: { color: colors.muted, fontSize: 13, marginTop: 8, textAlign: "center", lineHeight: 20 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 10,
    paddingRight: 12,
  },
  cardBody: { flex: 1, flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: colors.pale,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { color: colors.ink, fontWeight: "700", fontSize: 15 },
  cardMeta: { color: colors.muted, fontSize: 12, marginTop: 3 },
  cardDate: { color: colors.muted, fontSize: 11, marginTop: 2, fontStyle: "italic" },
  trashBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 8 },
  backdrop: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,.5)", padding: 24 },
  confirm: { backgroundColor: colors.bg, borderRadius: 16, padding: 24, width: "100%", maxWidth: 340 },
  warnIcon: { alignSelf: "center", width: 56, height: 56, borderRadius: 28, backgroundColor: "#FBEAEC", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  confirmTitle: { color: colors.ink, fontSize: 18, fontWeight: "700", textAlign: "center" },
  confirmBody: { color: colors.muted, fontSize: 13, textAlign: "center", marginTop: 8, lineHeight: 20 },
  cancel: { alignItems: "center", paddingVertical: 12 },
  cancelText: { color: colors.muted, fontWeight: "700" },
});
