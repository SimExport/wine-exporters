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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      campaigns: {
        Row: {
          created_at: string
          id: string
          launched_at: string | null
          name: string
          status: string
          target_markets: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          launched_at?: string | null
          name: string
          status?: string
          target_markets: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          launched_at?: string | null
          name?: string
          status?: string
          target_markets?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          category: string
          created_at: string
          cuvee: string | null
          file_name: string
          file_size: number
          file_url: string
          format: string | null
          id: string
          language: string | null
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
          vintage: number | null
        }
        Insert: {
          category: string
          created_at?: string
          cuvee?: string | null
          file_name: string
          file_size: number
          file_url: string
          format?: string | null
          id?: string
          language?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
          vintage?: number | null
        }
        Update: {
          category?: string
          created_at?: string
          cuvee?: string | null
          file_name?: string
          file_size?: number
          file_url?: string
          format?: string | null
          id?: string
          language?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
          vintage?: number | null
        }
        Relationships: []
      }
      media: {
        Row: {
          created_at: string
          credit: string | null
          file_url: string
          id: string
          sort_index: number | null
          thumbnail_url: string | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credit?: string | null
          file_url: string
          id?: string
          sort_index?: number | null
          thumbnail_url?: string | null
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credit?: string | null
          file_url?: string
          id?: string
          sort_index?: number | null
          thumbnail_url?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          aoc: string | null
          bottles_per_year: number | null
          campaigns_remaining: number | null
          created_at: string
          cuvees: string[] | null
          description: string | null
          domain_name: string | null
          grape_varieties: string[] | null
          id: string
          is_published: boolean | null
          location: string | null
          organic_body: string | null
          organic_conversion: boolean | null
          organic_year: number | null
          social_media: Json | null
          strengths: string[] | null
          subscription_plan: string | null
          surface_area: number | null
          updated_at: string
          user_id: string
          website: string | null
          wine_colors: string[] | null
        }
        Insert: {
          aoc?: string | null
          bottles_per_year?: number | null
          campaigns_remaining?: number | null
          created_at?: string
          cuvees?: string[] | null
          description?: string | null
          domain_name?: string | null
          grape_varieties?: string[] | null
          id?: string
          is_published?: boolean | null
          location?: string | null
          organic_body?: string | null
          organic_conversion?: boolean | null
          organic_year?: number | null
          social_media?: Json | null
          strengths?: string[] | null
          subscription_plan?: string | null
          surface_area?: number | null
          updated_at?: string
          user_id: string
          website?: string | null
          wine_colors?: string[] | null
        }
        Update: {
          aoc?: string | null
          bottles_per_year?: number | null
          campaigns_remaining?: number | null
          created_at?: string
          cuvees?: string[] | null
          description?: string | null
          domain_name?: string | null
          grape_varieties?: string[] | null
          id?: string
          is_published?: boolean | null
          location?: string | null
          organic_body?: string | null
          organic_conversion?: boolean | null
          organic_year?: number | null
          social_media?: Json | null
          strengths?: string[] | null
          subscription_plan?: string | null
          surface_area?: number | null
          updated_at?: string
          user_id?: string
          website?: string | null
          wine_colors?: string[] | null
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
      [_ in never]: never
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
    Enums: {},
  },
} as const
