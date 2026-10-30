import { webDarkTheme, webLightTheme } from "@fluentui/tokens";

/**
 * Translate the published Fluent 2 web themes into ClinicFlow's semantic CSS
 * contract. The product keeps its own accessible controls and clinical states;
 * shared neutral, brand, typography and radius values come from Fluent.
 */
export function applyFluentTheme(resolved: "light" | "dark"): void {
  const fluent = resolved === "dark" ? webDarkTheme : webLightTheme;
  const root = document.documentElement.style;
  const values: Record<string, string> = {
    "--color-surface-base": fluent.colorNeutralBackground1,
    "--color-surface-raised":
      resolved === "dark"
        ? fluent.colorNeutralBackground1
        : fluent.colorNeutralBackground2,
    "--color-border-subtle": fluent.colorNeutralStroke2,
    "--color-border-default": fluent.colorNeutralStroke1,
    "--color-ink-primary": fluent.colorNeutralForeground1,
    "--color-ink-secondary": fluent.colorNeutralForeground2,
    "--color-ink-tertiary": fluent.colorNeutralForeground3,
    "--color-accent": fluent.colorBrandBackground,
    "--color-accent-hover": fluent.colorBrandBackgroundHover,
    "--color-accent-active": fluent.colorBrandBackgroundPressed,
    "--color-accent-weak": fluent.colorBrandBackground2,
    "--color-accent-ink":
      resolved === "dark"
        ? fluent.colorBrandForeground2
        : fluent.colorBrandForeground1,
    "--color-danger-weak": fluent.colorPaletteRedBackground1,
    "--font-sans": fluent.fontFamilyBase,
    "--radius-marker": fluent.borderRadiusMedium,
    "--radius-control": fluent.borderRadiusMedium,
    "--radius-raised": fluent.borderRadiusLarge,
  };

  for (const [name, value] of Object.entries(values)) {
    root.setProperty(name, value);
  }
}
