import { describe, it, expect, vi } from "vitest";
import { render, screen } from "../../../../tests/utils";
import userEvent from "@testing-library/user-event";
import CategoriesTabs from "../CategoriesTabs";

describe("CategoriesTabs", () => {
  const mockOnTypeChange = vi.fn();

  const defaultProps = {
    activeType: "expense" as const,
    onTypeChange: mockOnTypeChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders tabs correctly", () => {
      render(<CategoriesTabs {...defaultProps} />);

      expect(screen.getByTestId("categories-tabs")).toBeInTheDocument();
      expect(screen.getByTestId("categories-tabs-list")).toBeInTheDocument();
      expect(screen.getByTestId("categories-income-tab")).toBeInTheDocument();
      expect(screen.getByTestId("categories-expense-tab")).toBeInTheDocument();
    });

    it("renders tab labels correctly", () => {
      render(<CategoriesTabs {...defaultProps} />);

      expect(screen.getByText("Income")).toBeInTheDocument();
      expect(screen.getByText("Expense")).toBeInTheDocument();
    });

    it("renders expense tab as selected by default", () => {
      render(<CategoriesTabs {...defaultProps} />);

      const expenseTab = screen.getByTestId("categories-expense-tab");
      expect(expenseTab).toHaveAttribute("data-state", "active");
    });
  });

  describe("Tab switching", () => {
    it("calls onTypeChange when income tab is clicked", async () => {
      const user = userEvent.setup();
      render(<CategoriesTabs {...defaultProps} />);

      const incomeTab = screen.getByTestId("categories-income-tab");

      await user.click(incomeTab);

      expect(mockOnTypeChange).toHaveBeenCalledWith("income");
    });

    it("calls onTypeChange when expense tab is clicked", async () => {
      const user = userEvent.setup();
      render(<CategoriesTabs {...defaultProps} activeType="income" />);

      const expenseTab = screen.getByTestId("categories-expense-tab");

      await user.click(expenseTab);

      expect(mockOnTypeChange).toHaveBeenCalledWith("expense");
    });

    it("does not call onTypeChange when clicking already active tab", async () => {
      const user = userEvent.setup();
      render(<CategoriesTabs {...defaultProps} />);

      const expenseTab = screen.getByTestId("categories-expense-tab");

      await user.click(expenseTab);

      expect(mockOnTypeChange).not.toHaveBeenCalled();
    });
  });

  describe("Accessibility", () => {
    it("tabs have correct roles", () => {
      render(<CategoriesTabs {...defaultProps} />);

      const incomeTab = screen.getByTestId("categories-income-tab");
      const expenseTab = screen.getByTestId("categories-expense-tab");

      expect(incomeTab).toHaveAttribute("role", "tab");
      expect(expenseTab).toHaveAttribute("role", "tab");
    });

    it("tabs have correct aria attributes", () => {
      render(<CategoriesTabs {...defaultProps} />);

      const incomeTab = screen.getByTestId("categories-income-tab");
      const expenseTab = screen.getByTestId("categories-expense-tab");

      expect(incomeTab).toHaveAttribute("aria-selected");
      expect(expenseTab).toHaveAttribute("aria-selected");
    });
  });

  describe("Active state", () => {
    it("shows expense tab as active when activeType is expense", () => {
      render(<CategoriesTabs {...defaultProps} activeType="expense" />);

      const expenseTab = screen.getByTestId("categories-expense-tab");
      expect(expenseTab).toHaveAttribute("data-state", "active");

      const incomeTab = screen.getByTestId("categories-income-tab");
      expect(incomeTab).toHaveAttribute("data-state", "inactive");
    });

    it("shows income tab as active when activeType is income", () => {
      render(<CategoriesTabs {...defaultProps} activeType="income" />);

      const incomeTab = screen.getByTestId("categories-income-tab");
      expect(incomeTab).toHaveAttribute("data-state", "active");

      const expenseTab = screen.getByTestId("categories-expense-tab");
      expect(expenseTab).toHaveAttribute("data-state", "inactive");
    });
  });

  describe("Grid layout", () => {
    it("applies correct grid classes", () => {
      render(<CategoriesTabs {...defaultProps} />);

      const tabsList = screen.getByTestId("categories-tabs-list");
      expect(tabsList).toHaveClass("grid", "grid-cols-2", "w-[400px]");
    });
  });
});
