import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { resolveCountryVariants } from "./country-variants.ts";

// These tests guarantee that the raw DB value passed by the frontend (e.g. "Croatia")
// is the one used to filter buyer_contacts — no translation, no aliasing.

Deno.test("uses raw DB value to match exact country", () => {
  const all = [
    { country: "Croatia" },
    { country: "France" },
    { country: "Italy" },
  ];
  assertEquals(resolveCountryVariants("Croatia", all), ["Croatia"]);
});

Deno.test("collects all casing/whitespace variants present in the DB", () => {
  const all = [
    { country: "Croatia" },
    { country: "croatia" },
    { country: "Croatia " }, // trailing space
    { country: "France" },
  ];
  const v = resolveCountryVariants("Croatia", all);
  assertEquals(new Set(v), new Set(["Croatia", "croatia", "Croatia "]));
});

Deno.test("FR→EN fallback resolves French label to English DB variant", () => {
  const all = [{ country: "Croatia" }, { country: "Italy" }];
  assertEquals(resolveCountryVariants("Croatie", all), ["Croatia"]);
});

Deno.test("FR→EN fallback works for Thaïlande / Suède / Allemagne", () => {
  const all = [
    { country: "Thailand" },
    { country: "Sweden" },
    { country: "Germany" },
  ];
  assertEquals(resolveCountryVariants("Thaïlande", all), ["Thailand"]);
  assertEquals(resolveCountryVariants("Suède", all), ["Sweden"]);
  assertEquals(resolveCountryVariants("Allemagne", all), ["Germany"]);
});

Deno.test("ignores unrelated countries", () => {
  const all = [
    { country: "Italy" },
    { country: "Italie" }, // unrelated stray FR entry
    { country: "United States" },
  ];
  assertEquals(resolveCountryVariants("Italy", all), ["Italy"]);
});

Deno.test("handles empty DB list by falling back to literal market name", () => {
  assertEquals(resolveCountryVariants("Croatia", []), ["Croatia"]);
});

Deno.test("ignores null country rows", () => {
  const all = [{ country: null }, { country: "Croatia" }];
  assertEquals(resolveCountryVariants("Croatia", all), ["Croatia"]);
});