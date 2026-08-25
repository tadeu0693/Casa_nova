import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/src/theme";
import { Icon, Screen } from "@/src/components/UI";
import type { CepData, User } from "@/src/types";

export function Home({ user, go, cep, onEditCep, onLogout }: { user: User; go: (s: string) => void; cep: CepData | null; onEditCep: () => void; onLogout: () => void }) {
  const firstName = (user.name || "").split(" ")[0] || "amigo";
  const openAccountMenu = () => {
    Alert.alert("Sua conta", user.email || "", [
      { text: "Cancelar", style: "cancel" },
      { text: "Alterar senha", onPress: () => go("change-password") },
      {
        text: "Sair da conta",
        style: "destructive",
        onPress: () =>
          Alert.alert("Sair da conta", "Tem certeza que quer sair? Você vai precisar entrar de novo com e-mail e senha (ou Google).", [
            { text: "Cancelar", style: "cancel" },
            { text: "Sair", style: "destructive", onPress: onLogout },
          ]),
      },
    ]);
  };
  return (
    <Screen testID="home-screen">
      <View style={styles.top}>
        <View>
          <Text style={styles.eyebrow}>OLÁ, {firstName.toUpperCase()}</Text>
          <Text style={styles.title}>O que vamos construir?</Text>
        </View>
        <Pressable testID="home-avatar" onPress={openAccountMenu} style={styles.avatar}>
          <Text style={styles.avatarText}>{(user.name || "?")[0]?.toUpperCase()}</Text>
        </Pressable>
      </View>
      <Pressable testID="home-cep" style={styles.location} onPress={onEditCep}>
        <Icon name="location-outline" size={18} color={colors.brand} />
        <Text style={styles.locationText}>
          {cep ? `${cep.city} · ${cep.uf}` : "Definir CEP para ofertas por região"}
        </Text>
        <Text style={styles.cep}>{cep ? "Alterar" : "Definir CEP"}</Text>
      </Pressable>
      <View style={styles.heroCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroKicker}>COMECE PELO SEU PROJETO</Text>
          <Text style={styles.heroCardTitle}>Da ideia à obra,{"\n"}sem complicação.</Text>
          <Pressable testID="home-cta-builder" onPress={() => go("builder")} style={styles.heroLink}>
            <Text style={styles.heroLinkText}>Criar do zero</Text>
            <Icon name="arrow-forward" size={16} color="#fff" />
          </Pressable>
          <Pressable testID="home-cta-templates" onPress={() => go("templates")} style={styles.heroLinkGhost}>
            <Icon name="sparkles-outline" size={14} color="#fff" />
            <Text style={styles.heroLinkText}>ou use um modelo</Text>
          </Pressable>
        </View>
        <View style={styles.blueprint}>
          <View style={styles.blueprintLine} />
          <View style={[styles.blueprintLine, { width: 42, transform: [{ rotate: "90deg" }] }]} />
          <Icon name="home-outline" size={43} color="#F4C5AD" />
        </View>
      </View>
      <Text style={styles.sectionTitle}>Atalhos</Text>
      <View style={styles.tiles}>
        <Action testID="home-tile-projects" icon="folder-outline" title="Meus projetos" text="Continuar editando" onPress={() => go("projects")} />
        <Action testID="home-tile-templates" icon="sparkles-outline" title="Modelos prontos" text="Kitnet, Casa, Sobrado" onPress={() => go("templates")} />
      </View>
      <View style={[styles.tiles, { marginTop: 12 }]}>
        <Action testID="home-tile-plan" icon="grid-outline" title="Planta 2D" text="Desenhe seus cômodos" onPress={() => go("builder")} />
        <Action testID="home-tile-offers" icon="pricetag-outline" title="Ofertas" text="Compare por CEP" onPress={() => go("offers")} />
      </View>
      <View style={[styles.tiles, { marginTop: 12 }]}>
        <Action testID="home-tile-cart" icon="basket-outline" title="Carrinho" text="Compare lojas" onPress={() => go("cart")} />
        <Action testID="home-tile-alerts" icon="notifications-outline" title="Alertas" text="Fique de olho no preço" onPress={() => go("alerts")} />
      </View>
      <Text style={styles.sectionTitle}>Como funciona</Text>
      <View style={styles.step}>
        <Step n="01" title="Defina seus cômodos" text="Arraste e redimensione no editor 2D." />
        <Step n="02" title="Gere a lista" text="Materiais e quantidades calculadas." />
        <Step n="03" title="Compare e economize" text="Preço + frete real por região." />
      </View>
    </Screen>
  );
}

function Action({ icon, title, text, onPress, testID }: any) {
  return (
    <Pressable testID={testID} onPress={onPress} style={({ pressed }) => [styles.action, pressed && { opacity: 0.72 }]}>
      <View style={styles.actionIcon}>
        <Icon name={icon} size={22} color={colors.brand} />
      </View>
      <Text style={styles.actionTitle}>{title}</Text>
      <Text style={styles.actionText}>{text}</Text>
    </Pressable>
  );
}

function Step({ n, title, text }: any) {
  return (
    <View style={styles.stepRow}>
      <Text style={styles.stepN}>{n}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepText}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 22 },
  eyebrow: { color: colors.brand, fontSize: 11, fontWeight: "700", letterSpacing: 1.2, marginBottom: 5 },
  title: { color: colors.ink, fontSize: 27, lineHeight: 32, fontWeight: "700" },
  avatar: { height: 42, width: 42, borderRadius: 21, backgroundColor: colors.pale, alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.brand, fontWeight: "700", fontSize: 17 },
  location: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 14, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line },
  locationText: { color: colors.ink, fontSize: 13, flex: 1, fontWeight: "600" },
  cep: { color: colors.brand, fontWeight: "700", fontSize: 13 },
  heroCard: { backgroundColor: colors.brand, borderRadius: 20, padding: 22, marginTop: 24, minHeight: 190, flexDirection: "row", overflow: "hidden" },
  heroKicker: { color: "#FADBCB", letterSpacing: 1.1, fontSize: 10, fontWeight: "700" },
  heroCardTitle: { color: "#fff", fontSize: 25, lineHeight: 30, fontWeight: "700", marginTop: 12 },
  heroLink: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 24 },
  heroLinkGhost: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10, opacity: 0.85 },
  heroLinkText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  blueprint: { width: 105, height: 135, backgroundColor: colors.brandDark, borderRadius: 12, alignItems: "center", justifyContent: "center", gap: 10, transform: [{ rotate: "5deg" }], marginTop: 8 },
  blueprintLine: { width: 65, height: 1, backgroundColor: "#F4C5AD" },
  sectionTitle: { fontSize: 19, fontWeight: "700", color: colors.ink, marginTop: 29, marginBottom: 13 },
  tiles: { flexDirection: "row", gap: 12 },
  action: { backgroundColor: colors.card, borderRadius: 15, padding: 14, flex: 1, minHeight: 118 },
  actionIcon: { width: 37, height: 37, backgroundColor: colors.pale, borderRadius: 11, alignItems: "center", justifyContent: "center", marginBottom: 13 },
  actionTitle: { color: colors.ink, fontWeight: "700", fontSize: 15 },
  actionText: { color: colors.muted, fontSize: 12, marginTop: 5 },
  step: { gap: 19 },
  stepRow: { flexDirection: "row", gap: 16, alignItems: "flex-start" },
  stepN: { color: colors.brand, fontSize: 13, fontWeight: "700", width: 25 },
  stepTitle: { fontWeight: "700", color: colors.ink, fontSize: 15 },
  stepText: { color: colors.muted, fontSize: 13, marginTop: 3 },
});
