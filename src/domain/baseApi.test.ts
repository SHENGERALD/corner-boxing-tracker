import { beforeEach, expect, it, vi } from "vitest";
import { BaseApiError, fetchBaseDashboard, fetchBaseOpponents, sendBaseCommand } from "./baseApi";

const mocks = vi.hoisted(()=>({rpc:vi.fn()}));
vi.mock("./supabase",()=>({supabase:{rpc:mocks.rpc}}));
beforeEach(()=>{mocks.rpc.mockReset();mocks.rpc.mockResolvedValue({data:{},error:null});});
it("only calls authenticated game RPCs and preserves idempotency parameters",async()=>{
  await fetchBaseDashboard();
  await fetchBaseOpponents("Bob",20,true);
  await sendBaseCommand({action:"raid",id:"request-1",args:{target:"bob",squad:[2,2,0]}});
  expect(mocks.rpc).toHaveBeenNthCalledWith(1,"get_base_dashboard",undefined);
  expect(mocks.rpc).toHaveBeenNthCalledWith(2,"get_base_opponents",{p_search:"Bob",p_offset:20,p_friends_only:true});
  expect(mocks.rpc).toHaveBeenNthCalledWith(3,"base_command",{p_action:"raid",p_request_id:"request-1",p_args:{target:"bob",squad:[2,2,0]}});
});
it("distinguishes uncertain network outcomes from known server refusals",async()=>{
  mocks.rpc.mockResolvedValueOnce({data:null,error:{code:"",message:"network"}});
  await expect(sendBaseCommand({action:"claim",id:"x",args:{}})).rejects.toMatchObject({uncertain:true});
  mocks.rpc.mockResolvedValueOnce({data:null,error:{code:"P0001",message:"insufficient supply"}});
  await expect(sendBaseCommand({action:"upgrade",id:"x",args:{building:0}})).rejects.toMatchObject({uncertain:false});
  mocks.rpc.mockResolvedValueOnce({data:null,error:{code:"PGRST202",message:"missing"}});
  await expect(fetchBaseDashboard()).rejects.toEqual(new BaseApiError("base migration required",false));
});
