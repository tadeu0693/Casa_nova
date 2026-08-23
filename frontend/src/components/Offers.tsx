import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { request } from "@/src/api";
import { colors } from "@/src/theme";
import { Chip, Header, Icon, Screen } from "@/src/components/UI";
import type { CepData, Offer } from "@/src/types";

const QUICK_QUERIES = ["Cimento", "Areia", "Bloco cerâmico", "Piso", "Tinta", "Telha"];
const SORTS = ["Melhor preço", "Menor frete", "Total (preço+frete)"];

export function Offers({
  cep,
  onOpenCep,
  onAddToCart,
  initialQuery,
}: {
  cep: CepData | null;
  onOpenCep: () => void;
  onAddToCart: (offer: Offer) => void;
  initialQuery?: string;
}) {
  const [q, setQ] = useState(initialQuery || "cimento");
  const [offers, setOffers] = useState<Offer[]>([]);
  const [partners, setPartners] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sort, setSort] = useState(SORTS[0]);

  const search = async (query: string = q) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ q: query, ...(cep?.uf ? { uf: cep.uf, cep: cep.cep } : {}) });
      const d = await request(`/offers?${params.toString()}`);
      setOffers(d.offers || []);
      setPartners(d.partner_stores || []);
      if (d.error) setError(d.error);
    } catch (e: any) {
      setOffers([]);
      setPartners([]);
      setError(e.message || "Não foi possível carregar as ofertas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuery) setQ(initialQuery);
    search(initialQuery || q).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery, cep?.uf]);

  const sorted = [...offers].sort((a, b) => {
    const pa = a.price || 0;
    const pb = b.price || 0;
    const fa = a.freight || 0;
    const fb = b.freight || 0;
    if (sort === "Menor frete") return fa - fb;
    if (sort === "Total (preço+frete)") return pa + fa - (pb + fb);
    return pa - pb;
  });

  return (
    <Screen testID="offers-screen">
      <Header title="Ofertas para sua obra" subtitle="Multi-loja · atualizado agora" />

      <Pressable testID="offers-cep-bar" onPress={onOpenCep} style={styles.cepBar}>
        <Icon name="location" size={16} color={colors.brand} />
        <Text style={styles.cepBarText}>
          {cep ? `${cep.city} · ${cep.uf} · frete estimado a partir de R$ ${cep.freight_base.toFixed(2)}` : "Definir CEP para calcular frete real"}
        </Text>
        <Icon name="chevron-forward" size={16} color={colors.muted} />
      </Pressable>

      <View style={styles.search}>
        <Icon name="search" size={20} color={colors.muted} />
        <TextInput
          testID="offers-search"
          value={q}
          onChangeText={setQ}
          onSubmitEditing={() => search()}
          placeholder="Buscar material (ex.: cimento, tinta)"
          placeholderTextColor="#A4A39D"
          style={styles.searchInput}
        />
        <Pressable testID="offers-search-button" onPress={() => search()}>
          <Icon name="arrow-forward-circle" size={26} color={colors.brand} />
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {QUICK_QUERIES.map((label) => (
          <Chip
            testID={`quick-${label}`}
            key={label}
            label={label}
            active={q.toLowerCase() === label.toLowerCase()}
            onPress={() => { setQ(label); search(label); }}
          />
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {SORTS.map((s) => (
          <Chip testID={`sort-${s}`} key={s} label={s} active={sort === s} onPress={() => setSort(s)} />
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: 35 }} />
      ) : (
        <>
          {error ? (
            <View style={styles.errorBox}>
              <Icon name="cloud-offline-outline" size={22} color={colors.warn} />
              <Text style={styles.errorText}>{error}</Text>
              <Pressable testID="offers-retry" onPress={() => search()}>
                <Text style={styles.retry}>Tentar novamente</Text>
              </Pressable>
            </View>
          ) : null}

          {sorted.length === 0 && !error ? (
            <View style={styles.empty}>
              <Icon name="pricetag-outline" size={34} color={colors.brand} />
              <Text style={styles.emptyTitle}>Nenhuma oferta encontrada</Text>
              <Text style={styles.emptyText}>Tente outro termo ou uma das buscas rápidas acima.</Text>
            </View>
          ) : null}

          {sorted.map((o) => (
            <View key={o.id} style={styles.offer}>
              <Pressable
                testID={`offer-open-${o.id}`}
                onPress={() => o.url && Linking.openURL(o.url)}
                style={styles.offerBody}
              >
                <View style={styles.offerImage}>
                  <Icon name="cube-outline" size={22} color={colors.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={2} style={styles.offerTitle}>{o.title}</Text>
                  <View style={styles.storeRow}>
                    <Text style={styles.offerStore}>{o.store}</Text>
                    {o.freight ? <Text style={styles.offerFreight}>+ frete R$ {o.freight.toFixed(2)}</Text> : null}
                  </View>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.offerPrice}>R$ {Number(o.price || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</Text>
                  {o.freight ? (
                    <Text style={styles.offerTotal}>Total R$ {(Number(o.price || 0) + Number(o.freight || 0)).toFixed(2)}</Text>
                  ) : null}
                </View>
              </Pressable>
              <Pressable
                testID={`offer-add-${o.id}`}
                onPress={() => onAddToCart(o)}
                style={styles.addBtn}
                hitSlop={6}
              >
                <Icon name="basket-outline" size={16} color={colors.brand} />
                <Text style={styles.addBtnText}>Adicionar ao carrinho</Text>
              </Pressable>
            </View>
          ))}

          {partners.length > 0 && (
            <>
              <Text style={styles.partnerTitle}>Buscar direto nas lojas</Text>
              {partners.map((p) => (
                <Pressable
                  key={p.id}
                  testID={`partner-${p.store}`}
                  onPress={() => p.url && Linking.openURL(p.url)}
                  style={styles.partner}
                >
                  <View style={styles.partnerLogo}>
                    <Icon name="storefront-outline" size={20} color={colors.brand} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.partnerName}>{p.store}</Text>
                    <Text style={styles.partnerNote}>{p.note}</Text>
                  </View>
                  <Icon name="open-outline" size={18} color={colors.muted} />
                </Pressable>
              ))}
            </>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cepBar: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.pale, padding: 12, borderRadius: 12, marginBottom: 12 },
  cepBarText: { color: colors.ink, fontSize: 12, flex: 1, fontWeight: "600" },
  search: { height: 52, borderWidth: 1, borderColor: colors.line, borderRadius: 13, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 10, backgroundColor: "#fff", marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 15, color: colors.ink },
  chipRow: { gap: 8, paddingHorizontal: 2, paddingVertical: 6 },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, backgroundColor: "#FEF3E4", borderRadius: 10, marginTop: 8 },
  errorText: { color: colors.ink, flex: 1, fontSize: 12 },
  retry: { color: colors.brand, fontWeight: "700", fontSize: 12 },
  empty: { alignItems: "center", marginTop: 60, paddingHorizontal: 30 },
  emptyTitle: { color: colors.ink, fontSize: 18, fontWeight: "700", marginTop: 15 },
  emptyText: { color: colors.muted, fontSize: 13, marginTop: 8, textAlign: "center" },
  offer: { paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.line },
  offerBody: { flexDirection: "row", alignItems: "center", gap: 11 },
  offerImage: { width: 52, height: 52, borderRadius: 10, backgroundColor: colors.pale, alignItems: "center", justifyContent: "center" },
  offerTitle: { color: colors.ink, fontSize: 13, lineHeight: 18, fontWeight: "600" },
  storeRow: { flexDirection: "row", gap: 8, marginTop: 4, alignItems: "center" },
  offerStore: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  offerFreight: { color: colors.blue, fontSize: 11, fontWeight: "600" },
  offerPrice: { color: colors.green, fontWeight: "700", fontSize: 14 },
  offerTotal: { color: colors.muted, fontSize: 10, marginTop: 2, fontWeight: "600" },
  addBtn: { flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", marginTop: 8, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.pale },
  addBtnText: { color: colors.brand, fontSize: 12, fontWeight: "700" },
  partnerTitle: { color: colors.ink, fontSize: 15, fontWeight: "700", marginTop: 24, marginBottom: 8 },
  partner: { flexDirection: "row", gap: 12, alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.line },
  partnerLogo: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  partnerName: { color: colors.ink, fontWeight: "700", fontSize: 13 },
  partnerNote: { color: colors.muted, fontSize: 11, marginTop: 3 },
});
