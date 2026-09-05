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
      conversations: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          last_message_at: string
          listing_id: string
          seller_id: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          last_message_at?: string
          listing_id: string
          seller_id: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          last_message_at?: string
          listing_id?: string
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      deposit_requests: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string
          id: string
          processed_at: string | null
          status: Database["public"]["Enums"]["withdrawal_status"]
          txid: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          created_at?: string
          id?: string
          processed_at?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          txid: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          id?: string
          processed_at?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          txid?: string
          user_id?: string
        }
        Relationships: []
      }
      disputes: {
        Row: {
          created_at: string
          id: string
          opened_by: string
          order_id: string
          reason: string
          resolution: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          opened_by: string
          order_id: string
          reason: string
          resolution?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          opened_by?: string
          order_id?: string
          reason?: string
          resolution?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_posts: {
        Row: {
          author_id: string
          body: string
          channel: string
          created_at: string
          id: string
        }
        Insert: {
          author_id: string
          body: string
          channel: string
          created_at?: string
          id?: string
        }
        Update: {
          author_id?: string
          body?: string
          channel?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_submissions: {
        Row: {
          admin_note: string | null
          country: string | null
          created_at: string
          document_number: string
          full_name: string
          id: string
          id_document_path: string
          reviewed_at: string | null
          selfie_path: string
          status: Database["public"]["Enums"]["kyc_status"]
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          country?: string | null
          created_at?: string
          document_number: string
          full_name: string
          id?: string
          id_document_path: string
          reviewed_at?: string | null
          selfie_path: string
          status?: Database["public"]["Enums"]["kyc_status"]
          user_id: string
        }
        Update: {
          admin_note?: string | null
          country?: string | null
          created_at?: string
          document_number?: string
          full_name?: string
          id?: string
          id_document_path?: string
          reviewed_at?: string | null
          selfie_path?: string
          status?: Database["public"]["Enums"]["kyc_status"]
          user_id?: string
        }
        Relationships: []
      }
      listings: {
        Row: {
          algorithm: string | null
          brand: string
          condition: string
          created_at: string
          description: string
          hashrate: string
          hours_used: number | null
          id: string
          images: string[]
          location: string | null
          model: string
          power_watts: number
          price_usd: number
          seller_id: string
          status: Database["public"]["Enums"]["listing_status"]
          title: string
          warranty_months: number
        }
        Insert: {
          algorithm?: string | null
          brand: string
          condition: string
          created_at?: string
          description: string
          hashrate: string
          hours_used?: number | null
          id?: string
          images?: string[]
          location?: string | null
          model: string
          power_watts: number
          price_usd: number
          seller_id: string
          status?: Database["public"]["Enums"]["listing_status"]
          title: string
          warranty_months: number
        }
        Update: {
          algorithm?: string | null
          brand?: string
          condition?: string
          created_at?: string
          description?: string
          hashrate?: string
          hours_used?: number | null
          id?: string
          images?: string[]
          location?: string | null
          model?: string
          power_watts?: number
          price_usd?: number
          seller_id?: string
          status?: Database["public"]["Enums"]["listing_status"]
          title?: string
          warranty_months?: number
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount: number
          buyer_id: string
          created_at: string
          fee: number
          id: string
          listing_id: string
          seller_id: string
          shipping_address: string | null
          shipping_carrier: string | null
          status: Database["public"]["Enums"]["order_status"]
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          buyer_id: string
          created_at?: string
          fee?: number
          id?: string
          listing_id: string
          seller_id: string
          shipping_address?: string | null
          shipping_carrier?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          buyer_id?: string
          created_at?: string
          fee?: number
          id?: string
          listing_id?: string
          seller_id?: string
          shipping_address?: string | null
          shipping_carrier?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          country: string | null
          created_at: string
          display_name: string
          id: string
          kyc_status: Database["public"]["Enums"]["kyc_status"]
          rating: number
          sales_count: number
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string
          display_name?: string
          id: string
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          rating?: number
          sales_count?: number
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string
          display_name?: string
          id?: string
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          rating?: number
          sales_count?: number
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          order_id: string
          rating: number
          reviewer_id: string
          seller_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          order_id: string
          rating: number
          reviewer_id: string
          seller_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          order_id?: string
          rating?: number
          reviewer_id?: string
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
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
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          reference: string | null
          status: string
          type: Database["public"]["Enums"]["tx_type"]
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          reference?: string | null
          status?: string
          type: Database["public"]["Enums"]["tx_type"]
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          reference?: string | null
          status?: string
          type?: Database["public"]["Enums"]["tx_type"]
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number
          currency: string
          deposit_address: string | null
          deposit_currency: string
          deposit_network: string
          deposit_tag: string
          held: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          currency?: string
          deposit_address?: string | null
          deposit_currency?: string
          deposit_network?: string
          deposit_tag: string
          held?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          currency?: string
          deposit_address?: string | null
          deposit_currency?: string
          deposit_network?: string
          deposit_tag?: string
          held?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          address: string
          amount: number
          created_at: string
          id: string
          network: string
          processed_at: string | null
          reject_reason: string | null
          status: Database["public"]["Enums"]["withdrawal_status"]
          tx_hash: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          amount: number
          created_at?: string
          id?: string
          network?: string
          processed_at?: string | null
          reject_reason?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          tx_hash?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          amount?: number
          created_at?: string
          id?: string
          network?: string
          processed_at?: string | null
          reject_reason?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          tx_hash?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_list_deposits: {
        Args: never
        Returns: {
          admin_note: string
          amount: number
          created_at: string
          display_name: string
          email: string
          id: string
          processed_at: string
          status: Database["public"]["Enums"]["withdrawal_status"]
          txid: string
          user_id: string
        }[]
      }
      admin_list_users: {
        Args: never
        Returns: {
          balance: number
          created_at: string
          display_name: string
          email: string
          held: number
          id: string
          is_admin: boolean
          kyc_status: Database["public"]["Enums"]["kyc_status"]
        }[]
      }
      admin_list_withdrawals: {
        Args: never
        Returns: {
          address: string
          amount: number
          created_at: string
          display_name: string
          email: string
          id: string
          network: string
          processed_at: string
          reject_reason: string
          status: Database["public"]["Enums"]["withdrawal_status"]
          user_id: string
        }[]
      }
      admin_platform_stats: {
        Args: never
        Returns: {
          new_users_7d: number
          total_listings: number
          total_orders: number
          total_users: number
        }[]
      }
      admin_set_user_role: {
        Args: { _make_admin: boolean; _user_id: string }
        Returns: undefined
      }
      approve_deposit: { Args: { _id: string }; Returns: undefined }
      approve_withdrawal: {
        Args: { _id: string; _tx_hash?: string }
        Returns: undefined
      }
      create_escrow_order: {
        Args: { _listing_id: string; _shipping_address: string }
        Returns: string
      }
      credit_deposit: {
        Args: { _amount: number; _reference: string; _user_id: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      mark_order_shipped: {
        Args: { _carrier: string; _order_id: string; _tracking: string }
        Returns: undefined
      }
      open_dispute: {
        Args: { _order_id: string; _reason: string }
        Returns: string
      }
      refund_escrow: { Args: { _order_id: string }; Returns: undefined }
      reject_deposit: {
        Args: { _id: string; _reason: string }
        Returns: undefined
      }
      reject_withdrawal: {
        Args: { _id: string; _reason: string }
        Returns: undefined
      }
      release_escrow: { Args: { _order_id: string }; Returns: undefined }
      request_withdrawal: {
        Args: { _address: string; _amount: number }
        Returns: string
      }
      set_deposit_address: {
        Args: {
          _address: string
          _currency: string
          _network: string
          _user_id: string
        }
        Returns: undefined
      }
      submit_deposit_confirmation: {
        Args: { _amount: number; _txid: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      kyc_status: "none" | "pending" | "approved" | "rejected"
      listing_status: "active" | "sold" | "paused"
      order_status:
        | "awaiting_payment"
        | "escrow_held"
        | "shipped"
        | "completed"
        | "disputed"
        | "refunded"
        | "cancelled"
      tx_type:
        | "deposit"
        | "withdrawal"
        | "escrow_hold"
        | "escrow_release"
        | "escrow_refund"
        | "fee"
      withdrawal_status: "pending" | "completed" | "rejected"
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
      app_role: ["admin", "moderator", "user"],
      kyc_status: ["none", "pending", "approved", "rejected"],
      listing_status: ["active", "sold", "paused"],
      order_status: [
        "awaiting_payment",
        "escrow_held",
        "shipped",
        "completed",
        "disputed",
        "refunded",
        "cancelled",
      ],
      tx_type: [
        "deposit",
        "withdrawal",
        "escrow_hold",
        "escrow_release",
        "escrow_refund",
        "fee",
      ],
      withdrawal_status: ["pending", "completed", "rejected"],
    },
  },
} as const
