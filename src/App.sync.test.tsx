import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { createEmptyState, type AppState } from "./domain/storage";

const backend = vi.hoisted(() => ({ state: null as AppState | null, revision: 1, writes: 0, failWrites: false }));

vi.mock("./domain/supabase", () => {
  const channel = { on: () => channel, subscribe: () => channel };
  return {
    isSupabaseConfigured: true,
    getAuthRedirectUrl: () => "http://127.0.0.1/",
    supabase: {
      auth: {
        getSession: async () => ({ data: { session: { user: { id: "user-1", email: "tester@example.com" } } } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: backend.state && { state: structuredClone(backend.state), revision: backend.revision, updated_at: new Date().toISOString() }, error: null }),
          }),
        }),
      }),
      rpc: async (_name: string, args: { next_state: AppState }) => {
        if (backend.failWrites) return { data: null, error: { message: "offline" } };
        backend.state = structuredClone(args.next_state);
        backend.revision += 1;
        backend.writes += 1;
        return { data: [{ revision: backend.revision, updated_at: new Date().toISOString() }], error: null };
      },
      channel: () => channel,
      removeChannel: async () => {},
    },
  };
});

describe("cloud catch-up", () => {
  beforeEach(() => {
    localStorage.clear();
    backend.state = createEmptyState();
    backend.revision = 1;
    backend.writes = 0;
    backend.failWrites = false;
  });

  it("pulls a missed update when the app regains focus", async () => {
    render(<App initialDate={new Date(2026, 6, 30, 12)} />);
    await waitFor(() => expect(backend.writes).toBeGreaterThan(0));
    expect(screen.getByRole("checkbox", { name: /一對一教練課/ })).not.toBeChecked();

    backend.state!.records["2026-07-30"] = {
      completedItemIds: ["coach-class"],
      updatedAt: "2026-08-01T00:00:00.000Z",
    };
    backend.revision += 1;
    fireEvent.focus(window);

    await waitFor(() => expect(screen.getByRole("checkbox", { name: /一對一教練課/ })).toBeChecked());
  });

  it("keeps an offline local edit and retries its upload on focus", async () => {
    const user = userEvent.setup();
    render(<App initialDate={new Date(2026, 6, 30, 12)} />);
    await waitFor(() => expect(backend.writes).toBeGreaterThan(0));

    backend.failWrites = true;
    await user.click(screen.getByRole("checkbox", { name: /一對一教練課/ }));
    await waitFor(() => expect(screen.getByRole("button", { name: "帳號與同步" })).toHaveTextContent("同步失敗"));
    expect(backend.state!.records["2026-07-30"]).toBeUndefined();

    backend.failWrites = false;
    fireEvent.focus(window);
    await waitFor(() => expect(backend.state!.records["2026-07-30"]?.completedItemIds).toContain("coach-class"));
    expect(screen.getByRole("checkbox", { name: /一對一教練課/ })).toBeChecked();
  });
});
