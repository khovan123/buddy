"use client"

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"

const majorOptions = [
  "All",
  "Computer Science",
  "Business",
  "Mechanical",
  "Psychology",
  "Arts",
] as const

export function ExploreMajorCombobox() {
  return (
    <Combobox items={majorOptions} defaultValue={majorOptions[0]}>
      <ComboboxInput
        id="explore-filter-major"
        className="w-full max-w-48"
        placeholder="Select major"
        showClear
      />
      <ComboboxContent>
        <ComboboxEmpty>No items found.</ComboboxEmpty>
        <ComboboxList>
          {(item) => (
            <ComboboxItem key={item} value={item}>
              {item}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
