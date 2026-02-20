// ---------------------------------------------------------------------------
// Tests for ViewShotCapture
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ShakeNbakeError } from '@shakenbake/core';

// Mock react-native-view-shot
const mockCaptureRef = vi.fn().mockResolvedValue('base64-image-data');

vi.mock('react-native-view-shot', () => ({
  captureRef: mockCaptureRef,
}));

// Mock react-native
vi.mock('react-native', () => ({
  Dimensions: {
    get: vi.fn(() => ({
      width: 390,
      height: 844,
      scale: 3,
      fontScale: 1,
    })),
  },
  PixelRatio: {
    get: vi.fn(() => 3),
    getFontScale: vi.fn(() => 1),
  },
  Platform: {
    OS: 'ios',
    Version: '17.0',
  },
  AccessibilityInfo: {
    isScreenReaderEnabled: vi.fn().mockResolvedValue(false),
    isReduceMotionEnabled: vi.fn().mockResolvedValue(false),
  },
}));

import { ViewShotCapture } from '../capture/screenshot.js';

describe('ViewShotCapture', () => {
  let capture: ViewShotCapture;
  const mockRef = { current: {} };

  beforeEach(() => {
    capture = new ViewShotCapture();
    vi.clearAllMocks();
    mockCaptureRef.mockResolvedValue('base64-image-data');
  });

  it('has correct name and platform', () => {
    expect(capture.name).toBe('viewshot');
    expect(capture.platform).toBe('react-native');
  });

  it('captures a screenshot with correct options', async () => {
    capture.setRef(mockRef);
    const result = await capture.capture();

    expect(mockCaptureRef).toHaveBeenCalledWith(mockRef, {
      format: 'png',
      quality: 1,
      result: 'base64',
    });
    expect(result).toEqual({
      imageData: 'base64-image-data',
      dimensions: { width: 390, height: 844 },
      mimeType: 'image/png',
    });
  });

  it('throws ShakeNbakeError when no ref is set', async () => {
    await expect(capture.capture()).rejects.toThrow(ShakeNbakeError);
    await expect(capture.capture()).rejects.toThrow(
      'No view ref set',
    );
  });

  it('throws ShakeNbakeError when captureRef fails', async () => {
    capture.setRef(mockRef);
    mockCaptureRef.mockRejectedValue(new Error('Capture failed'));

    await expect(capture.capture()).rejects.toThrow(ShakeNbakeError);
    await expect(capture.capture()).rejects.toThrow(
      'Screenshot capture failed',
    );
  });

  it('accepts a ref in the constructor', async () => {
    const captureWithRef = new ViewShotCapture(mockRef);
    const result = await captureWithRef.capture();

    expect(mockCaptureRef).toHaveBeenCalledWith(mockRef, {
      format: 'png',
      quality: 1,
      result: 'base64',
    });
    expect(result.imageData).toBe('base64-image-data');
  });

  it('returns the correct UPLOAD_FAILED error code', async () => {
    try {
      await capture.capture();
    } catch (err) {
      expect(err).toBeInstanceOf(ShakeNbakeError);
      expect((err as ShakeNbakeError).code).toBe('UPLOAD_FAILED');
    }
  });
});
