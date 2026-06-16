import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PushNotificationService {
  private fcmApp: any = null;
  private apnProvider: any = null;
  private fcmInitialized = false;
  private apnInitialized = false;

  constructor(private readonly configService: ConfigService) {
    this.initFcm();
    this.initApn();
  }

  private initFcm() {
    const projectId = this.configService.get('FCM_PROJECT_ID');
    if (!projectId) return;

    try {
      const admin = require('firebase-admin');
      this.fcmApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail: this.configService.get('FCM_CLIENT_EMAIL'),
          privateKey: this.configService.get('FCM_PRIVATE_KEY')?.replace(/\\n/g, '\n'),
        }),
      }, 'cakramerp');
      this.fcmInitialized = true;
    } catch {
      this.fcmInitialized = false;
    }
  }

  private initApn() {
    const keyPath = this.configService.get('APNS_KEY_PATH');
    if (!keyPath) return;

    try {
      const apn = require('apn');
      this.apnProvider = new apn.Provider({
        token: {
          key: keyPath,
          keyId: this.configService.get('APNS_KEY_ID')!,
          teamId: this.configService.get('APNS_TEAM_ID')!,
        },
        production: this.configService.get('APNS_ENVIRONMENT') === 'production',
      });
      this.apnInitialized = true;
    } catch {
      this.apnInitialized = false;
    }
  }

  async sendPush(
    tokens: Array<{ id: string; platform: 'ios' | 'android'; token: string }>,
    payload: {
      title: string;
      body: string;
      data?: Record<string, string>;
      badge?: number;
    },
  ): Promise<{ sent: number; failed: number; errors: string[]; invalidTokenIds: string[] }> {
    let sent = 0;
    let failed = 0;
    const errors: string[] = [];
    const invalidTokenIds: string[] = [];

    const iosTokens = tokens.filter(t => t.platform === 'ios');
    const androidTokens = tokens.filter(t => t.platform === 'android');

    if (this.fcmInitialized && this.fcmApp && androidTokens.length > 0) {
      try {
        const response = await this.fcmApp.messaging().sendEachForMulticast({
          tokens: androidTokens.map(t => t.token),
          notification: { title: payload.title, body: payload.body },
          data: payload.data || {},
          android: { priority: 'high', notification: { channelId: 'default' } },
        });
        sent += response.successCount;
        failed += response.failureCount;

        response.responses.forEach((resp: any, idx: number) => {
          if (!resp.success) {
            const errorCode = resp.error?.code || resp.error?.message;
            if (
              errorCode === 'messaging/registration-token-not-registered' ||
              errorCode === 'messaging/invalid-registration-token'
            ) {
              invalidTokenIds.push(androidTokens[idx].id);
            } else {
              errors.push(`FCM token ${androidTokens[idx].token.substring(0, 8)}...: ${errorCode}`);
            }
          }
        });
      } catch (err: any) {
        failed += androidTokens.length;
        errors.push(`FCM error: ${err?.message}`);
      }
    }

    if (this.apnInitialized && this.apnProvider && iosTokens.length > 0) {
      try {
        const apn = require('apn');
        const note = new apn.Notification();
        note.alert = { title: payload.title, body: payload.body };
        note.badge = payload.badge;
        note.payload = payload.data || {};
        note.topic = this.configService.get('APNS_BUNDLE_ID');

        const response = await this.apnProvider.send(note, iosTokens.map(t => t.token));
        sent += response.sent.length;
        failed += response.failed.length;
        response.failed.forEach((f: any) => {
          if (f.response?.reason === 'BadDeviceToken' || f.response?.reason === 'Unregistered') {
            const idx = iosTokens.findIndex(t => t.token === f.device);
            if (idx >= 0) invalidTokenIds.push(iosTokens[idx].id);
          } else {
            errors.push(`APNs: ${f.response?.reason}`);
          }
        });
      } catch (err: any) {
        failed += iosTokens.length;
        errors.push(`APNs error: ${err?.message}`);
      }
    }

    return { sent, failed, errors, invalidTokenIds };
  }

  isFcmInitialized(): boolean {
    return this.fcmInitialized;
  }

  isApnInitialized(): boolean {
    return this.apnInitialized;
  }
}
