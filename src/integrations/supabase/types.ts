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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          activity_type: string
          broker: string
          created_at: string | null
          deal_trigger: string | null
          firm_id: string | null
          id: string
          property_id: string
          sentiment: string | null
          summary: string
        }
        Insert: {
          activity_type: string
          broker: string
          created_at?: string | null
          deal_trigger?: string | null
          firm_id?: string | null
          id: string
          property_id: string
          sentiment?: string | null
          summary: string
        }
        Update: {
          activity_type?: string
          broker?: string
          created_at?: string | null
          deal_trigger?: string | null
          firm_id?: string | null
          id?: string
          property_id?: string
          sentiment?: string | null
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firm_dashboard"
            referencedColumns: ["firm_id"]
          },
          {
            foreignKeyName: "activities_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_context_logs: {
        Row: {
          ai_reasoning: string | null
          contact_context: Json | null
          created_at: string | null
          data_sources: string[] | null
          draft_id: string
          id: string
          market_context: Json | null
          property_context: Json | null
          relationship_context: Json | null
          user_preferences: Json | null
        }
        Insert: {
          ai_reasoning?: string | null
          contact_context?: Json | null
          created_at?: string | null
          data_sources?: string[] | null
          draft_id: string
          id?: string
          market_context?: Json | null
          property_context?: Json | null
          relationship_context?: Json | null
          user_preferences?: Json | null
        }
        Update: {
          ai_reasoning?: string | null
          contact_context?: Json | null
          created_at?: string | null
          data_sources?: string[] | null
          draft_id?: string
          id?: string
          market_context?: Json | null
          property_context?: Json | null
          relationship_context?: Json | null
          user_preferences?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_context_logs_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "draft_approval_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_context_logs_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "outreach_drafts"
            referencedColumns: ["id"]
          },
        ]
      }
      apartments_listings: {
        Row: {
          address: string | null
          beds_max: number | null
          beds_min: number | null
          city: string | null
          created_at: string | null
          id: number
          listing_url: string | null
          match_confidence: number | null
          matched_property_id: number | null
          property_name: string
          property_type: string | null
          rent_max: number | null
          rent_min: number | null
          scraped_at: string | null
          source_property_id: string | null
          sqft_max: number | null
          sqft_min: number | null
          state: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          beds_max?: number | null
          beds_min?: number | null
          city?: string | null
          created_at?: string | null
          id?: number
          listing_url?: string | null
          match_confidence?: number | null
          matched_property_id?: number | null
          property_name: string
          property_type?: string | null
          rent_max?: number | null
          rent_min?: number | null
          scraped_at?: string | null
          source_property_id?: string | null
          sqft_max?: number | null
          sqft_min?: number | null
          state?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          beds_max?: number | null
          beds_min?: number | null
          city?: string | null
          created_at?: string | null
          id?: number
          listing_url?: string | null
          match_confidence?: number | null
          matched_property_id?: number | null
          property_name?: string
          property_type?: string | null
          rent_max?: number | null
          rent_min?: number | null
          scraped_at?: string | null
          source_property_id?: string | null
          sqft_max?: number | null
          sqft_min?: number | null
          state?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "apartments_listings_matched_property_id_fkey"
            columns: ["matched_property_id"]
            isOneToOne: false
            referencedRelation: "property_vacancy_metrics"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "apartments_listings_matched_property_id_fkey"
            columns: ["matched_property_id"]
            isOneToOne: false
            referencedRelation: "student_housing_properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apartments_listings_matched_property_id_fkey"
            columns: ["matched_property_id"]
            isOneToOne: false
            referencedRelation: "vw_student_housing_enriched"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          firm_id: string | null
          id: string
          ip_address: unknown
          resource_id: string | null
          resource_type: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          firm_id?: string | null
          id?: string
          ip_address?: unknown
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          firm_id?: string | null
          id?: string
          ip_address?: unknown
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firm_dashboard"
            referencedColumns: ["firm_id"]
          },
          {
            foreignKeyName: "audit_log_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          created_at: string
          entity_id: string | null
          entity_type: Database["public"]["Enums"]["audit_entity"]
          firm_id: string | null
          id: string
          ip_address: unknown
          message: string
          metadata: Json | null
          severity: Database["public"]["Enums"]["audit_severity"]
          timestamp: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          created_at?: string
          entity_id?: string | null
          entity_type: Database["public"]["Enums"]["audit_entity"]
          firm_id?: string | null
          id?: string
          ip_address?: unknown
          message: string
          metadata?: Json | null
          severity?: Database["public"]["Enums"]["audit_severity"]
          timestamp?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          created_at?: string
          entity_id?: string | null
          entity_type?: Database["public"]["Enums"]["audit_entity"]
          firm_id?: string | null
          id?: string
          ip_address?: unknown
          message?: string
          metadata?: Json | null
          severity?: Database["public"]["Enums"]["audit_severity"]
          timestamp?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firm_dashboard"
            referencedColumns: ["firm_id"]
          },
          {
            foreignKeyName: "audit_logs_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      building_permits: {
        Row: {
          collection_timestamp: string | null
          county_fips: string | null
          created_at: string | null
          five_plus_units: number | null
          five_plus_value: number | null
          five_plus_yoy_change: number | null
          geography_name: string | null
          geography_type: string
          id: string
          msa_code: string | null
          multifamily_pct: number | null
          period_month: number | null
          period_type: string | null
          period_year: number
          place_fips: string | null
          single_family_units: number | null
          state_fips: string | null
          three_four_family_units: number | null
          total_units: number | null
          total_units_yoy_change: number | null
          total_value: number | null
          two_family_units: number | null
        }
        Insert: {
          collection_timestamp?: string | null
          county_fips?: string | null
          created_at?: string | null
          five_plus_units?: number | null
          five_plus_value?: number | null
          five_plus_yoy_change?: number | null
          geography_name?: string | null
          geography_type: string
          id?: string
          msa_code?: string | null
          multifamily_pct?: number | null
          period_month?: number | null
          period_type?: string | null
          period_year: number
          place_fips?: string | null
          single_family_units?: number | null
          state_fips?: string | null
          three_four_family_units?: number | null
          total_units?: number | null
          total_units_yoy_change?: number | null
          total_value?: number | null
          two_family_units?: number | null
        }
        Update: {
          collection_timestamp?: string | null
          county_fips?: string | null
          created_at?: string | null
          five_plus_units?: number | null
          five_plus_value?: number | null
          five_plus_yoy_change?: number | null
          geography_name?: string | null
          geography_type?: string
          id?: string
          msa_code?: string | null
          multifamily_pct?: number | null
          period_month?: number | null
          period_type?: string | null
          period_year?: number
          place_fips?: string | null
          single_family_units?: number | null
          state_fips?: string | null
          three_four_family_units?: number | null
          total_units?: number | null
          total_units_yoy_change?: number | null
          total_value?: number | null
          two_family_units?: number | null
        }
        Relationships: []
      }
      census_building_permits: {
        Row: {
          collection_timestamp: string | null
          created_at: string | null
          geography_code: string
          geography_name: string | null
          geography_type: string
          id: string
          period: string
          total_buildings: number | null
          total_units: number | null
          total_value: number | null
          units_1_family: number | null
          units_2_family: number | null
          units_3_4_family: number | null
          units_5_plus: number | null
          units_5_plus_yoy_change: number | null
          units_5_plus_yoy_pct: number | null
          value_5_plus: number | null
        }
        Insert: {
          collection_timestamp?: string | null
          created_at?: string | null
          geography_code: string
          geography_name?: string | null
          geography_type: string
          id?: string
          period: string
          total_buildings?: number | null
          total_units?: number | null
          total_value?: number | null
          units_1_family?: number | null
          units_2_family?: number | null
          units_3_4_family?: number | null
          units_5_plus?: number | null
          units_5_plus_yoy_change?: number | null
          units_5_plus_yoy_pct?: number | null
          value_5_plus?: number | null
        }
        Update: {
          collection_timestamp?: string | null
          created_at?: string | null
          geography_code?: string
          geography_name?: string | null
          geography_type?: string
          id?: string
          period?: string
          total_buildings?: number | null
          total_units?: number | null
          total_value?: number | null
          units_1_family?: number | null
          units_2_family?: number | null
          units_3_4_family?: number | null
          units_5_plus?: number | null
          units_5_plus_yoy_change?: number | null
          units_5_plus_yoy_pct?: number | null
          value_5_plus?: number | null
        }
        Relationships: []
      }
      census_tract_vacancy: {
        Row: {
          acs_year: number
          county_fips: string
          data_source: string | null
          fetched_at: string | null
          geoid: string
          id: string
          owner_occupied: number | null
          rental_vacancy_rate: number | null
          renter_occupied: number | null
          state_fips: string
          total_occupied: number | null
          total_vacancy_rate: number | null
          total_vacant: number | null
          tract_fips: string
          tract_name: string | null
          vacant_for_rent: number | null
          vacant_for_sale: number | null
          vacant_migrant_workers: number | null
          vacant_other: number | null
          vacant_rented_not_occupied: number | null
          vacant_seasonal: number | null
          vacant_sold_not_occupied: number | null
        }
        Insert: {
          acs_year: number
          county_fips: string
          data_source?: string | null
          fetched_at?: string | null
          geoid: string
          id?: string
          owner_occupied?: number | null
          rental_vacancy_rate?: number | null
          renter_occupied?: number | null
          state_fips: string
          total_occupied?: number | null
          total_vacancy_rate?: number | null
          total_vacant?: number | null
          tract_fips: string
          tract_name?: string | null
          vacant_for_rent?: number | null
          vacant_for_sale?: number | null
          vacant_migrant_workers?: number | null
          vacant_other?: number | null
          vacant_rented_not_occupied?: number | null
          vacant_seasonal?: number | null
          vacant_sold_not_occupied?: number | null
        }
        Update: {
          acs_year?: number
          county_fips?: string
          data_source?: string | null
          fetched_at?: string | null
          geoid?: string
          id?: string
          owner_occupied?: number | null
          rental_vacancy_rate?: number | null
          renter_occupied?: number | null
          state_fips?: string
          total_occupied?: number | null
          total_vacancy_rate?: number | null
          total_vacant?: number | null
          tract_fips?: string
          tract_name?: string | null
          vacant_for_rent?: number | null
          vacant_for_sale?: number | null
          vacant_migrant_workers?: number | null
          vacant_other?: number | null
          vacant_rented_not_occupied?: number | null
          vacant_seasonal?: number | null
          vacant_sold_not_occupied?: number | null
        }
        Relationships: []
      }
      contacts: {
        Row: {
          company: string | null
          contact_frequency: string | null
          created_at: string
          email: string | null
          firm_id: string | null
          first_name: string
          id: string
          last_contact_date: string | null
          last_name: string
          notes: string | null
          ownership_group_id: number | null
          phone: string | null
          preferred_contact_method: string | null
          role: string | null
          source: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          company?: string | null
          contact_frequency?: string | null
          created_at?: string
          email?: string | null
          firm_id?: string | null
          first_name: string
          id?: string
          last_contact_date?: string | null
          last_name: string
          notes?: string | null
          ownership_group_id?: number | null
          phone?: string | null
          preferred_contact_method?: string | null
          role?: string | null
          source?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          company?: string | null
          contact_frequency?: string | null
          created_at?: string
          email?: string | null
          firm_id?: string | null
          first_name?: string
          id?: string
          last_contact_date?: string | null
          last_name?: string
          notes?: string | null
          ownership_group_id?: number | null
          phone?: string | null
          preferred_contact_method?: string | null
          role?: string | null
          source?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firm_dashboard"
            referencedColumns: ["firm_id"]
          },
          {
            foreignKeyName: "contacts_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_ownership_group_id_fkey"
            columns: ["ownership_group_id"]
            isOneToOne: false
            referencedRelation: "ownership_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      data_sync_log: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_details: Json | null
          error_message: string | null
          id: string
          metadata: Json | null
          records_failed: number | null
          records_inserted: number | null
          records_processed: number | null
          records_updated: number | null
          source: string
          started_at: string | null
          status: string | null
          sync_type: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          records_failed?: number | null
          records_inserted?: number | null
          records_processed?: number | null
          records_updated?: number | null
          source: string
          started_at?: string | null
          status?: string | null
          sync_type?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          records_failed?: number | null
          records_inserted?: number | null
          records_processed?: number | null
          records_updated?: number | null
          source?: string
          started_at?: string | null
          status?: string | null
          sync_type?: string | null
        }
        Relationships: []
      }
      economic_indicators: {
        Row: {
          alert_threshold_high: number | null
          alert_threshold_low: number | null
          change_1m: number | null
          change_1w: number | null
          change_1y: number | null
          change_3m: number | null
          collection_timestamp: string | null
          created_at: string | null
          historical_values: Json | null
          id: number
          indicator_code: string
          indicator_name: string
          indicator_type: string
          is_alert_active: boolean | null
          source: string | null
          state_code: string | null
          updated_at: string | null
          value: number
          value_date: string
          yoy_growth_pct: number | null
        }
        Insert: {
          alert_threshold_high?: number | null
          alert_threshold_low?: number | null
          change_1m?: number | null
          change_1w?: number | null
          change_1y?: number | null
          change_3m?: number | null
          collection_timestamp?: string | null
          created_at?: string | null
          historical_values?: Json | null
          id?: number
          indicator_code: string
          indicator_name: string
          indicator_type?: string
          is_alert_active?: boolean | null
          source?: string | null
          state_code?: string | null
          updated_at?: string | null
          value: number
          value_date: string
          yoy_growth_pct?: number | null
        }
        Update: {
          alert_threshold_high?: number | null
          alert_threshold_low?: number | null
          change_1m?: number | null
          change_1w?: number | null
          change_1y?: number | null
          change_3m?: number | null
          collection_timestamp?: string | null
          created_at?: string | null
          historical_values?: Json | null
          id?: number
          indicator_code?: string
          indicator_name?: string
          indicator_type?: string
          is_alert_active?: boolean | null
          source?: string | null
          state_code?: string | null
          updated_at?: string | null
          value?: number
          value_date?: string
          yoy_growth_pct?: number | null
        }
        Relationships: []
      }
      enrollment_predictions: {
        Row: {
          actual_enrollment_change: number | null
          classification_accuracy: number | null
          created_at: string | null
          forecast_horizon: string
          id: number
          input_features: Json | null
          macro_risk_score: string
          model_r_squared: number | null
          model_rmse: number | null
          model_version: string
          predicted_bed_demand_change: number | null
          predicted_direction: string | null
          predicted_enrollment_change: number | null
          prediction_date: string | null
          residual: number | null
          residual_interpretation: string | null
          scenarios: Json | null
          state_code: string | null
          unitid: string | null
          university_name: string
        }
        Insert: {
          actual_enrollment_change?: number | null
          classification_accuracy?: number | null
          created_at?: string | null
          forecast_horizon: string
          id?: number
          input_features?: Json | null
          macro_risk_score: string
          model_r_squared?: number | null
          model_rmse?: number | null
          model_version: string
          predicted_bed_demand_change?: number | null
          predicted_direction?: string | null
          predicted_enrollment_change?: number | null
          prediction_date?: string | null
          residual?: number | null
          residual_interpretation?: string | null
          scenarios?: Json | null
          state_code?: string | null
          unitid?: string | null
          university_name: string
        }
        Update: {
          actual_enrollment_change?: number | null
          classification_accuracy?: number | null
          created_at?: string | null
          forecast_horizon?: string
          id?: number
          input_features?: Json | null
          macro_risk_score?: string
          model_r_squared?: number | null
          model_rmse?: number | null
          model_version?: string
          predicted_bed_demand_change?: number | null
          predicted_direction?: string | null
          predicted_enrollment_change?: number | null
          prediction_date?: string | null
          residual?: number | null
          residual_interpretation?: string | null
          scenarios?: Json | null
          state_code?: string | null
          unitid?: string | null
          university_name?: string
        }
        Relationships: []
      }
      enrollment_records: {
        Row: {
          academic_year: number
          created_at: string | null
          data_source: string | null
          first_time_students: number | null
          full_time_enrollment: number | null
          graduate_enrollment: number | null
          id: number
          international_students: number | null
          part_time_enrollment: number | null
          source_file: string | null
          total_enrollment: number
          transfer_students: number | null
          undergraduate_enrollment: number | null
          university_id: number
          updated_at: string | null
        }
        Insert: {
          academic_year: number
          created_at?: string | null
          data_source?: string | null
          first_time_students?: number | null
          full_time_enrollment?: number | null
          graduate_enrollment?: number | null
          id?: number
          international_students?: number | null
          part_time_enrollment?: number | null
          source_file?: string | null
          total_enrollment: number
          transfer_students?: number | null
          undergraduate_enrollment?: number | null
          university_id: number
          updated_at?: string | null
        }
        Update: {
          academic_year?: number
          created_at?: string | null
          data_source?: string | null
          first_time_students?: number | null
          full_time_enrollment?: number | null
          graduate_enrollment?: number | null
          id?: number
          international_students?: number | null
          part_time_enrollment?: number | null
          source_file?: string | null
          total_enrollment?: number
          transfer_students?: number | null
          undergraduate_enrollment?: number | null
          university_id?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollment_records_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_records_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "v_university_enrollment_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_records_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "vw_student_housing_enriched"
            referencedColumns: ["uni_id"]
          },
        ]
      }
      enrollment_trends: {
        Row: {
          cagr_3yr: number | null
          cagr_5yr: number | null
          calculated_at: string | null
          created_at: string | null
          id: number
          latest_enrollment: number | null
          peak_enrollment: number | null
          peak_year: number | null
          trend_confidence: number | null
          trend_direction: string | null
          trough_enrollment: number | null
          trough_year: number | null
          university_id: number
          updated_at: string | null
          years_of_data: number | null
          yoy_change_pct: number | null
        }
        Insert: {
          cagr_3yr?: number | null
          cagr_5yr?: number | null
          calculated_at?: string | null
          created_at?: string | null
          id?: number
          latest_enrollment?: number | null
          peak_enrollment?: number | null
          peak_year?: number | null
          trend_confidence?: number | null
          trend_direction?: string | null
          trough_enrollment?: number | null
          trough_year?: number | null
          university_id: number
          updated_at?: string | null
          years_of_data?: number | null
          yoy_change_pct?: number | null
        }
        Update: {
          cagr_3yr?: number | null
          cagr_5yr?: number | null
          calculated_at?: string | null
          created_at?: string | null
          id?: number
          latest_enrollment?: number | null
          peak_enrollment?: number | null
          peak_year?: number | null
          trend_confidence?: number | null
          trend_direction?: string | null
          trough_enrollment?: number | null
          trough_year?: number | null
          university_id?: number
          updated_at?: string | null
          years_of_data?: number | null
          yoy_change_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollment_trends_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: true
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_trends_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: true
            referencedRelation: "v_university_enrollment_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_trends_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: true
            referencedRelation: "vw_student_housing_enriched"
            referencedColumns: ["uni_id"]
          },
        ]
      }
      etl_run_log: {
        Row: {
          completed_at: string | null
          created_at: string | null
          duration_seconds: number | null
          error_message: string | null
          error_stack: string | null
          id: string
          metadata: Json | null
          pipeline_name: string
          records_failed: number | null
          records_fetched: number | null
          records_inserted: number | null
          records_updated: number | null
          run_type: string | null
          started_at: string | null
          status: string | null
          workflow_run_id: string | null
          workflow_run_url: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          error_stack?: string | null
          id?: string
          metadata?: Json | null
          pipeline_name: string
          records_failed?: number | null
          records_fetched?: number | null
          records_inserted?: number | null
          records_updated?: number | null
          run_type?: string | null
          started_at?: string | null
          status?: string | null
          workflow_run_id?: string | null
          workflow_run_url?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          error_stack?: string | null
          id?: string
          metadata?: Json | null
          pipeline_name?: string
          records_failed?: number | null
          records_fetched?: number | null
          records_inserted?: number | null
          records_updated?: number | null
          run_type?: string | null
          started_at?: string | null
          status?: string | null
          workflow_run_id?: string | null
          workflow_run_url?: string | null
        }
        Relationships: []
      }
      fannie_mae_loans: {
        Row: {
          acquisition_year: number | null
          ami_local: number | null
          census_tract: string | null
          collection_timestamp: string | null
          county_fips: string | null
          created_at: string | null
          current_upb: number | null
          delinquency_status: string | null
          dscr_at_origination: number | null
          dscr_current: number | null
          enterprise: string | null
          id: string
          is_affordable: boolean | null
          is_underserved: boolean | null
          loan_identifier: string
          loan_purpose: string | null
          loan_term: number | null
          maturity_date: string | null
          modification_flag: boolean | null
          months_delinquent: number | null
          msa_code: string | null
          msa_name: string | null
          note_rate: number | null
          occupancy_at_origination: number | null
          original_upb: number | null
          origination_date: string | null
          property_city: string | null
          property_name: string | null
          property_state: string | null
          property_type: string | null
          property_zip: string | null
          reporting_period: string
          seller_type: string | null
          special_servicing_flag: boolean | null
          state_fips: string | null
          tract_income_ratio: number | null
          tract_minority_pct: number | null
          unit_count: number | null
          updated_at: string | null
          year_built: number | null
        }
        Insert: {
          acquisition_year?: number | null
          ami_local?: number | null
          census_tract?: string | null
          collection_timestamp?: string | null
          county_fips?: string | null
          created_at?: string | null
          current_upb?: number | null
          delinquency_status?: string | null
          dscr_at_origination?: number | null
          dscr_current?: number | null
          enterprise?: string | null
          id?: string
          is_affordable?: boolean | null
          is_underserved?: boolean | null
          loan_identifier: string
          loan_purpose?: string | null
          loan_term?: number | null
          maturity_date?: string | null
          modification_flag?: boolean | null
          months_delinquent?: number | null
          msa_code?: string | null
          msa_name?: string | null
          note_rate?: number | null
          occupancy_at_origination?: number | null
          original_upb?: number | null
          origination_date?: string | null
          property_city?: string | null
          property_name?: string | null
          property_state?: string | null
          property_type?: string | null
          property_zip?: string | null
          reporting_period: string
          seller_type?: string | null
          special_servicing_flag?: boolean | null
          state_fips?: string | null
          tract_income_ratio?: number | null
          tract_minority_pct?: number | null
          unit_count?: number | null
          updated_at?: string | null
          year_built?: number | null
        }
        Update: {
          acquisition_year?: number | null
          ami_local?: number | null
          census_tract?: string | null
          collection_timestamp?: string | null
          county_fips?: string | null
          created_at?: string | null
          current_upb?: number | null
          delinquency_status?: string | null
          dscr_at_origination?: number | null
          dscr_current?: number | null
          enterprise?: string | null
          id?: string
          is_affordable?: boolean | null
          is_underserved?: boolean | null
          loan_identifier?: string
          loan_purpose?: string | null
          loan_term?: number | null
          maturity_date?: string | null
          modification_flag?: boolean | null
          months_delinquent?: number | null
          msa_code?: string | null
          msa_name?: string | null
          note_rate?: number | null
          occupancy_at_origination?: number | null
          original_upb?: number | null
          origination_date?: string | null
          property_city?: string | null
          property_name?: string | null
          property_state?: string | null
          property_type?: string | null
          property_zip?: string | null
          reporting_period?: string
          seller_type?: string | null
          special_servicing_flag?: boolean | null
          state_fips?: string | null
          tract_income_ratio?: number | null
          tract_minority_pct?: number | null
          unit_count?: number | null
          updated_at?: string | null
          year_built?: number | null
        }
        Relationships: []
      }
      fannie_mae_market_summary: {
        Row: {
          avg_dscr: number | null
          avg_note_rate: number | null
          avg_occupancy: number | null
          collection_timestamp: string | null
          created_at: string | null
          delinquency_rate: number | null
          geography_code: string
          geography_name: string | null
          geography_type: string
          id: string
          loans_maturing_12mo: number | null
          loans_maturing_24mo: number | null
          reporting_period: string
          special_servicing_rate: number | null
          total_loans: number | null
          total_upb: number | null
          upb_maturing_12mo: number | null
          upb_maturing_24mo: number | null
        }
        Insert: {
          avg_dscr?: number | null
          avg_note_rate?: number | null
          avg_occupancy?: number | null
          collection_timestamp?: string | null
          created_at?: string | null
          delinquency_rate?: number | null
          geography_code: string
          geography_name?: string | null
          geography_type: string
          id?: string
          loans_maturing_12mo?: number | null
          loans_maturing_24mo?: number | null
          reporting_period: string
          special_servicing_rate?: number | null
          total_loans?: number | null
          total_upb?: number | null
          upb_maturing_12mo?: number | null
          upb_maturing_24mo?: number | null
        }
        Update: {
          avg_dscr?: number | null
          avg_note_rate?: number | null
          avg_occupancy?: number | null
          collection_timestamp?: string | null
          created_at?: string | null
          delinquency_rate?: number | null
          geography_code?: string
          geography_name?: string | null
          geography_type?: string
          id?: string
          loans_maturing_12mo?: number | null
          loans_maturing_24mo?: number | null
          reporting_period?: string
          special_servicing_rate?: number | null
          total_loans?: number | null
          total_upb?: number | null
          upb_maturing_12mo?: number | null
          upb_maturing_24mo?: number | null
        }
        Relationships: []
      }
      firm_integrations: {
        Row: {
          access_token_encrypted: string | null
          api_calls_reset_at: string | null
          api_calls_today: number | null
          api_key_encrypted: string | null
          connected_at: string | null
          connected_by: string | null
          created_at: string | null
          disconnected_at: string | null
          disconnected_by: string | null
          external_account_id: string | null
          external_account_name: string | null
          external_workspace_id: string | null
          firm_id: string
          id: string
          last_sync_at: string | null
          last_sync_error: string | null
          last_sync_status: string | null
          next_sync_at: string | null
          provider_id: string
          refresh_token_encrypted: string | null
          settings: Json | null
          status: Database["public"]["Enums"]["integration_status"]
          status_message: string | null
          sync_direction: string | null
          sync_enabled: boolean | null
          token_expires_at: string | null
          token_scopes: string[] | null
          updated_at: string | null
        }
        Insert: {
          access_token_encrypted?: string | null
          api_calls_reset_at?: string | null
          api_calls_today?: number | null
          api_key_encrypted?: string | null
          connected_at?: string | null
          connected_by?: string | null
          created_at?: string | null
          disconnected_at?: string | null
          disconnected_by?: string | null
          external_account_id?: string | null
          external_account_name?: string | null
          external_workspace_id?: string | null
          firm_id: string
          id?: string
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          next_sync_at?: string | null
          provider_id: string
          refresh_token_encrypted?: string | null
          settings?: Json | null
          status?: Database["public"]["Enums"]["integration_status"]
          status_message?: string | null
          sync_direction?: string | null
          sync_enabled?: boolean | null
          token_expires_at?: string | null
          token_scopes?: string[] | null
          updated_at?: string | null
        }
        Update: {
          access_token_encrypted?: string | null
          api_calls_reset_at?: string | null
          api_calls_today?: number | null
          api_key_encrypted?: string | null
          connected_at?: string | null
          connected_by?: string | null
          created_at?: string | null
          disconnected_at?: string | null
          disconnected_by?: string | null
          external_account_id?: string | null
          external_account_name?: string | null
          external_workspace_id?: string | null
          firm_id?: string
          id?: string
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          next_sync_at?: string | null
          provider_id?: string
          refresh_token_encrypted?: string | null
          settings?: Json | null
          status?: Database["public"]["Enums"]["integration_status"]
          status_message?: string | null
          sync_direction?: string | null
          sync_enabled?: boolean | null
          token_expires_at?: string | null
          token_scopes?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "firm_integrations_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firm_dashboard"
            referencedColumns: ["firm_id"]
          },
          {
            foreignKeyName: "firm_integrations_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firm_integrations_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "available_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firm_integrations_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "integration_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      firm_invitations: {
        Row: {
          accepted_at: string | null
          email: string
          expires_at: string | null
          firm_id: string
          id: string
          invited_at: string | null
          invited_by: string
          role: string
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          email: string
          expires_at?: string | null
          firm_id: string
          id?: string
          invited_at?: string | null
          invited_by: string
          role?: string
          status?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          email?: string
          expires_at?: string | null
          firm_id?: string
          id?: string
          invited_at?: string | null
          invited_by?: string
          role?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "firm_invitations_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firm_dashboard"
            referencedColumns: ["firm_id"]
          },
          {
            foreignKeyName: "firm_invitations_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      firm_users: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          display_name: string | null
          firm_id: string
          id: string
          invited_at: string | null
          invited_by: string | null
          last_active_at: string | null
          role: string
          status: string
          territory: string[] | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          display_name?: string | null
          firm_id: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          last_active_at?: string | null
          role?: string
          status?: string
          territory?: string[] | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          display_name?: string | null
          firm_id?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          last_active_at?: string | null
          role?: string
          status?: string
          territory?: string[] | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "firm_users_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firm_dashboard"
            referencedColumns: ["firm_id"]
          },
          {
            foreignKeyName: "firm_users_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      firms: {
        Row: {
          api_key: string | null
          api_rate_limit: number | null
          billing_email: string | null
          created_at: string | null
          features: Json | null
          id: string
          logo_url: string | null
          max_properties: number | null
          max_users: number | null
          name: string
          onboarding_completed_at: string | null
          setup_fee_paid: boolean | null
          /** @legacy Mirrors DB column; billing is now provider-agnostic */
          stripe_customer_id: string | null
          subdomain: string | null
          subscription_tier: string
          updated_at: string | null
        }
        Insert: {
          api_key?: string | null
          api_rate_limit?: number | null
          billing_email?: string | null
          created_at?: string | null
          features?: Json | null
          id?: string
          logo_url?: string | null
          max_properties?: number | null
          max_users?: number | null
          name: string
          onboarding_completed_at?: string | null
          setup_fee_paid?: boolean | null
          /** @legacy Mirrors DB column; billing is now provider-agnostic */
          stripe_customer_id?: string | null
          subdomain?: string | null
          subscription_tier?: string
          updated_at?: string | null
        }
        Update: {
          api_key?: string | null
          api_rate_limit?: number | null
          billing_email?: string | null
          created_at?: string | null
          features?: Json | null
          id?: string
          logo_url?: string | null
          max_properties?: number | null
          max_users?: number | null
          name?: string
          onboarding_completed_at?: string | null
          setup_fee_paid?: boolean | null
          /** @legacy Mirrors DB column; billing is now provider-agnostic */
          stripe_customer_id?: string | null
          subdomain?: string | null
          subscription_tier?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      integration_oauth_state: {
        Row: {
          code_verifier: string | null
          created_at: string | null
          expires_at: string | null
          firm_id: string
          provider_id: string
          redirect_uri: string
          state: string
          user_id: string
        }
        Insert: {
          code_verifier?: string | null
          created_at?: string | null
          expires_at?: string | null
          firm_id: string
          provider_id: string
          redirect_uri: string
          state: string
          user_id: string
        }
        Update: {
          code_verifier?: string | null
          created_at?: string | null
          expires_at?: string | null
          firm_id?: string
          provider_id?: string
          redirect_uri?: string
          state?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_oauth_state_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firm_dashboard"
            referencedColumns: ["firm_id"]
          },
          {
            foreignKeyName: "integration_oauth_state_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_oauth_state_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "available_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_oauth_state_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "integration_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_providers: {
        Row: {
          api_version: string | null
          auth_type: Database["public"]["Enums"]["integration_auth_type"]
          base_url: string | null
          category: Database["public"]["Enums"]["integration_category"]
          created_at: string | null
          description: string | null
          docs_url: string | null
          features: string[]
          id: string
          is_beta: boolean | null
          is_enabled: boolean | null
          logo_url: string | null
          name: string
          oauth_config: Json | null
          rate_limit_requests: number | null
          rate_limit_window_seconds: number | null
          settings_schema: Json | null
          setup_instructions: string | null
          updated_at: string | null
          webhook_events: string[] | null
        }
        Insert: {
          api_version?: string | null
          auth_type: Database["public"]["Enums"]["integration_auth_type"]
          base_url?: string | null
          category: Database["public"]["Enums"]["integration_category"]
          created_at?: string | null
          description?: string | null
          docs_url?: string | null
          features: string[]
          id: string
          is_beta?: boolean | null
          is_enabled?: boolean | null
          logo_url?: string | null
          name: string
          oauth_config?: Json | null
          rate_limit_requests?: number | null
          rate_limit_window_seconds?: number | null
          settings_schema?: Json | null
          setup_instructions?: string | null
          updated_at?: string | null
          webhook_events?: string[] | null
        }
        Update: {
          api_version?: string | null
          auth_type?: Database["public"]["Enums"]["integration_auth_type"]
          base_url?: string | null
          category?: Database["public"]["Enums"]["integration_category"]
          created_at?: string | null
          description?: string | null
          docs_url?: string | null
          features?: string[]
          id?: string
          is_beta?: boolean | null
          is_enabled?: boolean | null
          logo_url?: string | null
          name?: string
          oauth_config?: Json | null
          rate_limit_requests?: number | null
          rate_limit_window_seconds?: number | null
          settings_schema?: Json | null
          setup_instructions?: string | null
          updated_at?: string | null
          webhook_events?: string[] | null
        }
        Relationships: []
      }
      integration_sync_logs: {
        Row: {
          completed_at: string | null
          direction: string
          entity_type: string | null
          errors: Json | null
          firm_integration_id: string
          id: string
          records_created: number | null
          records_failed: number | null
          records_processed: number | null
          records_updated: number | null
          started_at: string | null
          status: string
          sync_type: string
        }
        Insert: {
          completed_at?: string | null
          direction: string
          entity_type?: string | null
          errors?: Json | null
          firm_integration_id: string
          id?: string
          records_created?: number | null
          records_failed?: number | null
          records_processed?: number | null
          records_updated?: number | null
          started_at?: string | null
          status?: string
          sync_type: string
        }
        Update: {
          completed_at?: string | null
          direction?: string
          entity_type?: string | null
          errors?: Json | null
          firm_integration_id?: string
          id?: string
          records_created?: number | null
          records_failed?: number | null
          records_processed?: number | null
          records_updated?: number | null
          started_at?: string | null
          status?: string
          sync_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_sync_logs_firm_integration_id_fkey"
            columns: ["firm_integration_id"]
            isOneToOne: false
            referencedRelation: "firm_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_webhook_logs: {
        Row: {
          event_type: string | null
          firm_id: string | null
          headers: Json | null
          id: string
          payload: Json | null
          processed_at: string | null
          processing_error: string | null
          processing_status: string | null
          provider_id: string
          received_at: string | null
        }
        Insert: {
          event_type?: string | null
          firm_id?: string | null
          headers?: Json | null
          id?: string
          payload?: Json | null
          processed_at?: string | null
          processing_error?: string | null
          processing_status?: string | null
          provider_id: string
          received_at?: string | null
        }
        Update: {
          event_type?: string | null
          firm_id?: string | null
          headers?: Json | null
          id?: string
          payload?: Json | null
          processed_at?: string | null
          processing_error?: string | null
          processing_status?: string | null
          provider_id?: string
          received_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_webhook_logs_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firm_dashboard"
            referencedColumns: ["firm_id"]
          },
          {
            foreignKeyName: "integration_webhook_logs_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_webhook_logs_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "available_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_webhook_logs_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "integration_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      market_indicators: {
        Row: {
          collection_timestamp: string | null
          created_at: string | null
          data_period: string | null
          employment_change_1y: number | null
          employment_change_pct: number | null
          employment_total: number | null
          id: number
          industry_breakdown: Json | null
          labor_force: number | null
          labor_force_participation: number | null
          metro_area: string | null
          source: string | null
          state: string | null
          unemployment_rate: number | null
          unemployment_rate_prev: number | null
          updated_at: string | null
        }
        Insert: {
          collection_timestamp?: string | null
          created_at?: string | null
          data_period?: string | null
          employment_change_1y?: number | null
          employment_change_pct?: number | null
          employment_total?: number | null
          id?: number
          industry_breakdown?: Json | null
          labor_force?: number | null
          labor_force_participation?: number | null
          metro_area?: string | null
          source?: string | null
          state?: string | null
          unemployment_rate?: number | null
          unemployment_rate_prev?: number | null
          updated_at?: string | null
        }
        Update: {
          collection_timestamp?: string | null
          created_at?: string | null
          data_period?: string | null
          employment_change_1y?: number | null
          employment_change_pct?: number | null
          employment_total?: number | null
          id?: number
          industry_breakdown?: Json | null
          labor_force?: number | null
          labor_force_participation?: number | null
          metro_area?: string | null
          source?: string | null
          state?: string | null
          unemployment_rate?: number | null
          unemployment_rate_prev?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      market_stress_index: {
        Row: {
          avg_days_on_market: number | null
          avg_rent: number | null
          calculated_at: string | null
          dom_velocity: number | null
          id: number
          median_rent: number | null
          month: string
          new_listings: number | null
          rent_momentum: number | null
          stress_index: number | null
          stress_signal: string | null
          supply_pressure: number | null
          total_listings: number | null
          zip_code: string
        }
        Insert: {
          avg_days_on_market?: number | null
          avg_rent?: number | null
          calculated_at?: string | null
          dom_velocity?: number | null
          id?: never
          median_rent?: number | null
          month: string
          new_listings?: number | null
          rent_momentum?: number | null
          stress_index?: number | null
          stress_signal?: string | null
          supply_pressure?: number | null
          total_listings?: number | null
          zip_code: string
        }
        Update: {
          avg_days_on_market?: number | null
          avg_rent?: number | null
          calculated_at?: string | null
          dom_velocity?: number | null
          id?: never
          median_rent?: number | null
          month?: string
          new_listings?: number | null
          rent_momentum?: number | null
          stress_index?: number | null
          stress_signal?: string | null
          supply_pressure?: number | null
          total_listings?: number | null
          zip_code?: string
        }
        Relationships: []
      }
      outreach_campaign_contacts: {
        Row: {
          campaign_id: string
          contact_id: string | null
          created_at: string | null
          id: string
          property_id: number | null
          status: string
        }
        Insert: {
          campaign_id: string
          contact_id?: string | null
          created_at?: string | null
          id?: string
          property_id?: number | null
          status?: string
        }
        Update: {
          campaign_id?: string
          contact_id?: string | null
          created_at?: string | null
          id?: string
          property_id?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "outreach_campaign_contacts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "outreach_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_campaign_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_campaign_contacts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_vacancy_metrics"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "outreach_campaign_contacts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "student_housing_properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_campaign_contacts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "vw_student_housing_enriched"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_campaigns: {
        Row: {
          click_rate: number | null
          created_at: string | null
          created_by: string | null
          daily_limit: number | null
          description: string | null
          drafts_approved: number | null
          drafts_generated: number | null
          drafts_rejected: number | null
          emails_bounced: number | null
          emails_clicked: number | null
          emails_delivered: number | null
          emails_opened: number | null
          emails_replied: number | null
          emails_sent: number | null
          firm_id: string
          id: string
          name: string
          open_rate: number | null
          reply_rate: number | null
          scheduled_start: string | null
          send_timezone: string | null
          send_window_end: string | null
          send_window_start: string | null
          status: string
          target_criteria: Json | null
          template_id: string | null
          total_recipients: number | null
          updated_at: string | null
        }
        Insert: {
          click_rate?: number | null
          created_at?: string | null
          created_by?: string | null
          daily_limit?: number | null
          description?: string | null
          drafts_approved?: number | null
          drafts_generated?: number | null
          drafts_rejected?: number | null
          emails_bounced?: number | null
          emails_clicked?: number | null
          emails_delivered?: number | null
          emails_opened?: number | null
          emails_replied?: number | null
          emails_sent?: number | null
          firm_id: string
          id?: string
          name: string
          open_rate?: number | null
          reply_rate?: number | null
          scheduled_start?: string | null
          send_timezone?: string | null
          send_window_end?: string | null
          send_window_start?: string | null
          status?: string
          target_criteria?: Json | null
          template_id?: string | null
          total_recipients?: number | null
          updated_at?: string | null
        }
        Update: {
          click_rate?: number | null
          created_at?: string | null
          created_by?: string | null
          daily_limit?: number | null
          description?: string | null
          drafts_approved?: number | null
          drafts_generated?: number | null
          drafts_rejected?: number | null
          emails_bounced?: number | null
          emails_clicked?: number | null
          emails_delivered?: number | null
          emails_opened?: number | null
          emails_replied?: number | null
          emails_sent?: number | null
          firm_id?: string
          id?: string
          name?: string
          open_rate?: number | null
          reply_rate?: number | null
          scheduled_start?: string | null
          send_timezone?: string | null
          send_window_end?: string | null
          send_window_start?: string | null
          status?: string
          target_criteria?: Json | null
          template_id?: string | null
          total_recipients?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outreach_campaigns_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firm_dashboard"
            referencedColumns: ["firm_id"]
          },
          {
            foreignKeyName: "outreach_campaigns_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "outreach_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_drafts: {
        Row: {
          action_taken: Database["public"]["Enums"]["draft_action"] | null
          ai_completion_tokens: number | null
          ai_model: string | null
          ai_prompt_tokens: number | null
          body_html: string
          body_text: string | null
          campaign_id: string | null
          context_snapshot: Json
          created_at: string | null
          edit_distance: number | null
          expires_at: string | null
          final_body_html: string | null
          final_body_text: string | null
          final_subject: string | null
          firm_id: string
          generation_time_ms: number | null
          id: string
          message_id: string | null
          previous_draft_id: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          revision_instructions: string | null
          revision_number: number | null
          status: string
          subject: string
          template_id: string | null
          thread_id: string | null
          trigger_details: Json | null
          trigger_type: Database["public"]["Enums"]["outreach_trigger_type"]
        }
        Insert: {
          action_taken?: Database["public"]["Enums"]["draft_action"] | null
          ai_completion_tokens?: number | null
          ai_model?: string | null
          ai_prompt_tokens?: number | null
          body_html: string
          body_text?: string | null
          campaign_id?: string | null
          context_snapshot: Json
          created_at?: string | null
          edit_distance?: number | null
          expires_at?: string | null
          final_body_html?: string | null
          final_body_text?: string | null
          final_subject?: string | null
          firm_id: string
          generation_time_ms?: number | null
          id?: string
          message_id?: string | null
          previous_draft_id?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          revision_instructions?: string | null
          revision_number?: number | null
          status?: string
          subject: string
          template_id?: string | null
          thread_id?: string | null
          trigger_details?: Json | null
          trigger_type: Database["public"]["Enums"]["outreach_trigger_type"]
        }
        Update: {
          action_taken?: Database["public"]["Enums"]["draft_action"] | null
          ai_completion_tokens?: number | null
          ai_model?: string | null
          ai_prompt_tokens?: number | null
          body_html?: string
          body_text?: string | null
          campaign_id?: string | null
          context_snapshot?: Json
          created_at?: string | null
          edit_distance?: number | null
          expires_at?: string | null
          final_body_html?: string | null
          final_body_text?: string | null
          final_subject?: string | null
          firm_id?: string
          generation_time_ms?: number | null
          id?: string
          message_id?: string | null
          previous_draft_id?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          revision_instructions?: string | null
          revision_number?: number | null
          status?: string
          subject?: string
          template_id?: string | null
          thread_id?: string | null
          trigger_details?: Json | null
          trigger_type?: Database["public"]["Enums"]["outreach_trigger_type"]
        }
        Relationships: [
          {
            foreignKeyName: "outreach_drafts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "outreach_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_drafts_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firm_dashboard"
            referencedColumns: ["firm_id"]
          },
          {
            foreignKeyName: "outreach_drafts_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_drafts_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "outreach_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_drafts_previous_draft_id_fkey"
            columns: ["previous_draft_id"]
            isOneToOne: false
            referencedRelation: "draft_approval_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_drafts_previous_draft_id_fkey"
            columns: ["previous_draft_id"]
            isOneToOne: false
            referencedRelation: "outreach_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_drafts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "outreach_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_drafts_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "outreach_inbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_drafts_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "outreach_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_messages: {
        Row: {
          attachments: Json | null
          body_html: string | null
          body_text: string | null
          campaign_id: string | null
          cc_emails: string[] | null
          click_count: number | null
          clicked_links: Json | null
          created_at: string | null
          delivered_at: string | null
          detected_intent: string[] | null
          direction: string
          external_message_id: string | null
          first_clicked_at: string | null
          first_opened_at: string | null
          from_email: string
          from_name: string | null
          headers: Json | null
          id: string
          in_reply_to: string | null
          key_points: string[] | null
          last_opened_at: string | null
          open_count: number | null
          received_at: string | null
          sent_at: string | null
          sent_by: string | null
          sent_via: string | null
          sentiment: Database["public"]["Enums"]["reply_sentiment"] | null
          sentiment_confidence: number | null
          status: Database["public"]["Enums"]["outreach_status"]
          subject: string
          suggested_response: string | null
          thread_id: string
          to_email: string
          to_name: string | null
        }
        Insert: {
          attachments?: Json | null
          body_html?: string | null
          body_text?: string | null
          campaign_id?: string | null
          cc_emails?: string[] | null
          click_count?: number | null
          clicked_links?: Json | null
          created_at?: string | null
          delivered_at?: string | null
          detected_intent?: string[] | null
          direction: string
          external_message_id?: string | null
          first_clicked_at?: string | null
          first_opened_at?: string | null
          from_email: string
          from_name?: string | null
          headers?: Json | null
          id?: string
          in_reply_to?: string | null
          key_points?: string[] | null
          last_opened_at?: string | null
          open_count?: number | null
          received_at?: string | null
          sent_at?: string | null
          sent_by?: string | null
          sent_via?: string | null
          sentiment?: Database["public"]["Enums"]["reply_sentiment"] | null
          sentiment_confidence?: number | null
          status?: Database["public"]["Enums"]["outreach_status"]
          subject: string
          suggested_response?: string | null
          thread_id: string
          to_email: string
          to_name?: string | null
        }
        Update: {
          attachments?: Json | null
          body_html?: string | null
          body_text?: string | null
          campaign_id?: string | null
          cc_emails?: string[] | null
          click_count?: number | null
          clicked_links?: Json | null
          created_at?: string | null
          delivered_at?: string | null
          detected_intent?: string[] | null
          direction?: string
          external_message_id?: string | null
          first_clicked_at?: string | null
          first_opened_at?: string | null
          from_email?: string
          from_name?: string | null
          headers?: Json | null
          id?: string
          in_reply_to?: string | null
          key_points?: string[] | null
          last_opened_at?: string | null
          open_count?: number | null
          received_at?: string | null
          sent_at?: string | null
          sent_by?: string | null
          sent_via?: string | null
          sentiment?: Database["public"]["Enums"]["reply_sentiment"] | null
          sentiment_confidence?: number | null
          status?: Database["public"]["Enums"]["outreach_status"]
          subject?: string
          suggested_response?: string | null
          thread_id?: string
          to_email?: string
          to_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outreach_messages_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "outreach_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "outreach_inbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "outreach_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_templates: {
        Row: {
          available_merge_fields: string[] | null
          avg_open_rate: number | null
          avg_reply_rate: number | null
          body_template: string
          body_text_template: string | null
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          firm_id: string
          id: string
          is_active: boolean | null
          is_system: boolean | null
          name: string
          objective: string | null
          subject_template: string
          times_used: number | null
          tone: string | null
          typical_length: string | null
          updated_at: string | null
        }
        Insert: {
          available_merge_fields?: string[] | null
          avg_open_rate?: number | null
          avg_reply_rate?: number | null
          body_template: string
          body_text_template?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          firm_id: string
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name: string
          objective?: string | null
          subject_template: string
          times_used?: number | null
          tone?: string | null
          typical_length?: string | null
          updated_at?: string | null
        }
        Update: {
          available_merge_fields?: string[] | null
          avg_open_rate?: number | null
          avg_reply_rate?: number | null
          body_template?: string
          body_text_template?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          firm_id?: string
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name?: string
          objective?: string | null
          subject_template?: string
          times_used?: number | null
          tone?: string | null
          typical_length?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outreach_templates_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firm_dashboard"
            referencedColumns: ["firm_id"]
          },
          {
            foreignKeyName: "outreach_templates_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_threads: {
        Row: {
          contact_email: string
          contact_id: string | null
          contact_name: string | null
          created_at: string | null
          deal_id: string | null
          external_thread_id: string | null
          firm_id: string
          id: string
          interest_level: number | null
          is_archived: boolean | null
          is_read: boolean | null
          is_starred: boolean | null
          last_message_at: string | null
          last_message_direction: string | null
          message_count: number | null
          property_id: number | null
          snoozed_until: string | null
          status: Database["public"]["Enums"]["outreach_status"]
          subject: string
          suggested_next_action: string | null
          thread_sentiment:
            | Database["public"]["Enums"]["reply_sentiment"]
            | null
          updated_at: string | null
        }
        Insert: {
          contact_email: string
          contact_id?: string | null
          contact_name?: string | null
          created_at?: string | null
          deal_id?: string | null
          external_thread_id?: string | null
          firm_id: string
          id?: string
          interest_level?: number | null
          is_archived?: boolean | null
          is_read?: boolean | null
          is_starred?: boolean | null
          last_message_at?: string | null
          last_message_direction?: string | null
          message_count?: number | null
          property_id?: number | null
          snoozed_until?: string | null
          status?: Database["public"]["Enums"]["outreach_status"]
          subject: string
          suggested_next_action?: string | null
          thread_sentiment?:
            | Database["public"]["Enums"]["reply_sentiment"]
            | null
          updated_at?: string | null
        }
        Update: {
          contact_email?: string
          contact_id?: string | null
          contact_name?: string | null
          created_at?: string | null
          deal_id?: string | null
          external_thread_id?: string | null
          firm_id?: string
          id?: string
          interest_level?: number | null
          is_archived?: boolean | null
          is_read?: boolean | null
          is_starred?: boolean | null
          last_message_at?: string | null
          last_message_direction?: string | null
          message_count?: number | null
          property_id?: number | null
          snoozed_until?: string | null
          status?: Database["public"]["Enums"]["outreach_status"]
          subject?: string
          suggested_next_action?: string | null
          thread_sentiment?:
            | Database["public"]["Enums"]["reply_sentiment"]
            | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outreach_threads_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_threads_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firm_dashboard"
            referencedColumns: ["firm_id"]
          },
          {
            foreignKeyName: "outreach_threads_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_threads_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_vacancy_metrics"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "outreach_threads_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "student_housing_properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_threads_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "vw_student_housing_enriched"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_trigger_log: {
        Row: {
          contact_id: string | null
          draft_id: string | null
          id: string
          property_id: number | null
          trigger_id: string
          triggered_at: string | null
        }
        Insert: {
          contact_id?: string | null
          draft_id?: string | null
          id?: string
          property_id?: number | null
          trigger_id: string
          triggered_at?: string | null
        }
        Update: {
          contact_id?: string | null
          draft_id?: string | null
          id?: string
          property_id?: number | null
          trigger_id?: string
          triggered_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outreach_trigger_log_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_trigger_log_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "draft_approval_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_trigger_log_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "outreach_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_trigger_log_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_vacancy_metrics"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "outreach_trigger_log_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "student_housing_properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_trigger_log_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "vw_student_housing_enriched"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_trigger_log_trigger_id_fkey"
            columns: ["trigger_id"]
            isOneToOne: false
            referencedRelation: "outreach_triggers"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_triggers: {
        Row: {
          conditions: Json
          cooldown_days: number | null
          created_at: string | null
          created_by: string | null
          custom_instructions: string | null
          description: string | null
          firm_id: string
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
          max_drafts_per_day: number | null
          name: string
          objective: string | null
          template_id: string | null
          times_triggered: number | null
          tone: string | null
          trigger_type: Database["public"]["Enums"]["outreach_trigger_type"]
          updated_at: string | null
        }
        Insert: {
          conditions: Json
          cooldown_days?: number | null
          created_at?: string | null
          created_by?: string | null
          custom_instructions?: string | null
          description?: string | null
          firm_id: string
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          max_drafts_per_day?: number | null
          name: string
          objective?: string | null
          template_id?: string | null
          times_triggered?: number | null
          tone?: string | null
          trigger_type: Database["public"]["Enums"]["outreach_trigger_type"]
          updated_at?: string | null
        }
        Update: {
          conditions?: Json
          cooldown_days?: number | null
          created_at?: string | null
          created_by?: string | null
          custom_instructions?: string | null
          description?: string | null
          firm_id?: string
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          max_drafts_per_day?: number | null
          name?: string
          objective?: string | null
          template_id?: string | null
          times_triggered?: number | null
          tone?: string | null
          trigger_type?: Database["public"]["Enums"]["outreach_trigger_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outreach_triggers_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firm_dashboard"
            referencedColumns: ["firm_id"]
          },
          {
            foreignKeyName: "outreach_triggers_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_triggers_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "outreach_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      ownership_groups: {
        Row: {
          avg_occupancy: number | null
          avg_transition_score: number | null
          created_at: string | null
          firm_id: string | null
          id: number
          investment_horizon: string | null
          known_disposition_interest: boolean | null
          last_contact_date: string | null
          markets: string[] | null
          name: string
          normalized_name: string
          notes: string | null
          owner_type: string | null
          primary_contact_email: string | null
          primary_contact_name: string | null
          primary_contact_phone: string | null
          primary_market: string | null
          properties_high_priority: number | null
          property_count: number | null
          relationship_owner: string | null
          relationship_status: string | null
          states: string[] | null
          total_beds: number | null
          total_estimated_value: number | null
          total_units: number | null
          typical_hold_period: number | null
          updated_at: string | null
        }
        Insert: {
          avg_occupancy?: number | null
          avg_transition_score?: number | null
          created_at?: string | null
          firm_id?: string | null
          id?: number
          investment_horizon?: string | null
          known_disposition_interest?: boolean | null
          last_contact_date?: string | null
          markets?: string[] | null
          name: string
          normalized_name: string
          notes?: string | null
          owner_type?: string | null
          primary_contact_email?: string | null
          primary_contact_name?: string | null
          primary_contact_phone?: string | null
          primary_market?: string | null
          properties_high_priority?: number | null
          property_count?: number | null
          relationship_owner?: string | null
          relationship_status?: string | null
          states?: string[] | null
          total_beds?: number | null
          total_estimated_value?: number | null
          total_units?: number | null
          typical_hold_period?: number | null
          updated_at?: string | null
        }
        Update: {
          avg_occupancy?: number | null
          avg_transition_score?: number | null
          created_at?: string | null
          firm_id?: string | null
          id?: number
          investment_horizon?: string | null
          known_disposition_interest?: boolean | null
          last_contact_date?: string | null
          markets?: string[] | null
          name?: string
          normalized_name?: string
          notes?: string | null
          owner_type?: string | null
          primary_contact_email?: string | null
          primary_contact_name?: string | null
          primary_contact_phone?: string | null
          primary_market?: string | null
          properties_high_priority?: number | null
          property_count?: number | null
          relationship_owner?: string | null
          relationship_status?: string | null
          states?: string[] | null
          total_beds?: number | null
          total_estimated_value?: number | null
          total_units?: number | null
          typical_hold_period?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ownership_groups_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firm_dashboard"
            referencedColumns: ["firm_id"]
          },
          {
            foreignKeyName: "ownership_groups_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      property_census_tract: {
        Row: {
          geocode_source: string | null
          geocoded_at: string | null
          geoid: string
          id: string
          match_quality: string | null
          property_id: number | null
        }
        Insert: {
          geocode_source?: string | null
          geocoded_at?: string | null
          geoid: string
          id?: string
          match_quality?: string | null
          property_id?: number | null
        }
        Update: {
          geocode_source?: string | null
          geocoded_at?: string | null
          geoid?: string
          id?: string
          match_quality?: string | null
          property_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "property_census_tract_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: true
            referencedRelation: "property_vacancy_metrics"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "property_census_tract_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: true
            referencedRelation: "student_housing_properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_census_tract_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: true
            referencedRelation: "vw_student_housing_enriched"
            referencedColumns: ["id"]
          },
        ]
      }
      property_rent_history: {
        Row: {
          admin_fee: number | null
          application_fee: number | null
          availability_pct: number | null
          avg_rent_per_bed: number | null
          beds_available: number | null
          created_at: string | null
          id: number
          max_rent_overall: number | null
          min_rent_overall: number | null
          property_id: number | null
          raw_data: Json | null
          rent_1bed_max: number | null
          rent_1bed_min: number | null
          rent_2bed_max: number | null
          rent_2bed_min: number | null
          rent_3bed_max: number | null
          rent_3bed_min: number | null
          rent_4bed_max: number | null
          rent_4bed_min: number | null
          rent_5bed_max: number | null
          rent_5bed_min: number | null
          rent_studio_max: number | null
          rent_studio_min: number | null
          scraped_at: string | null
          security_deposit: number | null
          source: string
          source_url: string | null
          units_available: number | null
        }
        Insert: {
          admin_fee?: number | null
          application_fee?: number | null
          availability_pct?: number | null
          avg_rent_per_bed?: number | null
          beds_available?: number | null
          created_at?: string | null
          id?: number
          max_rent_overall?: number | null
          min_rent_overall?: number | null
          property_id?: number | null
          raw_data?: Json | null
          rent_1bed_max?: number | null
          rent_1bed_min?: number | null
          rent_2bed_max?: number | null
          rent_2bed_min?: number | null
          rent_3bed_max?: number | null
          rent_3bed_min?: number | null
          rent_4bed_max?: number | null
          rent_4bed_min?: number | null
          rent_5bed_max?: number | null
          rent_5bed_min?: number | null
          rent_studio_max?: number | null
          rent_studio_min?: number | null
          scraped_at?: string | null
          security_deposit?: number | null
          source: string
          source_url?: string | null
          units_available?: number | null
        }
        Update: {
          admin_fee?: number | null
          application_fee?: number | null
          availability_pct?: number | null
          avg_rent_per_bed?: number | null
          beds_available?: number | null
          created_at?: string | null
          id?: number
          max_rent_overall?: number | null
          min_rent_overall?: number | null
          property_id?: number | null
          raw_data?: Json | null
          rent_1bed_max?: number | null
          rent_1bed_min?: number | null
          rent_2bed_max?: number | null
          rent_2bed_min?: number | null
          rent_3bed_max?: number | null
          rent_3bed_min?: number | null
          rent_4bed_max?: number | null
          rent_4bed_min?: number | null
          rent_5bed_max?: number | null
          rent_5bed_min?: number | null
          rent_studio_max?: number | null
          rent_studio_min?: number | null
          scraped_at?: string | null
          security_deposit?: number | null
          source?: string
          source_url?: string | null
          units_available?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "property_rent_history_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_vacancy_metrics"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "property_rent_history_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "student_housing_properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_rent_history_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "vw_student_housing_enriched"
            referencedColumns: ["id"]
          },
        ]
      }
      rentcast_market_stats: {
        Row: {
          fetched_at: string
          id: number
          rental_data: Json | null
          sale_data: Json | null
          zip_code: string
        }
        Insert: {
          fetched_at?: string
          id?: number
          rental_data?: Json | null
          sale_data?: Json | null
          zip_code: string
        }
        Update: {
          fetched_at?: string
          id?: number
          rental_data?: Json | null
          sale_data?: Json | null
          zip_code?: string
        }
        Relationships: []
      }
      rentcast_raw: {
        Row: {
          applied_at: string | null
          endpoint: string
          fetched_at: string
          id: number
          property_id: number | null
          request_address: string | null
          request_zip: string | null
          response_json: Json
        }
        Insert: {
          applied_at?: string | null
          endpoint: string
          fetched_at?: string
          id?: number
          property_id?: number | null
          request_address?: string | null
          request_zip?: string | null
          response_json: Json
        }
        Update: {
          applied_at?: string | null
          endpoint?: string
          fetched_at?: string
          id?: number
          property_id?: number | null
          request_address?: string | null
          request_zip?: string | null
          response_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "rentcast_raw_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_vacancy_metrics"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "rentcast_raw_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "student_housing_properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rentcast_raw_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "vw_student_housing_enriched"
            referencedColumns: ["id"]
          },
        ]
      }
      score_history: {
        Row: {
          adjusted_transition_score: number | null
          algorithm_version: string
          calculated_at: string
          calculated_by: string | null
          data_completeness: number | null
          firm_id: string | null
          id: string
          property_id: number
          score_breakdown: Json
          transition_score: number
          trigger_type: string
          weights_snapshot: Json
        }
        Insert: {
          adjusted_transition_score?: number | null
          algorithm_version: string
          calculated_at?: string
          calculated_by?: string | null
          data_completeness?: number | null
          firm_id?: string | null
          id?: string
          property_id: number
          score_breakdown: Json
          transition_score: number
          trigger_type?: string
          weights_snapshot: Json
        }
        Update: {
          adjusted_transition_score?: number | null
          algorithm_version?: string
          calculated_at?: string
          calculated_by?: string | null
          data_completeness?: number | null
          firm_id?: string | null
          id?: string
          property_id?: number
          score_breakdown?: Json
          transition_score?: number
          trigger_type?: string
          weights_snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "score_history_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firm_dashboard"
            referencedColumns: ["firm_id"]
          },
          {
            foreignKeyName: "score_history_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_history_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_vacancy_metrics"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "score_history_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "student_housing_properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_history_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "vw_student_housing_enriched"
            referencedColumns: ["id"]
          },
        ]
      }
      score_weight_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          new_weight: number | null
          old_weight: number | null
          reason: string | null
          weight_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_weight?: number | null
          old_weight?: number | null
          reason?: string | null
          weight_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_weight?: number | null
          old_weight?: number | null
          reason?: string | null
          weight_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "score_weight_history_weight_id_fkey"
            columns: ["weight_id"]
            isOneToOne: false
            referencedRelation: "score_weights"
            referencedColumns: ["id"]
          },
        ]
      }
      score_weights: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          effective_from: string
          effective_to: string | null
          factor: string
          id: string
          is_active: boolean
          version: string
          weight: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          effective_from?: string
          effective_to?: string | null
          factor: string
          id?: string
          is_active?: boolean
          version: string
          weight: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          effective_from?: string
          effective_to?: string | null
          factor?: string
          id?: string
          is_active?: boolean
          version?: string
          weight?: number
        }
        Relationships: []
      }
      scraped_rents: {
        Row: {
          address: string | null
          beds_max: number | null
          beds_min: number | null
          city: string | null
          id: number
          matched_property_id: number | null
          property_name: string | null
          rent_max: number | null
          rent_min: number | null
          scraped_at: string | null
          source: string
          sqft_max: number | null
          sqft_min: number | null
          state: string | null
          url: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          beds_max?: number | null
          beds_min?: number | null
          city?: string | null
          id?: number
          matched_property_id?: number | null
          property_name?: string | null
          rent_max?: number | null
          rent_min?: number | null
          scraped_at?: string | null
          source?: string
          sqft_max?: number | null
          sqft_min?: number | null
          state?: string | null
          url?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          beds_max?: number | null
          beds_min?: number | null
          city?: string | null
          id?: number
          matched_property_id?: number | null
          property_name?: string | null
          rent_max?: number | null
          rent_min?: number | null
          scraped_at?: string | null
          source?: string
          sqft_max?: number | null
          sqft_min?: number | null
          state?: string | null
          url?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scraped_rents_matched_property_id_fkey"
            columns: ["matched_property_id"]
            isOneToOne: false
            referencedRelation: "property_vacancy_metrics"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "scraped_rents_matched_property_id_fkey"
            columns: ["matched_property_id"]
            isOneToOne: false
            referencedRelation: "student_housing_properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scraped_rents_matched_property_id_fkey"
            columns: ["matched_property_id"]
            isOneToOne: false
            referencedRelation: "vw_student_housing_enriched"
            referencedColumns: ["id"]
          },
        ]
      }
      student_housing_hot_list: {
        Row: {
          created_at: string | null
          flags: string[] | null
          hot_score: number
          id: number
          priority: string
          property_id: number | null
          reasons: string[] | null
        }
        Insert: {
          created_at?: string | null
          flags?: string[] | null
          hot_score: number
          id?: number
          priority: string
          property_id?: number | null
          reasons?: string[] | null
        }
        Update: {
          created_at?: string | null
          flags?: string[] | null
          hot_score?: number
          id?: number
          priority?: string
          property_id?: number | null
          reasons?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "student_housing_hot_list_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_vacancy_metrics"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "student_housing_hot_list_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "student_housing_properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_housing_hot_list_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "vw_student_housing_enriched"
            referencedColumns: ["id"]
          },
        ]
      }
      student_housing_properties: {
        Row: {
          address: string
          adjusted_transition_score: number | null
          amenities: string | null
          ami_30_pct: number | null
          ami_60_pct: number | null
          ami_80_pct: number | null
          asking_rent_max: number | null
          asking_rent_min: number | null
          asking_rent_scraped_at: string | null
          asking_rent_source: string | null
          assessor_id: string | null
          avg_asking_per_bed: number | null
          avg_asking_per_sf: number | null
          avg_asking_per_unit: number | null
          avg_concessions_pct: number | null
          avg_effective_per_unit: number | null
          avg_unit_sf: number | null
          avg_weighted_rent: number | null
          beds: number | null
          building_class: string | null
          building_status: string | null
          cap_rate: number | null
          city: string
          closest_transit: string | null
          comp_active_count: number | null
          comp_avg_distance: number | null
          comp_avg_dom: number | null
          comp_avg_rent: number | null
          comp_avg_sqft: number | null
          comp_median_rent: number | null
          costar_property_id: string | null
          county: string | null
          county_fips: string | null
          created_at: string | null
          data_completeness: number | null
          data_quality: string | null
          days_on_market: number | null
          days_to_maturity: number | null
          delinquency_status: string | null
          dscr_ncf: number | null
          dscr_noi: number | null
          enrichment_timestamp: string | null
          enrichment_version: string | null
          enrollment_change_pct: number | null
          enrollment_trend: string | null
          estimated_refi_rate: number | null
          exit_pressure: string | null
          expenses: number | null
          firm_id: string | null
          for_sale_price: number | null
          for_sale_status: string | null
          four_bed: number | null
          gse_loan_count: number | null
          has_loan_data: boolean | null
          hold_period_category: string | null
          hold_period_years: number | null
          id: number
          last_sale_date: string | null
          last_sale_price: number | null
          latitude: number | null
          leasing_company: string | null
          leasing_contact: string | null
          leasing_portal_url: string | null
          leed_certified: boolean | null
          legal_description: string | null
          loan_balance: number | null
          loan_category: string | null
          loan_interest_rate: number | null
          loan_maturity: string | null
          loan_maturity_date: string | null
          loan_origination_amount: number | null
          loan_origination_date: string | null
          loan_rate: number | null
          loan_source: string | null
          loan_type: string | null
          longitude: number | null
          lot_sf: number | null
          ltv: number | null
          market_liquidity: string | null
          market_name: string | null
          maturity_urgency: string | null
          missing_score_fields: string[] | null
          msa_ami: number | null
          msa_code: string | null
          msa_name: string | null
          ncf: number | null
          noi: number | null
          num_stories: number | null
          occupancy_pct: number | null
          one_bed: number | null
          originator: string | null
          owner_address: string | null
          owner_company_1: string | null
          owner_company_2: string | null
          owner_contact: string | null
          owner_contact_1: string | null
          owner_contact_2: string | null
          owner_name: string | null
          owner_occupied: boolean | null
          owner_phone: string | null
          owner_portfolio_category: string | null
          owner_portfolio_size: number | null
          owner_total_beds: number | null
          ownership_group_id: number | null
          payment_increase_pct: number | null
          pct_1bed: number | null
          pct_2bed: number | null
          pct_3bed: number | null
          pct_4bed: number | null
          pct_studios: number | null
          price_per_unit: number | null
          property_email: string | null
          property_manager_address: string | null
          property_manager_contact: string | null
          property_manager_name: string | null
          property_manager_phone: string | null
          property_name: string | null
          property_phone: string | null
          property_type: string | null
          property_website: string | null
          property_website_type: string | null
          rate_stress_bps: number | null
          rate_stress_category: string | null
          rba_sf: number | null
          rent_gap_category: string | null
          rent_gap_pct: number | null
          rentcast_bathrooms: number | null
          rentcast_bedrooms: number | null
          rentcast_comparables: Json | null
          rentcast_comparables_count: number | null
          rentcast_features: Json | null
          rentcast_fetched_at: string | null
          rentcast_property_id: string | null
          rentcast_property_type: string | null
          rentcast_rent_estimate: number | null
          rentcast_rent_high: number | null
          rentcast_rent_low: number | null
          rentcast_source_fields: string[] | null
          rentcast_tax_amount: number | null
          rentcast_tax_assessments: Json | null
          rentcast_value_estimate: number | null
          revenues: number | null
          sale_company: string | null
          sale_contact: string | null
          sale_contact_phone: string | null
          score_breakdown: Json | null
          score_calculated_at: string | null
          score_stale: boolean
          secondary_type: string | null
          source: string | null
          special_servicer_status: string | null
          star_rating: number | null
          state: string
          state_fips: string | null
          studios: number | null
          style: string | null
          subdivision: string | null
          submarket: string | null
          submarket_name: string | null
          three_bed: number | null
          transit_walk_time: number | null
          transition_score: number | null
          trepp_occupancy: number | null
          two_bed: number | null
          units: number | null
          university: string | null
          updated_at: string | null
          vacancy_pct: number | null
          watchlist_status: string | null
          website_discovered_at: string | null
          website_last_scraped_at: string | null
          website_scrape_status: string | null
          year_built: number | null
          year_renovated: number | null
          zillow_zhvi: number | null
          zillow_zhvi_yoy: number | null
          zillow_zori: number | null
          zillow_zori_yoy: number | null
          zip: string | null
          zoning: string | null
        }
        Insert: {
          address: string
          adjusted_transition_score?: number | null
          amenities?: string | null
          ami_30_pct?: number | null
          ami_60_pct?: number | null
          ami_80_pct?: number | null
          asking_rent_max?: number | null
          asking_rent_min?: number | null
          asking_rent_scraped_at?: string | null
          asking_rent_source?: string | null
          assessor_id?: string | null
          avg_asking_per_bed?: number | null
          avg_asking_per_sf?: number | null
          avg_asking_per_unit?: number | null
          avg_concessions_pct?: number | null
          avg_effective_per_unit?: number | null
          avg_unit_sf?: number | null
          avg_weighted_rent?: number | null
          beds?: number | null
          building_class?: string | null
          building_status?: string | null
          cap_rate?: number | null
          city: string
          closest_transit?: string | null
          comp_active_count?: number | null
          comp_avg_distance?: number | null
          comp_avg_dom?: number | null
          comp_avg_rent?: number | null
          comp_avg_sqft?: number | null
          comp_median_rent?: number | null
          costar_property_id?: string | null
          county?: string | null
          county_fips?: string | null
          created_at?: string | null
          data_completeness?: number | null
          data_quality?: string | null
          days_on_market?: number | null
          days_to_maturity?: number | null
          delinquency_status?: string | null
          dscr_ncf?: number | null
          dscr_noi?: number | null
          enrichment_timestamp?: string | null
          enrichment_version?: string | null
          enrollment_change_pct?: number | null
          enrollment_trend?: string | null
          estimated_refi_rate?: number | null
          exit_pressure?: string | null
          expenses?: number | null
          firm_id?: string | null
          for_sale_price?: number | null
          for_sale_status?: string | null
          four_bed?: number | null
          gse_loan_count?: number | null
          has_loan_data?: boolean | null
          hold_period_category?: string | null
          hold_period_years?: number | null
          id?: number
          last_sale_date?: string | null
          last_sale_price?: number | null
          latitude?: number | null
          leasing_company?: string | null
          leasing_contact?: string | null
          leasing_portal_url?: string | null
          leed_certified?: boolean | null
          legal_description?: string | null
          loan_balance?: number | null
          loan_category?: string | null
          loan_interest_rate?: number | null
          loan_maturity?: string | null
          loan_maturity_date?: string | null
          loan_origination_amount?: number | null
          loan_origination_date?: string | null
          loan_rate?: number | null
          loan_source?: string | null
          loan_type?: string | null
          longitude?: number | null
          lot_sf?: number | null
          ltv?: number | null
          market_liquidity?: string | null
          market_name?: string | null
          maturity_urgency?: string | null
          missing_score_fields?: string[] | null
          msa_ami?: number | null
          msa_code?: string | null
          msa_name?: string | null
          ncf?: number | null
          noi?: number | null
          num_stories?: number | null
          occupancy_pct?: number | null
          one_bed?: number | null
          originator?: string | null
          owner_address?: string | null
          owner_company_1?: string | null
          owner_company_2?: string | null
          owner_contact?: string | null
          owner_contact_1?: string | null
          owner_contact_2?: string | null
          owner_name?: string | null
          owner_occupied?: boolean | null
          owner_phone?: string | null
          owner_portfolio_category?: string | null
          owner_portfolio_size?: number | null
          owner_total_beds?: number | null
          ownership_group_id?: number | null
          payment_increase_pct?: number | null
          pct_1bed?: number | null
          pct_2bed?: number | null
          pct_3bed?: number | null
          pct_4bed?: number | null
          pct_studios?: number | null
          price_per_unit?: number | null
          property_email?: string | null
          property_manager_address?: string | null
          property_manager_contact?: string | null
          property_manager_name?: string | null
          property_manager_phone?: string | null
          property_name?: string | null
          property_phone?: string | null
          property_type?: string | null
          property_website?: string | null
          property_website_type?: string | null
          rate_stress_bps?: number | null
          rate_stress_category?: string | null
          rba_sf?: number | null
          rent_gap_category?: string | null
          rent_gap_pct?: number | null
          rentcast_bathrooms?: number | null
          rentcast_bedrooms?: number | null
          rentcast_comparables?: Json | null
          rentcast_comparables_count?: number | null
          rentcast_features?: Json | null
          rentcast_fetched_at?: string | null
          rentcast_property_id?: string | null
          rentcast_property_type?: string | null
          rentcast_rent_estimate?: number | null
          rentcast_rent_high?: number | null
          rentcast_rent_low?: number | null
          rentcast_source_fields?: string[] | null
          rentcast_tax_amount?: number | null
          rentcast_tax_assessments?: Json | null
          rentcast_value_estimate?: number | null
          revenues?: number | null
          sale_company?: string | null
          sale_contact?: string | null
          sale_contact_phone?: string | null
          score_breakdown?: Json | null
          score_calculated_at?: string | null
          score_stale?: boolean
          secondary_type?: string | null
          source?: string | null
          special_servicer_status?: string | null
          star_rating?: number | null
          state: string
          state_fips?: string | null
          studios?: number | null
          style?: string | null
          subdivision?: string | null
          submarket?: string | null
          submarket_name?: string | null
          three_bed?: number | null
          transit_walk_time?: number | null
          transition_score?: number | null
          trepp_occupancy?: number | null
          two_bed?: number | null
          units?: number | null
          university?: string | null
          updated_at?: string | null
          vacancy_pct?: number | null
          watchlist_status?: string | null
          website_discovered_at?: string | null
          website_last_scraped_at?: string | null
          website_scrape_status?: string | null
          year_built?: number | null
          year_renovated?: number | null
          zillow_zhvi?: number | null
          zillow_zhvi_yoy?: number | null
          zillow_zori?: number | null
          zillow_zori_yoy?: number | null
          zip?: string | null
          zoning?: string | null
        }
        Update: {
          address?: string
          adjusted_transition_score?: number | null
          amenities?: string | null
          ami_30_pct?: number | null
          ami_60_pct?: number | null
          ami_80_pct?: number | null
          asking_rent_max?: number | null
          asking_rent_min?: number | null
          asking_rent_scraped_at?: string | null
          asking_rent_source?: string | null
          assessor_id?: string | null
          avg_asking_per_bed?: number | null
          avg_asking_per_sf?: number | null
          avg_asking_per_unit?: number | null
          avg_concessions_pct?: number | null
          avg_effective_per_unit?: number | null
          avg_unit_sf?: number | null
          avg_weighted_rent?: number | null
          beds?: number | null
          building_class?: string | null
          building_status?: string | null
          cap_rate?: number | null
          city?: string
          closest_transit?: string | null
          comp_active_count?: number | null
          comp_avg_distance?: number | null
          comp_avg_dom?: number | null
          comp_avg_rent?: number | null
          comp_avg_sqft?: number | null
          comp_median_rent?: number | null
          costar_property_id?: string | null
          county?: string | null
          county_fips?: string | null
          created_at?: string | null
          data_completeness?: number | null
          data_quality?: string | null
          days_on_market?: number | null
          days_to_maturity?: number | null
          delinquency_status?: string | null
          dscr_ncf?: number | null
          dscr_noi?: number | null
          enrichment_timestamp?: string | null
          enrichment_version?: string | null
          enrollment_change_pct?: number | null
          enrollment_trend?: string | null
          estimated_refi_rate?: number | null
          exit_pressure?: string | null
          expenses?: number | null
          firm_id?: string | null
          for_sale_price?: number | null
          for_sale_status?: string | null
          four_bed?: number | null
          gse_loan_count?: number | null
          has_loan_data?: boolean | null
          hold_period_category?: string | null
          hold_period_years?: number | null
          id?: number
          last_sale_date?: string | null
          last_sale_price?: number | null
          latitude?: number | null
          leasing_company?: string | null
          leasing_contact?: string | null
          leasing_portal_url?: string | null
          leed_certified?: boolean | null
          legal_description?: string | null
          loan_balance?: number | null
          loan_category?: string | null
          loan_interest_rate?: number | null
          loan_maturity?: string | null
          loan_maturity_date?: string | null
          loan_origination_amount?: number | null
          loan_origination_date?: string | null
          loan_rate?: number | null
          loan_source?: string | null
          loan_type?: string | null
          longitude?: number | null
          lot_sf?: number | null
          ltv?: number | null
          market_liquidity?: string | null
          market_name?: string | null
          maturity_urgency?: string | null
          missing_score_fields?: string[] | null
          msa_ami?: number | null
          msa_code?: string | null
          msa_name?: string | null
          ncf?: number | null
          noi?: number | null
          num_stories?: number | null
          occupancy_pct?: number | null
          one_bed?: number | null
          originator?: string | null
          owner_address?: string | null
          owner_company_1?: string | null
          owner_company_2?: string | null
          owner_contact?: string | null
          owner_contact_1?: string | null
          owner_contact_2?: string | null
          owner_name?: string | null
          owner_occupied?: boolean | null
          owner_phone?: string | null
          owner_portfolio_category?: string | null
          owner_portfolio_size?: number | null
          owner_total_beds?: number | null
          ownership_group_id?: number | null
          payment_increase_pct?: number | null
          pct_1bed?: number | null
          pct_2bed?: number | null
          pct_3bed?: number | null
          pct_4bed?: number | null
          pct_studios?: number | null
          price_per_unit?: number | null
          property_email?: string | null
          property_manager_address?: string | null
          property_manager_contact?: string | null
          property_manager_name?: string | null
          property_manager_phone?: string | null
          property_name?: string | null
          property_phone?: string | null
          property_type?: string | null
          property_website?: string | null
          property_website_type?: string | null
          rate_stress_bps?: number | null
          rate_stress_category?: string | null
          rba_sf?: number | null
          rent_gap_category?: string | null
          rent_gap_pct?: number | null
          rentcast_bathrooms?: number | null
          rentcast_bedrooms?: number | null
          rentcast_comparables?: Json | null
          rentcast_comparables_count?: number | null
          rentcast_features?: Json | null
          rentcast_fetched_at?: string | null
          rentcast_property_id?: string | null
          rentcast_property_type?: string | null
          rentcast_rent_estimate?: number | null
          rentcast_rent_high?: number | null
          rentcast_rent_low?: number | null
          rentcast_source_fields?: string[] | null
          rentcast_tax_amount?: number | null
          rentcast_tax_assessments?: Json | null
          rentcast_value_estimate?: number | null
          revenues?: number | null
          sale_company?: string | null
          sale_contact?: string | null
          sale_contact_phone?: string | null
          score_breakdown?: Json | null
          score_calculated_at?: string | null
          score_stale?: boolean
          secondary_type?: string | null
          source?: string | null
          special_servicer_status?: string | null
          star_rating?: number | null
          state?: string
          state_fips?: string | null
          studios?: number | null
          style?: string | null
          subdivision?: string | null
          submarket?: string | null
          submarket_name?: string | null
          three_bed?: number | null
          transit_walk_time?: number | null
          transition_score?: number | null
          trepp_occupancy?: number | null
          two_bed?: number | null
          units?: number | null
          university?: string | null
          updated_at?: string | null
          vacancy_pct?: number | null
          watchlist_status?: string | null
          website_discovered_at?: string | null
          website_last_scraped_at?: string | null
          website_scrape_status?: string | null
          year_built?: number | null
          year_renovated?: number | null
          zillow_zhvi?: number | null
          zillow_zhvi_yoy?: number | null
          zillow_zori?: number | null
          zillow_zori_yoy?: number | null
          zip?: string | null
          zoning?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_housing_properties_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firm_dashboard"
            referencedColumns: ["firm_id"]
          },
          {
            foreignKeyName: "student_housing_properties_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_housing_properties_ownership_group_id_fkey"
            columns: ["ownership_group_id"]
            isOneToOne: false
            referencedRelation: "ownership_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      trepp_loans: {
        Row: {
          city: string
          collection_timestamp: string | null
          created_at: string | null
          current_balance: number | null
          delinquency_status: string | null
          dscr_ncf: number | null
          dscr_noi: number | null
          id: string
          loan_rate: number | null
          ltv: number | null
          match_confidence: string | null
          matched_property_id: number | null
          maturity_date: string | null
          ncf: number | null
          noi: number | null
          num_units: number | null
          occupancy_pct: number | null
          origination_date: string | null
          originator: string | null
          owner_address: string | null
          owner_name: string | null
          owner_phone: string | null
          property_name: string
          property_type: string | null
          source: string | null
          state: string
          updated_at: string | null
          year_built: number | null
        }
        Insert: {
          city: string
          collection_timestamp?: string | null
          created_at?: string | null
          current_balance?: number | null
          delinquency_status?: string | null
          dscr_ncf?: number | null
          dscr_noi?: number | null
          id?: string
          loan_rate?: number | null
          ltv?: number | null
          match_confidence?: string | null
          matched_property_id?: number | null
          maturity_date?: string | null
          ncf?: number | null
          noi?: number | null
          num_units?: number | null
          occupancy_pct?: number | null
          origination_date?: string | null
          originator?: string | null
          owner_address?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          property_name: string
          property_type?: string | null
          source?: string | null
          state: string
          updated_at?: string | null
          year_built?: number | null
        }
        Update: {
          city?: string
          collection_timestamp?: string | null
          created_at?: string | null
          current_balance?: number | null
          delinquency_status?: string | null
          dscr_ncf?: number | null
          dscr_noi?: number | null
          id?: string
          loan_rate?: number | null
          ltv?: number | null
          match_confidence?: string | null
          matched_property_id?: number | null
          maturity_date?: string | null
          ncf?: number | null
          noi?: number | null
          num_units?: number | null
          occupancy_pct?: number | null
          origination_date?: string | null
          originator?: string | null
          owner_address?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          property_name?: string
          property_type?: string | null
          source?: string | null
          state?: string
          updated_at?: string | null
          year_built?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trepp_loans_matched_property_id_fkey"
            columns: ["matched_property_id"]
            isOneToOne: false
            referencedRelation: "property_vacancy_metrics"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "trepp_loans_matched_property_id_fkey"
            columns: ["matched_property_id"]
            isOneToOne: false
            referencedRelation: "student_housing_properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trepp_loans_matched_property_id_fkey"
            columns: ["matched_property_id"]
            isOneToOne: false
            referencedRelation: "vw_student_housing_enriched"
            referencedColumns: ["id"]
          },
        ]
      }
      universities: {
        Row: {
          avg_market_occupancy: number | null
          avg_market_rent: number | null
          bed_demand_forecast: number | null
          city: string | null
          control: string | null
          created_at: string | null
          data_source: string | null
          enrollment_1yr_change: number | null
          enrollment_3yr_change: number | null
          enrollment_5yr_change: number | null
          enrollment_trend: string | null
          forecast_horizon: string | null
          grad_enrollment: number | null
          id: number
          last_verified_at: string | null
          latitude: number | null
          level: string | null
          longitude: number | null
          macro_risk_score: string | null
          name: string
          on_campus_housing_capacity: number | null
          on_campus_housing_pct: number | null
          predicted_enrollment_delta: number | null
          property_count: number | null
          school_residual: number | null
          sector: string | null
          state: string | null
          total_beds: number | null
          total_enrollment: number | null
          undergrad_enrollment: number | null
          unitid: number | null
          updated_at: string | null
          zip: string | null
        }
        Insert: {
          avg_market_occupancy?: number | null
          avg_market_rent?: number | null
          bed_demand_forecast?: number | null
          city?: string | null
          control?: string | null
          created_at?: string | null
          data_source?: string | null
          enrollment_1yr_change?: number | null
          enrollment_3yr_change?: number | null
          enrollment_5yr_change?: number | null
          enrollment_trend?: string | null
          forecast_horizon?: string | null
          grad_enrollment?: number | null
          id?: number
          last_verified_at?: string | null
          latitude?: number | null
          level?: string | null
          longitude?: number | null
          macro_risk_score?: string | null
          name: string
          on_campus_housing_capacity?: number | null
          on_campus_housing_pct?: number | null
          predicted_enrollment_delta?: number | null
          property_count?: number | null
          school_residual?: number | null
          sector?: string | null
          state?: string | null
          total_beds?: number | null
          total_enrollment?: number | null
          undergrad_enrollment?: number | null
          unitid?: number | null
          updated_at?: string | null
          zip?: string | null
        }
        Update: {
          avg_market_occupancy?: number | null
          avg_market_rent?: number | null
          bed_demand_forecast?: number | null
          city?: string | null
          control?: string | null
          created_at?: string | null
          data_source?: string | null
          enrollment_1yr_change?: number | null
          enrollment_3yr_change?: number | null
          enrollment_5yr_change?: number | null
          enrollment_trend?: string | null
          forecast_horizon?: string | null
          grad_enrollment?: number | null
          id?: number
          last_verified_at?: string | null
          latitude?: number | null
          level?: string | null
          longitude?: number | null
          macro_risk_score?: string | null
          name?: string
          on_campus_housing_capacity?: number | null
          on_campus_housing_pct?: number | null
          predicted_enrollment_delta?: number | null
          property_count?: number | null
          school_residual?: number | null
          sector?: string | null
          state?: string | null
          total_beds?: number | null
          total_enrollment?: number | null
          undergrad_enrollment?: number | null
          unitid?: number | null
          updated_at?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      university_metrics: {
        Row: {
          admission_rate: number | null
          applicants_total: number | null
          avg_annual_change_pct: number | null
          collection_timestamp: string | null
          confidence: number | null
          created_at: string | null
          data_source: string | null
          dorm_capacity: number | null
          enrollment_history: Json | null
          enrollment_trend: string | null
          freshmen_count: number | null
          ft_enrollment: number | null
          ft_pct: number | null
          grad_enrollment: number | null
          graduation_rate_150: number | null
          housing_deficit: number | null
          id: number
          latest_change_pct: number | null
          latest_enrollment_year: number | null
          pt_enrollment: number | null
          retention_rate_ft: number | null
          retention_rate_pt: number | null
          room_and_board_cost: number | null
          total_enrollment: number | null
          tuition_in_state: number | null
          tuition_out_state: number | null
          undergrad_enrollment: number | null
          unitid: number | null
          university_name: string
          updated_at: string | null
          yield_rate: number | null
        }
        Insert: {
          admission_rate?: number | null
          applicants_total?: number | null
          avg_annual_change_pct?: number | null
          collection_timestamp?: string | null
          confidence?: number | null
          created_at?: string | null
          data_source?: string | null
          dorm_capacity?: number | null
          enrollment_history?: Json | null
          enrollment_trend?: string | null
          freshmen_count?: number | null
          ft_enrollment?: number | null
          ft_pct?: number | null
          grad_enrollment?: number | null
          graduation_rate_150?: number | null
          housing_deficit?: number | null
          id?: number
          latest_change_pct?: number | null
          latest_enrollment_year?: number | null
          pt_enrollment?: number | null
          retention_rate_ft?: number | null
          retention_rate_pt?: number | null
          room_and_board_cost?: number | null
          total_enrollment?: number | null
          tuition_in_state?: number | null
          tuition_out_state?: number | null
          undergrad_enrollment?: number | null
          unitid?: number | null
          university_name: string
          updated_at?: string | null
          yield_rate?: number | null
        }
        Update: {
          admission_rate?: number | null
          applicants_total?: number | null
          avg_annual_change_pct?: number | null
          collection_timestamp?: string | null
          confidence?: number | null
          created_at?: string | null
          data_source?: string | null
          dorm_capacity?: number | null
          enrollment_history?: Json | null
          enrollment_trend?: string | null
          freshmen_count?: number | null
          ft_enrollment?: number | null
          ft_pct?: number | null
          grad_enrollment?: number | null
          graduation_rate_150?: number | null
          housing_deficit?: number | null
          id?: number
          latest_change_pct?: number | null
          latest_enrollment_year?: number | null
          pt_enrollment?: number | null
          retention_rate_ft?: number | null
          retention_rate_pt?: number | null
          room_and_board_cost?: number | null
          total_enrollment?: number | null
          tuition_in_state?: number | null
          tuition_out_state?: number | null
          undergrad_enrollment?: number | null
          unitid?: number | null
          university_name?: string
          updated_at?: string | null
          yield_rate?: number | null
        }
        Relationships: []
      }
      usage_metrics: {
        Row: {
          active_users: number | null
          activities_logged: number | null
          api_calls: number | null
          created_at: string | null
          deals_created: number | null
          firm_id: string
          id: string
          period_end: string
          period_start: string
          properties_viewed: number | null
          reports_generated: number | null
        }
        Insert: {
          active_users?: number | null
          activities_logged?: number | null
          api_calls?: number | null
          created_at?: string | null
          deals_created?: number | null
          firm_id: string
          id?: string
          period_end: string
          period_start: string
          properties_viewed?: number | null
          reports_generated?: number | null
        }
        Update: {
          active_users?: number | null
          activities_logged?: number | null
          api_calls?: number | null
          created_at?: string | null
          deals_created?: number | null
          firm_id?: string
          id?: string
          period_end?: string
          period_start?: string
          properties_viewed?: number | null
          reports_generated?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_metrics_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firm_dashboard"
            referencedColumns: ["firm_id"]
          },
          {
            foreignKeyName: "usage_metrics_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      zillow_indices: {
        Row: {
          collection_timestamp: string | null
          created_at: string | null
          data_source: string | null
          id: number
          metric: string
          period: string
          region_name: string
          region_type: string | null
          state: string | null
          value: number | null
          yoy_change: number | null
          yoy_change_pct: number | null
        }
        Insert: {
          collection_timestamp?: string | null
          created_at?: string | null
          data_source?: string | null
          id?: number
          metric: string
          period: string
          region_name: string
          region_type?: string | null
          state?: string | null
          value?: number | null
          yoy_change?: number | null
          yoy_change_pct?: number | null
        }
        Update: {
          collection_timestamp?: string | null
          created_at?: string | null
          data_source?: string | null
          id?: number
          metric?: string
          period?: string
          region_name?: string
          region_type?: string | null
          state?: string | null
          value?: number | null
          yoy_change?: number | null
          yoy_change_pct?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      available_integrations: {
        Row: {
          auth_type: Database["public"]["Enums"]["integration_auth_type"] | null
          category: Database["public"]["Enums"]["integration_category"] | null
          connected_at: string | null
          description: string | null
          docs_url: string | null
          external_account_name: string | null
          features: string[] | null
          id: string | null
          is_beta: boolean | null
          last_sync_at: string | null
          logo_url: string | null
          name: string | null
          settings: Json | null
          status: Database["public"]["Enums"]["integration_status"] | null
        }
        Relationships: []
      }
      draft_approval_queue: {
        Row: {
          body_html: string | null
          contact_company: string | null
          contact_email: string | null
          contact_name: string | null
          context_snapshot: Json | null
          created_at: string | null
          expires_at: string | null
          firm_id: string | null
          id: string | null
          property_id: number | null
          property_name: string | null
          revision_number: number | null
          subject: string | null
          template_id: string | null
          thread_id: string | null
          transition_score: number | null
          trigger_type:
            | Database["public"]["Enums"]["outreach_trigger_type"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "outreach_drafts_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firm_dashboard"
            referencedColumns: ["firm_id"]
          },
          {
            foreignKeyName: "outreach_drafts_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_drafts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "outreach_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_drafts_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "outreach_inbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_drafts_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "outreach_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_threads_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_vacancy_metrics"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "outreach_threads_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "student_housing_properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_threads_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "vw_student_housing_enriched"
            referencedColumns: ["id"]
          },
        ]
      }
      firm_dashboard: {
        Row: {
          active_deals: number | null
          active_users: number | null
          firm_id: string | null
          firm_name: string | null
          max_properties: number | null
          max_users: number | null
          pipeline_value: number | null
          property_count: number | null
          subscription_tier: string | null
        }
        Insert: {
          active_deals?: never
          active_users?: never
          firm_id?: string | null
          firm_name?: string | null
          max_properties?: number | null
          max_users?: number | null
          pipeline_value?: never
          property_count?: never
          subscription_tier?: string | null
        }
        Update: {
          active_deals?: never
          active_users?: never
          firm_id?: string | null
          firm_name?: string | null
          max_properties?: number | null
          max_users?: number | null
          pipeline_value?: never
          property_count?: never
          subscription_tier?: string | null
        }
        Relationships: []
      }
      integration_health: {
        Row: {
          api_calls_today: number | null
          category: Database["public"]["Enums"]["integration_category"] | null
          firm_id: string | null
          health_status: string | null
          issue_details: string | null
          last_sync_at: string | null
          last_sync_status: string | null
          provider_name: string | null
          rate_limit_requests: number | null
          status: Database["public"]["Enums"]["integration_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "firm_integrations_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firm_dashboard"
            referencedColumns: ["firm_id"]
          },
          {
            foreignKeyName: "firm_integrations_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_inbox: {
        Row: {
          attention_type: string | null
          contact_email: string | null
          contact_id: string | null
          contact_name: string | null
          deal_id: string | null
          firm_id: string | null
          id: string | null
          interest_level: number | null
          is_read: boolean | null
          is_starred: boolean | null
          last_message_at: string | null
          last_message_direction: string | null
          last_message_preview: string | null
          message_count: number | null
          pending_drafts: number | null
          property_id: number | null
          status: Database["public"]["Enums"]["outreach_status"] | null
          subject: string | null
          thread_sentiment:
            | Database["public"]["Enums"]["reply_sentiment"]
            | null
        }
        Insert: {
          attention_type?: never
          contact_email?: string | null
          contact_id?: string | null
          contact_name?: string | null
          deal_id?: string | null
          firm_id?: string | null
          id?: string | null
          interest_level?: number | null
          is_read?: boolean | null
          is_starred?: boolean | null
          last_message_at?: string | null
          last_message_direction?: string | null
          last_message_preview?: never
          message_count?: number | null
          pending_drafts?: never
          property_id?: number | null
          status?: Database["public"]["Enums"]["outreach_status"] | null
          subject?: string | null
          thread_sentiment?:
            | Database["public"]["Enums"]["reply_sentiment"]
            | null
        }
        Update: {
          attention_type?: never
          contact_email?: string | null
          contact_id?: string | null
          contact_name?: string | null
          deal_id?: string | null
          firm_id?: string | null
          id?: string | null
          interest_level?: number | null
          is_read?: boolean | null
          is_starred?: boolean | null
          last_message_at?: string | null
          last_message_direction?: string | null
          last_message_preview?: never
          message_count?: number | null
          pending_drafts?: never
          property_id?: number | null
          status?: Database["public"]["Enums"]["outreach_status"] | null
          subject?: string | null
          thread_sentiment?:
            | Database["public"]["Enums"]["reply_sentiment"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "outreach_threads_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_threads_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firm_dashboard"
            referencedColumns: ["firm_id"]
          },
          {
            foreignKeyName: "outreach_threads_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_threads_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_vacancy_metrics"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "outreach_threads_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "student_housing_properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_threads_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "vw_student_housing_enriched"
            referencedColumns: ["id"]
          },
        ]
      }
      property_vacancy_metrics: {
        Row: {
          acs_year: number | null
          address: string | null
          census_tract: string | null
          city: string | null
          property_id: number | null
          property_name: string | null
          state: string | null
          tract_rental_vacancy_pct: number | null
          tract_renter_units: number | null
          tract_total_vacancy_pct: number | null
          tract_vacant_rental_units: number | null
          university: string | null
          vacancy_stress_level: string | null
        }
        Relationships: []
      }
      v_latest_scores: {
        Row: {
          adjusted_transition_score: number | null
          algorithm_version: string | null
          calculated_at: string | null
          data_completeness: number | null
          property_id: number | null
          score_breakdown: Json | null
          transition_score: number | null
        }
        Relationships: [
          {
            foreignKeyName: "score_history_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_vacancy_metrics"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "score_history_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "student_housing_properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_history_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "vw_student_housing_enriched"
            referencedColumns: ["id"]
          },
        ]
      }
      v_recent_audit_logs: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"] | null
          entity_id: string | null
          entity_type: Database["public"]["Enums"]["audit_entity"] | null
          firm_id: string | null
          firm_name: string | null
          id: string | null
          message: string | null
          metadata: Json | null
          severity: Database["public"]["Enums"]["audit_severity"] | null
          timestamp: string | null
          user_id: string | null
          user_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firm_dashboard"
            referencedColumns: ["firm_id"]
          },
          {
            foreignKeyName: "audit_logs_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      v_score_changes: {
        Row: {
          address: string | null
          calculated_at: string | null
          previous_score: number | null
          property_id: number | null
          property_name: string | null
          score_change: number | null
          transition_score: number | null
          trigger_type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "score_history_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_vacancy_metrics"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "score_history_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "student_housing_properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_history_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "vw_student_housing_enriched"
            referencedColumns: ["id"]
          },
        ]
      }
      v_state_economic_indicators: {
        Row: {
          historical_values: Json | null
          income_growth_pct: number | null
          median_income: number | null
          state_code: string | null
          value_date: string | null
        }
        Insert: {
          historical_values?: Json | null
          income_growth_pct?: number | null
          median_income?: number | null
          state_code?: string | null
          value_date?: string | null
        }
        Update: {
          historical_values?: Json | null
          income_growth_pct?: number | null
          median_income?: number | null
          state_code?: string | null
          value_date?: string | null
        }
        Relationships: []
      }
      v_university_enrollment_summary: {
        Row: {
          avg_market_occupancy: number | null
          avg_market_rent: number | null
          cagr_3yr: number | null
          cagr_5yr: number | null
          city: string | null
          id: number | null
          name: string | null
          peak_enrollment: number | null
          peak_year: number | null
          property_count: number | null
          state: string | null
          total_beds: number | null
          total_enrollment: number | null
          trend_confidence: number | null
          trend_direction: string | null
          trend_score: number | null
          unitid: number | null
          yoy_change_pct: number | null
        }
        Relationships: []
      }
      vw_student_housing_enriched: {
        Row: {
          address: string | null
          adjusted_transition_score: number | null
          avg_asking_per_bed: number | null
          avg_asking_per_sf: number | null
          avg_concessions_pct: number | null
          avg_effective_per_unit: number | null
          avg_unit_sf: number | null
          avg_weighted_rent: number | null
          beds: number | null
          building_class: string | null
          cap_rate: number | null
          city: string | null
          comp_active_count: number | null
          comp_avg_distance: number | null
          comp_avg_dom: number | null
          comp_avg_rent: number | null
          comp_avg_sqft: number | null
          comp_median_rent: number | null
          county: string | null
          created_at: string | null
          data_completeness: number | null
          data_quality: string | null
          days_on_market: number | null
          days_to_maturity: number | null
          delinquency_status: string | null
          dscr_ncf: number | null
          dscr_noi: number | null
          estimated_refi_rate: number | null
          exit_pressure: string | null
          expenses: number | null
          for_sale_price: number | null
          for_sale_status: string | null
          has_coordinates: boolean | null
          has_enrollment_prediction: boolean | null
          has_hot_list: boolean | null
          has_loan_data: boolean | null
          has_market_indicators: boolean | null
          has_market_stress: boolean | null
          has_occupancy: boolean | null
          has_ownership_group: boolean | null
          has_rentcast_data: boolean | null
          has_trepp_loan: boolean | null
          has_university_data: boolean | null
          has_zillow_data: boolean | null
          hold_period_category: string | null
          hold_period_years: number | null
          hot_flags: string[] | null
          hot_priority: string | null
          hot_reasons: string[] | null
          hot_score: number | null
          id: number | null
          last_sale_date: string | null
          last_sale_price: number | null
          latitude: number | null
          leasing_company: string | null
          loan_balance: number | null
          loan_maturity_date: string | null
          loan_origination_amount: number | null
          loan_origination_date: string | null
          loan_rate: number | null
          loan_source: string | null
          loan_type: string | null
          longitude: number | null
          ltv: number | null
          market_name: string | null
          maturity_urgency: string | null
          metro_area_name: string | null
          metro_data_period: string | null
          metro_employment_change_1y: number | null
          metro_employment_change_pct: number | null
          metro_employment_total: number | null
          metro_industry_breakdown: Json | null
          metro_labor_force: number | null
          metro_labor_force_participation: number | null
          metro_unemployment_rate: number | null
          metro_unemployment_rate_prev: number | null
          ml_bed_demand_change: number | null
          ml_enrollment_change: number | null
          ml_forecast_horizon: string | null
          ml_macro_risk: string | null
          ml_model_version: string | null
          ml_r_squared: number | null
          ml_residual: number | null
          ml_residual_interp: string | null
          ml_rmse: number | null
          ml_scenarios: Json | null
          msa_ami: number | null
          msa_code: string | null
          msa_name: string | null
          msi_avg_dom: number | null
          msi_avg_rent: number | null
          msi_dom_velocity: number | null
          msi_median_rent: number | null
          msi_month: string | null
          msi_rent_momentum: number | null
          msi_stress_index: number | null
          msi_stress_signal: string | null
          msi_supply_pressure: number | null
          msi_total_listings: number | null
          ncf: number | null
          noi: number | null
          num_stories: number | null
          occupancy_pct: number | null
          originator: string | null
          owner_address: string | null
          owner_company_1: string | null
          owner_company_2: string | null
          owner_contact: string | null
          owner_group_aum: number | null
          owner_group_avg_score: number | null
          owner_group_beds: number | null
          owner_group_contact_email: string | null
          owner_group_contact_name: string | null
          owner_group_contact_phone: string | null
          owner_group_disposition: boolean | null
          owner_group_high_priority: number | null
          owner_group_hold_period: number | null
          owner_group_horizon: string | null
          owner_group_last_contact: string | null
          owner_group_market: string | null
          owner_group_name: string | null
          owner_group_properties: number | null
          owner_group_rel_status: string | null
          owner_group_states: string[] | null
          owner_group_type: string | null
          owner_group_units: number | null
          owner_name: string | null
          owner_phone: string | null
          ownership_group_id: number | null
          payment_increase_pct: number | null
          price_per_unit: number | null
          prop_enrollment_change_pct: number | null
          prop_enrollment_trend: string | null
          property_email: string | null
          property_manager_contact: string | null
          property_manager_name: string | null
          property_manager_phone: string | null
          property_name: string | null
          property_phone_direct: string | null
          property_type: string | null
          property_website: string | null
          rate_stress_bps: number | null
          rate_stress_category: string | null
          rba_sf: number | null
          rent_gap_category: string | null
          rent_gap_pct: number | null
          rentcast_bathrooms: number | null
          rentcast_bedrooms: number | null
          rentcast_comparables: Json | null
          rentcast_comparables_count: number | null
          rentcast_features: Json | null
          rentcast_fetched_at: string | null
          rentcast_property_id: string | null
          rentcast_property_type: string | null
          rentcast_rent_estimate: number | null
          rentcast_rent_high: number | null
          rentcast_rent_low: number | null
          rentcast_tax_amount: number | null
          rentcast_tax_assessments: Json | null
          rentcast_value_estimate: number | null
          revenues: number | null
          sale_company: string | null
          sale_contact: string | null
          sale_contact_phone: string | null
          score_breakdown: Json | null
          score_calculated_at: string | null
          score_stale: boolean | null
          special_servicer_status: string | null
          star_rating: number | null
          state: string | null
          style: string | null
          submarket_name: string | null
          transition_score: number | null
          trepp_balance: number | null
          trepp_delinquency: string | null
          trepp_dscr_ncf: number | null
          trepp_dscr_noi: number | null
          trepp_loan_id: string | null
          trepp_ltv: number | null
          trepp_match_confidence: string | null
          trepp_maturity_date: string | null
          trepp_ncf: number | null
          trepp_noi: number | null
          trepp_occ_pct: number | null
          trepp_occupancy: number | null
          trepp_origination_date: string | null
          trepp_originator: string | null
          trepp_owner_name: string | null
          trepp_owner_phone: string | null
          trepp_rate: number | null
          trepp_source: string | null
          uni_1yr_change: number | null
          uni_3yr_change: number | null
          uni_5yr_change: number | null
          uni_avg_market_occ: number | null
          uni_avg_market_rent: number | null
          uni_enrollment: number | null
          uni_enrollment_trend: string | null
          uni_housing_capacity: number | null
          uni_housing_pct: number | null
          uni_id: number | null
          uni_latitude: number | null
          uni_longitude: number | null
          uni_macro_risk: string | null
          uni_property_count: number | null
          uni_total_beds: number | null
          uni_undergrad: number | null
          units: number | null
          university_name: string | null
          updated_at: string | null
          vacancy_pct: number | null
          watchlist_status: string | null
          year_built: number | null
          year_renovated: number | null
          zillow_zhvi: number | null
          zillow_zhvi_yoy: number | null
          zillow_zori: number | null
          zillow_zori_yoy: number | null
          zip: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_housing_properties_ownership_group_id_fkey"
            columns: ["ownership_group_id"]
            isOneToOne: false
            referencedRelation: "ownership_groups"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      calc_rental_vacancy_rate: {
        Args: {
          renter_occupied: number
          vacant_for_rent: number
          vacant_rented_not_occupied: number
        }
        Returns: number
      }
      can_manage_users: { Args: never; Returns: boolean }
      cleanup_expired_oauth_states: { Args: never; Returns: undefined }
      cleanup_integration_data: {
        Args: { sync_retention_days?: number; webhook_retention_days?: number }
        Returns: {
          oauth_states_deleted: number
          sync_logs_deleted: number
          webhook_logs_deleted: number
        }[]
      }
      cleanup_old_sync_logs: {
        Args: { retention_days?: number }
        Returns: number
      }
      cleanup_old_webhook_logs: {
        Args: { retention_days?: number }
        Returns: number
      }
      create_firm_and_migrate_data: {
        Args: { firm_name: string; owner_email: string; owner_user_id: string }
        Returns: string
      }
      get_firm_enabled_features: {
        Args: { p_firm_id: string }
        Returns: string[]
      }
      get_high_vacancy_tracts: {
        Args: { p_min_vacancy_rate?: number; p_state_fips: string }
        Returns: {
          geoid: string
          rental_vacancy_rate: number
          renter_occupied: number
          total_vacancy_rate: number
          tract_name: string
          vacant_for_rent: number
        }[]
      }
      get_pending_drafts_count: { Args: { p_firm_id: string }; Returns: number }
      get_property_vacancy: {
        Args: { p_property_id: number }
        Returns: {
          acs_year: number
          rental_vacancy_rate: number
          total_vacancy_rate: number
          tract_geoid: string
          vacancy_stress: string
        }[]
      }
      get_secret: { Args: { secret_name: string }; Returns: string }
      get_user_firm_id: { Args: never; Returns: string }
      get_user_firm_role: { Args: never; Returns: string }
      is_integration_connected: {
        Args: { p_firm_id: string; p_provider_id: string }
        Returns: boolean
      }
      recalculate_stale_scores: {
        Args: { batch_size?: number }
        Returns: {
          error_count: number
          processed_count: number
        }[]
      }
      update_campaign_stats: {
        Args: { p_campaign_id: string }
        Returns: undefined
      }
    }
    Enums: {
      audit_action:
        | "create"
        | "update"
        | "delete"
        | "view"
        | "export"
        | "import"
        | "login"
        | "logout"
        | "permission_change"
        | "score_calculate"
        | "bulk_operation"
        | "system_event"
      audit_entity:
        | "property"
        | "deal"
        | "task"
        | "activity"
        | "contact"
        | "user"
        | "firm"
        | "score"
        | "document"
        | "settings"
        | "system"
      audit_severity: "debug" | "info" | "warn" | "error"
      draft_action:
        | "approved"
        | "approved_with_edits"
        | "revision_requested"
        | "rejected"
      integration_auth_type: "oauth2" | "api_key" | "webhook_only" | "none"
      integration_category:
        | "documents"
        | "crm"
        | "communication"
        | "data"
        | "calendar"
        | "accounting"
      integration_status:
        | "connected"
        | "disconnected"
        | "expired"
        | "error"
        | "pending"
      outreach_status:
        | "drafting"
        | "pending_approval"
        | "approved"
        | "scheduled"
        | "sending"
        | "sent"
        | "delivered"
        | "opened"
        | "clicked"
        | "replied"
        | "bounced"
        | "rejected"
        | "failed"
      outreach_trigger_type:
        | "manual"
        | "transition_score"
        | "debt_maturity"
        | "occupancy_change"
        | "no_contact"
        | "follow_up"
        | "campaign"
        | "reply_received"
      reply_sentiment:
        | "very_positive"
        | "positive"
        | "neutral"
        | "negative"
        | "very_negative"
        | "out_of_office"
        | "unsubscribe"
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
      audit_action: [
        "create",
        "update",
        "delete",
        "view",
        "export",
        "import",
        "login",
        "logout",
        "permission_change",
        "score_calculate",
        "bulk_operation",
        "system_event",
      ],
      audit_entity: [
        "property",
        "deal",
        "task",
        "activity",
        "contact",
        "user",
        "firm",
        "score",
        "document",
        "settings",
        "system",
      ],
      audit_severity: ["debug", "info", "warn", "error"],
      draft_action: [
        "approved",
        "approved_with_edits",
        "revision_requested",
        "rejected",
      ],
      integration_auth_type: ["oauth2", "api_key", "webhook_only", "none"],
      integration_category: [
        "documents",
        "crm",
        "communication",
        "data",
        "calendar",
        "accounting",
      ],
      integration_status: [
        "connected",
        "disconnected",
        "expired",
        "error",
        "pending",
      ],
      outreach_status: [
        "drafting",
        "pending_approval",
        "approved",
        "scheduled",
        "sending",
        "sent",
        "delivered",
        "opened",
        "clicked",
        "replied",
        "bounced",
        "rejected",
        "failed",
      ],
      outreach_trigger_type: [
        "manual",
        "transition_score",
        "debt_maturity",
        "occupancy_change",
        "no_contact",
        "follow_up",
        "campaign",
        "reply_received",
      ],
      reply_sentiment: [
        "very_positive",
        "positive",
        "neutral",
        "negative",
        "very_negative",
        "out_of_office",
        "unsubscribe",
      ],
    },
  },
} as const
