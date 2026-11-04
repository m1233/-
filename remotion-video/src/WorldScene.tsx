import React from 'react';
import {Interactive} from 'remotion';
import {World3D} from './World3D';

type WorldSceneProps = {
  readonly world: string;
  readonly start: number;
};

const WorldSceneInner: React.FC<WorldSceneProps> = ({world, start}) => (
  <>
    <World3D world={world} start={start} />
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(30,20,60,0.28) 100%)',
        pointerEvents: 'none',
      }}
    />
  </>
);

// One connected scene: an island (or the title / beach / finale) of the treasure journey.
export const WorldScene = Interactive.create({
  Component: WorldSceneInner,
  layout: 'absolute-fill',
  schema: {
    world: {type: 'string', default: 'title', description: 'World (scene id)', hiddenFromList: false},
    start: {type: 'number', default: 0, step: 0.001, description: 'Start time in the narration (s)', hiddenFromList: false},
  },
});
