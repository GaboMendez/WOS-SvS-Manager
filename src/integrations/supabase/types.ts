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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          alliance: string
          day: string
          id: string
          player_id: string
          score: number
          slot: string
        }
        Insert: {
          alliance?: string
          day: string
          id?: string
          player_id: string
          score?: number
          slot: string
        }
        Update: {
          alliance?: string
          day?: string
          id?: string
          player_id?: string
          score?: number
          slot?: string
        }
        Relationships: []
      }
      imports: {
        Row: {
          created_at: string
          filename: string
          id: string
          raw_csv: string
          row_count: number
        }
        Insert: {
          created_at?: string
          filename: string
          id?: string
          raw_csv: string
          row_count?: number
        }
        Update: {
          created_at?: string
          filename?: string
          id?: string
          raw_csv?: string
          row_count?: number
        }
        Relationships: []
      }
      players: {
        Row: {
          alliance: string
          name: string
          player_id: string
          updated_at: string
        }
        Insert: {
          alliance?: string
          name: string
          player_id: string
          updated_at?: string
        }
        Update: {
          alliance?: string
          name?: string
          player_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          id: number
          updated_at: string
          weights: Json
        }
        Insert: {
          id?: number
          updated_at?: string
          weights?: Json
        }
        Update: {
          id?: number
          updated_at?: string
          weights?: Json
        }
        Relationships: []
      }
      submissions: {
        Row: {
          comment: string
          import_id: string | null
          mon_hours: number[]
          mon_normal_fc: number
          mon_refined_fc: number
          mon_speedup_days: number
          player_id: string
          requests_monday: boolean
          requests_thursday: boolean
          requests_tuesday: boolean
          submitted_at: string
          thu_hours: number[]
          thu_speedup_days: number
          tue_hours: number[]
          tue_shards: number
          tue_speedup_days: number
        }
        Insert: {
          comment?: string
          import_id?: string | null
          mon_hours?: number[]
          mon_normal_fc?: number
          mon_refined_fc?: number
          mon_speedup_days?: number
          player_id: string
          requests_monday?: boolean
          requests_thursday?: boolean
          requests_tuesday?: boolean
          submitted_at?: string
          thu_hours?: number[]
          thu_speedup_days?: number
          tue_hours?: number[]
          tue_shards?: number
          tue_speedup_days?: number
        }
        Update: {
          comment?: string
          import_id?: string | null
          mon_hours?: number[]
          mon_normal_fc?: number
          mon_refined_fc?: number
          mon_speedup_days?: number
          player_id?: string
          requests_monday?: boolean
          requests_thursday?: boolean
          requests_tuesday?: boolean
          submitted_at?: string
          thu_hours?: number[]
          thu_speedup_days?: number
          tue_hours?: number[]
          tue_shards?: number
          tue_speedup_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "submissions_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "players"
            referencedColumns: ["player_id"]
          },
        ]
      }
      waitlist: {
        Row: {
          alliance: string
          day: string
          id: string
          player_id: string
          reason: string
          score: number
        }
        Insert: {
          alliance?: string
          day: string
          id?: string
          player_id: string
          reason?: string
          score?: number
        }
        Update: {
          alliance?: string
          day?: string
          id?: string
          player_id?: string
          reason?: string
          score?: number
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
