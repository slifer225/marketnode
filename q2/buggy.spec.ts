import type { User } from "./buggy";

type MockResponse = {
  ok: boolean;
  status: number;
  statusText: string;
  json: () => Promise<unknown>;
};

type FetchImpl = (url: string) => Promise<MockResponse>;

const globalWithFetch = globalThis as {
  fetch?: FetchImpl;
};
const originalFetch = globalWithFetch.fetch;

function installMockFetch(impl: FetchImpl) {
  const mock = jest.fn(impl) as jest.MockedFunction<FetchImpl>;
  globalWithFetch.fetch = mock;
  return mock;
}

afterEach(() => {
  jest.resetModules();
  jest.restoreAllMocks();
  if (originalFetch) {
    globalWithFetch.fetch = originalFetch;
  } else {
    globalWithFetch.fetch = undefined;
  }
});

describe("getUser", () => {
  it("rejects invalid payloads", async () => {
    const { getUser } = await import("./buggy");

    installMockFetch(async () => ({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({ id: 123, email: 456, role: "root" }),
    }));

    await expect(getUser("bad-payload")).rejects.toThrow(
      'Invalid user payload for "bad-payload"'
    );
  });

  it("caches frozen users while returning defensive copies", async () => {
    const { getUser } = await import("./buggy");

    const fetchMock = installMockFetch(async (url) => {
      const id = /\/api\/users\/(.+)$/.exec(url)?.[1] ?? "";
      const payload =
        id === "a1"
          ? { id: "a1", email: "a1@example.com", role: "admin", name: "Ada" }
          : { id, email: `${id}@example.com`, role: "member" };

      return {
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => payload,
      };
    });

    const first = await getUser("a1");
    const second = await getUser("a1");

    expect(first).not.toBe(second);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Mutate returned copy; cached user must stay pristine.
    (second as User).name = "Hacked";
    const third = await getUser("a1");

    expect(third.name).toBe("Ada");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("getAdmins", () => {
  it("returns only admins and keeps type guard usable", async () => {
    const { getAdmins, isAdmin } = await import("./buggy");

    installMockFetch(async (url) => {
      const id = /\/api\/users\/(.+)$/.exec(url)?.[1] ?? "";
      const payload =
        id === "a1"
          ? { id: "a1", email: "a1@example.com", role: "admin", name: "Ada" }
          : id === "m1"
          ? { id: "m1", email: "m1@example.com", role: "member" }
          : { id, email: `${id}@example.com`, role: "member" };

      return {
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => payload,
      };
    });

    const admins = await getAdmins(["a1", "m1"]);

    expect(admins).toHaveLength(1);
    expect(admins[0].role).toBe("admin");
    expect(isAdmin(admins[0])).toBe(true);

    const singleAdmin = await getAdmins(["a1"]);

    expect(singleAdmin).toHaveLength(1);
    expect(singleAdmin[0].role).toBe("admin");
    expect(isAdmin(singleAdmin[0])).toBe(true);

    const nonAdmin = await getAdmins(["m1"]);
    expect(nonAdmin).toHaveLength(0);
  });
});
