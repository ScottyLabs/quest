# ButtonSwitch Component

A reusable button switch component that allows users to select from multiple options. The component is fully accessible and supports keyboard navigation.

## Features

- ✅ Fully accessible with keyboard navigation
- ✅ Customizable options (dynamic number of segments)
- ✅ Multiple sizes (sm, md, lg)
- ✅ Disabled state support
- ✅ Full width support
- ✅ TypeScript support
- ✅ Custom styling with Tailwind CSS

## Usage

```tsx
import { ButtonSwitch, type ButtonSwitchOption } from "@/components/ui/button-switch";

// Define your options
const options: ButtonSwitchOption[] = [
  { value: "small", label: "S" },
  { value: "medium", label: "M" },
  { value: "large", label: "L" },
];

// Use the component
function MyComponent() {
  const [selectedValue, setSelectedValue] = useState("medium");

  return (
    <ButtonSwitch
      options={options}
      value={selectedValue}
      onValueChange={setSelectedValue}
      className="max-w-xs"
    />
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `options` | `ButtonSwitchOption[]` | - | Array of options to display |
| `value` | `string` | - | Currently selected value |
| `onValueChange` | `(value: string) => void` | - | Callback when value changes |
| `className` | `string` | - | Additional CSS classes |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Size of the component |
| `disabled` | `boolean` | `false` | Whether the component is disabled |

## ButtonSwitchOption Interface

```tsx
interface ButtonSwitchOption {
  value: string;  // Unique identifier for the option
  label: string;  // Display text for the option
}
```

## Examples

### Basic Usage
```tsx
const sizeOptions = [
  { value: "S", label: "S" },
  { value: "M", label: "M" },
  { value: "L", label: "L" },
];

<ButtonSwitch
  options={sizeOptions}
  value={selectedSize}
  onValueChange={setSelectedSize}
/>
```

### With Custom Styling
```tsx
<ButtonSwitch
  options={options}
  value={selectedValue}
  onValueChange={setSelectedValue}
  className="max-w-md bg-blue-50"
/>
```

### Different Sizes
```tsx
<ButtonSwitch
  options={options}
  value={selectedValue}
  onValueChange={setSelectedValue}
  size="sm"  // or "md" or "lg"
/>
```

### Disabled State
```tsx
<ButtonSwitch
  options={options}
  value={selectedValue}
  onValueChange={setSelectedValue}
  disabled={true}
/>
```

## Accessibility

The component includes:
- Proper ARIA attributes (`role="tablist"`, `role="tab"`, `aria-selected`)
- Keyboard navigation support (Enter and Space keys)
- Focus management
- Screen reader support

## Styling

The component uses Tailwind CSS classes and can be customized by passing additional classes via the `className` prop. The default styling includes:

- Gray background for unselected options
- White background with shadow for selected options
- Hover effects for interactive states
- Smooth transitions for state changes
