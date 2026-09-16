import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { COUNTRIES } from "@/components/importers/country-data";
import { AVAILABLE_MARKET_CODES } from "./options";

interface Props {
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
}

export function CountryCombobox({ value, onChange, invalid }: Props) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const isEn = i18n.language?.startsWith("en");

  const label = (code: string) => {
    const country = COUNTRIES.find((c) => c.code === code);
    if (!country) return "";
    return isEn ? country.englishName : country.name;
  };

  // Liste fermée de marchés disponibles pour cette V1.
  const sorted = AVAILABLE_MARKET_CODES.map((code) =>
    COUNTRIES.find((c) => c.code === code)
  )
    .filter((c): c is (typeof COUNTRIES)[number] => Boolean(c))
    .sort((a, b) =>
      label(a.code).localeCompare(label(b.code), isEn ? "en" : "fr")
    );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
            invalid && "border-destructive"
          )}
        >
          {value ? label(value) : t("marketAnalysis.step3.countryPlaceholder")}
          <ChevronsUpDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={t("marketAnalysis.step3.countrySearch")} />
          <CommandList>
            <CommandEmpty>{t("marketAnalysis.step3.countryEmpty")}</CommandEmpty>
            <CommandGroup>
              {sorted.map((country) => (
                <CommandItem
                  key={country.code}
                  value={`${country.name} ${country.englishName}`}
                  onSelect={() => {
                    onChange(country.code === value ? "" : country.code);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === country.code ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {label(country.code)}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
