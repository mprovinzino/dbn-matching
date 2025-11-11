export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      buy_box: {
        Row: {
          condition_types: string[] | null
          created_at: string
          id: string
          investor_id: string
          lead_types: string[] | null
          notes: string | null
          on_market_status: string[] | null
          price_max: number | null
          price_min: number | null
          property_types: string[] | null
          timeframe: string[] | null
          updated_at: string
          year_built_max: number | null
          year_built_min: number | null
        }
        Insert: {
          condition_types?: string[] | null
          created_at?: string
          id?: string
          investor_id: string
          lead_types?: string[] | null
          notes?: string | null
          on_market_status?: string[] | null
          price_max?: number | null
          price_min?: number | null
          property_types?: string[] | null
          timeframe?: string[] | null
          updated_at?: string
          year_built_max?: number | null
          year_built_min?: number | null
        }
        Update: {
          condition_types?: string[] | null
          created_at?: string
          id?: string
          investor_id?: string
          lead_types?: string[] | null
          notes?: string | null
          on_market_status?: string[] | null
          price_max?: number | null
          price_min?: number | null
          property_types?: string[] | null
          timeframe?: string[] | null
          updated_at?: string
          year_built_max?: number | null
          year_built_min?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "buy_box_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: true
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
        ]
      }
      investor_documents: {
        Row: {
          created_at: string
          document_type: string
          id: string
          investor_id: string
          label: string | null
          url: string
        }
        Insert: {
          created_at?: string
          document_type: string
          id?: string
          investor_id: string
          label?: string | null
          url: string
        }
        Update: {
          created_at?: string
          document_type?: string
          id?: string
          investor_id?: string
          label?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "investor_documents_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
        ]
      }
      investors: {
        Row: {
          cold_accepts: boolean | null
          company_name: string
          coverage_type: Database["public"]["Enums"]["coverage_type"]
          created_at: string
          freeze_reason: string | null
          hubspot_url: string | null
          id: string
          main_poc: string
          offer_types: string[] | null
          status: Database["public"]["Enums"]["investor_status"]
          status_changed_at: string | null
          status_changed_by: string | null
          status_reason: string | null
          tags: string[] | null
          tier: number
          updated_at: string
          user_id: string
          weekly_cap: number
        }
        Insert: {
          cold_accepts?: boolean | null
          company_name: string
          coverage_type: Database["public"]["Enums"]["coverage_type"]
          created_at?: string
          freeze_reason?: string | null
          hubspot_url?: string | null
          id?: string
          main_poc: string
          offer_types?: string[] | null
          status?: Database["public"]["Enums"]["investor_status"]
          status_changed_at?: string | null
          status_changed_by?: string | null
          status_reason?: string | null
          tags?: string[] | null
          tier: number
          updated_at?: string
          user_id: string
          weekly_cap?: number
        }
        Update: {
          cold_accepts?: boolean | null
          company_name?: string
          coverage_type?: Database["public"]["Enums"]["coverage_type"]
          created_at?: string
          freeze_reason?: string | null
          hubspot_url?: string | null
          id?: string
          main_poc?: string
          offer_types?: string[] | null
          status?: Database["public"]["Enums"]["investor_status"]
          status_changed_at?: string | null
          status_changed_by?: string | null
          status_reason?: string | null
          tags?: string[] | null
          tier?: number
          updated_at?: string
          user_id?: string
          weekly_cap?: number
        }
        Relationships: []
      }
      markets: {
        Row: {
          created_at: string
          dmas: string[] | null
          id: string
          investor_id: string
          market_type: Database["public"]["Enums"]["market_type"]
          states: string[] | null
          updated_at: string
          zip_codes: string[] | null
        }
        Insert: {
          created_at?: string
          dmas?: string[] | null
          id?: string
          investor_id: string
          market_type: Database["public"]["Enums"]["market_type"]
          states?: string[] | null
          updated_at?: string
          zip_codes?: string[] | null
        }
        Update: {
          created_at?: string
          dmas?: string[] | null
          id?: string
          investor_id?: string
          market_type?: Database["public"]["Enums"]["market_type"]
          states?: string[] | null
          updated_at?: string
          zip_codes?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "markets_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_seed_status: {
        Row: {
          created_at: string
          seeded: boolean
          seeded_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          seeded?: boolean
          seeded_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          seeded?: boolean
          seeded_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      zip_code_reference: {
        Row: {
          city: string
          created_at: string
          dma: string | null
          latitude: number | null
          longitude: number | null
          state: string
          zip_code: string
        }
        Insert: {
          city: string
          created_at?: string
          dma?: string | null
          latitude?: number | null
          longitude?: number | null
          state: string
          zip_code: string
        }
        Update: {
          city?: string
          created_at?: string
          dma?: string | null
          latitude?: number | null
          longitude?: number | null
          state?: string
          zip_code?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_all_users_with_roles: {
        Args: never
        Returns: {
          created_at: string
          email: string
          last_sign_in_at: string
          roles: Database["public"]["Enums"]["app_role"][]
          user_id: string
        }[]
      }
      get_dma_coverage: {
        Args: { market_zip_codes: string[] }
        Returns: {
          dma: string
          sample_zips: string[]
          state: string
          zip_count: number
        }[]
      }
      get_dma_coverage_density: {
        Args: never
        Returns: {
          direct_count: number
          dma: string
          full_coverage_count: number
          investor_count: number
          investor_ids: string[]
          primary_count: number
          secondary_count: number
          state: string
          total_zip_codes: number
        }[]
      }
      get_investor_ids_by_name: {
        Args: { search_text: string }
        Returns: {
          company_name: string
          id: string
        }[]
      }
      get_investors_by_dma: {
        Args: { dma_name: string }
        Returns: {
          company_name: string
          coverage_type: string
          investor_id: string
          main_poc: string
          market_type: string
          status: string
          tier: number
          zip_count: number
        }[]
      }
      get_investors_by_state: {
        Args: { state_code: string }
        Returns: {
          company_name: string
          coverage_type: string
          dma: string
          investor_id: string
          market_type: string
          tier: number
        }[]
      }
      get_state_level_coverage: {
        Args: never
        Returns: {
          investor_id: string
          investor_name: string
          market_type: string
          state: string
          tier: number
        }[]
      }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "team_member" | "viewer"
      coverage_type: "local" | "multi_state" | "state" | "national"
      investor_status: "active" | "paused" | "test" | "inactive"
      market_type: "primary" | "direct_purchase" | "full_coverage"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "team_member", "viewer"],
      coverage_type: ["local", "multi_state", "state", "national"],
      investor_status: ["active", "paused", "test", "inactive"],
      market_type: ["primary", "direct_purchase", "full_coverage"],
    },
  },
} as const
