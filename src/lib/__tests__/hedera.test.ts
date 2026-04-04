import { describe, it, expect, vi, beforeEach } from 'vitest';
import { queryAuditTrail } from '../hedera';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('queryAuditTrail', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('parses base64 messages from Mirror Node response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        messages: [
          {
            sequence_number: 1,
            message: btoa('{"type":"payment","amount":"0.01"}'),
            consensus_timestamp: '1711900000.000000000',
            topic_id: '0.0.12345',
          },
        ],
      }),
    });

    const messages = await queryAuditTrail('0.0.12345', 10);
    expect(messages).toHaveLength(1);
    expect(messages[0].sequenceNumber).toBe(1);
    expect(messages[0].contents).toBe('{"type":"payment","amount":"0.01"}');
    expect(messages[0].topicId).toBe('0.0.12345');
  });

  it('throws on non-OK response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    await expect(queryAuditTrail('0.0.99999')).rejects.toThrow('Mirror Node query failed');
  });

  it('returns empty array for topic with no messages', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ messages: [] }),
    });

    const messages = await queryAuditTrail('0.0.12345');
    expect(messages).toHaveLength(0);
  });

  it('respects limit parameter in URL', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ messages: [] }),
    });

    await queryAuditTrail('0.0.12345', 5);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('limit=5'),
      expect.any(Object),
    );
  });
});
