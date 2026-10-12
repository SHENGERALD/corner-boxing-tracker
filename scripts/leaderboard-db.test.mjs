import { after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

let db;
let week;
let today;
const alice = '00000000-0000-0000-0000-000000000001';
const bob = '00000000-0000-0000-0000-000000000002';

await (async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    grant usage on schema auth to authenticated, anon;
  `);
  for (const file of ['20260730220000_create_user_app_states.sql', '20261008000000_weekly_leaderboard.sql']) {
    await db.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8'));
  }
  const result = await db.query("select date_trunc('week', now() at time zone 'UTC')::date::text as week, (now() at time zone 'UTC')::date::text as today");
  ({ week, today } = result.rows[0]);
})();
after(async () => { await db?.close(); });
beforeEach(async () => {
  await db.exec("reset role; select set_config('request.jwt.claim.sub', '', false); delete from auth.users;");
});

async function seed(id, name, records, optIn = true) {
  await db.query('insert into auth.users values ($1)', [id]);
  await db.query('insert into public.user_app_states (user_id, state) values ($1, $2)', [id, JSON.stringify({ records })]);
  if (name !== null) await db.query('insert into public.leaderboard_profiles (user_id, display_name, opt_in) values ($1, $2, $3)', [id, name, optIn]);
}
async function asUser(id) {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
  await db.exec('set role authenticated');
}
const complete = (...ids) => ({ completedItemIds: ids });

test('production smoke script passes and leaves no test identities behind', async () => {
  await db.exec(await readFile(new URL('../supabase/tests/weekly_leaderboard_smoke.sql', import.meta.url), 'utf8'));
  assert.equal((await db.query('select count(*)::int as count from auth.users')).rows[0].count, 0);
});

test('migration executes and deduplicates completed items across sources', async () => {
  const record = { ...complete('a', 'a', 'removed'), removedItemIds: ['removed'], customItems: [{ id: 'a', completed: true }, { id: 'b', completed: true }], itemSetLogs: { b: [{ completed: true }], c: [{ completed: true }, { completed: true }], bad: 42 } };
  const result = await db.query('select public.leaderboard_completed_items($1::jsonb) as count', [JSON.stringify(record)]);
  assert.equal(result.rows[0].count, 3);
});

test('default participation is private and opt-out disappears immediately', async () => {
  await seed(alice, 'Alice', { [today]: complete('a') });
  await seed(bob, 'Bob', { [today]: complete('b') }, false);
  await asUser(alice);
  let result = await db.query('select * from public.get_weekly_leaderboard()');
  assert.deepEqual(result.rows.map(row => row.display_name), ['Alice']);
  assert.equal(result.rows[0].points, 25);
  await db.query('update public.leaderboard_profiles set opt_in = false where user_id = $1', [alice]);
  result = await db.query('select * from public.get_weekly_leaderboard()');
  assert.equal(result.rows.length, 0);
});

test('RLS prevents reading or changing another profile or training records', async () => {
  await seed(alice, 'Alice', {});
  await seed(bob, 'Bob', {});
  await asUser(alice);
  assert.equal((await db.query('select * from public.leaderboard_profiles')).rows.length, 1);
  assert.equal((await db.query('select * from public.user_app_states')).rows.length, 1);
  const result = await db.query('update public.leaderboard_profiles set opt_in = false where user_id = $1 returning user_id', [bob]);
  assert.equal(result.rows.length, 0);
  await assert.rejects(db.query('insert into public.leaderboard_profiles values ($1, $2, true, now()) on conflict(user_id) do update set opt_in = true', [bob, 'Hacked']), /row-level security/);
});

test('anonymous callers cannot read profiles or execute the ranking RPC', async () => {
  await db.exec('set role anon');
  await assert.rejects(db.query('select * from public.leaderboard_profiles'), /permission denied/);
  await assert.rejects(db.query('select * from public.get_weekly_leaderboard()'), /permission denied/);
});

test('daily points are capped and malformed date keys never count as extra days', async () => {
  await seed(alice, 'Alice', { [today]: complete('a', 'b', 'c', 'd', 'e', 'f'), [`${week}-extra`]: complete('fake') });
  await asUser(alice);
  const { rows } = await db.query('select * from public.get_weekly_leaderboard()');
  assert.equal(rows[0].points, 45);
  assert.equal(rows[0].training_days, 1);
  assert.deepEqual(Object.keys(rows[0]), ['week_start', 'position', 'display_name', 'points', 'training_days', 'is_me']);
});

test('only the current week counts', async () => {
  await seed(alice, 'Alice', { '2000-01-01': complete('old'), '2099-01-01': complete('future'), [today]: complete('current') });
  await asUser(alice);
  const { rows } = await db.query('select * from public.get_weekly_leaderboard()');
  assert.equal(rows[0].points, 25);
});

test('top 50 stays bounded even with tied scores, while including the caller', async () => {
  for (let i = 1; i <= 55; i++) {
    const id = `00000000-0000-0000-0000-${String(i).padStart(12, '0')}`;
    await seed(id, `Player ${String(i).padStart(2, '0')}`, {});
  }
  await asUser('00000000-0000-0000-0000-000000000055');
  const { rows } = await db.query('select * from public.get_weekly_leaderboard()');
  assert.equal(rows.length, 51);
  assert.equal(rows.filter(row => row.is_me).length, 1);
  assert.equal(rows.at(-1).display_name, 'Player 55');
});
