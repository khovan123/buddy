import { AppLogger } from '@libs/common';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type ModerationDecision = 'APPROVED' | 'REJECTED' | 'NEEDS_REVIEW' | 'ERROR';

export interface ModerationPayload {
  contentId: string;
  contentType: 'RESOURCE' | 'TUTORIAL';
  title: string;
  body: string;
  hightlights: string[];
  major?: string;
  course?: string;
  extractedText: string;
  mediaUrls?: string[];
  extractionStatus?: string;
  extractionError?: string | null;
}

export interface ModerationResult {
  decision: ModerationDecision;
  score: number | null;
  reasons: string[];
  ruleVersion: string;
}

export interface ModerationCategories {
  adultSexualContent?: boolean;
  pornographicContent?: boolean;
  sexualizationOfMinors?: boolean;
  childSafetyRisk?: boolean;
  nudityOrGraphicSexualContent?: boolean;
  hateOrHarassment?: boolean;
  violentExtremism?: boolean;
  graphicViolence?: boolean;
  selfHarmOrSuicide?: boolean;
  illegalActivity?: boolean;
  drugsWeaponsOrRegulatedGoods?: boolean;
  gamblingOrFinancialScam?: boolean;
  malwarePhishingOrCredentialTheft?: boolean;
  privacyDoxxingOrPersonalData?: boolean;
  copyrightPiracyOrLeakedPaidContent?: boolean;
  academicCheatingOrFraud?: boolean;
  medicalLegalFinancialAdviceRisk?: boolean;
  spamOrLowQuality?: boolean;
  misleadingOrMisinformation?: boolean;
  titleSummaryMismatch?: boolean;
  majorCourseMismatch?: boolean;
  contentCourseMismatch?: boolean;
  languageMismatch?: boolean;
  corruptedOrUnreadableContent?: boolean;
}

interface ProviderResponse {
  decision?: string;
  status?: string;
  score?: number;
  reasons?: string[];
  reason?: string;
  categories?: ModerationCategories;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

@Injectable()
export class ContentModerationService {
  private readonly logger = new AppLogger(ContentModerationService.name);

  constructor(private readonly config: ConfigService) {}

  async moderate(payload: ModerationPayload): Promise<ModerationResult> {
    const ruleVersion = this.config.get<string>('CONTENT_MODERATION_RULE_VERSION', 'v1');
    const enabled = this.config.get<string>('CONTENT_MODERATION_ENABLED', 'true') !== 'false';
    const endpoint = this.config.get<string>('CONTENT_MODERATION_PROVIDER_URL');
    const geminiApiKey = this.config.get<string>('GEMINI_API_KEY');

    if (!enabled) {
      return {
        decision: 'APPROVED',
        score: null,
        reasons: ['Content moderation disabled by configuration.'],
        ruleVersion,
      };
    }

    if (endpoint) {
      return this.moderateWithHttpProvider(endpoint, payload, ruleVersion);
    }

    if (geminiApiKey) {
      return this.moderateWithGemini(geminiApiKey, payload, ruleVersion);
    }

    return {
      decision: 'NEEDS_REVIEW',
      score: null,
      reasons: ['No moderation provider configured.'],
      ruleVersion,
    };
  }

  private async moderateWithHttpProvider(
    endpoint: string,
    payload: ModerationPayload,
    ruleVersion: string,
  ): Promise<ModerationResult> {
    if (!endpoint) {
      return {
        decision: 'NEEDS_REVIEW',
        score: null,
        reasons: ['CONTENT_MODERATION_PROVIDER_URL is not configured.'],
        ruleVersion,
      };
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify({
          ruleVersion,
          rules: this.config.get<string>('CONTENT_MODERATION_RULES', ''),
          content: payload,
        }),
      });

      if (!response.ok) {
        return {
          decision: 'ERROR',
          score: null,
          reasons: [`Moderation provider returned HTTP ${response.status}.`],
          ruleVersion,
        };
      }

