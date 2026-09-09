import { CursorOptionsDto } from "../dto/cursor-page.dto";
import { PageMetaDto } from "../dto/page.dto";
import { PageOptionsDto } from "../dto/page-options.dto";
import { AppException } from "../exceptions/app.exception";
import { CursorSerializer } from "./cursor.serializer";
import { paginate, paginateByCursor } from "./paginate.util";

describe("PageMetaDto", () => {
  it("calcula meta de paginação (1.248 pacientes, 12 por página)", () => {
    const options = Object.assign(new PageOptionsDto(), { page: 1, limit: 12 });
    const meta = new PageMetaDto({ pageOptionsDto: options, itemCount: 1248 });

    expect(meta.pageCount).toBe(104);
    expect(meta.hasPreviousPage).toBe(false);
    expect(meta.hasNextPage).toBe(true);
  });

  it("marca a última página como sem próxima", () => {
    const options = Object.assign(new PageOptionsDto(), {
      page: 104,
      limit: 12,
    });
    const meta = new PageMetaDto({ pageOptionsDto: options, itemCount: 1248 });

    expect(meta.hasNextPage).toBe(false);
    expect(meta.hasPreviousPage).toBe(true);
  });

  it("não quebra com resultado vazio", () => {
    const options = Object.assign(new PageOptionsDto(), { page: 1, limit: 10 });
    const meta = new PageMetaDto({ pageOptionsDto: options, itemCount: 0 });

    expect(meta.pageCount).toBe(0);
    expect(meta.hasNextPage).toBe(false);
  });
});

describe("PageOptionsDto", () => {
  it("calcula o skip a partir da página", () => {
    const options = Object.assign(new PageOptionsDto(), { page: 3, limit: 12 });
    expect(options.skip).toBe(24);
  });
});

describe("paginate", () => {
  it("passa skip e take para a consulta e monta o envelope", async () => {
    const options = Object.assign(new PageOptionsDto(), { page: 2, limit: 10 });
    const findMany = jest.fn().mockResolvedValue([{ id: "a" }]);
    const count = jest.fn().mockResolvedValue(35);

    const page = await paginate(options, findMany, count);

    expect(findMany).toHaveBeenCalledWith({ skip: 10, take: 10 });
    expect(page.data).toHaveLength(1);
    expect(page.meta.pageCount).toBe(4);
  });
});

describe("CursorSerializer", () => {
  it("faz ida e volta preservando a tupla de ordenação", () => {
    const at = new Date("2026-09-11T12:32:00.000Z");

    const decoded = CursorSerializer.decode(
      CursorSerializer.encode({ at, id: "abc" }),
    );

    expect(decoded.id).toBe("abc");
    expect(new Date(decoded.at).toISOString()).toBe(at.toISOString());
  });

  it("recusa cursor adulterado com erro de validação", () => {
    expect(() => CursorSerializer.decode("nao-e-um-cursor")).toThrow(
      AppException,
    );
  });
});

interface Row {
  id: string;
  createdAt: Date;
}

describe("paginateByCursor", () => {
  it("usa a regra do limit + 1 e devolve o cursor do último item", async () => {
    const options = Object.assign(new CursorOptionsDto(), { limit: 2 });
    const rows = [
      { id: "3", createdAt: new Date("2026-09-11T10:00:00Z") },
      { id: "2", createdAt: new Date("2026-09-10T10:00:00Z") },
      { id: "1", createdAt: new Date("2026-09-09T10:00:00Z") },
    ];
    const findMany = jest.fn().mockResolvedValue(rows);

    const page = await paginateByCursor<Row>(options, findMany, (row) => ({
      at: row.createdAt,
      id: row.id,
    }));

    expect(findMany).toHaveBeenCalledWith({ take: 3, cursor: null });
    expect(page.data).toHaveLength(2);
    expect(page.meta.hasNextPage).toBe(true);
    expect(CursorSerializer.decode(page.meta.nextCursor as string).id).toBe(
      "2",
    );
  });

  it("encerra a paginação quando não há item extra", async () => {
    const options = Object.assign(new CursorOptionsDto(), { limit: 5 });
    const findMany = jest
      .fn()
      .mockResolvedValue([{ id: "1", createdAt: new Date() }]);

    const page = await paginateByCursor<Row>(options, findMany, (row) => ({
      at: row.createdAt,
      id: row.id,
    }));

    expect(page.meta.hasNextPage).toBe(false);
    expect(page.meta.nextCursor).toBeNull();
  });
});
