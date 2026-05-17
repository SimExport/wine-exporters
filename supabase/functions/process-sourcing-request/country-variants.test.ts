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

Deno.test("does not match French translation against English DB value", () => {
  const all = [{ country: "Croatia" }, { country: "Italy" }];
  // If the frontend mistakenly sent the FR label, no variant should resolve;
  // we fall back to the literal value so the query returns 0 rows (caught upstream).
  assertEquals(resolveCountryVariants("Croatie", all), ["Croatie"]);
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