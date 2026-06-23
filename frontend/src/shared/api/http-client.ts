import axios, { type AxiosError } from "axios";

import { API_TIMEOUT_MS } from "@shared/constants/app";
import { env } from "@shared/config/env";
import { ApiError } from "@shared/api/api-error";
import { getErrorMessage } from "@shared/lib/error";

export const httpClient = axios.create({
  baseURL: env.VITE_API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: {
    "Content-Type": "application/json",
  },
});

httpClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const message = getErrorMessage(error);
    const statusCode = error.response?.status;

    return Promise.reject(
      new ApiError(message, {
        statusCode,
        details: error.response?.data,
      }),
    );
  },
);
