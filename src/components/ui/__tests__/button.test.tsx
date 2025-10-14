import { describe, it, expect } from "vitest";
import { render, screen } from "../../../../tests/utils";
import { Button } from "../button";

describe("Button", () => {
  it("renders correctly with default props", () => {
    render(<Button>Click me</Button>);

    const button = screen.getByRole("button", { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("data-slot", "button");
    expect(button).toHaveClass("bg-primary");
  });

  it("renders with different variants", () => {
    render(<Button variant="destructive">Destructive</Button>);

    const button = screen.getByRole("button", { name: /destructive/i });
    expect(button).toHaveClass("bg-destructive");
  });

  it("renders with different sizes", () => {
    render(<Button size="sm">Small</Button>);

    const button = screen.getByRole("button", { name: /small/i });
    expect(button).toHaveClass("h-8");
  });

  it("renders as a child component when asChild is true", () => {
    render(
      <Button asChild>
        <a href="/">Link Button</a>
      </Button>
    );

    const link = screen.getByRole("link", { name: /link button/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("data-slot", "button");
    expect(link).toHaveClass("bg-primary");
  });

  it("applies additional className", () => {
    render(<Button className="custom-class">Custom</Button>);

    const button = screen.getByRole("button", { name: /custom/i });
    expect(button).toHaveClass("custom-class");
  });
});
