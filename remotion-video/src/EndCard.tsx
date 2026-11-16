import React from 'react';
import {Easing, Interactive, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {cairo, reemKufi} from './fonts';

type EndCardProps = {
  readonly role: string;
  readonly teacher: string;
  readonly style?: React.CSSProperties;
};

// Closing credit card (no voice, music tail only).
const EndCardInner: React.FC<EndCardProps> = ({role, teacher, style}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <div
      dir="rtl"
      lang="ar"
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 18,
        background: 'radial-gradient(ellipse at center, #ffffff 0%, #f6f0ff 55%, #e9e1ff 100%)',
        ...style,
      }}
    >
      <div
        style={{
          fontFamily: cairo.fontFamily,
          fontWeight: 800,
          fontSize: 60,
          color: '#6b6f86',
          opacity: interpolate(frame, [0.2 * fps, 0.9 * fps], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
          translate: interpolate(frame, [0.2 * fps, 1.1 * fps], ['0px 24px', '0px 0px'], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        {role}
      </div>
      <div style={{width: 160, height: 8, borderRadius: 4, backgroundColor: '#8e6cf0', opacity: 0.8}} />
      <div
        style={{
          fontFamily: reemKufi.fontFamily,
          fontWeight: 700,
          fontSize: 140,
          color: '#5b2d91',
          lineHeight: 1.3,
          opacity: interpolate(frame, [0.6 * fps, 1.4 * fps], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
          scale: interpolate(frame, [0.6 * fps, 1.6 * fps], [0.9, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.spring({damping: 16}),
            output: 'perceptual-scale',
          }),
        }}
      >
        {teacher}
      </div>
    </div>
  );
};

export const EndCard = Interactive.create({
  Component: EndCardInner,
  layout: 'none',
  schema: {
    role: {type: 'string', default: 'إعداد المعلمة', description: 'Role line', hiddenFromList: false},
    teacher: {type: 'string', default: 'فاطمة الغامدي', description: 'Teacher name', hiddenFromList: false},
  },
});
