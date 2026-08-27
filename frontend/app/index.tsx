import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { storage } from "@/src/utils/storage";
import { request, TOKEN_KEY } from "@/src/api";
import { useTheme } from "@/src/utils/ThemeContext";
import { Icon } from "@/src/components/UI";
import { Auth } from "@/src/components/Auth";
import { Home } from "@/src/components/Home";
import { ChangePassword } from "@/src/components/ChangePassword";
import { Builder } from "@/src/components/Builder";
import { Plan2D } from "@/src/components/Plan2D";
import { Estimator } from "@/src/components/Estimator";
import { Offers } from "@/src/components/Offers";
import { Cart } from "@/src/components/Cart";
import { Templates } from "@/src/components/Templates";
import { Alerts } from "@/src/components/Alerts";
import { Projects } from "@/src/components/Projects";
import { View3D } from "@/src/components/View3D";
import { CepModal } from "@/src/components/CepModal";
import { Onboarding } from "@/src/components/Onboarding";
import type { CepData, Offer, Project, User } from "@/src/types";
import type { lightColors } from "@/src/theme";

const CEP_KEY = "constroi_facil_cep";
const ONBOARDING_KEY = "constroi_facil_onboarding_seen";

export default function Index() {
  const { colors } = useTheme();
  const styles = useMemo(() => buildStyles(colors), [colors]);
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState<"home" | "builder" | "plan" | "3d" | "estimate" | "offers" | "cart" | "templates" | "alerts" | "projects" | "change-password">("home");
  const [project, setProject] = useState<Project | null>(null);
  const [cep, setCep] = useState<CepData | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showCepModal, setShowCepModal] = useState(false);
  const [savingLayout, setSavingLayout] = useState(false);
  const [offerQuery, setOfferQuery] = useState<string | undefined>(undefined);
  const [toast, setToast] = useState<string>("");

  useEffect(() => {
    (async () => {
      const savedCep = await storage.getItem<string>(CEP_KEY, "");
      if (savedCep) {
        try { setCep(JSON.parse(savedCep)); } catch { /* ignore */ }
      }
      request("/auth/me")
        .then((d) => setUser(d.user))
        .catch(() => storage.secureRemove(TOKEN_KEY))
        .finally(() => setChecking(false));
    })();
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const seen = await storage.getItem<string>(ONBOARDING_KEY, "");
      if (!seen) setShowOnboarding(true);
    })();
  }, [user]);

  const dismissOnboarding = async () => {
    setShowOnboarding(false);
    await storage.setItem(ONBOARDING_KEY, "1");
  };

  const handleLogout = async () => {
    await storage.secureRemove(TOKEN_KEY);
    setUser(null);
    setProject(null);
    setTab("home");
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  const saveCep = async (data: CepData) => {
    setCep(data);
    await storage.setItem(CEP_KEY, JSON.stringify(data));
  };

  const savePlanLayout = async (rooms: Project["rooms"]) => {
    if (!project) return;
    setSavingLayout(true);
    try {
      const updated = { ...project, rooms };
      if (project.project_id) {
        const saved = await request(`/projects/${project.project_id}`, {
          method: "PUT",
          body: JSON.stringify(updated),
        });
        setProject(saved);
      } else {
        setProject(updated);
      }
      setToast("Layout salvo");
    } catch (e: any) {
      setToast(e.message || "Não foi possível salvar");
    } finally {
      setSavingLayout(false);
    }
  };

  const addToCart = async (offer: Offer) => {
    try {
      await request("/cart", {
        method: "POST",
        body: JSON.stringify({
          offer_id: offer.id,
          title: offer.title,
          price: Number(offer.price || 0),
          store: offer.store,
          url: offer.url || "",
          thumbnail: offer.thumbnail || "",
          freight: Number(offer.freight || 0),
          quantity: 1,
        }),
      });
      setToast("Adicionado ao carrinho");
    } catch (e: any) {
      setToast(e.message || "Erro ao adicionar");
    }
  };

  if (checking) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator color={colors.brand} size="large" />
      </SafeAreaView>
    );
  }

  if (!user) return <Auth onLogged={setUser} />;

  const go = (s: string) => setTab(s as any);

  const openOffersFor = (q: string) => {
    setOfferQuery(q);
    setTab("offers");
  };

  const loadExample = async () => {
    try {
      const data = await request("/templates");
      const items = data.templates || [];
      const t = items.find((x: any) => x.id === "casa_60") || items[0];
      if (!t) {
        setToast("Não foi possível carregar o exemplo agora");
        return;
      }
      const payload = { name: `${t.name} (exemplo)`, build_type: t.build_type, width: t.width, length: t.length, rooms: t.rooms };
      try {
        const saved = await request("/projects", { method: "POST", body: JSON.stringify({ ...payload, cep: cep?.cep || "" }) });
        setProject(saved);
      } catch {
        setProject(payload as Project);
      }
      setTab("plan");
    } catch {
      setToast("Não foi possível carregar o exemplo agora");
    }
  };

  let content: any;
  if (tab === "home") {
    content = <Home user={user} go={go} cep={cep} onEditCep={() => setShowCepModal(true)} onLogout={handleLogout} onLoadExample={loadExample} />;
  } else if (tab === "change-password") {
    content = <ChangePassword onBack={() => setTab("home")} onDone={() => { setToast("Senha alterada com sucesso"); setTab("home"); }} />;
  } else if (tab === "builder") {
    content = (
      <Builder
        initial={project}
        onDone={async (p) => {
          try {
            const saved = await request("/projects", { method: "POST", body: JSON.stringify({ ...p, cep: cep?.cep || "" }) });
            setProject(saved);
          } catch {
            setProject(p as Project);
          }
          setTab("plan");
        }}
      />
    );
  } else if (tab === "plan" && project) {
    content = (
      <Plan2D
        project={project}
        onNext={() => setTab("estimate")}
        onSave={savePlanLayout}
        saving={savingLayout}
        onView3D={() => setTab("3d")}
      />
    );
  } else if (tab === "3d" && project) {
    content = <View3D project={project} onBack={() => setTab("plan")} />;
  } else if (tab === "estimate" && project) {
    content = (
      <Estimator
        project={project}
        onOffers={() => setTab("offers")}
        onSearchMaterial={openOffersFor}
      />
    );
  } else if (tab === "cart") {
    content = <Cart onExplore={() => setTab("offers")} project={project} />;
  } else if (tab === "templates") {
    content = (
      <Templates
        onBack={() => setTab("home")}
        onPick={async (p) => {
          try {
            const saved = await request("/projects", { method: "POST", body: JSON.stringify({ ...p, cep: cep?.cep || "" }) });
            setProject(saved);
          } catch {
            setProject(p);
          }
          setTab("plan");
        }}
      />
    );
  } else if (tab === "alerts") {
    content = <Alerts onBack={() => setTab("home")} onSeeOffers={openOffersFor} />;
  } else if (tab === "projects") {
    content = (
      <Projects
        onBack={() => setTab("home")}
        onNew={() => { setProject(null); setTab("builder"); }}
        onTemplates={() => setTab("templates")}
        onOpen={(p) => { setProject(p); setTab("plan"); }}
      />
    );
  } else {
    content = (
      <Offers
        cep={cep}
        onOpenCep={() => setShowCepModal(true)}
        onAddToCart={addToCart}
        initialQuery={offerQuery}
      />
    );
  }

  return (
    <View style={styles.flex}>
      {content}
      {toast ? (
        <View style={styles.toast} testID="toast">
          <Icon name="checkmark-circle" size={18} color="#fff" />
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}
      {tab === "3d" || tab === "change-password" ? null : (
        <View style={styles.tabbar}>
          {[
            ["home", "Início", "home-outline"],
            ["builder", "Projetar", "create-outline"],
            ["offers", "Ofertas", "pricetag-outline"],
            ["cart", "Carrinho", "basket-outline"],
          ].map(([key, label, icon]) => (
            <Pressable key={key} testID={`tab-${key}`} onPress={() => setTab(key as any)} style={styles.tab}>
              <Icon name={icon as any} size={22} color={tab === key ? colors.brand : colors.muted} />
              <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>
      )}
      <CepModal
        visible={showCepModal}
        onClose={() => setShowCepModal(false)}
        onSaved={saveCep}
        currentCep={cep?.cep || null}
      />
      <Onboarding visible={showOnboarding} onDone={dismissOnboarding} />
    </View>
  );
}

function buildStyles(colors: typeof lightColors) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.bg },
    loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
    tabbar: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: 83,
      paddingBottom: 17,
      paddingTop: 10,
      backgroundColor: colors.bg,
      borderTopWidth: 1,
      borderColor: colors.line,
      flexDirection: "row",
      justifyContent: "space-around",
    },
    tab: { alignItems: "center", justifyContent: "center", minWidth: 65, gap: 4 },
    tabText: { color: colors.muted, fontSize: 11 },
    tabTextActive: { color: colors.brand, fontWeight: "700" },
    toast: {
      position: "absolute",
      bottom: 100,
      left: 20,
      right: 20,
      padding: 12,
      borderRadius: 12,
      backgroundColor: colors.ink,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      zIndex: 10,
    },
    toastText: { color: "#fff", fontWeight: "600", fontSize: 13, flex: 1 },
  });
}
