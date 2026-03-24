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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          project_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          project_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence: {
        Row: {
          ai_tags: Json | null
          ai_tags_original: Json | null
          channel: Database["public"]["Enums"]["evidence_channel"]
          evidence_code: string | null
          file_hash: string | null
          file_size_bytes: number | null
          gps_lat: number | null
          gps_lng: number | null
          human_override: boolean
          id: string
          label_dimensions_captured: number
          latitude: number | null
          longitude: number | null
          milestone_id: string
          note: string | null
          photo_url: string | null
          quality_assessment: string | null
          submitted_at: string
          submitted_by: string | null
          task_id: string | null
          training_eligible: boolean
          verification_level: number
        }
        Insert: {
          ai_tags?: Json | null
          ai_tags_original?: Json | null
          channel?: Database["public"]["Enums"]["evidence_channel"]
          evidence_code?: string | null
          file_hash?: string | null
          file_size_bytes?: number | null
          gps_lat?: number | null
          gps_lng?: number | null
          human_override?: boolean
          id?: string
          label_dimensions_captured?: number
          latitude?: number | null
          longitude?: number | null
          milestone_id: string
          note?: string | null
          photo_url?: string | null
          quality_assessment?: string | null
          submitted_at?: string
          submitted_by?: string | null
          task_id?: string | null
          training_eligible?: boolean
          verification_level?: number
        }
        Update: {
          ai_tags?: Json | null
          ai_tags_original?: Json | null
          channel?: Database["public"]["Enums"]["evidence_channel"]
          evidence_code?: string | null
          file_hash?: string | null
          file_size_bytes?: number | null
          gps_lat?: number | null
          gps_lng?: number | null
          human_override?: boolean
          id?: string
          label_dimensions_captured?: number
          latitude?: number | null
          longitude?: number | null
          milestone_id?: string
          note?: string | null
          photo_url?: string | null
          quality_assessment?: string | null
          submitted_at?: string
          submitted_by?: string | null
          task_id?: string | null
          training_eligible?: boolean
          verification_level?: number
        }
        Relationships: [
          {
            foreignKeyName: "evidence_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      milestone_assignments: {
        Row: {
          id: string
          milestone_id: string
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          milestone_id: string
          role: string
          user_id: string
        }
        Update: {
          id?: string
          milestone_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestone_assignments_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
        ]
      }
      milestone_shifts: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          id: string
          milestone_id: string
          new_date: string
          old_date: string
          reason: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          id?: string
          milestone_id: string
          new_date: string
          old_date: string
          reason?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          id?: string
          milestone_id?: string
          new_date?: string
          old_date?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "milestone_shifts_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          checklist: Json | null
          created_at: string
          created_from: Database["public"]["Enums"]["milestone_source"]
          description: string | null
          due_date: string | null
          id: string
          name: string
          payment_value: number | null
          position: number
          project_id: string
          status: Database["public"]["Enums"]["milestone_status"]
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          checklist?: Json | null
          created_at?: string
          created_from?: Database["public"]["Enums"]["milestone_source"]
          description?: string | null
          due_date?: string | null
          id?: string
          name: string
          payment_value?: number | null
          position?: number
          project_id: string
          status?: Database["public"]["Enums"]["milestone_status"]
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          checklist?: Json | null
          created_at?: string
          created_from?: Database["public"]["Enums"]["milestone_source"]
          description?: string | null
          due_date?: string | null
          id?: string
          name?: string
          payment_value?: number | null
          position?: number
          project_id?: string
          status?: Database["public"]["Enums"]["milestone_status"]
        }
        Relationships: [
          {
            foreignKeyName: "milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_certificates: {
        Row: {
          amount: number
          certificate_url: string | null
          generated_at: string
          id: string
          milestone_id: string
          released_at: string | null
          released_by: string | null
        }
        Insert: {
          amount: number
          certificate_url?: string | null
          generated_at?: string
          id?: string
          milestone_id: string
          released_at?: string | null
          released_by?: string | null
        }
        Update: {
          amount?: number
          certificate_url?: string | null
          generated_at?: string
          id?: string
          milestone_id?: string
          released_at?: string | null
          released_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_certificates_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
        ]
      }
      project_changes: {
        Row: {
          change_type: string
          changed_by: string | null
          changed_by_name: string | null
          created_at: string
          entity_id: string | null
          entity_name: string | null
          entity_type: string
          id: string
          new_value: Json | null
          note: string | null
          old_value: Json | null
          project_id: string
        }
        Insert: {
          change_type: string
          changed_by?: string | null
          changed_by_name?: string | null
          created_at?: string
          entity_id?: string | null
          entity_name?: string | null
          entity_type: string
          id?: string
          new_value?: Json | null
          note?: string | null
          old_value?: Json | null
          project_id: string
        }
        Update: {
          change_type?: string
          changed_by?: string | null
          changed_by_name?: string | null
          created_at?: string
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string
          id?: string
          new_value?: Json | null
          note?: string | null
          old_value?: Json | null
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_changes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          email: string | null
          id: string
          invite_token: string | null
          joined_at: string | null
          name: string
          phone_number: string | null
          project_id: string
          role: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["member_status"]
          user_id: string | null
        }
        Insert: {
          email?: string | null
          id?: string
          invite_token?: string | null
          joined_at?: string | null
          name: string
          phone_number?: string | null
          project_id: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["member_status"]
          user_id?: string | null
        }
        Update: {
          email?: string | null
          id?: string
          invite_token?: string | null
          joined_at?: string | null
          name?: string
          phone_number?: string | null
          project_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["member_status"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          address: string | null
          cancelled_at: string | null
          created_at: string
          created_by: string | null
          end_date: string | null
          id: string
          name: string
          payment_mode: boolean | null
          project_code: string | null
          start_date: string | null
          total_budget: number | null
        }
        Insert: {
          address?: string | null
          cancelled_at?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          name: string
          payment_mode?: boolean | null
          project_code?: string | null
          start_date?: string | null
          total_budget?: number | null
        }
        Update: {
          address?: string | null
          cancelled_at?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          name?: string
          payment_mode?: boolean | null
          project_code?: string | null
          start_date?: string | null
          total_budget?: number | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_role: string | null
          assigned_to: string | null
          assigned_to_name: string | null
          budget: number | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          depends_on: string | null
          description: string | null
          due_date: string | null
          evidence_required: boolean
          id: string
          milestone_id: string
          name: string
          position: number
          status: string
        }
        Insert: {
          assigned_role?: string | null
          assigned_to?: string | null
          assigned_to_name?: string | null
          budget?: number | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          depends_on?: string | null
          description?: string | null
          due_date?: string | null
          evidence_required?: boolean
          id?: string
          milestone_id: string
          name: string
          position?: number
          status?: string
        }
        Update: {
          assigned_role?: string | null
          assigned_to?: string | null
          assigned_to_name?: string | null
          budget?: number | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          depends_on?: string | null
          description?: string | null
          due_date?: string | null
          evidence_required?: boolean
          id?: string
          milestone_id?: string
          name?: string
          position?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_depends_on_fkey"
            columns: ["depends_on"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
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
      whatsapp_sessions: {
        Row: {
          id: string
          milestone_id: string | null
          phone_number: string
          project_id: string | null
          state: string
          updated_at: string
        }
        Insert: {
          id?: string
          milestone_id?: string | null
          phone_number: string
          project_id?: string | null
          state?: string
          updated_at?: string
        }
        Update: {
          id?: string
          milestone_id?: string | null
          phone_number?: string
          project_id?: string | null
          state?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_sessions_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_invitations_for_user: {
        Args: { _email: string; _user_id: string }
        Returns: undefined
      }
      get_project_role: {
        Args: { _project_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      is_project_member: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      lookup_project_by_code: {
        Args: { _code: string }
        Returns: {
          id: string
          name: string
        }[]
      }
    }
    Enums: {
      app_role: "pm" | "contractor" | "trade" | "client"
      evidence_channel: "app" | "whatsapp"
      member_status: "invited" | "confirmed" | "active"
      milestone_source: "manual" | "template" | "extracted"
      milestone_status:
        | "pending"
        | "in_progress"
        | "overdue"
        | "in_review"
        | "complete"
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
      app_role: ["pm", "contractor", "trade", "client"],
      evidence_channel: ["app", "whatsapp"],
      member_status: ["invited", "confirmed", "active"],
      milestone_source: ["manual", "template", "extracted"],
      milestone_status: [
        "pending",
        "in_progress",
        "overdue",
        "in_review",
        "complete",
      ],
    },
  },
} as const
