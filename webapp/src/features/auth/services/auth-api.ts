import type { OtpPurpose, RegisterResponse } from "@/features/auth/type"
import type { ApiResponse } from "@/types/api"

import { baseApi } from "../../../lib/redux/base-api"

export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    register: build.mutation<
      ApiResponse<RegisterResponse>,
      { email: string; password: string; nickname: string }
    >({
      query: (body) => ({
        url: "/v1/auth/register",
        method: "POST",
        body,
      }),
    }),

    resendOtp: build.mutation<
      ApiResponse<{ message: string }>,
      { email: string; purpose?: OtpPurpose }
    >({
      query: (body) => ({
        url: "/v1/auth/resend-otp",
        method: "POST",
        body,
      }),
    }),
  }),
})

export const { useRegisterMutation, useResendOtpMutation } = authApi
