import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";

/** Abre a rota para requisições sem Bearer. O guard global é a regra; isto é a exceção. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
