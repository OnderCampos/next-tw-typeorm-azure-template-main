import { afterEach, describe, expect, it, vi } from "vitest";
import { HttpClient } from "./index";

describe("HttpClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("posts JSON payloads and returns the decoded response without network I/O", async () => {
    const json = vi.fn().mockResolvedValue({ instanceId: "workflow-1" });
    const fetchMock = vi.fn().mockResolvedValue({ json });
    vi.stubGlobal("fetch", fetchMock);

    await expect(HttpClient.post("https://durable.test/start", { orderId: 7 })).resolves.toEqual({
      instanceId: "workflow-1",
    });
    expect(fetchMock).toHaveBeenCalledWith("https://durable.test/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: 7 }),
    });
  });

  it("gets a URL and returns its decoded response without network I/O", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ json: vi.fn().mockResolvedValue({ ok: true }) });
    vi.stubGlobal("fetch", fetchMock);

    await expect(HttpClient.get("https://durable.test/status")).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith("https://durable.test/status");
  });
});
