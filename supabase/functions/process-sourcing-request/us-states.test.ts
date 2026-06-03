import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { expandUsStateVariants, normalizeUsState } from "./us-states.ts";

Deno.test("normalizeUsState handles bare names", () => {
  assertEquals(normalizeUsState("California"), "California");
  assertEquals(normalizeUsState("District of Columbia"), "District of Columbia");
});

Deno.test("normalizeUsState strips comma suffixes", () => {
  assertEquals(normalizeUsState("California, Napa County"), "California");
  assertEquals(
    normalizeUsState("Illinois, Cook County, Bremen Township"),
    "Illinois",
  );
});

Deno.test("normalizeUsState handles '<State> County' artefacts", () => {
  assertEquals(normalizeUsState("California County"), "California");
  assertEquals(normalizeUsState("Colorado County"), "Colorado");
});

Deno.test("normalizeUsState handles '<State>-...' artefacts", () => {
  assertEquals(normalizeUsState("Florida-Dade County"), "Florida");
});

Deno.test("normalizeUsState rejects non-US values", () => {
  assertEquals(normalizeUsState("Caicos Islands, Providenciales"), null);
  assertEquals(normalizeUsState(""), null);
  assertEquals(normalizeUsState(null), null);
});

Deno.test("expandUsStateVariants aggregates sub-regions of selected state", () => {
  const raw = [
    "California",
    "California, Napa County",
    "California, Sonoma County",
    "Oregon",
    "Florida-Dade County",
    "Caicos Islands, Providenciales",
  ];
  const expanded = expandUsStateVariants(raw, ["California", "Florida"]);
  assertEquals(expanded.sort(), [
    "California",
    "California, Napa County",
    "California, Sonoma County",
    "Florida-Dade County",
  ].sort());
});