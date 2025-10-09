export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  graphql_public: {
    Tables: Record<never, never>;
    Views: Record<never, never>;
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
  public: {
    Tables: {
      accounts: {
        Row: {
          active: boolean;
          created_at: string;
          currency_id: number;
          id: number;
          name: string;
          tag: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          currency_id: number;
          id?: number;
          name: string;
          tag?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          currency_id?: number;
          id?: number;
          name?: string;
          tag?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "accounts_currency_id_fkey";
            columns: ["currency_id"];
            isOneToOne: false;
            referencedRelation: "currencies";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          active: boolean;
          category_type: Database["public"]["Enums"]["category_type_enum"];
          created_at: string;
          id: number;
          name: string;
          parent_id: number;
          tag: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          active?: boolean;
          category_type?: Database["public"]["Enums"]["category_type_enum"];
          created_at?: string;
          id?: number;
          name: string;
          parent_id?: number;
          tag?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          active?: boolean;
          category_type?: Database["public"]["Enums"]["category_type_enum"];
          created_at?: string;
          id?: number;
          name?: string;
          parent_id?: number;
          tag?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      currencies: {
        Row: {
          active: boolean;
          code: string;
          created_at: string;
          description: string;
          id: number;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          code: string;
          created_at?: string;
          description: string;
          id?: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          code?: string;
          created_at?: string;
          description?: string;
          id?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          account_id: number;
          active: boolean;
          amount: number;
          category_id: number;
          comment: string | null;
          created_at: string;
          currency_id: number;
          id: number;
          transaction_date: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          account_id: number;
          active?: boolean;
          amount: number;
          category_id: number;
          comment?: string | null;
          created_at?: string;
          currency_id: number;
          id?: number;
          transaction_date: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          account_id?: number;
          active?: boolean;
          amount?: number;
          category_id?: number;
          comment?: string | null;
          created_at?: string;
          currency_id?: number;
          id?: number;
          transaction_date?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "view_accounts_with_balance";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_currency_id_fkey";
            columns: ["currency_id"];
            isOneToOne: false;
            referencedRelation: "currencies";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      view_accounts_with_balance: {
        Row: {
          active: boolean | null;
          balance: number | null;
          created_at: string | null;
          currency_code: string | null;
          currency_description: string | null;
          id: number | null;
          name: string | null;
          tag: string | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Relationships: [];
      };
      view_category_monthly_summary: {
        Row: {
          category_id: number | null;
          category_name: string | null;
          category_type: Database["public"]["Enums"]["category_type_enum"] | null;
          parent_id: number | null;
          report_date: string | null;
          total_amount: number | null;
          transaction_count: number | null;
          user_id: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      calculate_account_balance: {
        Args: { p_account_id: number; p_user_id: string };
        Returns: number;
      };
      get_category_type: {
        Args: { p_category_id: number };
        Returns: Database["public"]["Enums"]["category_type_enum"];
      };
    };
    Enums: {
      category_type_enum: "income" | "expense";
    };
    CompositeTypes: Record<never, never>;
  };
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      category_type_enum: ["income", "expense"],
    },
  },
} as const;
