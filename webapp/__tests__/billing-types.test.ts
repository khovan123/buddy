import {
  formatCompactVND,
  formatCurrencyFromCents,
  getCurrencyFractionDigits,
} from "@/features/billing/types/billing-types"

describe("billing currency formatting", () => {
  it("formats VND prices with the dong symbol and full amount", () => {
    expect(formatCompactVND(99000)).toBe("99,000₫")
  })

  it("always formats currency as VND", () => {
    expect(getCurrencyFractionDigits("USD")).toBe(0)
    expect(formatCurrencyFromCents(99000, "USD").replace(/\s/u, " ")).toBe(
      "99,000₫"
    )
  })
})
