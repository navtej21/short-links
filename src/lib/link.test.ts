import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createLink, InvalidUrlError, RateLimitError, MAX_LINKS_PER_HOUR } from "./links";

const single = vi.fn();
const recentCount = vi.fn();

// Mirrors the real chains:
//   from().insert().select().single()
//   from().select().eq().gte()  (rate-limit count)
const client = {
  from: () => ({
    insert: () => ({
      select: () => ({ single }),
    }),
    select: () => ({
      eq: () => ({ gte: recentCount }),
    }),
  }),
} as unknown as SupabaseClient;

const input = { targetUrl: "https://example.com", userId: "user-1" };

const row = {
  id: "11111111-1111-1111-1111-111111111111",
  code: "aB3xK9q",
  target_url: "https://example.com/",
  user_id: "user-1",
  is_active: true,
  expires_at: null,
  created_at: "2026-10-09T00:00:00Z",
};

const collision = {
  data: null,
  error: { code: "23505", message: "duplicate key" },
};

describe("createLink", () => {
  beforeEach(() => {
    single.mockReset();
    recentCount.mockReset();
    recentCount.mockResolvedValue({ count: 0, error: null });
  });

  it("refuses when the user hit the hourly limit", async () => {
    recentCount.mockResolvedValue({ count: MAX_LINKS_PER_HOUR, error: null });

    await expect(createLink(client, input)).rejects.toThrow(RateLimitError);
    expect(single).not.toHaveBeenCalled();
  });

  it("allows creation just under the limit", async () => {
    recentCount.mockResolvedValue({ count: MAX_LINKS_PER_HOUR - 1, error: null });
    single.mockResolvedValueOnce({ data: row, error: null });

    await expect(createLink(client, input)).resolves.toEqual(row);
  });

  it("retries after a code collision and then succeeds", async () => {
    single
      .mockResolvedValueOnce(collision)
      .mockResolvedValueOnce({ data: row, error: null });

    const result = await createLink(client, input);

    expect(result).toEqual(row);
    expect(single).toHaveBeenCalledTimes(2);
  });

  it("gives up after 5 collisions", async () => {
    single.mockResolvedValue(collision);

    await expect(createLink(client, input)).rejects.toThrow("unique code");
    expect(single).toHaveBeenCalledTimes(5);
  });

  it("does not retry on a non-collision error", async () => {
    single.mockResolvedValue({
      data: null,
      error: { code: "42501", message: "permission denied" },
    });

    await expect(createLink(client, input)).rejects.toThrow(
      "Failed to create link"
    );
    expect(single).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid URLs with InvalidUrlError and never hits the database", async () => {
    for (const bad of ["not a url", "javascript:alert(1)", "ftp://example.com"]) {
      await expect(
        createLink(client, { targetUrl: bad, userId: "user-1" })
      ).rejects.toThrow(InvalidUrlError);
    }
    expect(single).not.toHaveBeenCalled();
  });
});