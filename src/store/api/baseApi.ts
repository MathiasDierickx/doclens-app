import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

// Base API configuration for DocLens
export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:7071/api",
  }),
  endpoints: () => ({}),
  tagTypes: ["Document", "Health"],
});
