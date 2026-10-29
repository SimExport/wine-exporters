import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { parisDayBoundsUtc } from "./paris-day.ts";

Deno.test("parisDayBoundsUtc — winter day (CET, UTC+1)", () => {
  const { start, end } = parisDayBoundsUtc(new Date("2026-01-15T12:00:00Z"));
  assertEquals(start.toISOString(), "2026-01-14T23:00:00.000Z");
  assertEquals(end.toISOString(), "2026-01-15T23:00:00.000Z");
});

Deno.test("parisDayBoundsUtc — summer day (CEST, UTC+2)", () => {
  const { start, end } = parisDayBoundsUtc(new Date("2026-07-15T12:00:00Z"));
  assertEquals(start.toISOString(), "2026-07-14T22:00:00.000Z");
  assertEquals(end.toISOString(), "2026-07-15T22:00:00.000Z");
});

Deno.test("parisDayBoundsUtc — 23:30 UTC is already tomorrow in Paris (winter)", () => {
  const { start } = parisDayBoundsUtc(new Date("2026-01-15T23:30:00Z"));
  assertEquals(start.toISOString(), "2026-01-15T23:00:00.000Z");
});

Deno.test("parisDayBoundsUtc — 22:30 UTC is still today in Paris (winter)", () => {
  const { start } = parisDayBoundsUtc(new Date("2026-01-15T22:30:00Z"));
  assertEquals(start.toISOString(), "2026-01-14T23:00:00.000Z");
});

Deno.test("parisDayBoundsUtc — DST switch day (29 Mar 2026) spans 23 hours", () => {
  const { start, end } = parisDayBoundsUtc(new Date("2026-03-29T12:00:00Z"));
  assertEquals(start.toISOString(), "2026-03-28T23:00:00.000Z");
  assertEquals(end.toISOString(), "2026-03-29T22:00:00.000Z");
});
