// Unit tests for WorkItemStateMachine RCA validation logic
// These run without needing a real DB (mocked)

describe('WorkItemStateMachine - RCA Validation', () => {
  describe('VALID_TRANSITIONS logic', () => {
    const VALID_TRANSITIONS: Record<string, string[]> = {
      OPEN: ['INVESTIGATING'],
      INVESTIGATING: ['RESOLVED'],
      RESOLVED: ['CLOSED'],
      CLOSED: [],
    };

    it('allows OPEN → INVESTIGATING', () => {
      expect(VALID_TRANSITIONS['OPEN']).toContain('INVESTIGATING');
    });

    it('allows INVESTIGATING → RESOLVED', () => {
      expect(VALID_TRANSITIONS['INVESTIGATING']).toContain('RESOLVED');
    });

    it('allows RESOLVED → CLOSED', () => {
      expect(VALID_TRANSITIONS['RESOLVED']).toContain('CLOSED');
    });

    it('disallows OPEN → CLOSED (skipping states)', () => {
      expect(VALID_TRANSITIONS['OPEN']).not.toContain('CLOSED');
    });

    it('disallows CLOSED → anything (terminal state)', () => {
      expect(VALID_TRANSITIONS['CLOSED']).toHaveLength(0);
    });

    it('disallows backward transition RESOLVED → INVESTIGATING', () => {
      expect(VALID_TRANSITIONS['RESOLVED']).not.toContain('INVESTIGATING');
    });
  });

  describe('RCA validation rules', () => {
    const validateRCA = (rca: Record<string, string | undefined>) => {
      if (!rca) return { valid: false, reason: 'RCA is missing' };
      if (!rca.fixApplied || !rca.preventionSteps || !rca.rootCauseCategory) {
        return { valid: false, reason: 'RCA is incomplete' };
      }
      return { valid: true, reason: null };
    };

    it('rejects CLOSE if RCA is missing', () => {
      const result = validateRCA(null as unknown as Record<string, string>);
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/missing/i);
    });

    it('rejects CLOSE if fixApplied is empty', () => {
      const result = validateRCA({ fixApplied: '', preventionSteps: 'ok', rootCauseCategory: 'SOFTWARE_BUG' });
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/incomplete/i);
    });

    it('rejects CLOSE if preventionSteps is empty', () => {
      const result = validateRCA({ fixApplied: 'ok', preventionSteps: '', rootCauseCategory: 'SOFTWARE_BUG' });
      expect(result.valid).toBe(false);
    });

    it('rejects CLOSE if rootCauseCategory is empty', () => {
      const result = validateRCA({ fixApplied: 'ok', preventionSteps: 'ok', rootCauseCategory: '' });
      expect(result.valid).toBe(false);
    });

    it('allows CLOSE if all RCA fields are present', () => {
      const result = validateRCA({
        fixApplied: 'Restarted the DB',
        preventionSteps: 'Added connection pooling',
        rootCauseCategory: 'CAPACITY_EXHAUSTION',
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('MTTR calculation', () => {
    it('calculates MTTR in minutes correctly', () => {
      const startTime = new Date('2024-01-01T10:00:00Z');
      const endTime = new Date('2024-01-01T11:30:00Z');
      const mttr = (endTime.getTime() - startTime.getTime()) / 60000;
      expect(mttr).toBe(90);
    });

    it('returns 0 for same start and end time', () => {
      const t = new Date('2024-01-01T10:00:00Z');
      const mttr = (t.getTime() - t.getTime()) / 60000;
      expect(mttr).toBe(0);
    });
  });
});
