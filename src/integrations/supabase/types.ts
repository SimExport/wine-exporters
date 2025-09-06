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
      admin_tasks: {
        Row: {
          admin_comment: string | null
          assignee: string | null
          campaign_id: string | null
          created_at: string
          id: string
          resolved_at: string | null
          status: string
          type: string
        }
        Insert: {
          admin_comment?: string | null
          assignee?: string | null
          campaign_id?: string | null
          created_at?: string
          id?: string
          resolved_at?: string | null
          status?: string
          type: string
        }
        Update: {
          admin_comment?: string | null
          assignee?: string | null
          campaign_id?: string | null
          created_at?: string
          id?: string
          resolved_at?: string | null
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_tasks_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      buyer_contacts: {
        Row: {
          company_name: string
          contact_first_name: string
          contact_last_name: string
          country: string
          created_at: string
          email: string
          id: string
          type: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          company_name: string
          contact_first_name: string
          contact_last_name: string
          country: string
          created_at?: string
          email: string
          id?: string
          type: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          company_name?: string
          contact_first_name?: string
          contact_last_name?: string
          country?: string
          created_at?: string
          email?: string
          id?: string
          type?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
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
          admin_reviewer: string | null
          audience_estimate: number | null
          blacklist_buyer_ids: string[] | null
          channels: string[] | null
          client_note: string | null
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
          markets: string[] | null
          message_html: string | null
          message_text: string | null
          name: string
          price_max: number | null
          price_min: number | null
          reply_to: string | null
          schedule_at: string | null
          segments: string[] | null
          selected_wines: string[] | null
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
          validated_at: string | null
          validation_requested_at: string | null
          volume_band: string | null
        }
        Insert: {
          admin_reviewer?: string | null
          audience_estimate?: number | null
          blacklist_buyer_ids?: string[] | null
          channels?: string[] | null
          client_note?: string | null
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
          markets?: string[] | null
          message_html?: string | null
          message_text?: string | null
          name: string
          price_max?: number | null
          price_min?: number | null
          reply_to?: string | null
          schedule_at?: string | null
          segments?: string[] | null
          selected_wines?: string[] | null
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
          validated_at?: string | null
          validation_requested_at?: string | null
          volume_band?: string | null
        }
        Update: {
          admin_reviewer?: string | null
          audience_estimate?: number | null
          blacklist_buyer_ids?: string[] | null
          channels?: string[] | null
          client_note?: string | null
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
          markets?: string[] | null
          message_html?: string | null
          message_text?: string | null
          name?: string
          price_max?: number | null
          price_min?: number | null
          reply_to?: string | null
          schedule_at?: string | null
          segments?: string[] | null
          selected_wines?: string[] | null
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
          validated_at?: string | null
          validation_requested_at?: string | null
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
          related_wine: string | null
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
          related_wine?: string | null
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
          related_wine?: string | null
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
          address_line1: string | null
          address_line2: string | null
          buyer_contact_id: string | null
          buyer_id: string
          campaign_id: string
          city: string | null
          company_name: string | null
          country: string | null
          created_at: string
          created_by: string | null
          email: string | null
          estimated_amount: number | null
          first_name: string | null
          id: string
          last_activity_at: string | null
          last_name: string | null
          lost_reason: string | null
          market: string
          message_snippet: string | null
          owner_notes: string | null
          phone: string | null
          postal_code: string | null
          prospect_status: Database["public"]["Enums"]["prospect_status"] | null
          requested_actions:
            | Database["public"]["Enums"]["requested_action"][]
            | null
          requested_other: string | null
          status: string | null
          tally_response_id: string | null
          tally_response_url: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          buyer_contact_id?: string | null
          buyer_id: string
          campaign_id: string
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          estimated_amount?: number | null
          first_name?: string | null
          id?: string
          last_activity_at?: string | null
          last_name?: string | null
          lost_reason?: string | null
          market: string
          message_snippet?: string | null
          owner_notes?: string | null
          phone?: string | null
          postal_code?: string | null
          prospect_status?:
            | Database["public"]["Enums"]["prospect_status"]
            | null
          requested_actions?:
            | Database["public"]["Enums"]["requested_action"][]
            | null
          requested_other?: string | null
          status?: string | null
          tally_response_id?: string | null
          tally_response_url?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          buyer_contact_id?: string | null
          buyer_id?: string
          campaign_id?: string
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          estimated_amount?: number | null
          first_name?: string | null
          id?: string
          last_activity_at?: string | null
          last_name?: string | null
          lost_reason?: string | null
          market?: string
          message_snippet?: string | null
          owner_notes?: string | null
          phone?: string | null
          postal_code?: string | null
          prospect_status?:
            | Database["public"]["Enums"]["prospect_status"]
            | null
          requested_actions?:
            | Database["public"]["Enums"]["requested_action"][]
            | null
          requested_other?: string | null
          status?: string | null
          tally_response_id?: string | null
          tally_response_url?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_buyer_contact_id_fkey"
            columns: ["buyer_contact_id"]
            isOneToOne: false
            referencedRelation: "buyer_contacts"
            referencedColumns: ["id"]
          },
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
          certifications: string[] | null
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
          wine_types: string[] | null
        }
        Insert: {
          aoc?: string | null
          bottles_per_year?: number | null
          campaigns_remaining?: number | null
          certifications?: string[] | null
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
          wine_types?: string[] | null
        }
        Update: {
          aoc?: string | null
          bottles_per_year?: number | null
          campaigns_remaining?: number | null
          certifications?: string[] | null
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
          wine_types?: string[] | null
        }
        Relationships: []
      }
      prospect_notes: {
        Row: {
          body: string
          created_at: string
          id: string
          lead_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          lead_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          lead_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospect_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      sample_items: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          lead_id: string
          quantity: number
          updated_at: string
          wine_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          lead_id: string
          quantity: number
          updated_at?: string
          wine_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          lead_id?: string
          quantity?: number
          updated_at?: string
          wine_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sample_items_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sample_items_wine_id_fkey"
            columns: ["wine_id"]
            isOneToOne: false
            referencedRelation: "wines"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          daily_digest_enabled: boolean
          display_name: string | null
          id: string
          notify_on_approved: boolean
          notify_on_high_bounce: boolean
          notify_on_reply: boolean
          notify_on_results: boolean
          notify_on_sending: boolean
          reply_to_default: string | null
          ui_language: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_digest_enabled?: boolean
          display_name?: string | null
          id?: string
          notify_on_approved?: boolean
          notify_on_high_bounce?: boolean
          notify_on_reply?: boolean
          notify_on_results?: boolean
          notify_on_sending?: boolean
          reply_to_default?: string | null
          ui_language?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_digest_enabled?: boolean
          display_name?: string | null
          id?: string
          notify_on_approved?: boolean
          notify_on_high_bounce?: boolean
          notify_on_reply?: boolean
          notify_on_results?: boolean
          notify_on_sending?: boolean
          reply_to_default?: string | null
          ui_language?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wines: {
        Row: {
          appellation: string | null
          awards: string | null
          color: string
          created_at: string
          description: string | null
          exw_price_eur: number
          grapes: string[] | null
          id: string
          is_active: boolean
          is_biodynamic: boolean | null
          is_natural: boolean | null
          name: string
          organic: boolean
          updated_at: string
          user_id: string
          vintages: number[] | null
        }
        Insert: {
          appellation?: string | null
          awards?: string | null
          color: string
          created_at?: string
          description?: string | null
          exw_price_eur: number
          grapes?: string[] | null
          id?: string
          is_active?: boolean
          is_biodynamic?: boolean | null
          is_natural?: boolean | null
          name: string
          organic?: boolean
          updated_at?: string
          user_id: string
          vintages?: number[] | null
        }
        Update: {
          appellation?: string | null
          awards?: string | null
          color?: string
          created_at?: string
          description?: string | null
          exw_price_eur?: number
          grapes?: string[] | null
          id?: string
          is_active?: boolean
          is_biodynamic?: boolean | null
          is_natural?: boolean | null
          name?: string
          organic?: boolean
          updated_at?: string
          user_id?: string
          vintages?: number[] | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      prospect_status:
        | "new"
        | "samples_requested"
        | "samples_sent"
        | "received"
        | "tasted"
        | "negotiation"
        | "won"
        | "lost"
      requested_action:
        | "price_list"
        | "samples"
        | "video_call"
        | "tech_sheets"
        | "other"
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
      app_role: ["admin", "user"],
      prospect_status: [
        "new",
        "samples_requested",
        "samples_sent",
        "received",
        "tasted",
        "negotiation",
        "won",
        "lost",
      ],
      requested_action: [
        "price_list",
        "samples",
        "video_call",
        "tech_sheets",
        "other",
      ],
    },
  },
} as const
