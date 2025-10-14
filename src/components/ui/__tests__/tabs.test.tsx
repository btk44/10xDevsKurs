import { describe, it, expect } from "vitest";
import { render, screen, userEvent } from "../../../../tests/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../tabs";

describe("Tabs", () => {
  describe("Tabs", () => {
    it("renders correctly with default props", () => {
      render(
        <Tabs>
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );

      const tabsRoot = screen.getByRole("tablist").parentElement;
      expect(tabsRoot).toHaveAttribute("data-slot", "tabs");
      expect(tabsRoot).toHaveClass("flex", "flex-col", "gap-2");
    });

    it("applies additional className", () => {
      render(
        <Tabs className="custom-tabs">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>
      );

      const tabsRoot = screen.getByRole("tablist").parentElement;
      expect(tabsRoot).toHaveClass("custom-tabs");
    });

    it("passes through other props to Radix root", () => {
      render(
        <Tabs defaultValue="tab2" data-testid="tabs-root">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );

      expect(screen.getByTestId("tabs-root")).toBeInTheDocument();
    });
  });

  describe("TabsList", () => {
    it("renders correctly with default styling", () => {
      render(
        <Tabs>
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
        </Tabs>
      );

      const tabsList = screen.getByRole("tablist");
      expect(tabsList).toHaveAttribute("data-slot", "tabs-list");
      expect(tabsList).toHaveClass(
        "bg-muted",
        "text-muted-foreground",
        "inline-flex",
        "h-9",
        "w-fit",
        "items-center",
        "justify-center",
        "rounded-lg",
        "p-[3px]"
      );
    });

    it("applies additional className", () => {
      render(
        <Tabs>
          <TabsList className="custom-list">
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
        </Tabs>
      );

      const tabsList = screen.getByRole("tablist");
      expect(tabsList).toHaveClass("custom-list");
    });
  });

  describe("TabsTrigger", () => {
    it("renders correctly with default styling", () => {
      render(
        <Tabs>
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
        </Tabs>
      );

      const trigger = screen.getByRole("tab", { name: /tab 1/i });
      expect(trigger).toHaveAttribute("data-slot", "tabs-trigger");
      expect(trigger).toHaveClass(
        "inline-flex",
        "h-[calc(100%-1px)]",
        "flex-1",
        "items-center",
        "justify-center",
        "gap-1.5",
        "rounded-md",
        "border",
        "border-transparent",
        "px-2",
        "py-1",
        "text-sm",
        "font-medium",
        "whitespace-nowrap"
      );
    });

    it("applies additional className", () => {
      render(
        <Tabs>
          <TabsList>
            <TabsTrigger value="tab1" className="custom-trigger">Tab 1</TabsTrigger>
          </TabsList>
        </Tabs>
      );

      const trigger = screen.getByRole("tab", { name: /tab 1/i });
      expect(trigger).toHaveClass("custom-trigger");
    });

    it("shows active state styling when selected", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
        </Tabs>
      );

      const activeTrigger = screen.getByRole("tab", { name: /tab 1/i });
      const inactiveTrigger = screen.getByRole("tab", { name: /tab 2/i });

      // Active tab should have data-state="active"
      expect(activeTrigger).toHaveAttribute("data-state", "active");

      // Inactive tab should have data-state="inactive"
      expect(inactiveTrigger).toHaveAttribute("data-state", "inactive");

      // Check that the component has the base styling classes
      expect(activeTrigger).toHaveClass("data-[state=active]:bg-background");
      expect(activeTrigger).toHaveClass("inline-flex");
      expect(activeTrigger).toHaveClass("h-[calc(100%-1px)]");
    });

    it("accepts value prop for Radix integration", () => {
      render(
        <Tabs defaultValue="custom-value">
          <TabsList>
            <TabsTrigger value="custom-value">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="custom-value">Content</TabsContent>
        </Tabs>
      );

      const trigger = screen.getByRole("tab", { name: /tab 1/i });
      expect(trigger).toHaveAttribute("data-state", "active");
    });
  });

  describe("TabsContent", () => {
    it("renders correctly with default styling", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>
      );

      const content = screen.getByText("Content 1");
      expect(content).toHaveAttribute("data-slot", "tabs-content");
      expect(content).toHaveClass("flex-1", "outline-none");
    });

    it("applies additional className", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsContent value="tab1" className="custom-content">Content 1</TabsContent>
        </Tabs>
      );

      const content = screen.getByText("Content 1");
      expect(content).toHaveClass("custom-content");
    });

    it("only shows content for active tab", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );

      expect(screen.getByText("Content 1")).toBeInTheDocument();
      expect(screen.queryByText("Content 2")).not.toBeInTheDocument();
    });
  });

  describe("Tab switching functionality", () => {
    it("switches content when clicking tabs", async () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );

      // Initially tab1 content is visible
      expect(screen.getByText("Content 1")).toBeInTheDocument();
      expect(screen.queryByText("Content 2")).not.toBeInTheDocument();

      // Click tab2
      await userEvent.click(screen.getByRole("tab", { name: /tab 2/i }));

      // Now tab2 content should be visible
      expect(screen.queryByText("Content 1")).not.toBeInTheDocument();
      expect(screen.getByText("Content 2")).toBeInTheDocument();
    });

    it("maintains controlled state", () => {
      const { rerender } = render(
        <Tabs value="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );

      expect(screen.getByText("Content 1")).toBeInTheDocument();
      expect(screen.queryByText("Content 2")).not.toBeInTheDocument();

      // Change value prop
      rerender(
        <Tabs value="tab2">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );

      expect(screen.queryByText("Content 1")).not.toBeInTheDocument();
      expect(screen.getByText("Content 2")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has correct ARIA attributes", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );

      const tablist = screen.getByRole("tablist");
      const tabs = screen.getAllByRole("tab");
      const tabpanel = screen.getByRole("tabpanel");

      expect(tablist).toBeInTheDocument();
      expect(tabs).toHaveLength(2);
      expect(tabpanel).toBeInTheDocument();

      // Check that active tab has correct state
      const activeTab = tabs.find(tab => tab.getAttribute("data-state") === "active");
      expect(activeTab).toBeInTheDocument();
      expect(activeTab).toHaveAttribute("aria-selected", "true");
    });

    it("supports keyboard navigation", async () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
            <TabsTrigger value="tab3">Tab 3</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
          <TabsContent value="tab3">Content 3</TabsContent>
        </Tabs>
      );

      const firstTab = screen.getByRole("tab", { name: /tab 1/i });
      const secondTab = screen.getByRole("tab", { name: /tab 2/i });

      // Focus first tab
      firstTab.focus();
      expect(firstTab).toHaveFocus();

      // Navigate to next tab with arrow right
      await userEvent.keyboard("{ArrowRight}");
      expect(secondTab).toHaveFocus();
    });
  });
});
