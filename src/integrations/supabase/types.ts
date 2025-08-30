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
      campaign_events: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          payload: Json | null
          type: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          payload?: Json | null
          type: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          payload?: Json | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          audience_estimate: number | null
          blacklist_buyer_ids: string[] | null
          channels: string[] | null
          created_at: string
          cuvees: string[] | null
          daily_cap: number | null
          doc_presentation: string | null
          doc_pricelist: string | null
          doc_techs: string[] | null
          exclude_recent_days: number | null
          id: string
          language: string | null
          launched_at: string | null
          managed_by_bo: boolean | null
          message_html: string | null
          message_text: string | null
          name: string
          price_max: number | null
          price_min: number | null
          reply_to: string | null
          schedule_at: string | null
          segments: string[] | null
          send_as_name: string | null
          send_now: boolean | null
          seq2_delay_days: number | null
          seq3_delay_days: number | null
          sequence_enabled: boolean | null
          stats_bounces: number | null
          stats_clicks: number | null
          stats_opens: number | null
          stats_replies: number | null
          status: string
          subject_selected: string | null
          subject_variants: string[] | null
          target_markets: string[]
          techs_link: string | null
          updated_at: string
          user_id: string
          volume_band: string | null
        }
        Insert: {
          audience_estimate?: number | null
          blacklist_buyer_ids?: string[] | null
          channels?: string[] | null
          created_at?: string
          cuvees?: string[] | null
          daily_cap?: number | null
          doc_presentation?: string | null
          doc_pricelist?: string | null
          doc_techs?: string[] | null
          exclude_recent_days?: number | null
          id?: string
          language?: string | null
          launched_at?: string | null
          managed_by_bo?: boolean | null
          message_html?: string | null
          message_text?: string | null
          name: string
          price_max?: number | null
          price_min?: number | null
          reply_to?: string | null
          schedule_at?: string | null
          segments?: string[] | null
          send_as_name?: string | null
          send_now?: boolean | null
          seq2_delay_days?: number | null
          seq3_delay_days?: number | null
          sequence_enabled?: boolean | null
          stats_bounces?: number | null
          stats_clicks?: number | null
          stats_opens?: number | null
          stats_replies?: number | null
          status?: string
          subject_selected?: string | null
          subject_variants?: string[] | null
          target_markets: string[]
          techs_link?: string | null
          updated_at?: string
          user_id: string
          volume_band?: string | null
        }
        Update: {
          audience_estimate?: number | null
          blacklist_buyer_ids?: string[] | null
          channels?: string[] | null
          created_at?: string
          cuvees?: string[] | null
          daily_cap?: number | null
          doc_presentation?: string | null
          doc_pricelist?: string | null
          doc_techs?: string[] | null
          exclude_recent_days?: number | null
          id?: string
          language?: string | null
          launched_at?: string | null
          managed_by_bo?: boolean | null
          message_html?: string | null
          message_text?: string | null
          name?: string
          price_max?: number | null
          price_min?: number | null
          reply_to?: string | null
          schedule_at?: string | null
          segments?: string[] | null
          send_as_name?: string | null
          send_now?: boolean | null
          seq2_delay_days?: number | null
          seq3_delay_days?: number | null
          sequence_enabled?: boolean | null
          stats_bounces?: number | null
          stats_clicks?: number | null
          stats_opens?: number | null
          stats_replies?: number | null
          status?: string
          subject_selected?: string | null
          subject_variants?: string[] | null
          target_markets?: string[]
          techs_link?: string | null
          updated_at?: string
          user_id?: string
          volume_band?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_doc_presentation_fkey"
            columns: ["doc_presentation"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_doc_pricelist_fkey"
            columns: ["doc_pricelist"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
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
      leads: {
        Row: {
          buyer_id: string
          campaign_id: string
          created_at: string
          id: string
          market: string
          message_snippet: string | null
          owner_notes: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          buyer_id: string
          campaign_id: string
          created_at?: string
          id?: string
          market: string
          message_snippet?: string | null
          owner_notes?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          campaign_id?: string
          created_at?: string
          id?: string
          market?: string
          message_snippet?: string | null
          owner_notes?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
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
