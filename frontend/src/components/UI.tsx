import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/src/theme";

export function Icon({ name, size = 22, color = colors.ink }: { name: keyof typeof Ionicons.glyphMap; size?: number; color?: string }) {
  return <Ionicons name={name} size={size} color={color} />;
}

export function Button({ title, onPress, secondary = false, disabled = false, testID }: { title: string; onPress: () => void; secondary?: boolean; disabled?: boolean; testID?: string }) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [ui.button, secondary && ui.secondaryButton, disabled && ui.disabled, pressed && ui.pressed]}
    >
      <Text style={[ui.buttonText, secondary && ui.secondaryText]}>{title}</Text>
    </Pressable>
  );
}

export function Field({ label, value, onChangeText, placeholder, keyboardType = "default", secureTextEntry = false, testID }: any) {
  return (
    <View style={ui.field}>
      <Text style={ui.label}>{label}</Text>
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#A4A39D"
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        style={ui.input}
      />
    </View>
  );
}

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={ui.header}>
      <Text style={ui.title}>{title}</Text>
      {subtitle ? <Text style={ui.subtle}>{subtitle}</Text> : null}
    </View>
  );
}

export function Screen({ children, testID }: { children: React.ReactNode; testID?: string }) {
  return (
    <SafeAreaView style={ui.safe} edges={["top"]}>
      <ScrollView testID={testID} contentContainerStyle={ui.scroll} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Chip({ label, active, onPress, testID }: { label: string; active?: boolean; onPress: () => void; testID?: string }) {
  return (
    <Pressable testID={testID} onPress={onPress} style={[ui.chip, active && ui.chipActive]}>
      <Text style={[ui.chipText, active && ui.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export const ui = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 20, paddingBottom: 140 },
  field: { marginTop: 20 },
  label: { color: colors.muted, fontSize: 12, fontWeight: "700", marginBottom: 8, letterSpacing: 0.3 },
  input: { height: 50, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 15, color: colors.ink, fontSize: 16, backgroundColor: colors.white },
  button: { minHeight: 50, borderRadius: 12, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center", paddingHorizontal: 18, marginTop: 20 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  secondaryButton: { backgroundColor: colors.pale },
  secondaryText: { color: colors.brand },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },
  header: { marginBottom: 22 },
  title: { color: colors.ink, fontSize: 26, lineHeight: 32, fontWeight: "700" },
  subtle: { color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: 6 },
  chip: {
    height: 36,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 999,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  chipActive: { borderColor: colors.brand, backgroundColor: colors.pale },
  chipText: { color: colors.muted, fontSize: 13, fontWeight: "600" },
  chipTextActive: { color: colors.brand, fontWeight: "700" },
});
