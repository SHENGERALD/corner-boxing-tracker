import { after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const alice = '00000000-0000-4000-8000-000000000001';
const bob = '00000000-0000-4000-8000-000000000002';
await db.exec(`create role anon; create role authenticated; create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth to authenticated,anon;`);
for (const file of ['20260730220000_create_user_app_states.sql','20261008000000_weekly_leaderboard.sql','20261015000000_training_base.sql']) {
  await db.exec(await readFile(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'));
}
after(()=>db.close());
const command = async (action,args={},id=randomUUID()) => (await db.query('select public.base_command($1,$2,$3) as data',[action,id,JSON.stringify(args)])).rows[0].data;
const dashboard = async () => (await db.query('select public.get_base_dashboard() as data')).rows[0].data;
const asUser = async id => { await db.exec('reset role'); await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]); await db.exec('set role authenticated'); };
beforeEach(async()=>{
  await db.exec("reset role; select set_config('request.jwt.claim.sub','',false); delete from auth.users;");
  await db.query('insert into auth.users values ($1),($2)',[alice,bob]);
  await asUser(bob); await dashboard();
  await command('profile',{name:'Bob',opt_in:true});
  await asUser(alice); await dashboard();
});

test('private by default; cannot write server resources or inspect another private player',async()=>{
  assert.equal((await dashboard()).player.opt_in,false);
  assert.equal((await db.query('select * from public.base_players')).rows.length,1);
  await assert.rejects(db.query('update public.base_players set credits=99999'),/permission denied/);
  await assert.rejects(db.query('select * from public.base_receipts'),/permission denied/);
  await assert.rejects(command('raid',{target:bob,squad:[2,2,0]}),/participation/);
});
test('anonymous callers cannot read or command the game',async()=>{
  await db.exec('reset role; set role anon');
  await assert.rejects(dashboard(),/permission denied/);
  await assert.rejects(command('upgrade',{building:0}),/permission denied/);
});
test('training must be synced; claim cannot replay even after records are removed',async()=>{
  await assert.rejects(command('claim'),/sync completed training/);
  const today=(await dashboard()).today;
  await db.query('insert into public.user_app_states(user_id,state) values($1,$2)',[alice,JSON.stringify({records:{[today]:{completedItemIds:['a']}}})]);
  const result=await command('claim');
  assert.equal(result.dashboard.player.credits,550);
  assert.equal(result.dashboard.player.energy,5);
  assert.equal((await command('claim')).dashboard.player.credits,550);
  await db.query('delete from public.user_app_states where user_id=$1',[alice]);
  assert.equal((await dashboard()).claimed_today,true);
  assert.equal((await dashboard()).can_claim,false);
});
test('past, future, malformed and removed training items cannot unlock today reward',async()=>{
  const today=(await dashboard()).today;
  await db.query('insert into public.user_app_states(user_id,state) values($1,$2)',[alice,JSON.stringify({records:{'2000-01-01':{completedItemIds:['a']},'2099-01-01':{completedItemIds:['b']},[today+'-extra']:{completedItemIds:['c']},[today]:{completedItemIds:['removed'],removedItemIds:['removed']}}})]);
  await assert.rejects(command('claim'),/sync completed training/);
});
test('upgrade is charged once and rejects altered replay IDs and invalid buildings',async()=>{
  const id=randomUUID();
  const first=await command('upgrade',{building:0},id);
  assert.equal(first.dashboard.player.credits,300);
  assert.equal((await command('upgrade',{building:0},id)).dashboard.player.levels[0],2);
  await assert.rejects(command('upgrade',{building:1},id),/request ID reused/);
  await assert.rejects(command('upgrade',{building:6}),/invalid building/);
  await command('upgrade',{building:0});
  await assert.rejects(command('upgrade',{building:0}),/insufficient supply/);
});
test('raid resolution is server-owned, idempotent and leaves defender assets intact',async()=>{
  await command('profile',{name:'Alice',opt_in:true});
  const id=randomUUID();
  const args={target:bob,squad:[2,2,0],power:99999,reward:99999};
  const first=await command('raid',args,id);
  assert.equal(first.battle.power,112);
  assert.equal(first.battle.supply,75);
  assert.equal(first.dashboard.player.energy,2);
  assert.equal(first.dashboard.player.trophies,15);
  assert.equal(first.dashboard.battle_position,1);
  assert.equal((await command('raid',args,id)).dashboard.player.energy,2);
  await assert.rejects(command('raid',{target:bob,squad:[2,2,0]}),/already raided/);
  await asUser(bob);
  const defender=await dashboard();
  assert.equal(defender.player.credits,400);
  assert.deepEqual(defender.player.levels,[1,1,1,1,1,1]);
  assert.equal(defender.battles[0].attacking,false);
});
test('retrying an old command returns current resources, not a stale snapshot',async()=>{
  const id=randomUUID();
  await command('upgrade',{building:0},id);
  await command('upgrade',{building:1});
  assert.equal((await command('upgrade',{building:0},id)).dashboard.player.credits,200);
});
test('opting out disappears from public matches and blocks pending attacks',async()=>{
  await command('profile',{name:'Alice',opt_in:true});
  await asUser(bob); await command('profile',{name:'Bob',opt_in:false});
  await asUser(alice);
  assert.equal((await db.query('select * from public.get_base_opponents()')).rows.some(row=>row.user_id===bob),false);
  await assert.rejects(command('raid',{target:bob,squad:[2,2,0]}),/unavailable/);
});
test('invalid squads and self raids cannot consume energy',async()=>{
  await command('profile',{name:'Alice',opt_in:true});
  for(const squad of [[0,0,0],[4,4,4],[-1,2,2],[1,2],null,[null,1,1],[1.5,1,1]]) {
    await assert.rejects(command('raid',{target:bob,squad}));
  }
  await assert.rejects(command('raid',{target:alice,squad:[2,2,0]}));
  assert.equal((await dashboard()).player.energy,3);
});
test('friendship requires the recipient to accept and cannot be accepted by the sender',async()=>{
  await command('profile',{name:'Alice',opt_in:true});
  await command('friend_request',{target:bob});
  assert.equal((await db.query("select * from public.get_base_opponents('',0,true)")).rows.length,0);
  await assert.rejects(command('friend_accept',{target:bob}),/invitation unavailable/);
  await asUser(bob);
  assert.equal((await dashboard()).requests[0].name,'Alice');
  await command('friend_accept',{target:alice});
  assert.equal((await db.query("select * from public.get_base_opponents('',0,true)")).rows[0].user_id,alice);
  await command('friend_remove',{target:alice});
  assert.equal((await db.query("select * from public.get_base_opponents('',0,true)")).rows.length,0);
});
test('battle rankings and search never expose private resources',async()=>{
  const rows=(await db.query("select * from public.get_base_opponents('bob',0,false)")).rows;
  assert.equal(rows.length,1);
  assert.equal(rows[0].display_name,'Bob');
  assert.equal('credits' in rows[0],false);
  assert.equal('energy' in rows[0],false);
  assert.equal('state' in rows[0],false);
});

test('concurrent duplicate request submissions spend only once',async()=>{
  const id=randomUUID();
  await Promise.all([command('upgrade',{building:0},id),command('upgrade',{building:0},id)]);
  assert.equal((await dashboard()).player.credits,300);
});
test('defense upgrades affect raids and strength mismatch cannot spend energy',async()=>{
  await asUser(bob); await command('upgrade',{building:3});
  await asUser(alice); await command('profile',{name:'Alice',opt_in:true});
  await assert.rejects(command('raid',{target:bob,squad:[1,0,0]}),/strength range/);
  assert.equal((await dashboard()).player.energy,3);
  const result=await command('raid',{target:bob,squad:[2,2,0]});
  assert.equal(result.battle.defense,110);
  assert.equal(result.battle.won,true);
});
test('zero energy and malformed profiles do not award resources',async()=>{
  await command('profile',{name:'Alice',opt_in:true});
  await db.exec('reset role');
  await db.query('update public.base_players set energy=0 where user_id=$1',[alice]);
  await asUser(alice);
  await assert.rejects(command('raid',{target:bob,squad:[2,2,0]}),/insufficient energy/);
  await assert.rejects(command('profile',{name:'A',opt_in:true}),/invalid profile/);
  await assert.rejects(command('profile',{name:'Alice',opt_in:'yes'}),/invalid profile/);
  assert.equal((await dashboard()).player.trophies,0);
});

test('recommended targets sort by power, while ranking order stays independent',async()=>{
  await command('profile',{name:'Alice',opt_in:true});
  await db.exec('reset role');
  await db.query('update public.base_players set levels=array[1,1,1,3,3,3],trophies=100 where user_id=$1',[bob]);
  await asUser(alice);
  const ranking=(await db.query("select * from public.get_base_opponents('',0,false)")).rows;
  assert.equal(ranking[0].user_id,bob);
  const matches=(await db.query("select * from public.get_base_opponents('',0,false,95)")).rows;
  assert.equal(matches[0].user_id,alice);
  assert.equal((await dashboard()).battle_position,2);
});
test('deployment smoke script rolls back every test identity',async()=>{
  await db.exec(await readFile(new URL('../supabase/tests/training_base_smoke.sql',import.meta.url),'utf8'));
  const {rows}=await db.query("select count(*)::int as count from auth.users where id::text like 'dd000000-%'");
  assert.equal(rows[0].count,0);
});
