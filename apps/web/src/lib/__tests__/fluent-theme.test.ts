import { webDarkTheme, webLightTheme } from "@fluentui/tokens";
import { afterEach, describe, expect, it, vi } from "vitest";
import { applyFluentTheme } from "../fluent-theme";

const clinicalStateToken = "--color-state-espera";
const cssPropertiesUnderTest = [
  "--color-surface-base",
  "--color-ink-primary",
  "--color-accent",
  "--color-accent-hover",
  "--color-accent-active",
  "--color-accent-ink",
  "--font-sans",
];

describe("applyFluentTheme", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    for (const property of [...cssPropertiesUnderTest, clinicalStateToken]) {
      document.documentElement.style.removeProperty(property);
    }
  });

  it("resolves official brand and ink tokens on light → dark → light switches", () => {
    const rootStyle = document.documentElement.style;

    for (const [resolved, fluent] of [
      ["light", webLightTheme],
      ["dark", webDarkTheme],
      ["light", webLightTheme],
    ] as const) {
      applyFluentTheme(resolved);

      expect(rootStyle.getPropertyValue("--color-surface-base")).toBe(
        fluent.colorNeutralBackground1,
      );
      expect(rootStyle.getPropertyValue("--color-ink-primary")).toBe(
        fluent.colorNeutralForeground1,
      );
      expect(rootStyle.getPropertyValue("--color-accent")).toBe(
        fluent.colorBrandBackground,
      );
      expect(rootStyle.getPropertyValue("--color-accent-hover")).toBe(
        fluent.colorBrandBackgroundHover,
      );
      expect(rootStyle.getPropertyValue("--color-accent-active")).toBe(
        fluent.colorBrandBackgroundPressed,
      );
      expect(rootStyle.getPropertyValue("--color-accent-ink")).toBe(
        resolved === "dark"
          ? fluent.colorBrandForeground2
          : fluent.colorBrandForeground1,
      );
      expect(rootStyle.getPropertyValue("--font-sans")).toBe(
        fluent.fontFamilyBase,
      );
    }
  });

  it("leaves clinical-state styling alone and writes only semantic CSS variables", () => {
    const rootStyle = document.documentElement.style;
    rootStyle.setProperty(clinicalStateToken, "var(--clinic-waiting-color)");
    const setProperty = vi.spyOn(rootStyle, "setProperty");

    applyFluentTheme("dark");

    const writtenProperties = setProperty.mock.calls.map(
      ([property]) => property,
    );
    expect(writtenProperties).not.toContain(clinicalStateToken);
    expect(
      writtenProperties.every((property) =>
        /^--(?:color|font|radius)-[a-z0-9-]+$/.test(property),
      ),
    ).toBe(true);
    expect(rootStyle.getPropertyValue(clinicalStateToken)).toBe(
      "var(--clinic-waiting-color)",
    );
  });
});
