import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import type { CategoryType } from "../../types";

interface CategoriesTabsProps {
  activeType: CategoryType;
  onTypeChange: (type: CategoryType) => void;
}

const CategoriesTabs = ({ activeType, onTypeChange }: CategoriesTabsProps) => {
  const handleValueChange = (value: string) => {
    onTypeChange(value as CategoryType);
  };

  return (
    <Tabs value={activeType} onValueChange={handleValueChange} className="w-full" data-testid="categories-tabs">
      <TabsList className="grid grid-cols-2 w-[400px]" data-testid="categories-tabs-list">
        <TabsTrigger value="income" data-testid="categories-income-tab">
          Income
        </TabsTrigger>
        <TabsTrigger value="expense" data-testid="categories-expense-tab">
          Expense
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
};

export default CategoriesTabs;
