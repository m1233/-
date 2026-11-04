import {useThree} from '@react-three/fiber';
import {ThreeCanvas} from '@remotion/three';
import React, {useEffect, useMemo, useState} from 'react';
import {continueRender, delayRender, useCurrentFrame, useVideoConfig} from 'remotion';
import {cairo, reemKufi} from './fonts';
import {createWorld, environmentFor} from './engine/scenes';

type WorldRigProps = {
  readonly world: string;
  readonly start: number;
};

// Builds the scene graph once and advances it from useCurrentFrame() only (no useFrame()).
const WorldRig: React.FC<WorldRigProps> = ({world, start}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {camera, scene, gl} = useThree();
  const built = useMemo(() => createWorld(world), [world]);

  built.update(start + frame / fps, camera);
  scene.fog = built.view.fog;
  scene.environment = environmentFor(gl);
  scene.environmentIntensity = 0.3;
  gl.toneMappingExposure = built.view.exposure;

  return <primitive object={built.root} />;
};

export const World3D: React.FC<WorldRigProps> = ({world, start}) => {
  const {width, height} = useVideoConfig();
  const [handle] = useState(() => delayRender('Loading Arabic fonts for 3D text'));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([cairo.waitUntilDone(), reemKufi.waitUntilDone()]).then(() => {
      setReady(true);
      continueRender(handle);
    });
  }, [handle]);

  return (
    <ThreeCanvas width={width} height={height} shadows gl={{antialias: true}}>
      {ready ? <WorldRig world={world} start={start} /> : null}
    </ThreeCanvas>
  );
};
