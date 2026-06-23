import axios from "axios";

import { isRecord } from "@shared/lib/guard";

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data;

    if (isRecord(responseData)) {
      const message = responseData.message;
      const detail = responseData.error;

      if (typeof message === "string" && message.length > 0) {
        return message;
      }

      if (typeof detail === "string" && detail.length > 0) {
        return detail;
      }
    }

    return error.message || "Request failed";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred";
}
