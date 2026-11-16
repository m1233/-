import {Audio} from '@remotion/media';
import {TransitionSeries} from '@remotion/transitions';
import {AbsoluteFill, interpolate, staticFile, Track, useCurrentFrame, useVideoConfig} from 'remotion';
import {ArabicTitle} from './ArabicTitle';
import {CloudWipe} from './CloudWipe';
import {EndCard} from './EndCard';
import {WorldScene} from './WorldScene';

// World Children's Day: the treasure map of children's rights (5 floating islands).
// Narration: Modern Standard Arabic (Fusha), young girl's voice; calm music + SFX underneath.
export const ChildRightsDay: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();

  return (
    <AbsoluteFill style={{backgroundColor: '#ffffff'}}>
      <TransitionSeries name="Scenes">
      <TransitionSeries.Sequence name="Title — World Children's Day" durationInFrames={380}>
        <WorldScene name="Title world" world="title" start={0.0} />
      </TransitionSeries.Sequence>
      <TransitionSeries.Overlay durationInFrames={45}>
        <CloudWipe name="Cloud wipe 1" seed="wipe-1" />
      </TransitionSeries.Overlay>
      <TransitionSeries.Sequence name="Beach — the treasure map" durationInFrames={892}>
        <WorldScene name="Beach world" world="beach" start={12.656} />
      </TransitionSeries.Sequence>
      <TransitionSeries.Overlay durationInFrames={45}>
        <CloudWipe name="Cloud wipe 2" seed="wipe-2" />
      </TransitionSeries.Overlay>
      <TransitionSeries.Sequence name="The five islands" durationInFrames={753}>
        <WorldScene name="Islands world" world="islands" start={42.406} />
      </TransitionSeries.Sequence>
      <TransitionSeries.Overlay durationInFrames={45}>
        <CloudWipe name="Cloud wipe 3" seed="wipe-3" />
      </TransitionSeries.Overlay>
      <TransitionSeries.Sequence name="Island 1 — Protection" durationInFrames={1628}>
        <WorldScene name="Protection world" world="protection" start={67.51} />
        <ArabicTitle
          name="Protection title"
          from={54}
          durationInFrames={120}
          style={{color: '#3d8bfd', fontSize: 104}}
        >
          الجزيرةُ الأولى: كنزُ الحماية
        </ArabicTitle>
      </TransitionSeries.Sequence>
      <TransitionSeries.Overlay durationInFrames={45}>
        <CloudWipe name="Cloud wipe 4" seed="wipe-4" />
      </TransitionSeries.Overlay>
      <TransitionSeries.Sequence name="Island 2 — Education" durationInFrames={1707}>
        <WorldScene name="Education world" world="education" start={121.767} />
        <ArabicTitle
          name="Education title"
          from={54}
          durationInFrames={120}
          style={{color: '#f5a700', fontSize: 104}}
        >
          الجزيرةُ الثانية: كنزُ التعليم
        </ArabicTitle>
      </TransitionSeries.Sequence>
      <TransitionSeries.Overlay durationInFrames={45}>
        <CloudWipe name="Cloud wipe 5" seed="wipe-5" />
      </TransitionSeries.Overlay>
      <TransitionSeries.Sequence name="Island 3 — Play" durationInFrames={1785}>
        <WorldScene name="Play world" world="play" start={178.682} />
        <ArabicTitle
          name="Play title"
          from={54}
          durationInFrames={120}
          style={{color: '#2fae4e', fontSize: 104}}
        >
          الجزيرةُ الثالثة: كنزُ اللعبِ والنشاط
        </ArabicTitle>
      </TransitionSeries.Sequence>
      <TransitionSeries.Overlay durationInFrames={45}>
        <CloudWipe name="Cloud wipe 6" seed="wipe-6" />
      </TransitionSeries.Overlay>
      <TransitionSeries.Sequence name="Island 4 — Health" durationInFrames={1506}>
        <WorldScene name="Health world" world="health" start={238.173} />
        <ArabicTitle
          name="Health title"
          from={54}
          durationInFrames={120}
          style={{color: '#ff4f8f', fontSize: 104}}
        >
          الجزيرةُ الرابعة: كنزُ الصحّةِ والعنايةِ بالنفس
        </ArabicTitle>
      </TransitionSeries.Sequence>
      <TransitionSeries.Overlay durationInFrames={45}>
        <CloudWipe name="Cloud wipe 7" seed="wipe-7" />
      </TransitionSeries.Overlay>
      <TransitionSeries.Sequence name="Island 5 — Respect" durationInFrames={1141}>
        <WorldScene name="Respect world" world="respect" start={288.358} />
        <ArabicTitle
          name="Respect title"
          from={66}
          durationInFrames={120}
          style={{color: '#7a4fd0', fontSize: 104}}
        >
          الجزيرةُ الخامسة: كنزُ الاحترامِ والكرامة
        </ArabicTitle>
      </TransitionSeries.Sequence>
      <TransitionSeries.Overlay durationInFrames={45}>
        <CloudWipe name="Cloud wipe 8" seed="wipe-8" />
      </TransitionSeries.Overlay>
      <TransitionSeries.Sequence name="Finale" durationInFrames={422}>
        <WorldScene name="Finale world" world="finale" start={326.407} />
      </TransitionSeries.Sequence>
      <TransitionSeries.Sequence name="Credits" durationInFrames={150}>
        <EndCard name="Credit card" role="إعداد المعلمة" teacher="فاطمة الغامدي" />
      </TransitionSeries.Sequence>
      </TransitionSeries>
      <AbsoluteFill
        name="Fade in / out"
        style={{
          backgroundColor: '#ffffff',
          pointerEvents: 'none',
          opacity: interpolate(frame, [0, 0.6 * fps, durationInFrames - 1.4 * fps, durationInFrames - 1], [1, 0, 0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      />
      <Track name="Narration">
        <Audio name="Fusha narration (child voice)" src={staticFile('voice-fusha.mp3')} />
      </Track>
      <Track name="Music and SFX">
        <Audio name="Calm music + sound effects" src={staticFile('music-and-sfx.mp3')} volume={0.9} />
      </Track>
    </AbsoluteFill>
  );
};
