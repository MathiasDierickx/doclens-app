import { baseApi as api } from "./baseApi";
export const addTagTypes = ["Documents", "System"] as const;
const injectedRtkApi = api
  .enhanceEndpoints({
    addTagTypes,
  })
  .injectEndpoints({
    endpoints: (build) => ({
      getUploadUrl: build.mutation<GetUploadUrlApiResponse, GetUploadUrlApiArg>(
        {
          query: (queryArg) => ({
            url: `/documents/upload-url`,
            method: "POST",
            params: {
              filename: queryArg.filename,
            },
          }),
          invalidatesTags: ["Documents"],
        },
      ),
      listDocuments: build.query<ListDocumentsApiResponse, ListDocumentsApiArg>(
        {
          query: () => ({ url: `/documents` }),
          providesTags: ["Documents"],
        },
      ),
      getDocument: build.query<GetDocumentApiResponse, GetDocumentApiArg>({
        query: (queryArg) => ({ url: `/documents/${queryArg.documentId}` }),
        providesTags: ["Documents"],
      }),
      deleteDocument: build.mutation<
        DeleteDocumentApiResponse,
        DeleteDocumentApiArg
      >({
        query: (queryArg) => ({
          url: `/documents/${queryArg.documentId}`,
          method: "DELETE",
        }),
        invalidatesTags: ["Documents"],
      }),
      getHealth: build.query<GetHealthApiResponse, GetHealthApiArg>({
        query: () => ({ url: `/health` }),
        providesTags: ["System"],
      }),
      sayHello: build.query<SayHelloApiResponse, SayHelloApiArg>({
        query: (queryArg) => ({
          url: `/hello`,
          params: {
            name: queryArg.name,
          },
        }),
        providesTags: ["System"],
      }),
    }),
    overrideExisting: false,
  });
export { injectedRtkApi as api };
export type GetUploadUrlApiResponse =
  /** status 200 Upload URL and document metadata */ UploadUrlResponse;
export type GetUploadUrlApiArg = {
  /** Filename of the PDF to upload (must end with .pdf) */
  filename: string;
};
export type ListDocumentsApiResponse =
  /** status 200 List of documents */ DocumentListResponse;
export type ListDocumentsApiArg = void;
export type GetDocumentApiResponse =
  /** status 200 Document details */ DocumentInfo;
export type GetDocumentApiArg = {
  /** Document ID */
  documentId: string;
};
export type DeleteDocumentApiResponse =
  /** status 200 Deletion confirmation */ DeleteDocumentResponse;
export type DeleteDocumentApiArg = {
  /** Document ID */
  documentId: string;
};
export type GetHealthApiResponse =
  /** status 200 Health status */ HealthResponse;
export type GetHealthApiArg = void;
export type SayHelloApiResponse =
  /** status 200 Greeting message */ HelloResponse;
export type SayHelloApiArg = {
  /** Name to greet */
  name?: string;
};
export type UploadUrlResponse = {
  documentId?: string;
  uploadUrl?: string;
  blobName?: string;
  expiresAt?: string;
};
export type ErrorResponse = {
  error?: string;
};
export type DocumentInfo = {
  documentId?: string;
  filename?: string;
  size?: number | null;
  uploadedAt?: string | null;
};
export type DocumentListResponse = {
  documents?: DocumentInfo[];
};
export type DeleteDocumentResponse = {
  message?: string;
  documentId?: string;
};
export type HealthResponse = {
  status?: string;
  timestamp?: string;
  version?: string;
};
export type HelloResponse = {
  message?: string;
  timestamp?: string;
};
export const {
  useGetUploadUrlMutation,
  useListDocumentsQuery,
  useGetDocumentQuery,
  useDeleteDocumentMutation,
  useGetHealthQuery,
  useSayHelloQuery,
} = injectedRtkApi;
