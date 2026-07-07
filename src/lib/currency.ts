const EUROPE_COUNTRIES = [
  "AT","BE","BG","CY","CZ","DE","DK","EE","ES","FI",
  "FR","GR","HR","HU","IE","IT","LT","LU","LV","MT",
  "NL","PL","PT","RO","SE","SI","SK",
  "CH","NO","IS","GB",
];

export type Currency = "EUR" | "USD";

export function getCurrencyFromCountry(countryCode: string | null): Currency {
  if (!countryCode) return "USD";
  return EUROPE_COUNTRIES.includes(countryCode) ? "EUR" : "USD";
}

type PriceKey = "digital" | "digitalAnnual" | "digitalAnnualMonthly" | "printAnnual" | "printAnnualMonthly" | "book";

const PRICE_TABLE: Record<PriceKey, Record<Currency, string>> = {
  digital:              { EUR: "4,99 €", USD: "$4.99" },
  digitalAnnual:        { EUR: "35,88 €", USD: "$35.88" },
  digitalAnnualMonthly: { EUR: "2,99 €", USD: "$2.99" },
  printAnnual:        { EUR: "79 €",   USD: "$79" },
  printAnnualMonthly: { EUR: "6,58 €", USD: "$6.58" },
  book:               { EUR: "29 €",   USD: "$29" },
};

export function formatPrice(currency: Currency, key: PriceKey): string {
  return PRICE_TABLE[key][currency];
}
