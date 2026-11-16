import React from 'react';
import {Easing, Interactive, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {cairo, reemKufi} from './fonts';

type ArabicTitleProps = {
  readonly children: string;
  readonly style?: React.CSSProperties;
};

// Clean island title card: a small kicker ("الجزيرة الأولى") above the island's
// treasure name in its theme colour. Words animate in one by one (arabic-text.md).
const ArabicTitleInner: React.FC<ArabicTitleProps> = ({children, style}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const [kicker, main] = children.includes(':') ? children.split(':').map((x) => x.trim()) : ['', children];
  const accent = (style?.color as string) ?? '#3d8bfd';
  const words = main.split(' ');

  return (
    <div
      dir="rtl"
      lang="ar"
      style={{
        position: 'absolute',
        top: 64,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        opacity: interpolate(frame, [0, 0.35 * fps, durationInFrames - 0.5 * fps, durationInFrames], [0, 1, 1, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        }),
        translate: interpolate(frame, [durationInFrames - 0.5 * fps, durationInFrames], ['0px 0px', '0px -30px'], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.bezier(0.7, 0, 0.84, 0),
        }),
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
          padding: '22px 64px 28px',
          borderRadius: 40,
          backgroundColor: 'rgba(255,255,255,0.86)',
          boxShadow: '0 20px 60px rgba(30,40,80,0.18), inset 0 0 0 2px rgba(255,255,255,0.9)',
          scale: interpolate(frame, [0, 0.6 * fps], [0.85, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.spring({damping: 14}),
            output: 'perceptual-scale',
          }),
        }}
      >
        {kicker ? (
          <div style={{fontFamily: cairo.fontFamily, fontWeight: 800, fontSize: 44, color: '#5b6478', lineHeight: 1.2}}>{kicker}</div>
        ) : null}
        <div style={{width: 120, height: 7, borderRadius: 4, backgroundColor: accent, opacity: 0.85}} />
        <div style={{fontFamily: reemKufi.fontFamily, fontWeight: 700, fontSize: 92, color: accent, lineHeight: 1.25, whiteSpace: 'nowrap'}}>
          {words.map((w, i) => (
            <span
              key={i}
              style={{
                display: 'inline-block',
                margin: '0 12px',
                opacity: interpolate(frame, [6 + i * 4, 16 + i * 4], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
                translate: interpolate(frame, [6 + i * 4, 22 + i * 4], ['0px 26px', '0px 0px'], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                  easing: Easing.bezier(0.16, 1, 0.3, 1),
                }),
              }}
            >
              {w}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export const ArabicTitle = Interactive.create({
  Component: ArabicTitleInner,
  layout: 'none',
  schema: {
    ...Interactive.textSchema,
    children: {type: 'string', default: '', description: 'Title text', hiddenFromList: false},
  },
});
