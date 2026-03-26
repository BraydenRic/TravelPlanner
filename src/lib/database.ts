import type {
  Profile,
  City,
  VisitedPlace,
  PlaceRating,
  Group,
  GroupMember,
  GroupPlace,
  PlacePhoto,
  Achievement,
  PushToken,
  PlaceCategory,
  RatingCategory,
  MemberColor,
  BadgeType,
} from '@typedefs/database'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<Omit<Profile, 'id'>>
        Relationships: []
      }
      cities: {
        Row: City
        Insert: Record<string, never> // READ-ONLY
        Update: Record<string, never> // READ-ONLY
        Relationships: []
      }
      visited_places: {
        Row: VisitedPlace
        Insert: Omit<VisitedPlace, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<VisitedPlace, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
        Relationships: []
      }
      place_ratings: {
        Row: PlaceRating
        Insert: Omit<PlaceRating, 'id' | 'created_at'>
        Update: Pick<PlaceRating, 'score'>
        Relationships: []
      }
      groups: {
        Row: Group
        Insert: Omit<Group, 'id' | 'created_at'>
        Update: Partial<Pick<Group, 'name' | 'invite_code' | 'invite_expires_at' | 'color_scheme' | 'created_by'>>
        Relationships: []
      }
      group_members: {
        Row: GroupMember
        Insert: Omit<GroupMember, 'id' | 'joined_at'>
        Update: Record<string, never>
        Relationships: []
      }
      group_places: {
        Row: GroupPlace
        Insert: Omit<GroupPlace, 'id' | 'created_at'>
        Update: Record<string, never>
        Relationships: []
      }
      place_photos: {
        Row: PlacePhoto
        Insert: Omit<PlacePhoto, 'id' | 'created_at'>
        Update: Partial<Pick<PlacePhoto, 'caption' | 'sort_order'>>
        Relationships: []
      }
      achievements: {
        Row: Achievement
        Insert: Record<string, never> // Written by DB functions only
        Update: Record<string, never>
        Relationships: []
      }
      push_tokens: {
        Row: PushToken
        Insert: Omit<PushToken, 'id' | 'created_at'>
        Update: Partial<Pick<PushToken, 'expo_push_token' | 'device_type' | 'enabled'>>
        Relationships: []
      }
    }
    Views: Record<never, never>
    Functions: {
      compute_country_ratings: {
        Args: { p_country_code: string; p_user_id: string }
        Returns: {
          overall_score: number
          categories: Record<RatingCategory, number>
          cities_rated: number
          total_cities: number
        }
      }
      compute_group_country_ratings: {
        Args: { p_group_id: string; p_country_code: string }
        Returns: {
          group_average: Record<RatingCategory, number>
          group_overall: number
          member_ratings: {
            user_id: string
            color: MemberColor
            categories: Record<RatingCategory, number>
            overall: number
          }[]
        }
      }
      get_country_city_status: {
        Args: { p_country_code: string; p_user_id: string }
        Returns: {
          city_id: string
          name: string
          latitude: number
          longitude: number
          is_capital: boolean
          population_rank: number
          is_visited: boolean
          category: PlaceCategory | null
          overall_score: number | null
          visited_place_id: string | null
        }[]
      }
      get_country_fill_intensity: {
        Args: { p_user_id: string }
        Returns: {
          country_code: string
          cities_visited: number
          total_cities: number
          fill_ratio: number
        }[]
      }
      check_achievements: {
        Args: { p_user_id: string }
        Returns: { badge_type: BadgeType; newly_unlocked: boolean }[]
      }
      get_travel_stats: {
        Args: { p_user_id: string }
        Returns: {
          countries_visited: number
          cities_visited: number
          countries_want: number
          countries_lived: number
          continents_visited: string[]
          world_percentage: number
          average_global_rating: number
        }
      }
      get_group_map_data: {
        Args: { p_group_id: string }
        Returns: {
          user_id: string
          color: MemberColor
          country_code: string
          city_id: string | null
          category: PlaceCategory
        }[]
      }
      account_delete: {
        Args: { p_user_id: string }
        Returns: void
      }
      export_user_data: {
        Args: { p_user_id: string }
        Returns: Record<string, unknown>
      }
    }
  }
}
