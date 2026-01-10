import { baseApi as api } from "./baseApi";
export const addTagTypes = ["Documents", "Chat", "System"] as const;
const injectedRtkApi = api
  .enhanceEndpoints({
    addTagTypes,
  })
  .injectEndpoints({
    endpoints: (build) => ({
      askQuestion: build.mutation<AskQuestionApiResponse, AskQuestionApiArg>({
        query: (queryArg) => ({
          url: `/documents/${queryArg.documentId}/ask`,
          method: "POST",
          body: queryArg.askRequest,
        }),
        invalidatesTags: ["Documents"],
      }),
      getChatSessions: build.query<
        GetChatSessionsApiResponse,
        GetChatSessionsApiArg
      >({
        query: (queryArg) => ({
          url: `/documents/${queryArg.documentId}/chat-sessions`,
        }),
        providesTags: ["Chat"],
      }),
      getChatHistory: build.query<
        GetChatHistoryApiResponse,
        GetChatHistoryApiArg
      >({
        query: (queryArg) => ({ url: `/chat-sessions/${queryArg.sessionId}` }),
        providesTags: ["Chat"],
      }),
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
      getDownloadUrl: build.query<
        GetDownloadUrlApiResponse,
        GetDownloadUrlApiArg
      >({
        query: (queryArg) => ({
          url: `/documents/${queryArg.documentId}/download-url`,
        }),
        providesTags: ["Documents"],
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
      getIndexingStatus: build.query<
        GetIndexingStatusApiResponse,
        GetIndexingStatusApiArg
      >({
        query: (queryArg) => ({
          url: `/documents/${queryArg.documentId}/status`,
        }),
        providesTags: ["Documents"],
      }),
    }),
    overrideExisting: false,
  });
export { injectedRtkApi as api };
export type AskQuestionApiResponse = unknown;
export type AskQuestionApiArg = {
  documentId: string;
  askRequest: AskRequest;
};
export type GetChatSessionsApiResponse =
  /** status 200 List of chat sessions */ ChatSessionsResponse;
export type GetChatSessionsApiArg = {
  /** Document ID */
  documentId: string;
};
export type GetChatHistoryApiResponse =
  /** status 200 Chat history */ ChatHistoryResponse;
export type GetChatHistoryApiArg = {
  /** Session ID */
  sessionId: string;
};
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
export type GetDownloadUrlApiResponse =
  /** status 200 Download URL and document metadata */ DownloadUrlResponse;
export type GetDownloadUrlApiArg = {
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
export type GetIndexingStatusApiResponse = unknown;
export type GetIndexingStatusApiArg = {
  documentId: string;
};
export type AskRequest = {
  question?: string;
  sessionId?: string;
};
export type ChatSessionSummary = {
  sessionId?: string;
  documentId?: string;
  messageCount?: number;
  createdAt?: string;
  updatedAt?: string;
};
export type ChatSessionsResponse = {
  sessions?: ChatSessionSummary[];
};
export type BoundingBox = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};
export type TextPosition = {
  pageNumber?: number;
  boundingBox?: BoundingBox;
  charOffset?: number;
  charLength?: number;
  pageWidth?: number | null;
  pageHeight?: number | null;
};
export type SourceReference = {
  page?: number;
  text?: string;
  positions?: TextPosition[];
};
export type ChatMessageDto = {
  role?: string;
  content?: string;
  timestamp?: string;
  sources?: SourceReference[];
};
export type ChatHistoryResponse = {
  sessionId?: string;
  documentId?: string;
  messages?: ChatMessageDto[];
};
export type ErrorResponse = {
  error?: string;
};
export type UploadUrlResponse = {
  documentId?: string;
  uploadUrl?: string;
  blobName?: string;
  expiresAt?: string;
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
export type DownloadUrlResponse = {
  documentId?: string;
  downloadUrl?: string;
  filename?: string;
  expiresAt?: string;
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
  useAskQuestionMutation,
  useGetChatSessionsQuery,
  useGetChatHistoryQuery,
  useGetUploadUrlMutation,
  useListDocumentsQuery,
  useGetDocumentQuery,
  useDeleteDocumentMutation,
  useGetDownloadUrlQuery,
  useGetHealthQuery,
  useSayHelloQuery,
  useGetIndexingStatusQuery,
} = injectedRtkApi;
