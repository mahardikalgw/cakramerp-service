export const MY_PROFILE_SERVICE = Symbol('MY_PROFILE_SERVICE');

export interface MyProfileServicePort {
  getProfile(employeeId: string): Promise<any>;
  updateProfile(employeeId: string, data: any): Promise<any>;
  createChangeRequest(
    employeeId: string,
    data: {
      fieldName: string;
      oldValue: string;
      newValue: string;
      reason: string;
    },
  ): Promise<any>;
  getDocuments(employeeId: string): Promise<any[]>;
  getDocumentDownloadUrl(
    employeeId: string,
    documentId: string,
  ): Promise<string>;
}
