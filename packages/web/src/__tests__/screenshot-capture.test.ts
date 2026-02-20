import { describe, it, expect, vi, afterEach } from 'vitest';
import { ShakeNbakeError } from '@shakenbake/core';
import { Html2CanvasCapture } from '../capture/screenshot.js';

// Mock html2canvas-pro at the module level.
vi.mock('html2canvas-pro', () => {
  return {
    default: vi.fn(),
  };
});

// We need to import the mocked module after vi.mock.
import html2canvas from 'html2canvas-pro';

const mockHtml2canvas = vi.mocked(html2canvas);

describe('Html2CanvasCapture', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('has correct name and platform', () => {
    const capture = new Html2CanvasCapture();
    expect(capture.name).toBe('html2canvas');
    expect(capture.platform).toBe('web');
  });

  it('capture returns a valid CaptureResult', async () => {
    const fakeCanvas = {
      width: 800,
      height: 600,
      toDataURL: vi.fn().mockReturnValue('data:image/png;base64,abc123'),
    } as unknown as HTMLCanvasElement;

    mockHtml2canvas.mockResolvedValueOnce(fakeCanvas);

    const capture = new Html2CanvasCapture();
    const result = await capture.capture();

    expect(result).toEqual({
      imageData: 'data:image/png;base64,abc123',
      dimensions: { width: 800, height: 600 },
      mimeType: 'image/png',
    });
  });

  it('calls html2canvas with document.body by default', async () => {
    const fakeCanvas = {
      width: 100,
      height: 100,
      toDataURL: vi.fn().mockReturnValue('data:image/png;base64,x'),
    } as unknown as HTMLCanvasElement;

    mockHtml2canvas.mockResolvedValueOnce(fakeCanvas);

    const capture = new Html2CanvasCapture();
    await capture.capture();

    expect(mockHtml2canvas).toHaveBeenCalledWith(
      document.body,
      expect.objectContaining({
        useCORS: true,
        logging: false,
      }),
    );
  });

  it('calls html2canvas with a custom target element', async () => {
    const fakeCanvas = {
      width: 200,
      height: 150,
      toDataURL: vi.fn().mockReturnValue('data:image/png;base64,x'),
    } as unknown as HTMLCanvasElement;

    mockHtml2canvas.mockResolvedValueOnce(fakeCanvas);

    const target = document.createElement('div');
    const capture = new Html2CanvasCapture({ target });
    await capture.capture();

    expect(mockHtml2canvas).toHaveBeenCalledWith(
      target,
      expect.anything(),
    );
  });

  it('passes scale option to html2canvas', async () => {
    const fakeCanvas = {
      width: 200,
      height: 150,
      toDataURL: vi.fn().mockReturnValue('data:image/png;base64,x'),
    } as unknown as HTMLCanvasElement;

    mockHtml2canvas.mockResolvedValueOnce(fakeCanvas);

    const capture = new Html2CanvasCapture({ scale: 2 });
    await capture.capture();

    expect(mockHtml2canvas).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ scale: 2 }),
    );
  });

  it('throws ShakeNbakeError when html2canvas fails', async () => {
    mockHtml2canvas.mockRejectedValueOnce(new Error('Canvas rendering failed'));

    const capture = new Html2CanvasCapture();

    try {
      await capture.capture();
      expect.unreachable('Should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ShakeNbakeError);
      expect((e as ShakeNbakeError).code).toBe('UNKNOWN');
      expect((e as ShakeNbakeError).originalError).toBeInstanceOf(Error);
    }
  });

  it('calls toDataURL with image/png', async () => {
    const toDataURL = vi.fn().mockReturnValue('data:image/png;base64,x');
    const fakeCanvas = {
      width: 100,
      height: 100,
      toDataURL,
    } as unknown as HTMLCanvasElement;

    mockHtml2canvas.mockResolvedValueOnce(fakeCanvas);

    const capture = new Html2CanvasCapture();
    await capture.capture();

    expect(toDataURL).toHaveBeenCalledWith('image/png');
  });
});
