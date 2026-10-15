import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { BaseGame, BaseGameContent } from "./BaseGame";
import { BaseApiError, fetchBaseDashboard, fetchBaseOpponents, sendBaseCommand, type BaseDashboard } from "../domain/baseApi";

vi.mock("../domain/baseApi",async importOriginal=>({...await importOriginal<typeof import("../domain/baseApi")>(),fetchBaseDashboard:vi.fn(),fetchBaseOpponents:vi.fn(),sendBaseCommand:vi.fn()}));
const fixture = (): BaseDashboard => ({
  player:{user_id:"alice",display_name:"Alice",opt_in:false,credits:400,energy:3,trophies:0,levels:[1,1,1,1,1,1]},today:"2026-10-15",can_claim:true,claimed_today:false,requests:[],battles:[],
});
beforeEach(()=>{vi.clearAllMocks();sessionStorage.clear();vi.mocked(fetchBaseDashboard).mockResolvedValue(fixture());vi.mocked(fetchBaseOpponents).mockResolvedValue([]);});
afterEach(cleanup);

it("requires sign-in and never loads someone else's game for a guest",()=>{
  render(<BaseGame/>);
  expect(screen.getByText("登入後即可建立自己的基地。")).toBeInTheDocument();
  expect(fetchBaseDashboard).not.toHaveBeenCalled();
});
it("retries an uncertain upgrade with the same request ID and prevents double submits",async()=>{
  const upgraded=fixture();upgraded.player.credits=300;upgraded.player.levels[0]=2;
  vi.mocked(sendBaseCommand).mockRejectedValueOnce(new BaseApiError("network",true)).mockResolvedValue({dashboard:upgraded,battle:null});
  render(<BaseGameContent userId="alice" language="zh-TW"/>);
  const button=await screen.findByRole("button",{name:"升級 拳擊指揮所"});
  fireEvent.click(button);fireEvent.click(button);
  await screen.findByRole("button",{name:"確認上一筆操作"});
  expect(sendBaseCommand).toHaveBeenCalledTimes(1);
  const request=vi.mocked(sendBaseCommand).mock.calls[0][0];
  expect(JSON.parse(sessionStorage.getItem("corner-base-pending-alice")!).id).toBe(request.id);
  vi.mocked(fetchBaseDashboard).mockResolvedValue(upgraded);
  fireEvent.click(screen.getByRole("button",{name:"確認上一筆操作"}));
  await waitFor(()=>expect(sendBaseCommand).toHaveBeenCalledTimes(2));
  expect(vi.mocked(sendBaseCommand).mock.calls[1][0]).toEqual(request);
  await waitFor(()=>expect(sessionStorage.getItem("corner-base-pending-alice")).toBeNull());
  expect(screen.getByRole("heading",{name:/拳擊指揮所 · LV.2/})).toBeInTheDocument();
});
it("stays private until profile consent is explicitly submitted",async()=>{
  vi.mocked(sendBaseCommand).mockResolvedValue({dashboard:fixture(),battle:null});
  render(<BaseGameContent userId="alice" language="zh-TW"/>);
  const checkbox=await screen.findByRole("checkbox");
  expect(checkbox).not.toBeChecked();
  expect(sendBaseCommand).not.toHaveBeenCalled();
  fireEvent.click(checkbox);
  fireEvent.submit(screen.getByRole("button",{name:"儲存設定"}).closest("form")!);
  await waitFor(()=>expect(sendBaseCommand).toHaveBeenCalledWith(expect.objectContaining({action:"profile",args:{name:"Alice",opt_in:true}})));
});
it("clears old account responses when a different account mounts",async()=>{
  let resolveOld!: (value:BaseDashboard)=>void;
  vi.mocked(fetchBaseDashboard).mockImplementationOnce(()=>new Promise(resolve=>{resolveOld=resolve;}));
  const view=render(<BaseGameContent key="alice" userId="alice" language="zh-TW"/>);
  const bob=fixture();bob.player.user_id="bob";bob.player.display_name="Bob";
  vi.mocked(fetchBaseDashboard).mockResolvedValue(bob);
  view.rerender(<BaseGameContent key="bob" userId="bob" language="zh-TW"/>);
  await screen.findByDisplayValue("Bob");
  await act(async()=>{resolveOld(fixture());});
  expect(screen.queryByDisplayValue("Alice")).not.toBeInTheDocument();
  expect(screen.getByDisplayValue("Bob")).toBeInTheDocument();
});
it("presents a recoverable missing-migration error",async()=>{
  vi.mocked(fetchBaseDashboard).mockRejectedValue(new BaseApiError("base migration required",false));
  render(<BaseGameContent userId="alice" language="zh-TW"/>);
  expect(await screen.findByRole("alert")).toHaveTextContent("基地功能尚未在伺服器啟用");
  expect(screen.getByRole("button",{name:"重試"})).toBeEnabled();
});
