export interface EmailDeliveryLogRepositoryPort {
  save(log: {
    notificationId?: string;
    recipientEmail: string;
    subject: string;
    provider: string;
    providerMessageId?: string | null;
    status: string;
    errorMessage?: string | null;
  }): Promise<void>;
}

export const EMAIL_DELIVERY_LOG_REPOSITORY = Symbol('EMAIL_DELIVERY_LOG_REPOSITORY');
