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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      audit_events: {
        Row: {
          action: string
          actor: string | null
          at: string
          hash: string
          id: number
          prev_hash: string
          resource_id: string | null
          resource_type: string
          summary: Json | null
        }
        Insert: {
          action: string
          actor?: string | null
          at?: string
          hash: string
          id?: number
          prev_hash: string
          resource_id?: string | null
          resource_type: string
          summary?: Json | null
        }
        Update: {
          action?: string
          actor?: string | null
          at?: string
          hash?: string
          id?: number
          prev_hash?: string
          resource_id?: string | null
          resource_type?: string
          summary?: Json | null
        }
        Relationships: []
      }
      capas: {
        Row: {
          action: string
          code: string
          completed_at: string | null
          created_at: string
          created_by: string
          department: string | null
          deviation_id: string | null
          due_date: string
          effectiveness_criteria: string | null
          evidence: string | null
          id: string
          is_demo: boolean
          kind: string
          owner_id: string | null
          priority: string
          problem: string
          rationale: string | null
          status: string
          verified_by: string | null
        }
        Insert: {
          action: string
          code?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          department?: string | null
          deviation_id?: string | null
          due_date: string
          effectiveness_criteria?: string | null
          evidence?: string | null
          id?: string
          is_demo?: boolean
          kind: string
          owner_id?: string | null
          priority?: string
          problem: string
          rationale?: string | null
          status?: string
          verified_by?: string | null
        }
        Update: {
          action?: string
          code?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          department?: string | null
          deviation_id?: string | null
          due_date?: string
          effectiveness_criteria?: string | null
          evidence?: string | null
          id?: string
          is_demo?: boolean
          kind?: string
          owner_id?: string | null
          priority?: string
          problem?: string
          rationale?: string | null
          status?: string
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "capas_deviation_id_fkey"
            columns: ["deviation_id"]
            isOneToOne: false
            referencedRelation: "deviations"
            referencedColumns: ["id"]
          },
        ]
      }
      deviations: {
        Row: {
          batch: string
          category: string
          code: string
          containment: string | null
          created_at: string
          created_by: string
          data_integrity_impact: string | null
          department: string
          description: string
          detected_at: string
          equipment: string | null
          expected_condition: string | null
          id: string
          is_demo: boolean
          observed_condition: string | null
          observed_value: number | null
          oos_oot: string | null
          owner_id: string | null
          patient_impact: string | null
          product: string
          quality_impact: string | null
          severity: string
          severity_rationale: string | null
          spec_max: number | null
          spec_min: number | null
          stage: string | null
          status: string
          title: string
          units: string | null
          updated_at: string
        }
        Insert: {
          batch: string
          category: string
          code?: string
          containment?: string | null
          created_at?: string
          created_by?: string
          data_integrity_impact?: string | null
          department: string
          description: string
          detected_at?: string
          equipment?: string | null
          expected_condition?: string | null
          id?: string
          is_demo?: boolean
          observed_condition?: string | null
          observed_value?: number | null
          oos_oot?: string | null
          owner_id?: string | null
          patient_impact?: string | null
          product: string
          quality_impact?: string | null
          severity: string
          severity_rationale?: string | null
          spec_max?: number | null
          spec_min?: number | null
          stage?: string | null
          status?: string
          title: string
          units?: string | null
          updated_at?: string
        }
        Update: {
          batch?: string
          category?: string
          code?: string
          containment?: string | null
          created_at?: string
          created_by?: string
          data_integrity_impact?: string | null
          department?: string
          description?: string
          detected_at?: string
          equipment?: string | null
          expected_condition?: string | null
          id?: string
          is_demo?: boolean
          observed_condition?: string | null
          observed_value?: number | null
          oos_oot?: string | null
          owner_id?: string | null
          patient_impact?: string | null
          product?: string
          quality_impact?: string | null
          severity?: string
          severity_rationale?: string | null
          spec_max?: number | null
          spec_min?: number | null
          stage?: string | null
          status?: string
          title?: string
          units?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      investigations: {
        Row: {
          chronology: string | null
          conclusion: string | null
          corrective_actions: string | null
          deviation_id: string
          equipment_history: string | null
          evidence: string | null
          findings: string | null
          hypotheses: string | null
          id: string
          impact_assessment: string | null
          materials_environment: string | null
          personnel_factors: string | null
          preventive_actions: string | null
          process_context: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          chronology?: string | null
          conclusion?: string | null
          corrective_actions?: string | null
          deviation_id: string
          equipment_history?: string | null
          evidence?: string | null
          findings?: string | null
          hypotheses?: string | null
          id?: string
          impact_assessment?: string | null
          materials_environment?: string | null
          personnel_factors?: string | null
          preventive_actions?: string | null
          process_context?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          chronology?: string | null
          conclusion?: string | null
          corrective_actions?: string | null
          deviation_id?: string
          equipment_history?: string | null
          evidence?: string | null
          findings?: string | null
          hypotheses?: string | null
          id?: string
          impact_assessment?: string | null
          materials_environment?: string | null
          personnel_factors?: string | null
          preventive_actions?: string | null
          process_context?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "investigations_deviation_id_fkey"
            columns: ["deviation_id"]
            isOneToOne: true
            referencedRelation: "deviations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          department: string | null
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          code: string
          content: Json
          content_hash: string | null
          created_at: string
          created_by: string
          deviation_id: string
          id: string
          model: string | null
          reviewed_at: string | null
          reviewer_comment: string | null
          reviewer_id: string | null
          status: string
          template_version: string | null
          version: number
        }
        Insert: {
          code?: string
          content: Json
          content_hash?: string | null
          created_at?: string
          created_by?: string
          deviation_id: string
          id?: string
          model?: string | null
          reviewed_at?: string | null
          reviewer_comment?: string | null
          reviewer_id?: string | null
          status?: string
          template_version?: string | null
          version?: number
        }
        Update: {
          code?: string
          content?: Json
          content_hash?: string | null
          created_at?: string
          created_by?: string
          deviation_id?: string
          id?: string
          model?: string | null
          reviewed_at?: string | null
          reviewer_comment?: string | null
          reviewer_id?: string | null
          status?: string
          template_version?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "reports_deviation_id_fkey"
            columns: ["deviation_id"]
            isOneToOne: false
            referencedRelation: "deviations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      audit_hash: {
        Args: {
          a: string
          act: string
          p: string
          rid: string
          rt: string
          s: Json
          t: string
        }
        Returns: string
      }
      audit_log: {
        Args: { _action: string; _rid: string; _rtype: string; _summary: Json }
        Returns: undefined
      }
      can_write: { Args: { _u: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_member: { Args: { _u: string }; Returns: boolean }
      log_client_event: {
        Args: { _action: string; _rid: string; _rtype: string; _summary: Json }
        Returns: undefined
      }
      notify: {
        Args: { _link: string; _title: string; _u: string }
        Returns: undefined
      }
      set_user_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"]; _user: string }
        Returns: undefined
      }
      similar_deviations: {
        Args: { _id: string }
        Returns: {
          category: string
          code: string
          equipment: string
          id: string
          product: string
          reasons: string[]
          score: number
          severity: string
          title: string
        }[]
      }
      verify_audit_chain: {
        Args: never
        Returns: {
          broken_id: number
          ok: boolean
          total: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "investigator" | "qa_reviewer" | "auditor"
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
    Enums: {
      app_role: ["admin", "investigator", "qa_reviewer", "auditor"],
    },
  },
} as const
