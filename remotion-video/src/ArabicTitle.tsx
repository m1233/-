import React from 'react';
import {Easing, Interactive, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {reemKufi} from './fonts';

type ArabicTitleProps = {
  readonly children: string;
  readonly style?: React.CSSProperties;
};

// Glossy 3D-style Arabic title, animated word by word (remotion-markup/arabic-text.md).
const ArabicTitleInner: React.FC<ArabicTitleProps> = ({children, style}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const words = children.split(' ');
  return (
    <div
      dir="rtl"
      lang="ar"
      style={{
        position: 'absolute',
        top: 110,
        left: 80,
        right: 80,
        textAlign: 'center',
        fontFamily: reemKufi.fontFamily,
        fontWeight: 700,
        fontSize: 104,
        lineHeight: 1.25,
        color: '#ffffff',
        WebkitTextStroke: '3px rgba(255,255,255,0.95)',
        paintOrder: 'stroke fill',
        opacity: interpolate(frame, [durationInFrames - 0.5 * fps, durationInFrames], [1, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        }),
        ...style,
      }}
    >
      {words.map((w, i) => (
        <span
          key={i}
          style={{
            display: 'inline-block',
            margin: '0 14px',
            textShadow:
              '0 2px 0 rgba(255,255,255,0.9), 0 4px 0 rgba(0,0,0,0.22), 0 7px 0 rgba(0,0,0,0.18), 0 14px 26px rgba(0,0,0,0.25), 0 0 36px rgba(255,255,255,0.85)',
            opacity: interpolate(frame, [i * 4, i * 4 + 10], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
            scale: interpolate(frame, [i * 4, i * 4 + 18], [0.4, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
              easing: Easing.spring({damping: 12}),
              output: 'perceptual-scale',
            }),
            translate: interpolate(frame, [i * 4, i * 4 + 18], ['0px 40px', '0px 0px'], {
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
