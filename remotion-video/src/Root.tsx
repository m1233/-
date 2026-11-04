import {Composition, Folder} from 'remotion';
import {ArabicTitle} from './ArabicTitle';
import {ChildRightsDay} from './Composition';
import {WorldScene} from './WorldScene';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ChildRightsDay"
        component={ChildRightsDay}
        width={1920}
        height={1080}
        fps={30}
        durationInFrames={10214}
      />
      <Folder name="Scenes">
        <Composition
          id="Title"
          component={WorldScene}
          width={1920}
          height={1080}
          fps={30}
          durationInFrames={380}
          defaultProps={{world: 'title', start: 0.0}}
        />
        <Composition
          id="Beach"
          component={WorldScene}
          width={1920}
          height={1080}
          fps={30}
          durationInFrames={892}
          defaultProps={{world: 'beach', start: 12.656}}
        />
        <Composition
          id="Islands"
          component={WorldScene}
          width={1920}
          height={1080}
          fps={30}
          durationInFrames={753}
          defaultProps={{world: 'islands', start: 42.406}}
        />
        <Composition
          id="Protection"
          component={WorldScene}
          width={1920}
          height={1080}
          fps={30}
          durationInFrames={1628}
          defaultProps={{world: 'protection', start: 67.51}}
        />
        <Composition
          id="Education"
          component={WorldScene}
          width={1920}
          height={1080}
          fps={30}
          durationInFrames={1707}
          defaultProps={{world: 'education', start: 121.767}}
        />
        <Composition
          id="Play"
          component={WorldScene}
          width={1920}
          height={1080}
          fps={30}
          durationInFrames={1785}
          defaultProps={{world: 'play', start: 178.682}}
        />
        <Composition
          id="Health"
          component={WorldScene}
          width={1920}
          height={1080}
          fps={30}
          durationInFrames={1506}
          defaultProps={{world: 'health', start: 238.173}}
        />
        <Composition
          id="Respect"
          component={WorldScene}
          width={1920}
          height={1080}
          fps={30}
          durationInFrames={1141}
          defaultProps={{world: 'respect', start: 288.358}}
        />
        <Composition
          id="Finale"
          component={WorldScene}
          width={1920}
          height={1080}
          fps={30}
          durationInFrames={422}
          defaultProps={{world: 'finale', start: 326.407}}
        />
      </Folder>
      <Folder name="Elements">
        <Composition
          id="IslandTitle"
          component={ArabicTitle}
          width={1920}
          height={1080}
          fps={30}
          durationInFrames={108}
          defaultProps={{children: 'الجزيرةُ الأولى: كنزُ الحماية', style: {color: '#3d8bfd', fontSize: 104}}}
        />
      </Folder>
    </>
  );
};
