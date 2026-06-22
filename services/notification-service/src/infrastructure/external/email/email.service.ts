import { AppLogger } from '@libs/common';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as Handlebars from 'handlebars';
import * as nodemailer from 'nodemailer';
import * as path from 'path';

/** Interface representing data constraints for  send email options. */
export interface SendEmailOptions {
  to: string;
  subject: string;
  template: string;
  context: Record<string, unknown>;
}

/** Service handling business logic for  email. */
@Injectable()
export class EmailService implements OnModuleInit {
  private transporter!: nodemailer.Transporter;
  private readonly logger = new AppLogger(EmailService.name);
  private readonly templateCache = new Map<string, HandlebarsTemplateDelegate>();

  constructor(private readonly config: ConfigService) {
    Handlebars.registerHelper('eq', function (a, b) {
      return a === b;
    });
  }

  async onModuleInit(): Promise<void> {
    this.transporter = nodemailer.createTransport({
      host: this.config.get('SMTP_HOST', 'localhost'),
      port: this.config.get<number>('SMTP_PORT', 1025),
      secure: this.config.get('SMTP_SECURE') === 'true',
      auth: this.config.get('SMTP_USER')
        ? {
            user: this.config.get('SMTP_USER'),
            pass: this.config.get('SMTP_PASS'),
          }
        : undefined,
    });

    try {
      await this.transporter.verify();
      this.logger.log('SMTP connection verified');
    } catch (err) {
      this.logger.warn(`SMTP verify failed (non-fatal in dev): ${err}`);
    }
  }

  /**
   * Executes the send operation.
   *
   * @param options - The options parameter
   */
  async send(options: SendEmailOptions): Promise<void> {
    const compiledTemplate = this.getTemplate(options.template);

    const html = compiledTemplate(options.context);

    const from = `"${this.config.get('EMAIL_FROM_NAME', 'UniBuddy MS')}" <${this.config.get('EMAIL_FROM', 'noreply@unibuddy-ms.com')}>`;

    try {
      await this.transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        html,
      });

      this.logger.log(`Email sent to ${options.to} [template: ${options.template}]`);
    } catch (err) {
      this.logger.error(`Failed to send email to ${options.to}`, String(err));
      throw err;
    }
  }

  /**
   * Executes the get template operation.
   *
   * @param templateName - The templateName parameter
   * @returns Result of type HandlebarsTemplateDelegate
   */
  private getTemplate(templateName: string): HandlebarsTemplateDelegate {
    let compiled = this.templateCache.get(templateName);
    if (compiled) return compiled;

    const templateFile = `${templateName}.hbs`;
    const templatePath = [
      path.join(__dirname, 'templates', templateFile),
      path.join(
        __dirname,
        '..',
        '..',
        '..',
        '..',
        'infrastructure',
        'external',
        'email',
        'templates',
        templateFile,
      ),
      path.join(
        process.cwd(),
        'src',
        'infrastructure',
        'external',
        'email',
        'templates',
        templateFile,
      ),
    ].find((candidate) => fs.existsSync(candidate));

    if (!templatePath) {
      this.logger.error(`Email template "${templateName}" not found`);
      throw new Error(`Email template "${templateName}" not found`);
    }

    try {
      const rawTemplate = fs.readFileSync(templatePath, 'utf8');
      compiled = Handlebars.compile(rawTemplate);
      this.templateCache.set(templateName, compiled);
      return compiled;
    } catch (err) {
      this.logger.error(`Error loading email template "${templateName}"`, String(err));
      throw err;
    }
  }
}
