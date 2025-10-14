import { describe, it, expect } from "vitest";
import { render, screen } from "../../../../tests/utils";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "../dialog";

describe("Dialog", () => {
  describe("Dialog", () => {
    it("renders correctly with default props", () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogTitle>Test Dialog</DialogTitle>
            Test content
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByText("Test content")).toBeInTheDocument();
    });
  });

  describe("DialogTrigger", () => {
    it("renders correctly", () => {
      render(
        <Dialog>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent>Test content</DialogContent>
        </Dialog>
      );

      const trigger = screen.getByRole("button", { name: /open dialog/i });
      expect(trigger).toBeInTheDocument();
      expect(trigger).toHaveAttribute("data-slot", "dialog-trigger");
    });

    it("passes through props correctly", () => {
      render(
        <Dialog>
          <DialogTrigger data-testid="trigger">Open Dialog</DialogTrigger>
          <DialogContent>Test content</DialogContent>
        </Dialog>
      );

      const trigger = screen.getByTestId("trigger");
      expect(trigger).toHaveAttribute("data-slot", "dialog-trigger");
    });
  });

  describe("DialogContent", () => {
    it("renders correctly with default props", () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogTitle>Test Dialog</DialogTitle>
            Test content
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByText("Test content")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /close/i })).toBeInTheDocument();
    });

    it("renders without close button when showCloseButton is false", () => {
      render(
        <Dialog open>
          <DialogContent showCloseButton={false}>
            <DialogTitle>Test Dialog</DialogTitle>
            Test content
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByText("Test content")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /close/i })).not.toBeInTheDocument();
    });

    it("applies additional className", () => {
      render(
        <Dialog open>
          <DialogContent className="custom-class">
            <DialogTitle>Test Dialog</DialogTitle>
            Test content
          </DialogContent>
        </Dialog>
      );

      const content = screen.getByText("Test content").closest('[data-slot="dialog-content"]');
      expect(content).toHaveClass("custom-class");
    });

    it("has correct data-slot attribute", () => {
      render(
        <Dialog open>
          <DialogContent data-testid="content">
            <DialogTitle>Test Dialog</DialogTitle>
            Test content
          </DialogContent>
        </Dialog>
      );

      const content = screen.getByTestId("content");
      expect(content).toHaveAttribute("data-slot", "dialog-content");
    });
  });

  describe("DialogHeader", () => {
    it("renders correctly", () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogTitle>Test Dialog</DialogTitle>
            <DialogHeader>Header content</DialogHeader>
          </DialogContent>
        </Dialog>
      );

      const header = screen.getByText("Header content");
      expect(header).toBeInTheDocument();
      expect(header).toHaveAttribute("data-slot", "dialog-header");
      expect(header).toHaveClass("flex", "flex-col", "gap-2");
    });

    it("applies additional className", () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogTitle>Test Dialog</DialogTitle>
            <DialogHeader className="custom-header">Header content</DialogHeader>
          </DialogContent>
        </Dialog>
      );

      const header = screen.getByText("Header content");
      expect(header).toHaveClass("custom-header");
    });
  });

  describe("DialogTitle", () => {
    it("renders correctly", () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogTitle>Test Title</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      const title = screen.getByRole("heading", { name: /test title/i });
      expect(title).toBeInTheDocument();
      expect(title).toHaveAttribute("data-slot", "dialog-title");
      expect(title).toHaveClass("text-lg", "leading-none", "font-semibold");
    });

    it("applies additional className", () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogTitle className="custom-title">Test Title</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      const title = screen.getByRole("heading", { name: /test title/i });
      expect(title).toHaveClass("custom-title");
    });
  });

  describe("DialogDescription", () => {
    it("renders correctly", () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogTitle>Test Dialog</DialogTitle>
            <DialogDescription>Test description</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      const description = screen.getByText("Test description");
      expect(description).toBeInTheDocument();
      expect(description).toHaveAttribute("data-slot", "dialog-description");
      expect(description).toHaveClass("text-muted-foreground", "text-sm");
    });

    it("applies additional className", () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogTitle>Test Dialog</DialogTitle>
            <DialogDescription className="custom-desc">Test description</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      const description = screen.getByText("Test description");
      expect(description).toHaveClass("custom-desc");
    });
  });

  describe("DialogFooter", () => {
    it("renders correctly", () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogTitle>Test Dialog</DialogTitle>
            <DialogFooter>Footer content</DialogFooter>
          </DialogContent>
        </Dialog>
      );

      const footer = screen.getByText("Footer content");
      expect(footer).toBeInTheDocument();
      expect(footer).toHaveAttribute("data-slot", "dialog-footer");
      expect(footer).toHaveClass("flex", "flex-col-reverse", "gap-2");
    });

    it("applies additional className", () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogTitle>Test Dialog</DialogTitle>
            <DialogFooter className="custom-footer">Footer content</DialogFooter>
          </DialogContent>
        </Dialog>
      );

      const footer = screen.getByText("Footer content");
      expect(footer).toHaveClass("custom-footer");
    });
  });

  describe("DialogClose", () => {
    it("renders correctly", () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogTitle>Test Dialog</DialogTitle>
            <DialogClose>Custom close</DialogClose>
          </DialogContent>
        </Dialog>
      );

      const close = screen.getByText("Custom close");
      expect(close).toBeInTheDocument();
      expect(close).toHaveAttribute("data-slot", "dialog-close");
    });
  });

  describe("DialogOverlay", () => {
    it("renders correctly", () => {
      render(
        <Dialog open>
          <DialogOverlay data-testid="overlay" />
          <DialogContent>
            <DialogTitle>Test Dialog</DialogTitle>
            Test content
          </DialogContent>
        </Dialog>
      );

      const overlay = screen.getByTestId("overlay");
      expect(overlay).toBeInTheDocument();
      expect(overlay).toHaveAttribute("data-slot", "dialog-overlay");
    });

    it("applies additional className", () => {
      render(
        <Dialog open>
          <DialogOverlay className="custom-overlay" data-testid="overlay" />
          <DialogContent>
            <DialogTitle>Test Dialog</DialogTitle>
            Test content
          </DialogContent>
        </Dialog>
      );

      const overlay = screen.getByTestId("overlay");
      expect(overlay).toHaveClass("custom-overlay");
    });
  });

  describe("DialogPortal", () => {
    it("renders correctly", () => {
      render(
        <Dialog open>
          <DialogPortal>
            <DialogOverlay />
            <DialogContent>
              <DialogTitle>Test Dialog</DialogTitle>
              Test content
            </DialogContent>
          </DialogPortal>
        </Dialog>
      );

      // Portal components don't render DOM elements themselves,
      // but the content inside them should be rendered
      expect(screen.getByText("Test content")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("close button has screen reader text", () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogTitle>Test Dialog</DialogTitle>
            Test content
          </DialogContent>
        </Dialog>
      );

      const closeButton = screen.getByRole("button", { name: /close/i });
      expect(closeButton).toHaveTextContent("Close");
    });

    it("close button has proper styling and accessibility attributes", () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogTitle>Test Dialog</DialogTitle>
            Test content
          </DialogContent>
        </Dialog>
      );

      const closeButton = screen.getByRole("button", { name: /close/i });
      expect(closeButton).toHaveClass("absolute", "top-4", "right-4");
      expect(closeButton).toHaveAttribute("data-slot", "dialog-close");
    });
  });
});
