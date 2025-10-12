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
    <Tabs value={activeType} onValueChange={handleValueChange} className="w-full">
      <TabsList className="grid grid-cols-2 w-[400px]">
        <TabsTrigger value="income">Income</TabsTrigger>
        <TabsTrigger value="expense">Expense</TabsTrigger>
      </TabsList>
    </Tabs>
  );
};

export default CategoriesTabs;
