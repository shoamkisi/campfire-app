import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ReferencePitch } from './ReferencePitch';
import { Tuner } from './Tuner';

describe('reference pitch control', () => {
  it('shows A = Hz on the tuner, closed, ready to tap', () => {
    const html = renderToStaticMarkup(createElement(Tuner, { preview: 'idle' }));
    expect(html).toContain('A = 440 Hz');
    expect(html).toContain('reference-toggle');
    expect(html).toContain('listen');
    expect(html).not.toContain('reference-choice');
  });

  it('opens 432, 440, and 442 plus one-hertz steps', () => {
    const html = renderToStaticMarkup(
      createElement(ReferencePitch, { hz: 440, onChange: () => {}, startOpen: true }),
    );
    expect(html).toContain('A = 440 Hz');
    expect(html).toContain('>432<');
    expect(html).toContain('>440<');
    expect(html).toContain('>442<');
    expect(html).toContain('Lower by 1 hertz');
    expect(html).toContain('Raise by 1 hertz');
    expect(html).toContain('aria-pressed="true"');
  });
});
