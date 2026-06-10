import { describe, expect, it } from 'vitest';
import { getModel, loadModels } from '../src/core/assets.js';

describe('asset fallback proof controls', () => {
  it('proves all-null model config is accepted and missing models fall back to primitives', async () => {
    await expect(loadModels({ player: null, boss: null })).resolves.toBeUndefined();
    expect(getModel('player')).toBeNull();
    expect(getModel('boss')).toBeNull();
  });
});
