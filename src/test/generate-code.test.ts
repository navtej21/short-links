import { createLink } from "@/lib/links";
import { describe, it, expect, vi, beforeEach } from "vitest";


// vi.mock is hoisted above imports, so anything it references must be
// created with vi.hoisted, or you get "cannot access before initialization".
const { single } = vi.hoisted(() => ({ single: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("./supabase/server", () => ({
  supabase: {
    from: () => ({
      insert: () => ({
        select: () => ({ single }),
      }),
    }),
  },
}));


const row = {
  id: "11111111-1111-1111-1111-111111111111",
  code: "aB3xK9q",
  target_url: "https://example.com/",
  user_id: null,
  is_active: true,
  expires_at: null,
  created_at: "2026-10-09T00:00:00Z",
};

const collision = { data: null, error: { code: "23505", message: "duplicate key" } };

describe("createLink", () => {
  beforeEach(() => {
    single.mockReset();
  });

  it("retries after a code collision and then succeeds", async () => {
    single
      .mockResolvedValueOnce(collision)
      .mockResolvedValueOnce({ data: row, error: null });

    const result = await createLink({ targetUrl: "https://example.com" });

    expect(result).toEqual(row);
    expect(single).toHaveBeenCalledTimes(2);
  });

  it("gives up after 5 collisions", async () => {
    single.mockResolvedValue(collision);

    await expect(
      createLink({ targetUrl: "https://example.com" })
    ).rejects.toThrow("unique code");
    expect(single).toHaveBeenCalledTimes(5);
  });

  it("does not retry on a non-collision error", async () => {
    single.mockResolvedValue({
      data: null,
      error: { code: "42501", message: "permission denied" },
    });

    await expect(
      createLink({ targetUrl: "https://example.com" })
    ).rejects.toThrow("Failed to create link");
    expect(single).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid or non-http URLs without touching the database", async () => {
    for (const bad of ["not a url", "javascript:alert(1)", "ftp://example.com"]) {
      await expect(createLink({ targetUrl: bad })).rejects.toThrow();
    }
    expect(single).not.toHaveBeenCalled();
  });
});