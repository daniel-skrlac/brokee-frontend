export interface ServiceResponse<T> {
  success: boolean;
  message: string;
  statusCode: number;
  data: T;
}
