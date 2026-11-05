import type { Location } from "react-router";

/** Detalhes abertos no app preservam a tela anterior; links diretos têm página própria. */
export function appointmentBackground(
  location: Location,
): Location | undefined {
  if (!/^\/consultas\/(?!nova(?:\/|$))[^/]+\/?$/.test(location.pathname)) {
    return undefined;
  }
  const candidate: unknown = location.state?.backgroundLocation;
  if (!candidate || typeof candidate !== "object") return undefined;
  const background = candidate as Partial<Location>;
  if (
    typeof background.pathname !== "string" ||
    !background.pathname.startsWith("/") ||
    background.pathname.startsWith("//") ||
    background.pathname === location.pathname ||
    typeof background.search !== "string" ||
    typeof background.hash !== "string" ||
    typeof background.key !== "string"
  ) {
    return undefined;
  }
  return background as Location;
}
