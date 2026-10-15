import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { BasePreview } from "./BasePreview";
import { BASE_PREVIEW_KEY } from "../domain/basePreview";

beforeEach(() => { localStorage.clear(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
it("persists a raid once, blocks double taps and shows its result", () => {
  vi.useFakeTimers();
  render(<BasePreview />);
  fireEvent.click(screen.getByRole("button", { name: "出征" }));
  fireEvent.click(screen.getByRole("button", { name: "查看基地 IRON CAMP" }));
  fireEvent.click(screen.getByRole("button", { name: "增加 重裝兵" }));
  const attack = screen.getByRole("button", { name: /開始突襲/ });
  fireEvent.click(attack);
  fireEvent.click(attack);
  expect(JSON.parse(localStorage.getItem(BASE_PREVIEW_KEY)!).battles).toBe(1);
  expect(screen.getByRole("button", { name: /交戰中/ })).toBeDisabled();
  act(() => { vi.advanceTimersByTime(2500); });
  expect(screen.getByRole("heading", { name: "攻佔成功" })).toBeInTheDocument();
});

it("browses, searches friends and scouts without spending resources", () => {
  render(<BasePreview />);
  fireEvent.click(screen.getByRole("button", { name: "出征" }));
  expect(screen.getByRole("heading", { name: "選擇突襲目標" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /開始突襲/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "換一批" }));
  expect(screen.queryByRole("button", { name: "查看基地 IRON CAMP" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "好友挑戰" }));
  expect(screen.queryByRole("button", { name: "查看基地 RED RIDGE" })).not.toBeInTheDocument();
  fireEvent.change(screen.getByRole("textbox", { name: "搜尋暱稱或基地" }), { target: { value: "夜行者" } });
  fireEvent.click(screen.getByRole("button", { name: "查看基地 NIGHT WATCH" }));
  expect(screen.getByRole("heading", { name: "NIGHT WATCH" })).toBeInTheDocument();
  expect(localStorage.getItem(BASE_PREVIEW_KEY)).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "對手名單" }));
  fireEvent.change(screen.getByRole("textbox", { name: "搜尋暱稱或基地" }), { target: { value: "nobody-matches" } });
  expect(screen.getByRole("status")).toHaveTextContent("找不到符合的基地");
  fireEvent.click(screen.getByRole("button", { name: "清除搜尋" }));
  expect(screen.getByRole("button", { name: "查看基地 IRON CAMP" })).toBeInTheDocument();
});

it("opens rankings on weekly training and keeps demo battle trophies separate", () => {
  render(<BasePreview />);
  fireEvent.click(screen.getByRole("button", { name: "排行榜" }));
  expect(screen.getByRole("button", { name: "訓練週榜" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByText("登入後可查看排行榜")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "對戰榜" }));
  expect(screen.getByLabelText("我的對戰排名")).toHaveTextContent("#9");
  expect(screen.queryByText("Private")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "示範好友" }));
  expect(screen.queryByText("Ruby")).not.toBeInTheDocument();
  expect(screen.getByText("鐵拳阿凱")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "查看基地 IRON CAMP" }));
  expect(screen.getByRole("heading", { name: "IRON CAMP" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "出征" })).toHaveAttribute("aria-pressed", "true");
  expect(localStorage.getItem(BASE_PREVIEW_KEY)).toBeNull();
});
