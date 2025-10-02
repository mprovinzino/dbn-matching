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
      [_ in never]: never
    }
    Enums: {
      coverage_type: "local" | "multi_state" | "state" | "national"
      investor_status: "active" | "paused" | "test" | "inactive"
      market_type: "direct_purchase" | "primary" | "secondary"
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
      coverage_type: ["local", "multi_state", "state", "national"],
      investor_status: ["active", "paused", "test", "inactive"],
      market_type: ["direct_purchase", "primary", "secondary"],
    },
  },
} as const