      const data = (await response.json()) as ProviderResponse;
      return this.normalizeProviderResponse(data, ruleVersion);
    } catch (error) {
      this.logger.warn(
        `Moderation provider request failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        decision: 'ERROR',
        score: null,
        reasons: [error instanceof Error ? error.message : String(error)],
        ruleVersion,
      };
    }
  }

  private async moderateWithGemini(
    apiKey: string,
    payload: ModerationPayload,
    ruleVersion: string,
  ): Promise<ModerationResult> {
    const model = this.config.get<string>('LLM_MODEL', 'gemini-2.5-flash');
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model,
    )}:generateContent?key=${encodeURIComponent(apiKey)}`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: this.buildGeminiModerationPrompt(payload, ruleVersion) }],
            },
          ],
          generationConfig: {
            temperature: 0,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (!response.ok) {
        return {
          decision: 'ERROR',
          score: null,
          reasons: [`Gemini moderation returned HTTP ${response.status}.`],
          ruleVersion,
        };
      }

      const data = (await response.json()) as GeminiResponse;
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      const parsed = this.parseProviderJson(text);
      return this.normalizeProviderResponse(parsed, ruleVersion);
    } catch (error) {
      this.logger.warn(
        `Gemini moderation request failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        decision: 'ERROR',
        score: null,
        reasons: [error instanceof Error ? error.message : String(error)],
        ruleVersion,
      };
    }
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const apiKey = this.config.get<string>('CONTENT_MODERATION_PROVIDER_API_KEY');
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }
    return headers;
  }

  private normalizeProviderResponse(data: ProviderResponse, ruleVersion: string): ModerationResult {
    const categoryReasons = this.getViolationReasons(data.categories);
    const rawDecision = (data.decision ?? data.status ?? 'NEEDS_REVIEW').toUpperCase();
    const providerDecision: ModerationDecision =
      rawDecision === 'APPROVED' || rawDecision === 'REJECTED' || rawDecision === 'ERROR'
        ? rawDecision
        : 'NEEDS_REVIEW';
    const decision: ModerationDecision =
      categoryReasons.length > 0 && providerDecision === 'APPROVED'
        ? 'REJECTED'
        : providerDecision;
    const providerReasons = Array.isArray(data.reasons)
      ? data.reasons
      : data.reason
        ? [data.reason]
        : [];
    const reasons = [...providerReasons, ...categoryReasons];

    return {
      decision,
      score: typeof data.score === 'number' ? data.score : null,
      reasons: reasons.length > 0 ? reasons : ['No moderation reason returned.'],
      ruleVersion,
    };
  }

  private buildGeminiModerationPrompt(payload: ModerationPayload, ruleVersion: string): string {
    return [
      'You are a content safety moderator for an educational marketplace.',
      'Decide whether uploaded learning content should be published.',
      'Use the title, summary/description, major, course, hightlights (the highlight list), extracted file text/transcript, media URLs, and extraction status as context.',
      'Reject or flag these violation cases:',
      '- Adult or sexually explicit content, pornography, nudity, sexual services, erotic roleplay, fetish content, or 18+ material.',
      '- Any sexualization of minors, child safety risk, grooming, or exploitation. Always REJECT.',
      '- Hate, harassment, bullying, slurs, violent extremism, terrorism, graphic violence, threats, or self-harm encouragement.',
      '- Illegal activity, drugs, weapons, regulated goods, gambling scams, fraud, financial scams, or evasion instructions.',
      '- Malware, phishing, credential theft, account takeover, spam, scams, suspicious links, or privacy/doxxing/personal-data exposure.',
      '- Copyright piracy, leaked paid content, stolen exam answers, academic cheating, plagiarism services, or impersonation.',
      '- Unsafe medical/legal/financial advice when presented as authoritative professional guidance.',
      '- Misinformation, misleading claims, low-quality gibberish, corrupted/unreadable content, or content with no educational value.',
      '- Content that does not match the title, summary/description, selected major, or selected course.',
      '- Major/course mismatch, e.g. course does not belong to the selected major or context is internally inconsistent.',
      '- Language mismatch when title/summary/course imply one language but file content is substantially unrelated or deceptive.',
      'Allow legitimate educational/security content when the course context makes it appropriate.',
      `Rule version: ${ruleVersion}`,
      `Additional rules: ${this.config.get<string>('CONTENT_MODERATION_RULES', '')}`,
      'Return only JSON with this exact shape:',
      '{"decision":"APPROVED|REJECTED|NEEDS_REVIEW","score":0.0,"categories":{"adultSexualContent":false,"pornographicContent":false,"sexualizationOfMinors":false,"childSafetyRisk":false,"nudityOrGraphicSexualContent":false,"hateOrHarassment":false,"violentExtremism":false,"graphicViolence":false,"selfHarmOrSuicide":false,"illegalActivity":false,"drugsWeaponsOrRegulatedGoods":false,"gamblingOrFinancialScam":false,"malwarePhishingOrCredentialTheft":false,"privacyDoxxingOrPersonalData":false,"copyrightPiracyOrLeakedPaidContent":false,"academicCheatingOrFraud":false,"medicalLegalFinancialAdviceRisk":false,"spamOrLowQuality":false,"misleadingOrMisinformation":false,"titleSummaryMismatch":false,"majorCourseMismatch":false,"contentCourseMismatch":false,"languageMismatch":false,"corruptedOrUnreadableContent":false},"reasons":["short reason"]}',
      'Do not echo or wrap the input content.',
      '',
      JSON.stringify(payload),
    ].join('\n');
  }

  private parseProviderJson(text: string): ProviderResponse {
    const trimmed = text.trim();
    const withoutFence = trimmed
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '');

    try {
      const parsed = JSON.parse(withoutFence) as ProviderResponse | ProviderResponse[];
      if (Array.isArray(parsed)) {
        return (
          parsed.find((item) => item.decision || item.status || item.reasons || item.reason) ?? {
            decision: 'NEEDS_REVIEW',
            reasons: ['Moderation provider returned an empty JSON array.'],
          }
        );
      }
      return parsed;
    } catch {
      return {
        decision: 'NEEDS_REVIEW',
        reasons: ['Moderation provider returned non-JSON response.'],
      };
    }
  }

  private getViolationReasons(categories?: ModerationCategories): string[] {
    if (!categories) {
      return [];
    }

    const labels: Record<keyof ModerationCategories, string> = {
      adultSexualContent: 'Adult sexual content detected.',
      pornographicContent: 'Pornographic content detected.',
      sexualizationOfMinors: 'Minor sexualization or child safety risk detected.',
      childSafetyRisk: 'Child safety risk detected.',
      nudityOrGraphicSexualContent: 'Nudity or graphic sexual content detected.',
      hateOrHarassment: 'Hate, harassment, or bullying detected.',
      violentExtremism: 'Violent extremism or terrorism content detected.',
      graphicViolence: 'Graphic violence or threats detected.',
      selfHarmOrSuicide: 'Self-harm or suicide risk content detected.',
      illegalActivity: 'Illegal activity content detected.',
      drugsWeaponsOrRegulatedGoods: 'Drugs, weapons, or regulated goods content detected.',
      gamblingOrFinancialScam: 'Gambling, fraud, or financial scam content detected.',
      malwarePhishingOrCredentialTheft: 'Malware, phishing, or credential theft content detected.',
      privacyDoxxingOrPersonalData: 'Privacy, doxxing, or personal data exposure detected.',
      copyrightPiracyOrLeakedPaidContent: 'Copyright piracy or leaked paid content detected.',
      academicCheatingOrFraud: 'Academic cheating, exam fraud, or plagiarism service detected.',
      medicalLegalFinancialAdviceRisk: 'Unsafe medical, legal, or financial advice risk detected.',
      spamOrLowQuality: 'Spam or low-quality content detected.',
      misleadingOrMisinformation: 'Misleading or misinformation content detected.',
      titleSummaryMismatch: 'Uploaded content does not match title or summary.',
      majorCourseMismatch: 'Selected major and course appear inconsistent.',
      contentCourseMismatch: 'Uploaded content does not match selected major or course.',
      languageMismatch: 'Language mismatch or deceptive language context detected.',
      corruptedOrUnreadableContent: 'Content is corrupted, unreadable, or not extractable enough.',
    };

    return (Object.keys(labels) as Array<keyof ModerationCategories>)
      .filter((key) => categories[key] === true)
      .map((key) => labels[key]);
  }
}
