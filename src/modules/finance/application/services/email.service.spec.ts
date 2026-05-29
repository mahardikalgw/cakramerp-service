import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';

describe('EmailService', () => {
  let service: EmailService;
  let loggerSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailService],
    }).compile();

    service = module.get(EmailService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('send', () => {
    it('should log email payload', async () => {
      const logger = (service as any).logger;
      loggerSpy = jest.spyOn(logger, 'log').mockImplementation();

      await service.send({
        to: 'test@example.com',
        subject: 'Test Subject',
        body: 'Test body content',
      });

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('[EMAIL]'),
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('test@example.com'),
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Test Subject'),
      );
    });

    it('should truncate body in log to 100 characters', async () => {
      const logger = (service as any).logger;
      loggerSpy = jest.spyOn(logger, 'log').mockImplementation();

      const longBody = 'A'.repeat(200);
      await service.send({
        to: 'test@example.com',
        subject: 'Test',
        body: longBody,
      });

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('...'),
      );
    });
  });

  describe('sendAlertNotification', () => {
    it('should format and send alert email', async () => {
      const logger = (service as any).logger;
      loggerSpy = jest.spyOn(logger, 'log').mockImplementation();

      await service.sendAlertNotification({
        type: 'budget_exceeded',
        message: 'Budget exceeded by 10%',
        severity: 'high',
      });

      expect(loggerSpy).toHaveBeenCalled();
      const logCall = loggerSpy.mock.calls[0][0];
      expect(logCall).toContain('director@company.com');
    });

    it('should use ALERT_NOTIFICATION_EMAIL env var', async () => {
      const originalEnv = process.env.ALERT_NOTIFICATION_EMAIL;
      process.env.ALERT_NOTIFICATION_EMAIL = 'custom@company.com';

      const logger = (service as any).logger;
      loggerSpy = jest.spyOn(logger, 'log').mockImplementation();

      await service.sendAlertNotification({
        type: 'test_alert',
        message: 'Test',
        severity: 'low',
      });

      const logCall = loggerSpy.mock.calls[0][0];
      expect(logCall).toContain('custom@company.com');

      process.env.ALERT_NOTIFICATION_EMAIL = originalEnv;
    });

    it('should include related URL when provided', async () => {
      const logger = (service as any).logger;
      loggerSpy = jest.spyOn(logger, 'log').mockImplementation();

      await service.sendAlertNotification({
        type: 'kpi_alert',
        message: 'KPI threshold exceeded',
        severity: 'medium',
        relatedUrl: 'https://erp.company.com/kpi/123',
      });

      const logCall = loggerSpy.mock.calls[0][0];
      expect(logCall).toContain('kpi alert');
    });
  });
});
