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
      contract_extractions: {
        Row: {
          confirmed_at: string | null
          created_at: string
          created_by: string | null
          file_path: string | null
          filename: string | null
          id: string
          parsed_status: string
          project_id: string
          project_type: string | null
          raw_payload: Json | null
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          created_by?: string | null
          file_path?: string | null
          filename?: string | null
          id?: string
          parsed_status?: string
          project_id: string
          project_type?: string | null
          raw_payload?: Json | null
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          created_by?: string | null
          file_path?: string | null
          filename?: string | null
          id?: string
          parsed_status?: string
          project_id?: string
          project_type?: string | null
          raw_payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_extractions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
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
          voice_note_url: string | null
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
          voice_note_url?: string | null
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
          voice_note_url?: string | null
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
      knowledge_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          document_id: string
          embedding: string | null
          id: string
          project_id: string | null
          source_key: string | null
          token_estimate: number | null
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string
          document_id: string
          embedding?: string | null
          id?: string
          project_id?: string | null
          source_key?: string | null
          token_estimate?: number | null
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          document_id?: string
          embedding?: string | null
          id?: string
          project_id?: string | null
          source_key?: string | null
          token_estimate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "project_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_chunks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
      milestone_suggestions: {
        Row: {
          created_at: string
          deferred_by: string | null
          id: string
          phase_id: string
          phase_name: string
          project_id: string
          reason: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deferred_by?: string | null
          id?: string
          phase_id: string
          phase_name: string
          project_id: string
          reason?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deferred_by?: string | null
          id?: string
          phase_id?: string
          phase_name?: string
          project_id?: string
          reason?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestone_suggestions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      milestone_work_packages: {
        Row: {
          contract_type: string
          milestone_key: string
          sort_order: number
          work_package_key: string
        }
        Insert: {
          contract_type?: string
          milestone_key: string
          sort_order: number
          work_package_key: string
        }
        Update: {
          contract_type?: string
          milestone_key?: string
          sort_order?: number
          work_package_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestone_work_packages_work_package_key_fkey"
            columns: ["work_package_key"]
            isOneToOne: false
            referencedRelation: "work_packages"
            referencedColumns: ["work_package_key"]
          },
        ]
      }
      milestones: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          assigned_to: string | null
          assigned_to_name: string | null
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
          assigned_to?: string | null
          assigned_to_name?: string | null
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
          assigned_to?: string | null
          assigned_to_name?: string | null
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
      ontology_training_signals: {
        Row: {
          action: string
          context: Json | null
          created_at: string
          entity_id: string | null
          extraction_id: string | null
          id: string
          project_id: string | null
          signal_type: string
          user_id: string | null
        }
        Insert: {
          action: string
          context?: Json | null
          created_at?: string
          entity_id?: string | null
          extraction_id?: string | null
          id?: string
          project_id?: string | null
          signal_type: string
          user_id?: string | null
        }
        Update: {
          action?: string
          context?: Json | null
          created_at?: string
          entity_id?: string | null
          extraction_id?: string | null
          id?: string
          project_id?: string | null
          signal_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ontology_training_signals_extraction_id_fkey"
            columns: ["extraction_id"]
            isOneToOne: false
            referencedRelation: "contract_extractions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ontology_training_signals_project_id_fkey"
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
          payment_status: string | null
          released_at: string | null
          released_by: string | null
        }
        Insert: {
          amount: number
          certificate_url?: string | null
          generated_at?: string
          id?: string
          milestone_id: string
          payment_status?: string | null
          released_at?: string | null
          released_by?: string | null
        }
        Update: {
          amount?: number
          certificate_url?: string | null
          generated_at?: string
          id?: string
          milestone_id?: string
          payment_status?: string | null
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
      project_documents: {
        Row: {
          byte_size: number | null
          created_at: string
          error: string | null
          file_path: string
          id: string
          is_global: boolean
          kind: string
          mime_type: string | null
          project_id: string | null
          status: string
          title: string
          uploaded_by: string | null
        }
        Insert: {
          byte_size?: number | null
          created_at?: string
          error?: string | null
          file_path: string
          id?: string
          is_global?: boolean
          kind?: string
          mime_type?: string | null
          project_id?: string | null
          status?: string
          title: string
          uploaded_by?: string | null
        }
        Update: {
          byte_size?: number | null
          created_at?: string
          error?: string | null
          file_path?: string
          id?: string
          is_global?: boolean
          kind?: string
          mime_type?: string | null
          project_id?: string | null
          status?: string
          title?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_documents_project_id_fkey"
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
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
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
      whatsapp_identities: {
        Row: {
          created_at: string
          id: string
          phone_number: string
          user_id: string
          verified_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          phone_number: string
          user_id: string
          verified_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          phone_number?: string
          user_id?: string
          verified_at?: string
        }
        Relationships: []
      }
      whatsapp_sessions: {
        Row: {
          id: string
          last_evidence_id: string | null
          last_inbound_at: string | null
          last_milestone_id: string | null
          milestone_id: string | null
          phone_number: string
          project_id: string | null
          state: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          id?: string
          last_evidence_id?: string | null
          last_inbound_at?: string | null
          last_milestone_id?: string | null
          milestone_id?: string | null
          phone_number: string
          project_id?: string | null
          state?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          id?: string
          last_evidence_id?: string | null
          last_inbound_at?: string | null
          last_milestone_id?: string | null
          milestone_id?: string | null
          phone_number?: string
          project_id?: string | null
          state?: string
          updated_at?: string
          user_id?: string | null
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
      whatsapp_verifications: {
        Row: {
          code: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          phone_number: string
          user_id: string
        }
        Insert: {
          code: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          phone_number: string
          user_id: string
        }
        Update: {
          code?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          phone_number?: string
          user_id?: string
        }
        Relationships: []
      }
      work_package_tasks: {
        Row: {
          concealment_flag: boolean
          created_at: string | null
          expected_evidence: string | null
          governing_rule: string | null
          id: string
          task: string
          task_order: number
          task_type: string
          work_package_key: string
        }
        Insert: {
          concealment_flag?: boolean
          created_at?: string | null
          expected_evidence?: string | null
          governing_rule?: string | null
          id?: string
          task: string
          task_order: number
          task_type: string
          work_package_key: string
        }
        Update: {
          concealment_flag?: boolean
          created_at?: string | null
          expected_evidence?: string | null
          governing_rule?: string | null
          id?: string
          task?: string
          task_order?: number
          task_type?: string
          work_package_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_package_tasks_work_package_key_fkey"
            columns: ["work_package_key"]
            isOneToOne: false
            referencedRelation: "work_packages"
            referencedColumns: ["work_package_key"]
          },
        ]
      }
      work_packages: {
        Row: {
          description: string | null
          label: string
          work_package_key: string
        }
        Insert: {
          description?: string | null
          label: string
          work_package_key: string
        }
        Update: {
          description?: string | null
          label?: string
          work_package_key?: string
        }
        Relationships: []
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
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
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
      match_chunks: {
        Args: {
          _match_count?: number
          _project_id: string
          _query_embedding: string
        }
        Returns: {
          chunk_index: number
          content: string
          document_id: string
          id: string
          is_global: boolean
          similarity: number
        }[]
      }
      match_project_chunks: {
        Args: {
          _match_count?: number
          _project_id: string
          _query_embedding: string
        }
        Returns: {
          chunk_index: number
          content: string
          document_id: string
          id: string
          similarity: number
        }[]
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
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
        | "disputed"
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
        "disputed",
      ],
    },
  },
} as const
