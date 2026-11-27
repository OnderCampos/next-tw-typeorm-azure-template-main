import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const post = vi.hoisted(() => vi.fn());
vi.mock("@infra/http", () => ({ HttpClient: { post } }));
const request = (body: unknown) => ({ json: vi.fn().mockResolvedValue(body) }) as any;
const originalEnv = process.env;

describe("POST /api/workflows", () => {
  beforeEach(() => { process.env = { ...originalEnv, DURABLE_FUNCTIONS_URL: "https://durable.test" }; vi.resetModules(); });
  afterEach(() => { process.env = originalEnv; vi.clearAllMocks(); vi.restoreAllMocks(); });

  it("forwards workflows to the mediated Durable Functions client", async () => {
    const { POST } = await import("./route");
    post.mockResolvedValue({ instanceId: "instance-1" });
    const response = await POST(request({ workflowName: "sample", input: { id: 1 } }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ instanceId: "instance-1" });
    expect(post).toHaveBeenCalledWith("https://durable.test/api/orchestrators/sample", { id: 1 });
  });

  it("returns Error messages and safe unknown errors", async () => {
    const { POST } = await import("./route");
    post.mockRejectedValueOnce(new Error("workflow unavailable")).mockRejectedValueOnce("unexpected");
    const errorResponse = await POST(request({ workflowName: "sample", input: {} }));
    const unknownResponse = await POST(request({ workflowName: "sample", input: {} }));
    expect(errorResponse.status).toBe(500);
    await expect(errorResponse.json()).resolves.toEqual({ error: "workflow unavailable" });
    await expect(unknownResponse.json()).resolves.toEqual({ error: "Unknown error" });
  });
});
