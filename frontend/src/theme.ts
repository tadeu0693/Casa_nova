export const lightColors = {
  bg: "#F8F7F4",
  ink: "#1A1A1A",
  muted: "#706F6A",
  line: "#E2DFD8",
  card: "#EFECE6",
  brand: "#C85A32",
  brandDark: "#A9451C",
  pale: "#FCECE6",
  green: "#388E3C",
  blue: "#335C67",
  warn: "#F57C00",
  error: "#D32F2F",
  white: "#FFFFFF",
  dim: "#BDBCB6",
};

export const darkColors = {
  bg: "#16140F",
  ink: "#F5F2EC",
  muted: "#A9A69D",
  line: "#332E27",
  card: "#211D18",
  brand: "#E2895F",
  brandDark: "#C85A32",
  pale: "#3A2A22",
  green: "#5FBF6A",
  blue: "#7FA8B4",
  warn: "#FFA94D",
  error: "#FF6B6B",
  white: "#FFFFFF",
  dim: "#57534A",
};

// Backward-compat default export — screens not yet migrated to useTheme() keep
// working (in light colors) while the rest of the app adopts dark mode gradually.
export const colors = lightColors;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
