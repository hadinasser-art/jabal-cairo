import { Check, ChevronsUpDown } from "lucide-react";
import type { AdminProductRow } from "@/components/admin/types";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface ProductPickerProps {
  products: AdminProductRow[];
  selectedProductId: string;
  onSelect: (productId: string) => void;
}

export function ProductPicker({ products, selectedProductId, onSelect }: ProductPickerProps) {
  const selected = products.find((product) => product.id === selectedProductId);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          className="w-full justify-between sm:max-w-md"
        >
          <span className="truncate">{selected?.name || "Choose a product"}</span>
          <ChevronsUpDown className="opacity-50" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search products…" />
          <CommandList>
            <CommandEmpty>No products found.</CommandEmpty>
            <CommandGroup>
              {products.map((product) => (
                <CommandItem
                  key={product.id}
                  value={product.name}
                  onSelect={() => onSelect(product.id)}
                >
                  <Check
                    className={cn(
                      "mr-2 size-4",
                      selectedProductId === product.id ? "opacity-100" : "opacity-0",
                    )}
                    aria-hidden="true"
                  />
                  <span className="truncate">{product.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
