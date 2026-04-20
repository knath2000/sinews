import { describe, it, expect } from 'vitest';
import {
  normalizeFeedPayload,
  type ReplacementOutcomeReason,
} from '../app/(app)/feed/feed-response';

describe('replacementNotice feed response', () => {
  it('should accept a valid replacementNotice on a feed article', () => {
    const payload = {
      generatedAt: '2026-04-19T12:00:00Z',
      articles: [
        {
          id: 1,
          title: 'Test',
          source_name: 'Source',
          canonical_url: 'https://example.com',
          image_url: null,
          published_at: null,
          summary: 'Summary',
          tldr: 'TL;DR',
          why_recommended: 'Why',
          matched_signals: null,
          provenance: null,
          rank: 1,
          score: 0.5,
          brief_item_id: 1,
          replacementNotice: { reason: 'no_current_day_candidates', message: 'No articles available.' },
        },
      ],
    };

    const result = normalizeFeedPayload(payload);
    expect(result).not.toBeNull();
    expect(result!.articles[0].replacementNotice).toEqual({
      reason: 'no_current_day_candidates',
      message: 'No articles available.',
    });
  });

  it('should accept undefined replacementNotice', () => {
    const payload = {
      generatedAt: '2026-04-19T12:00:00Z',
      articles: [
        {
          id: 1,
          title: 'Test',
          source_name: 'Source',
          canonical_url: 'https://example.com',
          image_url: null,
          published_at: null,
          summary: 'Summary',
          tldr: 'TL;DR',
          why_recommended: 'Why',
          matched_signals: null,
          provenance: null,
          rank: 1,
          score: 0.5,
          brief_item_id: 1,
        },
      ],
    };

    const result = normalizeFeedPayload(payload);
    expect(result).not.toBeNull();
    expect(result!.articles[0].replacementNotice).toBeUndefined();
  });

  it('should drop an invalid reason code silently (article passes, notice is undefined)', () => {
    const payload = {
      generatedAt: '2026-04-19T12:00:00Z',
      articles: [
        {
          id: 1,
          title: 'Test',
          source_name: 'Source',
          canonical_url: 'https://example.com',
          image_url: null,
          published_at: null,
          summary: 'Summary',
          tldr: 'TL;DR',
          why_recommended: 'Why',
          matched_signals: null,
          provenance: null,
          rank: 1,
          score: 0.5,
          brief_item_id: 1,
          replacementNotice: { reason: 'invalid_reason', message: 'Bad' },
        },
      ],
    };

    const result = normalizeFeedPayload(payload);
    // Article passes but replacementNotice is stripped
    expect(result).not.toBeNull();
    expect(result!.articles[0].replacementNotice).toBeUndefined();
  });
});

describe('Type exports for ReplacementOutcomeReason', () => {
  it('compiles with reason code string', () => {
    const reason: ReplacementOutcomeReason = 'no_current_day_candidates';
    expect(reason).toBe('no_current_day_candidates');
  });

  it('compiles with race_lost_retry_exhausted', () => {
    const reason: ReplacementOutcomeReason = 'race_lost_retry_exhausted';
    expect(reason).toBe('race_lost_retry_exhausted');
  });
});
