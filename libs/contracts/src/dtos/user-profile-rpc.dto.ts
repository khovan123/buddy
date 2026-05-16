/** Shared DTO for user profile data returned via RPC between services. */
export interface UserProfileRpcResponseDto {
  id: string;
  nickname: string;
  email: string;
  phone?: string;
  bio?: string;
  avatarUrl?: string;
  dateOfBirth?: Date;
  majorId?: string;
  semester?: number;
  career?: { id: string; name: string };
  skills?: { id: string; name: string }[];
}
