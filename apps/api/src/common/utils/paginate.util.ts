import {
  CursorMetaDto,
  CursorOptionsDto,
  CursorPageDto,
} from "../dto/cursor-page.dto";
import { PageDto, PageMetaDto } from "../dto/page.dto";
import { PageOptionsDto } from "../dto/page-options.dto";
import { CursorSerializer } from "./cursor.serializer";

/**
 * Paginação por offset sobre Prisma.
 *
 * `findMany` e `count` correm em paralelo, não numa transação: uma listagem
 * tolera que o total esteja um registro defasado, e serializar as duas queries
 * dobraria o tempo do painel do dia sem ninguém perceber a diferença.
 */
export async function paginate<T>(
  options: PageOptionsDto,
  findMany: (args: { skip: number; take: number }) => Promise<T[]>,
  count: () => Promise<number>,
): Promise<PageDto<T>> {
  const [items, itemCount] = await Promise.all([
    findMany({ skip: options.skip, take: options.limit }),
    count(),
  ]);
  return new PageDto(
    items,
    new PageMetaDto({ pageOptionsDto: options, itemCount }),
  );
}

/**
 * Paginação por cursor (método seek).
 *
 * Busca `limit + 1` itens: se voltar o extra, existe próxima página — sem um
 * `COUNT(*)` que varreria a tabela inteira a cada rolagem do histórico.
 * `keyOf` extrai a tupla de ordenação (coluna temporal + id como tie-breaker).
 */
export async function paginateByCursor<T>(
  options: CursorOptionsDto,
  findMany: (args: {
    take: number;
    cursor: { at: Date; id: string } | null;
  }) => Promise<T[]>,
  keyOf: (item: T) => { at: Date; id: string },
): Promise<CursorPageDto<T>> {
  const decoded = options.cursor
    ? CursorSerializer.decode(options.cursor)
    : null;

  const rows = await findMany({
    take: options.limit + 1,
    cursor: decoded ? { at: new Date(decoded.at), id: decoded.id } : null,
  });

  const hasNextPage = rows.length > options.limit;
  const data = hasNextPage ? rows.slice(0, options.limit) : rows;
  const last = data.at(-1);

  return new CursorPageDto(
    data,
    new CursorMetaDto(
      hasNextPage,
      hasNextPage && last ? CursorSerializer.encode(keyOf(last)) : null,
    ),
  );
}
