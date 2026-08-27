import { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/src/utils/ThemeContext";
import type { lightColors } from "@/src/theme";
import { Icon } from "@/src/components/UI";

const SLIDES = [
  {
    icon: "grid-outline" as const,
    title: "Desenhe seus cômodos",
    text: "Arraste, redimensione e organize a planta do seu jeito — ou descreva em texto e a gente monta pra você.",
  },
  {
    icon: "cube-outline" as const,
    title: "Veja em 3D de verdade",
    text: "Gire, dê zoom e isole cada andar da maquete. Sobrados ficam com térreo e andar superior bem separados.",
  },
  {
    icon: "calculator-outline" as const,
    title: "Materiais e orçamento na hora",
    text: "Cimento, tinta, piso e mais — calculados automaticamente pela área construída, com estimativa de custo total.",
  },
  {
    icon: "pricetag-outline" as const,
    title: "Compare preços e economize",
    text: "Veja ofertas de várias lojas por região, monte seu carrinho e acompanhe quanto já foi gasto na obra de verdade.",
  },
];

export function Onboarding({ visible, onDone }: { visible: boolean; onDone: () => void }) {
  const { colors } = useTheme();
  const styles = useMemo(() => buildStyles(colors), [colors]);
  const [step, setStep] = useState(0);
  const isLast = step === SLIDES.length - 1;
  const slide = SLIDES[step];

  const next = () => {
    if (isLast) {
      onDone();
    } else {
      setStep((s) => s + 1);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={styles.card} testID="onboarding-card">
          <Pressable testID="onboarding-skip" onPress={onDone} style={styles.skip} hitSlop={10}>
            <Text style={styles.skipText}>Pular</Text>
          </Pressable>

          <View style={styles.iconWrap}>
            <Icon name={slide.icon} size={40} color={colors.brand} />
          </View>
          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.text}>{slide.text}</Text>

          <View style={styles.dots}>
            {SLIDES.map((_, i) => (
              <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
            ))}
          </View>

          <Pressable testID="onboarding-next" onPress={next} style={styles.nextBtn}>
            <Text style={styles.nextBtnText}>{isLast ? "Começar a construir" : "Próximo"}</Text>
            <Icon name={isLast ? "arrow-forward-circle" : "arrow-forward"} size={18} color="#fff" />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function buildStyles(colors: typeof lightColors) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: "rgba(26,26,26,0.55)", alignItems: "center", justifyContent: "center", padding: 24 },
    card: { width: "100%", maxWidth: 380, backgroundColor: colors.bg, borderRadius: 24, padding: 28, alignItems: "center" },
    skip: { position: "absolute", top: 16, right: 18 },
    skipText: { color: colors.muted, fontWeight: "700", fontSize: 13 },
    iconWrap: { width: 76, height: 76, borderRadius: 22, backgroundColor: colors.pale, alignItems: "center", justifyContent: "center", marginTop: 16, marginBottom: 20 },
    title: { color: colors.ink, fontSize: 21, fontWeight: "700", textAlign: "center" },
    text: { color: colors.muted, fontSize: 14, textAlign: "center", lineHeight: 21, marginTop: 10, marginBottom: 26 },
    dots: { flexDirection: "row", gap: 7, marginBottom: 24 },
    dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.line },
    dotActive: { backgroundColor: colors.brand, width: 20 },
    nextBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.brand, paddingVertical: 15, borderRadius: 14, width: "100%" },
    nextBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  });
}
